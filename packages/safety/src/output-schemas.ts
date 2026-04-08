/**
 * PawSnap AI Output Schemas
 *
 * ALL AI responses are constrained to these Zod schemas before being
 * returned to the client. Free-form text from the model is NEVER passed
 * through unchecked.
 *
 * Design principles:
 * 1. Urgency is an enum — the model cannot invent a new level
 * 2. Confidence is a number — below threshold triggers redaction
 * 3. No medication names, dosages, or diagnostic assertions anywhere
 * 4. Every health-related output ships with a required disclaimer
 * 5. Structured output means the model cannot "explain" its way around rules
 */

import { z } from "zod";

// ─── Shared Primitives ────────────────────────────────────────────────────────

export const ConfidenceScore = z
  .number()
  .min(0)
  .max(1)
  .describe("Model confidence 0–1. Below 0.70 triggers uncertain-state UI.");

export const UrgencyLevelSchema = z.enum([
  "MONITOR",
  "VET_SOON",
  "VET_TODAY",
  "EMERGENCY",
]);

export const LifeStageSchema = z.enum([
  "puppy_kitten",
  "junior",
  "adult",
  "mature",
  "senior",
  "geriatric",
]);

export const SpeciesSchema = z.enum(["dog", "cat"]);

// ─── Image Quality Gate ───────────────────────────────────────────────────────

/**
 * Returned by the vision model before any health analysis.
 * If imageUsable is false, the full analysis is skipped.
 */
export const ImageQualitySchema = z.object({
  imageUsable: z.boolean(),
  issues: z
    .array(
      z.enum([
        "too_blurry",
        "too_dark",
        "too_bright",
        "pet_occluded",
        "no_pet_detected",
        "multiple_pets",
        "non_pet_subject",
      ])
    )
    .default([]),
  qualityScore: ConfidenceScore,
});

export type ImageQuality = z.infer<typeof ImageQualitySchema>;

// ─── Breed Identification ─────────────────────────────────────────────────────

export const BreedIdentificationSchema = z.object({
  primaryBreedId: z.string().nullable(),
  primaryBreedName: z.string().nullable(),
  confidence: ConfidenceScore,
  isMixedBreed: z.boolean(),
  mixComponents: z
    .array(
      z.object({
        breedId: z.string(),
        breedName: z.string(),
        estimatedPercentage: z.number().min(0).max(100).nullable(),
      })
    )
    .default([]),
  /**
   * When confidence < 0.70 or isMixedBreed is true, this is set
   * and breed-specific care recommendations are suppressed.
   */
  uncertaintyReason: z.string().nullable(),
  estimatedLifeStage: LifeStageSchema.nullable(),
  estimatedAgeRangeYears: z
    .object({ min: z.number(), max: z.number() })
    .nullable(),
});

export type BreedIdentification = z.infer<typeof BreedIdentificationSchema>;

// ─── Health Signal (single indicator) ────────────────────────────────────────

/**
 * One observable health signal from the photo.
 * MUST NOT contain diagnostic assertions.
 * "appears healthy" language only — never "is healthy" or "has condition X".
 */
export const HealthSignalSchema = z.object({
  area: z.enum([
    "coat_fur",
    "eyes",
    "ears",
    "body_condition",
    "nose",
    "posture",
    "visible_skin",
  ]),
  observation: z
    .string()
    .max(200)
    .describe("Factual visual description only. No diagnostic language."),
  signalStatus: z.enum([
    "appears_normal",
    "needs_monitoring",
    "consult_vet",
    "insufficient_view",
  ]),
  confidence: ConfidenceScore,
  ownerTip: z
    .string()
    .max(300)
    .nullable()
    .describe("Plain-English wellness tip. No medication advice."),
});

export type HealthSignal = z.infer<typeof HealthSignalSchema>;

// ─── Body Condition Score ─────────────────────────────────────────────────────

export const BodyConditionScoreSchema = z.object({
  score: z.number().int().min(1).max(9).nullable(),
  label: z
    .enum([
      "very_underweight",
      "underweight",
      "lean",
      "ideal",
      "slightly_overweight",
      "overweight",
      "obese",
      "severely_obese",
    ])
    .nullable(),
  confidence: ConfidenceScore,
  ownerGuidance: z.string().max(300).nullable(),
  /**
   * If score is outside 4–5 range, this nudges user toward vet.
   * Never specifies a diet or calorie prescription.
   */
  vetConsultRecommended: z.boolean(),
});

export type BodyConditionScore = z.infer<typeof BodyConditionScoreSchema>;

// ─── Full Health Scan Result ──────────────────────────────────────────────────

