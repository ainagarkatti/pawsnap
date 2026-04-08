/**
 * PawSnap RAG Query Engine
 *
 * Retrieval flow:
 *   1. Pre-filter by species + category (reduces search space, cuts hallucination risk)
 *   2. Embed the query using text-embedding-3-small
 *   3. Cosine similarity search against pgvector index
 *   4. Post-filter: drop chunks below minScore
 *   5. Re-rank: authoritative sources weighted up
 *   6. Return top-K chunks + metadata for prompt injection
 *
 * The retrieved chunks are injected into the system prompt as grounding context.
 * The model is instructed to ONLY use this context — no parametric recall.
 */

import type {
  RAGRetrievalRequest,
  RAGRetrievalResult,
  RAGChunk,
  KBDocument,
  ConfidenceTier,
} from "./types";

// ─── Confidence Tier Weights ──────────────────────────────────────────────────
// Applied as a score multiplier during re-ranking to surface authoritative sources.

const TIER_WEIGHT: Record<ConfidenceTier, number> = {
  authoritative: 1.20,
  established: 1.10,
  curated: 1.00,
  community: 0.80,
};

// ─── Prompt Builder ───────────────────────────────────────────────────────────

/**
 * Formats RAG chunks into a grounding context block for the system prompt.
 * Includes source attribution so the model can cite sources.
 */
export function buildGroundingContext(chunks: RAGChunk[]): string {
  if (chunks.length === 0) {
    return "No relevant knowledge base content was found. Respond conservatively and recommend consulting a vet.";
  }

  const sections = chunks.map((chunk, i) => {
    const doc = chunk.document;
    const citation = doc.sourceUrl
      ? `${doc.sourceId} (${doc.sourceUrl})`
      : doc.sourceId;
    return [
      `[CONTEXT ${i + 1}] Category: ${doc.category} | Source: ${citation} | Confidence: ${doc.confidenceTier}`,
      doc.content,
    ].join("\n");
  });

  return [
    "=== VETERINARY KNOWLEDGE BASE CONTEXT ===",
    "Use ONLY the following verified information to answer. Do not use general training knowledge for medical claims.",
    "",
    sections.join("\n\n"),
    "",
    "=== END OF CONTEXT ===",
  ].join("\n");
}

// ─── System Prompt Templates ──────────────────────────────────────────────────

export function buildHealthScanSystemPrompt(
  groundingContext: string,
  species: "dog" | "cat"
): string {
  return `You are PawSnap's veterinary wellness AI assistant. You help ${species} owners understand visual health signals from photos.

CRITICAL RULES — you must follow these without exception:
1. ONLY use the knowledge base context provided below. Never use your general training knowledge for medical claims.
2. NEVER diagnose. Use "appears to show signs consistent with" or "may indicate" — never "has" or "is diagnosed with".
3. NEVER name medications, dosages, or treatment protocols of any kind.
4. NEVER give a prognosis ("will recover", "won't get better").
5. NEVER say "does not need a vet" or discourage veterinary consultation.
6. When confidence is below threshold, say "unable to determine from this image" rather than guessing.
7. If ANY emergency signal is detected, stop all analysis and return the emergency flag only.
8. All health output MUST be factual, observational, and wellness-focused — not diagnostic.

RESPONSE FORMAT:
Return a structured JSON object matching the HealthScanResult schema exactly.
Do not add any fields not in the schema.
Do not include explanatory prose outside the schema fields.

${groundingContext}`;
}

export function buildSymptomCheckSystemPrompt(
  groundingContext: string,
  species: "dog" | "cat"
): string {
  return `You are PawSnap's symptom triage assistant for ${species} owners.

CRITICAL RULES:
1. ONLY use the provided triage rules and knowledge base context. No general training knowledge.
2. NEVER name medications, dosages, or home treatments.
3. NEVER diagnose — only triage urgency.
4. When multiple symptoms are present, always return the HIGHEST urgency level.
5. EMERGENCY cases must ALWAYS recommend going to a vet immediately — no exceptions.
6. Keep owner guidance to 2–3 clear sentences. Plain English only.

RESPONSE FORMAT: Return structured JSON matching the SymptomCheckResult schema.

${groundingContext}`;
}

