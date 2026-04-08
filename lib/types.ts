/**
 * PawSnap client-side types
 * Derived from the API output schemas — only what the UI needs.
 */

export type Species = "dog" | "cat";

export type LifeStage =
  | "puppy_kitten"
  | "junior"
  | "adult"
  | "mature"
  | "senior"
  | "geriatric";

export type UrgencyLevel = "MONITOR" | "VET_SOON" | "VET_TODAY" | "EMERGENCY";

export type SignalStatus =
  | "appears_normal"
  | "needs_monitoring"
  | "consult_vet"
  | "insufficient_view";

// ─── Pet Profile (client-only, stored locally) ────────────────────────────────

export interface Pet {
  id: string;
  name: string;
  species: Species;
  breedId: string | null;
  breedName: string | null;
  birthYear: number | null;
  photoUri: string | null;
  createdAt: string;
}

// ─── Scan History ─────────────────────────────────────────────────────────────

export interface HealthSignal {
  area:
    | "coat_fur"
    | "eyes"
    | "ears"
    | "body_condition"
    | "nose"
    | "posture"
    | "visible_skin";
  observation: string;
  signalStatus: SignalStatus;
  confidence: number;
  ownerTip: string | null;
}

export interface BreedIdentification {
  primaryBreedId: string | null;
  primaryBreedName: string | null;
  confidence: number;
  isMixedBreed: boolean;
  uncertaintyReason: string | null;
  estimatedLifeStage: LifeStage | null;
  estimatedAgeRangeYears: { min: number; max: number } | null;
}

export interface BodyConditionScore {
  score: number | null;
  label: string | null;
  confidence: number;
  ownerGuidance: string | null;
  vetConsultRecommended: boolean;
}

export interface EmergencyAlert {
  triggered: true;
  reason: string;
  immediateAction: string;
  aspca_poison_control: string;
}

export interface ScanResult {
  scanId: string;
  petId: string;
  capturedAt: string;
  imageQuality: {
    imageUsable: boolean;
    issues: string[];
    qualityScore: number;
  };
  breedIdentification: BreedIdentification;
  bodyConditionScore: BodyConditionScore;
  healthSignals: HealthSignal[];
  overallSummary: string;
  emergencyAlert: EmergencyAlert | null;
  disclaimer: string;
  processingMs: number;
}

// ─── Symptom Check ────────────────────────────────────────────────────────────

export interface SymptomCheckResult {
  checkId: string;
  symptoms: string[];
  species: Species;
  urgency: UrgencyLevel;
  summary: string;
  emergencyContacts: {
    aspca_poison_control: string;
    generic_emergency_note: string;
  } | null;
  disclaimer: string;
  checkedAt: string;
}