export const HealthScanResultSchema = z.object({
  scanId: z.string().uuid(),
  petId: z.string(),
  capturedAt: z.string().datetime(),

  imageQuality: ImageQualitySchema,
  breedIdentification: BreedIdentificationSchema,
  bodyConditionScore: BodyConditionScoreSchema,
  healthSignals: z.array(HealthSignalSchema),

  /**
   * Overall wellness summary — 2–3 sentences, no diagnosis, no medication.
   * Must end with the standard disclaimer.
   */
  overallSummary: z.string().max(500),

  /** Populated only if an emergency pattern is detected. Bypasses confidence gates. */
  emergencyAlert: z
    .object({
      triggered: z.literal(true),
      reason: z.string(),
      immediateAction: z.string(),
      aspca_poison_control: z.literal("888-426-4435"),
    })
    .nullable(),

  /** Sources from RAG retrieval that informed this response */
  ragSources: z.array(
    z.object({
      sourceId: z.string(),
      sourceName: z.string(),
      category: z.string(),
      relevanceScore: z.number(),
    })
  ),

  /** Required legal disclaimer — injected server-side, never by AI model */
  disclaimer: z.string(),

  modelVersion: z.string(),
  processingMs: z.number(),
});

export type HealthScanResult = z.infer<typeof HealthScanResultSchema>;

// ─── Symptom Check Result ─────────────────────────────────────────────────────

export const SymptomCheckResultSchema = z.object({
  checkId: z.string().uuid(),
  symptoms: z.array(z.string()),
  species: SpeciesSchema,
  urgency: UrgencyLevelSchema,

  matchedRules: z.array(
    z.object({
      ruleId: z.string(),
      symptom: z.string(),
      urgency: UrgencyLevelSchema,
      ownerGuidance: z.string(),
      hardcoded: z.boolean(),
    })
  ),

  /** Next-step guidance — no medication names, no dosage, no diagnosis */
  summary: z.string().max(400),

  /**
   * Emergency contacts populated for VET_TODAY and EMERGENCY urgency.
   * Will be populated with regional vet finder links in v1.1.
   */
  emergencyContacts: z.object({
    aspca_poison_control: z.literal("888-426-4435"),
    generic_emergency_note: z.string(),
  }).nullable(),

  ragSources: z.array(
    z.object({ sourceId: z.string(), sourceName: z.string() })
  ),
  disclaimer: z.string(),
  checkedAt: z.string().datetime(),
});

export type SymptomCheckResult = z.infer<typeof SymptomCheckResultSchema>;

// ─── Care Plan ────────────────────────────────────────────────────────────────

export const CarePlanSchema = z.object({
  petId: z.string(),
  breedId: z.string().nullable(),
  lifeStage: LifeStageSchema,
  generatedAt: z.string().datetime(),

  nutrition: z.object({
    feedingFrequencyPerDay: z.number().int().min(1).max(6),
    foodTypeGuidance: z.string().max(300),
    portionNote: z
      .string()
      .max(300)
      .describe("General guidance only. No specific gram amounts — those require vet input."),
    waterNote: z.string().max(200),
  }),

  exercise: z.object({
    dailyMinutesRange: z.object({ min: z.number(), max: z.number() }),
    intensityLevel: z.enum(["gentle", "moderate", "vigorous"]),
    notes: z.string().max(300),
  }),

  grooming: z.object({
    brushingFrequency: z.string().max(100),
    bathingFrequencyWeeks: z.number().nullable(),
    nailTrimFrequencyWeeks: z.number().nullable(),
    professionalGroomingNotes: z.string().max(200).nullable(),
  }),

  vaccinationReminders: z.array(
    z.object({
      vaccineName: z.string(),
      dueAgeMonths: z.number().nullable(),
      isCore: z.boolean(),
      notes: z.string().max(200),
    })
  ),

  ragSources: z.array(z.object({ sourceId: z.string(), sourceName: z.string() })),
  disclaimer: z.string(),
});

export type CarePlan = z.infer<typeof CarePlanSchema>;

// ─── Breed Restriction Notice ─────────────────────────────────────────────────

export const BreedRestrictionNoticeSchema = z.object({
  breedId: z.string(),
  breedName: z.string(),
  userJurisdiction: z.string(),
  restrictions: z.array(
    z.object({
      jurisdiction: z.string(),
      jurisdictionLabel: z.string(),
      status: z.enum(["banned", "restricted"]),
      notes: z.string(),
      lastVerified: z.string(),
    })
  ),
  legalDisclaimerRequired: z.literal(true),
  legalDisclaimer: z.string(),
});

export type BreedRestrictionNotice = z.infer<typeof BreedRestrictionNoticeSchema>;
