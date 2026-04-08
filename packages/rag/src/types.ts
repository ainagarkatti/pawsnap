/**
 * PawSnap RAG Knowledge Base — Core Types
 *
 * Every document stored in the vector DB uses this schema.
 * Metadata is designed for pre-filter retrieval: always filter
 * species + category before semantic search to reduce hallucination
 * surface area and retrieval latency.
 */

// ─── Document Categories ────────────────────────────────────────────────────

export type KBCategory =
  | "breed_profile"          // Physical traits, temperament, history
  | "breed_health"           // Genetic predispositions, common conditions
  | "health_signal"          // Visual indicators: coat, eyes, ears, BCS
  | "symptom_triage"         // Symptom → urgency mapping
  | "care_nutrition"         // Feeding guidelines, portion sizes
  | "care_exercise"          // Activity requirements by breed/age
  | "care_grooming"          // Grooming schedules, coat care
  | "vaccination_schedule"   // Core + non-core vaccines by region
  | "toxic_substance"        // Foods, plants, chemicals toxic to pets
  | "banned_breed_law"       // Jurisdiction-specific breed restrictions
  | "emergency_protocol"     // When to go to ER vet immediately
  | "first_aid"              // Owner-safe stabilization only
  | "life_stage"             // Puppy/kitten, adult, senior thresholds
  | "dental_health"          // Dental scoring, brushing, dental disease
  | "parasite_prevention";   // Flea, tick, heartworm by region

export type Species = "dog" | "cat" | "both";

export type ConfidenceTier =
  | "authoritative"   // Peer-reviewed / official vet body (WSAVA, AVMA, ASPCA)
  | "established"     // Major vet hospital or breed registry (VCA, AKC, CFA)
  | "curated"         // Vet-reviewed proprietary content
  | "community";      // Aggregated owner/breeder knowledge (lower weight)

export type UrgencyLevel =
  | "MONITOR"         // Watch at home, recheck in 24–48h
  | "VET_SOON"        // Non-emergency appointment within 24–72h
  | "VET_TODAY"       // Same-day appointment needed
  | "EMERGENCY";      // Go to emergency vet NOW — bypass AI output

// ─── Source Registry ────────────────────────────────────────────────────────

/**
 * Canonical list of approved data sources.
 * Each chunk must reference one of these IDs.
 * New sources require a vet-team review before addition.
 */
export type DataSourceId =
  // Tier: authoritative
  | "wsava"              // World Small Animal Veterinary Association
  | "avma"               // American Veterinary Medical Association
  | "aspca"              // ASPCA Poison Control / animal welfare
  | "bsava"              // British Small Animal Veterinary Association
  | "esccap"             // European parasite control guidelines
  | "aaha"               // American Animal Hospital Association
  // Tier: established
  | "vca_hospitals"      // VCA Animal Hospitals care guides
  | "merck_vet"          // Merck Veterinary Manual (public sections)
  | "akc"                // American Kennel Club breed standards
  | "cfa"                // Cat Fanciers' Association
  | "the_kennel_club"    // UK Kennel Club
  | "ankc"               // Australian National Kennel Council
  | "royal_canin"        // Royal Canin breed + nutrition library
  | "purina_pro"         // Purina Pro Plan vet resources
  // Tier: curated (PawSnap proprietary, vet-reviewed)
  | "pawsnap_vet_review" // Internal vet-reviewed content
  // Tier: regulatory
  | "uk_dda_1991"        // UK Dangerous Dogs Act 1991 + 2014 amendment
  | "uae_municipal_law"  // UAE Federal Law No. 22/2016 + emirate bylaws
  | "au_biosecurity"     // Australian state biosecurity acts
  | "ca_provincial"      // Canadian provincial breed restrictions;

export const DATA_SOURCE_REGISTRY: Record<DataSourceId, {
  name: string;
  tier: ConfidenceTier;
  url: string;
  requiresCitation: boolean;
}> = {
  wsava:            { name: "WSAVA", tier: "authoritative", url: "https://wsava.org", requiresCitation: true },
  avma:             { name: "AVMA", tier: "authoritative", url: "https://avma.org", requiresCitation: true },
  aspca:            { name: "ASPCA", tier: "authoritative", url: "https://aspca.org", requiresCitation: true },
  bsava:            { name: "BSAVA", tier: "authoritative", url: "https://bsava.com", requiresCitation: true },
  esccap:           { name: "ESCCAP", tier: "authoritative", url: "https://esccap.org", requiresCitation: true },
  aaha:             { name: "AAHA", tier: "authoritative", url: "https://aaha.org", requiresCitation: true },
  vca_hospitals:    { name: "VCA Animal Hospitals", tier: "established", url: "https://vcahospitals.com", requiresCitation: true },
  merck_vet:        { name: "Merck Veterinary Manual", tier: "established", url: "https://merckvetmanual.com", requiresCitation: true },
  akc:              { name: "American Kennel Club", tier: "established", url: "https://akc.org", requiresCitation: true },
  cfa:              { name: "Cat Fanciers' Association", tier: "established", url: "https://cfa.org", requiresCitation: true },
  the_kennel_club:  { name: "The Kennel Club (UK)", tier: "established", url: "https://thekennelclub.org.uk", requiresCitation: true },
  ankc:             { name: "ANKC", tier: "established", url: "https://ankc.org.au", requiresCitation: true },
  royal_canin:      { name: "Royal Canin", tier: "established", url: "https://royalcanin.com", requiresCitation: false },
  purina_pro:       { name: "Purina Pro Plan Vet", tier: "established", url: "https://purinaproplan.com", requiresCitation: false },
  pawsnap_vet_review: { name: "PawSnap Vet Review", tier: "curated", url: "https://pawsnap.app/kb", requiresCitation: false },
  uk_dda_1991:      { name: "UK Dangerous Dogs Act", tier: "authoritative", url: "https://legislation.gov.uk/ukpga/1991/65", requiresCitation: true },
  uae_municipal_law: { name: "UAE Federal Law 22/2016", tier: "authoritative", url: "https://u.ae/en", requiresCitation: true },
  au_biosecurity:   { name: "AU Biosecurity Act", tier: "authoritative", url: "https://agriculture.gov.au", requiresCitation: true },
  ca_provincial:    { name: "Canadian Provincial Laws", tier: "authoritative", url: "https://canada.ca", requiresCitation: true },
};

