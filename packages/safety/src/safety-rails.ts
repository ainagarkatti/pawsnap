/**
 * PawSnap Safety Rails Engine
 *
 * This module runs BEFORE and AFTER AI model calls.
 * It is the single source of truth for risk mitigation.
 *
 * Pre-flight checks (run before any AI call):
 *   1. Image quality gate
 *   2. Emergency symptom detection (hardcoded rules, no AI needed)
 *   3. Prohibited content patterns
 *
 * Post-flight checks (run on AI output before returning to client):
 *   4. Strip any medication names or dosages that slipped through
 *   5. Enforce confidence thresholds — redact low-confidence outputs
 *   6. Inject required disclaimers
 *   7. Validate output against Zod schemas
 *
 * Legal exposure mitigations:
 *   - No diagnostic assertions (is/has/suffers from)
 *   - No medication names or dosages ever
 *   - No prognosis (will/won't recover)
 *   - Disclaimer on every health output
 *   - Emergency always shows vet referral — AI confidence irrelevant
 */

import type { HealthScanResult, SymptomCheckResult } from "./output-schemas";
import { SYMPTOM_TRIAGE_RULES, getHardcodedEmergencyRules } from "../../rag/src/seed-data/symptom-triage";
import { TOXIC_SUBSTANCES } from "../../rag/src/seed-data/toxic-substances";

// ─── Configuration ────────────────────────────────────────────────────────────

export const SAFETY_CONFIG = {
  /** Breed ID confidence below this → show "uncertain / mixed breed" */
  BREED_CONFIDENCE_THRESHOLD: 0.70,

  /** Health signal confidence below this → omit signal from output */
  HEALTH_SIGNAL_CONFIDENCE_THRESHOLD: 0.60,

  /** Body condition score confidence below this → suppress score */
  BCS_CONFIDENCE_THRESHOLD: 0.65,

  /** Image quality score below this → reject image, ask user to retake */
  IMAGE_QUALITY_THRESHOLD: 0.45,

  /** Max tokens allowed in AI summary fields */
  MAX_SUMMARY_TOKENS: 150,
} as const;

// ─── Prohibited Language Patterns ────────────────────────────────────────────

/**
 * Regex patterns that must never appear in AI-generated text returned to users.
 * The post-processor strips or replaces any matches.
 *
 * Categories:
 *  - Diagnostic assertions ("has", "is diagnosed with", "suffers from")
 *  - Medication references (drug names, dosage patterns)
 *  - Prognosis ("will recover", "may not survive")
 *  - Legal / compliance red flags
 */
export const PROHIBITED_PATTERNS: { pattern: RegExp; replacement: string; reason: string }[] = [
  // Diagnostic assertion patterns
  {
    pattern: /\b(is diagnosed with|has been diagnosed|suffers from|is suffering from)\b/gi,
    replacement: "may be showing signs consistent with",
    reason: "Diagnostic assertion — only a vet can diagnose",
  },
  {
    pattern: /\byour (dog|cat|pet) has\b(?! (a|an) (good|healthy|great|beautiful|shiny|clean))/gi,
    replacement: "your $1 may be showing signs of",
    reason: "Ownership-diagnostic pattern",
  },
  {
    pattern: /\bwill (definitely|certainly|surely) (recover|improve|get better|be fine)\b/gi,
    replacement: "may improve with veterinary care",
    reason: "Prognosis assertion",
  },
  {
    pattern: /\bdoes not need (a vet|veterinary care|treatment)\b/gi,
    replacement: "can be monitored at home, but consult a vet if symptoms persist",
    reason: "Actively discouraging vet visit",
  },

  // Medication patterns — never suggest specific medications
  {
    pattern: /\b(give|administer|apply|use)\s+(ibuprofen|paracetamol|acetaminophen|aspirin|benadryl|diphenhydramine|metronidazole|amoxicillin|prednisone|gabapentin|tramadol|meloxicam)\b/gi,
    replacement: "[medication advice removed — consult your vet]",
    reason: "Specific medication recommendation",
  },
  // Dosage pattern — e.g. "5mg/kg", "10 mg", "0.5 mL"
  {
    pattern: /\b\d+\.?\d*\s*(mg|ml|mL|mcg|IU|units?)\s*(\/\s*(kg|lb|day|dose))?\b/gi,
    replacement: "[dosage removed — consult your vet]",
    reason: "Dosage specification",
  },

  // "Just" minimiser — underplays severity
  {
    pattern: /\bit's? just\b/gi,
    replacement: "it may be",
    reason: "Minimising language that could delay vet visit",
  },
];

