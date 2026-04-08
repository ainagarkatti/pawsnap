/**
 * POST /api/analyze
 *
 * Pipeline:
 *   1. Auth + rate limit
 *   2. Parse + validate request
 *   3. Pre-flight emergency detection (hardcoded rules, no AI)
 *   4. RAG retrieval
 *   5. AI vision call (Vercel AI SDK — generateText + Output.object)
 *   6. Post-processing: confidence thresholds + text sanitization + disclaimer
 *   7. Schema validation
 *   8. Return to client
 */

import { NextRequest, NextResponse } from "next/server";
import { generateText, Output, gateway } from "ai";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

import {
  detectEmergency,
  processHealthScanOutput,
  DISCLAIMERS,
} from "../../../packages/safety/src/safety-rails";
import {
  HealthScanResultSchema,
} from "../../../packages/safety/src/output-schemas";
import {
  retrieveContext,
  buildGroundingContext,
  buildHealthScanSystemPrompt,
  assessRetrievalQuality,
} from "../../../packages/rag/src/query";
import { getBreedRestrictions } from "../../../packages/rag/src/seed-data/banned-breeds";

// ─── Request Schema ───────────────────────────────────────────────────────────

const AnalyzeRequestSchema = z.object({
  /** Base64-encoded image (no data-URL prefix) */
  imageBase64: z.string().min(100),
  imageMediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  petId: z.string().uuid(),
  species: z.enum(["dog", "cat"]),
  reportedSymptoms: z.array(z.string().max(100)).max(20).default([]),
  userContext: z.string().max(500).default(""),
  /** ISO 3166-1 alpha-2, used for breed restriction lookup */
  userJurisdiction: z.string().length(2).toUpperCase().default("US"),
});

type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

// ─── AI Output Schema (subset of HealthScanResult driven by AI) ──────────────
// The AI only fills this; the rest is injected server-side.

const AIHealthOutputSchema = z.object({
  imageQuality: z.object({
    imageUsable: z.boolean(),
    issues: z.array(z.enum([
      "too_blurry", "too_dark", "too_bright",
      "pet_occluded", "no_pet_detected", "multiple_pets", "non_pet_subject",
    ])).default([]),
    qualityScore: z.number().min(0).max(1),
  }),
  breedIdentification: z.object({
    primaryBreedId: z.string().nullable(),
    primaryBreedName: z.string().nullable(),
    confidence: z.number().min(0).max(1),
    isMixedBreed: z.boolean(),
    mixComponents: z.array(z.object({
      breedId: z.string(),
      breedName: z.string(),
      estimatedPercentage: z.number().nullable(),
    })).default([]),
    uncertaintyReason: z.string().nullable(),
    estimatedLifeStage: z.enum([
      "puppy_kitten", "junior", "adult", "mature", "senior", "geriatric",
    ]).nullable(),
    estimatedAgeRangeYears: z.object({ min: z.number(), max: z.number() }).nullable(),
  }),
  bodyConditionScore: z.object({
    score: z.number().int().min(1).max(9).nullable(),
    label: z.enum([
      "very_underweight", "underweight", "lean", "ideal",
      "slightly_overweight", "overweight", "obese", "severely_obese",
    ]).nullable(),
    confidence: z.number().min(0).max(1),
    ownerGuidance: z.string().max(300).nullable(),
    vetConsultRecommended: z.boolean(),
  }),
  healthSignals: z.array(z.object({
    area: z.enum(["coat_fur", "eyes", "ears", "body_condition", "nose", "posture", "visible_skin"]),
    observation: z.string().max(200),
    signalStatus: z.enum(["appears_normal", "needs_monitoring", "consult_vet", "insufficient_view"]),
    confidence: z.number().min(0).max(1),
    ownerTip: z.string().max(300).nullable(),
  })),
  overallSummary: z.string().max(500),
});

// ─── Rate Limit ───────────────────────────────────────────────────────────────

async function checkRateLimit(
  userId: string,
  tier: "free" | "pro" | "family"
): Promise<{ allowed: boolean; remaining: number }> {
  // TODO: Upstash Redis rate limit in production
  const limit = tier === "free" ? 5 : 999999;
  return { allowed: true, remaining: limit };
}

// ─── Mock vector search (replace with real pgvector client) ──────────────────