// ─── Knowledge Base Document ─────────────────────────────────────────────────

/**
 * A single chunk stored in the vector DB.
 * The `content` field is what gets embedded.
 * All other fields are stored as filterable metadata.
 */
export interface KBDocument {
  id: string;                      // UUID v4
  content: string;                 // Text for embedding (max ~500 tokens)
  category: KBCategory;
  species: Species;
  sourceId: DataSourceId;
  confidenceTier: ConfidenceTier;

  // Optional enrichment
  breedIds?: string[];             // e.g. ["golden_retriever", "labrador"]
  urgencyLevel?: UrgencyLevel;     // Only for symptom_triage + emergency_protocol
  jurisdictions?: string[];        // ISO 3166-1 alpha-2 codes — for legal docs
  ageStages?: LifeStage[];

  // Audit
  reviewedByVet: boolean;
  reviewedAt?: string;             // ISO 8601
  sourceUrl?: string;
  lastVerifiedAt: string;          // ISO 8601 — stale if >18 months
  version: number;                 // Increment on update, never delete
}

export type LifeStage = "puppy_kitten" | "junior" | "adult" | "mature" | "senior" | "geriatric";

// ─── Retrieval Request ───────────────────────────────────────────────────────

export interface RAGRetrievalRequest {
  query: string;
  species: Species;
  categories?: KBCategory[];       // Pre-filter; if omitted, search all
  breedId?: string;
  jurisdiction?: string;           // ISO 3166-1 alpha-2
  minConfidenceTier?: ConfidenceTier;
  topK?: number;                   // Default 5
  minScore?: number;               // Cosine similarity threshold, default 0.72
}

export interface RAGChunk {
  document: KBDocument;
  score: number;                   // Cosine similarity 0–1
}

export interface RAGRetrievalResult {
  chunks: RAGChunk[];
  retrievedAt: string;
  queryEmbeddingMs: number;
  searchMs: number;
}

// ─── Breed Registry Entry ────────────────────────────────────────────────────

export interface BreedProfile {
  id: string;                      // snake_case, e.g. "golden_retriever"
  canonicalName: string;
  aliases: string[];               // Common alternate names
  species: "dog" | "cat";
  groupCategory: string;           // e.g. "Sporting", "Herding", "Domestic Shorthair"
  sizeCategory?: "toy" | "small" | "medium" | "large" | "giant"; // dogs only
  coatTypes: string[];
  typicalWeightKgRange: [number, number];
  typicalLifespanYears: [number, number];
  commonHealthConditions: string[];// Plain English, no diagnosis claims
  energyLevel: 1 | 2 | 3 | 4 | 5;
  groomingDemand: 1 | 2 | 3 | 4 | 5;
  bannedIn: string[];              // ISO country codes where restricted/banned
  requiresRegistrationIn: string[];
  sourceId: DataSourceId;
}

// ─── Symptom Triage Rule ─────────────────────────────────────────────────────

export interface SymptomTriageRule {
  id: string;
  symptom: string;                 // Plain English, max 60 chars
  species: Species;
  urgency: UrgencyLevel;
  redFlags: string[];              // Additional signals that escalate urgency
  ownerGuidance: string;           // Short, no medication advice
  sourceId: DataSourceId;
  /** If true, this rule CANNOT be overridden by low AI confidence — always shown */
  hardcoded: boolean;
}

// ─── Toxic Substance Entry ───────────────────────────────────────────────────

export interface ToxicSubstance {
  id: string;
  name: string;
  aliases: string[];
  species: Species;
  toxicityLevel: "mild" | "moderate" | "severe" | "potentially_fatal";
  category: "food" | "plant" | "medication" | "chemical" | "household";
  symptoms: string[];              // Plain English, no medical jargon
  immediateAction: string;         // Always: "Contact vet or ASPCA poison control"
  sourceId: DataSourceId;
}