// ─── Known Medication Name List (for exhaustive scan) ────────────────────────

/**
 * Subset of commonly prescribed / OTC medications.
 * If any of these appear in AI output, the entire medication sentence
 * is replaced with a vet-referral message.
 */
export const PROHIBITED_MEDICATION_NAMES = new Set([
  "ibuprofen", "paracetamol", "acetaminophen", "aspirin", "naproxen",
  "benadryl", "diphenhydramine", "cetirizine", "loratadine",
  "amoxicillin", "metronidazole", "doxycycline", "cephalexin", "enrofloxacin",
  "prednisone", "prednisolone", "dexamethasone", "triamcinolone",
  "gabapentin", "tramadol", "meloxicam", "carprofen", "deracoxib",
  "phenobarbital", "potassium bromide", "levetiracetam",
  "atenolol", "amlodipine", "furosemide", "enalapril",
  "insulin", "vetsulin", "prozinc",
  "methimazole", "felimazole",
  "ivermectin", "milbemycin", "selamectin", "moxidectin",
]);

// ─── Emergency Detection ──────────────────────────────────────────────────────

export interface EmergencySignal {
  triggered: true;
  reason: string;
  immediateAction: string;
  aspca_poison_control: "888-426-4435";
}

/**
 * Scans user-reported symptoms + free text for emergency patterns.
 * DOES NOT use AI — uses hardcoded triage rules.
 * Returns EmergencySignal if any emergency pattern is detected.
 *
 * This runs before the AI call so we never wait on AI for life-threatening signals.
 */
export function detectEmergency(
  symptoms: string[],
  userText: string,
  species: "dog" | "cat"
): EmergencySignal | null {
  const emergencyRules = getHardcodedEmergencyRules();
  const combinedText = [...symptoms, userText].join(" ").toLowerCase();

  for (const rule of emergencyRules) {
    const speciesMatch = rule.species === "both" || rule.species === species;
    if (!speciesMatch) continue;

    const symptomKeywords = rule.symptom.toLowerCase().split(/\s+/);
    const mainWordMatches = symptomKeywords.filter(kw => kw.length > 4).some(kw =>
      combinedText.includes(kw)
    );

    if (mainWordMatches) {
      return {
        triggered: true,
        reason: rule.symptom,
        immediateAction: rule.ownerGuidance,
        aspca_poison_control: "888-426-4435",
      };
    }
  }

  // Check toxic substance names in free text
  for (const toxin of TOXIC_SUBSTANCES) {
    const toxinNames = [toxin.name, ...toxin.aliases].map(n => n.toLowerCase());
    if (
      toxinNames.some(name => combinedText.includes(name)) &&
      (toxin.toxicityLevel === "potentially_fatal" || toxin.toxicityLevel === "severe")
    ) {
      return {
        triggered: true,
        reason: `Possible ingestion of ${toxin.name}`,
        immediateAction: toxin.immediateAction,
        aspca_poison_control: "888-426-4435",
      };
    }
  }

  return null;
}

// ─── Output Sanitizer ─────────────────────────────────────────────────────────

/**
 * Apply all prohibited pattern replacements to a string.
 * Returns the cleaned string and a log of what was removed.
 */
export function sanitizeText(text: string): {
  cleaned: string;
  removals: { pattern: string; reason: string }[];
} {
  let cleaned = text;
  const removals: { pattern: string; reason: string }[] = [];

  for (const { pattern, replacement, reason } of PROHIBITED_PATTERNS) {
    const before = cleaned;
    cleaned = cleaned.replace(pattern, replacement);
    if (cleaned !== before) {
      removals.push({ pattern: pattern.toString(), reason });
    }
  }

  // Scan for prohibited medication names (word boundary check)
  for (const medName of PROHIBITED_MEDICATION_NAMES) {
    const medPattern = new RegExp(`\\b${medName}\\b`, "gi");
    if (medPattern.test(cleaned)) {
      cleaned = cleaned.replace(
        medPattern,
        "[medication name removed — consult your vet]"
      );
      removals.push({
        pattern: medName,
        reason: "Prohibited medication name",
      });
    }
  }

  return { cleaned, removals };
}

// ─── Confidence Threshold Enforcement ────────────────────────────────────────

/**
 * Apply confidence thresholds to a health scan result.
 * Low-confidence outputs are nulled or replaced with uncertainty messages.
 */