const mockVectorSearch = async () => [];
const mockEmbed = async (_text: string) => new Array(1536).fill(0);

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const startMs = Date.now();
  const scanId = uuidv4();

  // 1. Auth
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = "mock_user_id"; // extracted from JWT in production
  const userTier: "free" | "pro" | "family" = "pro";

  // 2. Rate limit
  const rateLimit = await checkRateLimit(userId, userTier);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Monthly scan limit reached.", upgradeUrl: "https://pawsnap.app/upgrade" },
      { status: 429 }
    );
  }

  // 3. Parse request
  let body: AnalyzeRequest;
  try {
    body = AnalyzeRequestSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: "Invalid request", details: e instanceof z.ZodError ? e.issues : undefined },
      { status: 400 }
    );
  }

  const { imageBase64, imageMediaType, petId, species, reportedSymptoms, userContext, userJurisdiction } = body;

  // 4. Pre-flight emergency detection — never blocked by AI latency
  const emergencySignal = detectEmergency(reportedSymptoms, userContext, species);
  if (emergencySignal) {
    return NextResponse.json({
      scanId, petId, capturedAt: new Date().toISOString(),
      emergencyAlert: {
        triggered: true,
        reason: emergencySignal.reason,
        immediateAction: emergencySignal.immediateAction,
        aspca_poison_control: "888-426-4435",
      },
      overallSummary: "Emergency signs detected. Please seek veterinary care immediately.",
      healthSignals: [], breedIdentification: null, bodyConditionScore: null,
      imageQuality: { imageUsable: true, issues: [], qualityScore: 1 },
      disclaimer: DISCLAIMERS.EMERGENCY,
      ragSources: [], modelVersion: "emergency-bypass",
      processingMs: Date.now() - startMs,
    });
  }

  // 5. RAG retrieval
  const ragQuery = [
    `${species} visual health assessment`,
    ...reportedSymptoms,
    userContext,
  ].filter(Boolean).join(". ");

  const ragResult = await retrieveContext(
    {
      query: ragQuery,
      species,
      categories: ["health_signal", "breed_health", "symptom_triage"],
      topK: 6,
      minScore: 0.70,
      minConfidenceTier: "established",
    },
    mockEmbed,
    mockVectorSearch
  );

  const { warning: ragWarning } = assessRetrievalQuality(ragResult);
  const groundingContext = buildGroundingContext(ragResult.chunks);
  const systemPrompt = buildHealthScanSystemPrompt(groundingContext, species)
    + (ragWarning ? `\n\n${ragWarning}` : "");

  // 6. AI vision call — Vercel AI SDK with structured output
  let aiOutput: z.infer<typeof AIHealthOutputSchema>;
  try {
    const userPromptParts = [
      `Analyze this ${species} photo for visual wellness signals.`,
      reportedSymptoms.length > 0 ? `Owner-reported concerns: ${reportedSymptoms.join(", ")}.` : "",
      userContext ? `Additional context: ${userContext}` : "",
      "",
      "Return a JSON object with: imageQuality, breedIdentification, bodyConditionScore, healthSignals[], overallSummary.",
      "REMINDER: No medication names. No diagnostic assertions ('has', 'is diagnosed with'). No prognosis.",
      "For any area you cannot see clearly, set confidence low and use signalStatus: insufficient_view.",
    ].filter(Boolean).join("\n");

    const { output } = await generateText({
      model: gateway("anthropic/claude-sonnet-4.6"),
      output: Output.object({ schema: AIHealthOutputSchema }),
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: imageBase64,
              mediaType: imageMediaType,
            },
            {
              type: "text",
              text: userPromptParts,
            },
          ],
        },
      ],
    });

    aiOutput = output;
  } catch (e) {
    console.error("[analyze] AI SDK error", e);
    return NextResponse.json(
      { error: "Analysis service temporarily unavailable. Please try again." },
      { status: 503 }
    );
  }

  // 7. Post-processing safety pipeline
  const processedResult = processHealthScanOutput(
    {
      ...aiOutput,
      scanId,
      petId,
      capturedAt: new Date().toISOString(),
      ragSources: ragResult.chunks.map(c => ({
        sourceId: c.document.sourceId,
        sourceName: c.document.sourceId,
        category: c.document.category,
        relevanceScore: c.score,
      })),
      modelVersion: "anthropic/claude-sonnet-4.6",
      processingMs: Date.now() - startMs,
    },
    null
  );

  // 8. Breed restriction notice
  const breedId = processedResult.breedIdentification?.primaryBreedId;
  const breedRestrictionNotice = breedId
    ? (() => {
        const restrictions = getBreedRestrictions(breedId).filter(
          r => r.jurisdiction === userJurisdiction
        );
        return restrictions.length > 0
          ? { breedId, breedName: processedResult.breedIdentification?.primaryBreedName, restrictions, legalDisclaimer: DISCLAIMERS.BREED_RESTRICTION }
          : null;
      })()
    : null;

  // 9. Final schema validation
  const validated = HealthScanResultSchema.safeParse(processedResult);
  if (!validated.success) {
    console.error("[analyze] Schema validation issues", validated.error.issues);
  }

  return NextResponse.json(
    { ...(validated.success ? validated.data : processedResult), breedRestrictionNotice },
    {
      status: 200,
      headers: {
        "X-Scan-Id": scanId,
        "X-Rate-Limit-Remaining": String(rateLimit.remaining - 1),
      },
    }
  );
}