// ─── Mock Retrieval (replace with real pgvector in production) ───────────────

/**
 * In production this calls your Neon Postgres (pgvector) database.
 *
 * SQL pattern:
 *   SELECT *, 1 - (embedding <=> $query_embedding) AS score
 *   FROM kb_documents
 *   WHERE species = $species
 *     AND category = ANY($categories)
 *   ORDER BY embedding <=> $query_embedding
 *   LIMIT $topK;
 *
 * The mock below is replaced by the real DB client in apps/api.
 */
export type VectorSearchFn = (
  queryEmbedding: number[],
  filters: { species: string; categories?: string[] },
  topK: number
) => Promise<{ document: KBDocument; score: number }[]>;

// ─── Core Retrieval Function ──────────────────────────────────────────────────

export async function retrieveContext(
  request: RAGRetrievalRequest,
  embedText: (text: string) => Promise<number[]>,
  vectorSearch: VectorSearchFn
): Promise<RAGRetrievalResult> {
  const startTotal = Date.now();

  // 1. Embed the query
  const embedStart = Date.now();
  const queryEmbedding = await embedText(request.query);
  const queryEmbeddingMs = Date.now() - embedStart;

  // 2. Pre-filtered vector search
  const searchStart = Date.now();
  const rawResults = await vectorSearch(
    queryEmbedding,
    {
      species: request.species,
      categories: request.categories,
    },
    (request.topK ?? 5) * 2 // over-fetch to allow for re-ranking
  );
  const searchMs = Date.now() - searchStart;

  // 3. Score filtering + confidence tier filter
  const minScore = request.minScore ?? 0.72;
  let filtered = rawResults.filter(r => r.score >= minScore);

  if (request.minConfidenceTier) {
    const tierOrder: Record<ConfidenceTier, number> = {
      authoritative: 3, established: 2, curated: 1, community: 0,
    };
    const minTierScore = tierOrder[request.minConfidenceTier];
    filtered = filtered.filter(
      r => tierOrder[r.document.confidenceTier] >= minTierScore
    );
  }

  // 4. Re-rank: multiply cosine score by tier weight
  const reranked = filtered
    .map(r => ({
      document: r.document,
      score: r.score * TIER_WEIGHT[r.document.confidenceTier],
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, request.topK ?? 5);

  return {
    chunks: reranked,
    retrievedAt: new Date().toISOString(),
    queryEmbeddingMs,
    searchMs,
  };
}

// ─── Retrieval Quality Checks ─────────────────────────────────────────────────

/**
 * If retrieved chunks are low quality or scarce, the AI response
 * should be more conservative. Returns a warning string to inject
 * into the system prompt.
 */
export function assessRetrievalQuality(result: RAGRetrievalResult): {
  adequate: boolean;
  warning: string | null;
} {
  if (result.chunks.length === 0) {
    return {
      adequate: false,
      warning: "WARNING: No relevant knowledge base content found. Be very conservative and recommend consulting a vet.",
    };
  }

  const avgScore = result.chunks.reduce((s, c) => s + c.score, 0) / result.chunks.length;
  if (avgScore < 0.75) {
    return {
      adequate: true,
      warning: "NOTE: Knowledge base matches have low relevance scores. Respond conservatively.",
    };
  }

  const authoritativeCount = result.chunks.filter(
    c => c.document.confidenceTier === "authoritative" || c.document.confidenceTier === "established"
  ).length;
  if (authoritativeCount === 0) {
    return {
      adequate: true,
      warning: "NOTE: No authoritative sources in retrieved context. Recommend vet consultation for any health decisions.",
    };
  }

  return { adequate: true, warning: null };
}