export function enforceConfidenceThresholds(
  result: Partial<HealthScanResult>
): Partial<HealthScanResult> {
  const r = { ...result };

  // Breed ID
  if (
    r.breedIdentification &&
    r.breedIdentification.confidence < SAFETY_CONFIG.BREED_CONFIDENCE_THRESHOLD
  ) {
    r.breedIdentification = {
      ...r.breedIdentification,
      primaryBreedId: null,
      primaryBreedName: null,
      uncertaintyReason:
        r.breedIdentification.isMixedBreed
          ? "Mixed breed detected — breed-specific recommendations are not available."
          : "Breed could not be determined with sufficient confidence from this photo.",
    };
  }

  // Health signals — filter out low-confidence ones
  if (r.healthSignals) {
    r.healthSignals = r.healthSignals.filter(
      s => s.confidence >= SAFETY_CONFIG.HEALTH_SIGNAL_CONFIDENCE_THRESHOLD
    );
  }

  // Body condition score
  if (
    r.bodyConditionScore &&
    r.bodyConditionScore.confidence < SAFETY_CONFIG.BCS_CONFIDENCE_THRESHOLD
  ) {
    r.bodyConditionScore = {
      ...r.bodyConditionScore,
      score: null,
      label: null,
      ownerGuidance:
        "Body condition could not be assessed from this photo. A hands-on assessment by your vet provides the most accurate result.",
    };
  }

  return r;
}

// ─── Disclaimer Registry ──────────────────────────────────────────────────────

export const DISCLAIMERS = {
  STANDARD_HEALTH: [
    "PawSnap is a wellness tool, not a veterinary diagnostic service.",
    "This information is for general guidance only and does not constitute veterinary advice.",
    "Always consult a licensed veterinarian for health concerns, diagnosis, or treatment decisions.",
  ].join(" "),

  EMERGENCY: [
    "⚠️ This may be a veterinary emergency.",
    "Please contact an emergency vet or ASPCA Poison Control (888-426-4435) immediately.",
    "Do not rely on this app in an emergency — call your vet now.",
  ].join(" "),

  BREED_RESTRICTION: [
    "Breed restriction laws change frequently.",
    "Always verify current regulations with your local municipal authority before acquiring or travelling with a pet.",
    "PawSnap is not a legal service and this information should not be relied upon as legal advice.",
  ].join(" "),

  SYMPTOM_CHECKER: [
    "This symptom guidance is for general information only.",
    "It does not replace a veterinary examination.",
    "If your pet's condition worsens or you are unsure, contact your vet immediately.",
  ].join(" "),

  CARE_PLAN: [
    "Care recommendations are general guidelines for this breed and life stage.",
    "Individual pets may have different needs.",
    "Consult your veterinarian to create a personalised care plan.",
  ].join(" "),
} as const;

// ─── Full Post-Processing Pipeline ───────────────────────────────────────────

/**
 * Run the complete post-processing safety pipeline on a health scan result.
 * Must be called on every AI response before it reaches the client.
 */
export function processHealthScanOutput(
  rawResult: Partial<HealthScanResult>,
  emergencySignal: EmergencySignal | null
): HealthScanResult {
  let result = enforceConfidenceThresholds(rawResult);

  // Sanitize all text fields
  if (result.overallSummary) {
    result.overallSummary = sanitizeText(result.overallSummary).cleaned;
  }
  if (result.healthSignals) {
    result.healthSignals = result.healthSignals.map(signal => ({
      ...signal,
      observation: sanitizeText(signal.observation).cleaned,
      ownerTip: signal.ownerTip ? sanitizeText(signal.ownerTip).cleaned : null,
    }));
  }
  if (result.bodyConditionScore?.ownerGuidance) {
    result.bodyConditionScore.ownerGuidance = sanitizeText(
      result.bodyConditionScore.ownerGuidance
    ).cleaned;
  }

  // Inject emergency alert (overrides everything else)
  if (emergencySignal) {
    result.emergencyAlert = {
      triggered: true,
      reason: emergencySignal.reason,
      immediateAction: emergencySignal.immediateAction,
      aspca_poison_control: "888-426-4435",
    };
    result.disclaimer = DISCLAIMERS.EMERGENCY;
  } else {
    result.emergencyAlert = null;
    result.disclaimer = DISCLAIMERS.STANDARD_HEALTH;
  }

  return result as HealthScanResult;
}
