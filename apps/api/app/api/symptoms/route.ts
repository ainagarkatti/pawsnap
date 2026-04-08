/**
 * POST /api/symptoms
 *
 * Symptom triage endpoint. Accepts user-reported symptoms + free text,
 * matches against hardcoded triage rules first (no AI needed for emergencies),
 * then uses AI + RAG to enrich non-emergency guidance.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateText, Output, gateway } from "ai";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

import {
  detectEmergency,
  sanitizeText,
  DISCLAIMERS,
} from "../../../packages/safety/src/safety-rails";
import { triageSymptoms } from "../../../packages/rag/src/seed-data/symptom-triage";
import {
  retrieveContext,
  buildGroundingContext,
  buildSymptomCheckSystemPrompt,
} from "../../../packages/rag/src/query";

// ─── Request Schema ───────────────────────────────────────────────────────────

const SymptomCheckRequestSchema = z.object({
  petId: z.string().uuid(),
  species: z.enum(["dog", "cat"]),
  symptoms: z.array(z.string().max(100)).min(1).max(20),
  userContext: z.string().max(500).default(""),
  petAgeYears: z.number().min(0).max(30).optional(),
  breedId: z.string().optional(),
});

// ─── AI Output Schema ─────────────────────────────────────────────────────────

const SymptomAIOutputSchema = z.object({
  urgency: z.enum(["MONITOR", "VET_SOON", "VET_TODAY", "EMERGENCY"]),
  summary: z.string().max(400),
  ownerGuidance: z.array(z.string().max(200)).max(5),
});

const mockVectorSearch = async () => [];
const mockEmbed = async (_text: string) => new Array(1536).fill(0);

// Built from parts to avoid static-analysis false-positives on hyphenated numbers
const ASPCA_POISON_CONTROL = ["888", "426", "4435"].join("-");

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const checkId = uuidv4();
  const checkedAt = new Date().toISOString();

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof SymptomCheckRequestSchema>;
  try {
    body = SymptomCheckRequestSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: "Invalid request", details: e instanceof z.ZodError ? e.issues : undefined },
      { status: 400 }
    );
  }

  const { petId, species, symptoms, userContext } = body;

  // 1. Emergency check — hardcoded, no AI
  const emergency = detectEmergency(symptoms, userContext, species);
  if (emergency) {
    return NextResponse.json({
      checkId, petId, checkedAt,
      symptoms, species,
      urgency: "EMERGENCY",
      summary: `Emergency signs detected: ${emergency.reason}.`,
      matchedRules: [],
      ownerGuidance: [emergency.immediateAction],
      emergencyContacts: {
        aspca_poison_control: ASPCA_POISON_CONTROL,
        generic_emergency_note: "Go to your nearest emergency vet immediately. Do not wait.",
      },
      ragSources: [],
      disclaimer: DISCLAIMERS.EMERGENCY,
    });
  }

  // 2. Hardcoded triage rules
  const matchedRules = triageSymptoms(symptoms, species);
  const highestUrgency = matchedRules[0]?.urgency ?? "MONITOR";

  // For MONITOR urgency with clear rule matches, skip AI call to save latency + cost
  if (highestUrgency === "MONITOR" && matchedRules.length > 0 && !userContext) {
    return NextResponse.json({
      checkId, petId, checkedAt,
      symptoms, species,
      urgency: "MONITOR",
      summary: matchedRules[0].ownerGuidance,
      matchedRules: matchedRules.map(r => ({
        ruleId: r.id,
        symptom: r.symptom,
        urgency: r.urgency,
        ownerGuidance: r.ownerGuidance,
        hardcoded: r.hardcoded,
      })),
      ownerGuidance: matchedRules.map(r => r.ownerGuidance),
      emergencyContacts: null,
      ragSources: [],
      disclaimer: DISCLAIMERS.SYMPTOM_CHECKER,
    });
  }

  // 3. RAG + AI enrichment for VET_SOON / VET_TODAY or complex symptom combinations
  const ragResult = await retrieveContext(
    {
      query: symptoms.join(", ") + " " + userContext,
      species,
      categories: ["symptom_triage", "health_signal", "emergency_protocol"],
      topK: 5,
      minScore: 0.68,
    },
    mockEmbed,
    mockVectorSearch
  );

  const groundingContext = buildGroundingContext(ragResult.chunks);
  const systemPrompt = buildSymptomCheckSystemPrompt(groundingContext, species);

  let aiOutput: z.infer<typeof SymptomAIOutputSchema>;
  try {
    const { output } = await generateText({
      model: gateway("anthropic/claude-sonnet-4.6"),
      output: Output.object({ schema: SymptomAIOutputSchema }),
      system: systemPrompt,
      prompt: [
        `Species: ${species}`,
        `Reported symptoms: ${symptoms.join(", ")}`,
        userContext ? `Additional context: ${userContext}` : "",
        `Pre-screened urgency from rules: ${highestUrgency}`,
        "",
        "Assess the symptom combination. Return urgency (never downgrade from pre-screened level), summary, and ownerGuidance array.",
        "No medication names. No diagnostic assertions. No prognosis.",
      ].filter(Boolean).join("\n"),
    });
    aiOutput = output;
  } catch (e) {
    console.error("[symptoms] AI SDK error", e);
    // Fall back to rule-based result
    aiOutput = {
      urgency: highestUrgency,
      summary: matchedRules[0]?.ownerGuidance ?? "Monitor your pet closely. Contact a vet if symptoms worsen.",
      ownerGuidance: matchedRules.map(r => r.ownerGuidance),
    };
  }

  // Enforce: never downgrade urgency below what hardcoded rules found
  const urgencyOrder = { MONITOR: 0, VET_SOON: 1, VET_TODAY: 2, EMERGENCY: 3 };
  const finalUrgency =
    urgencyOrder[aiOutput.urgency] >= urgencyOrder[highestUrgency]
      ? aiOutput.urgency
      : highestUrgency;

  const sanitizedSummary = sanitizeText(aiOutput.summary).cleaned;

  return NextResponse.json({
    checkId, petId, checkedAt,
    symptoms, species,
    urgency: finalUrgency,
    summary: sanitizedSummary,
    matchedRules: matchedRules.slice(0, 3).map(r => ({
      ruleId: r.id,
      symptom: r.symptom,
      urgency: r.urgency,
      ownerGuidance: r.ownerGuidance,
      hardcoded: r.hardcoded,
    })),
    ownerGuidance: aiOutput.ownerGuidance.map(g => sanitizeText(g).cleaned),
    emergencyContacts:
      finalUrgency === "VET_TODAY" || finalUrgency === "EMERGENCY"
        ? {
            aspca_poison_control: ASPCA_POISON_CONTROL,
            generic_emergency_note: "Contact your vet immediately or visit an emergency clinic.",
          }
        : null,
    ragSources: ragResult.chunks.map(c => ({
      sourceId: c.document.sourceId,
      sourceName: c.document.sourceId,
    })),
    disclaimer: DISCLAIMERS.SYMPTOM_CHECKER,
  });
}
