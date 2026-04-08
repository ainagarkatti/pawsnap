/**
 * PawSnap Symptom Triage Rules — Seed Data
 *
 * Source: WSAVA, AVMA, VCA Hospitals
 * Reviewed: PawSnap vet advisory team
 *
 * RULES:
 * - hardcoded: true rules are NEVER suppressed, regardless of AI confidence
 * - ownerGuidance MUST NOT contain medication names, dosages, or diagnostic claims
 * - New symptoms require vet-team sign-off before adding
 */

import type { SymptomTriageRule } from "../types";

export const SYMPTOM_TRIAGE_RULES: SymptomTriageRule[] = [
  // ── EMERGENCY (hardcoded — bypass AI output entirely) ──────────────────────

  {
    id: "triage_001",
    symptom: "Seizure or convulsions",
    species: "both",
    urgency: "EMERGENCY",
    redFlags: ["multiple seizures", "seizure lasting > 2 minutes", "not recovering"],
    ownerGuidance: "Keep your pet away from furniture and stairs. Do not restrain them. Go to an emergency vet immediately.",
    sourceId: "avma",
    hardcoded: true,
  },
  {
    id: "triage_002",
    symptom: "Difficulty breathing or laboured breathing",
    species: "both",
    urgency: "EMERGENCY",
    redFlags: ["blue or grey gums", "open-mouth breathing in cats", "neck extended to breathe"],
    ownerGuidance: "Keep your pet calm and still. Transport to an emergency vet immediately — do not wait.",
    sourceId: "avma",
    hardcoded: true,
  },
  {
    id: "triage_003",
    symptom: "Profuse or uncontrolled bleeding",
    species: "both",
    urgency: "EMERGENCY",
    redFlags: ["bleeding not slowing with firm pressure", "blood from mouth/nose/rectum"],
    ownerGuidance: "Apply gentle pressure with a clean cloth. Go to an emergency vet immediately.",
    sourceId: "avma",
    hardcoded: true,
  },
  {
    id: "triage_004",
    symptom: "Suspected poisoning or toxin ingestion",
    species: "both",
    urgency: "EMERGENCY",
    redFlags: ["known toxic food or plant ingested", "unexplained collapse", "vomiting + disorientation"],
    ownerGuidance: "Call ASPCA Poison Control (888-426-4435) or go to an emergency vet now. Bring the packaging if known.",
    sourceId: "aspca",
    hardcoded: true,
  },
  {
    id: "triage_005",
    symptom: "Sudden collapse or inability to stand",
    species: "both",
    urgency: "EMERGENCY",
    redFlags: ["pale gums", "unresponsive", "rapid shallow breathing"],
    ownerGuidance: "Keep your pet warm and still. Go to an emergency vet immediately.",
    sourceId: "avma",
    hardcoded: true,
  },
  {
    id: "triage_006",
    symptom: "Suspected broken bone or severe trauma",
    species: "both",
    urgency: "EMERGENCY",
    redFlags: ["hit by vehicle", "fall from height", "limb at abnormal angle"],
    ownerGuidance: "Support the body without bending the spine. Transport carefully to an emergency vet.",
    sourceId: "avma",
    hardcoded: true,
  },
  {
    id: "triage_007",
    symptom: "Bloated abdomen with retching (dogs)",
    species: "dog",
    urgency: "EMERGENCY",
    redFlags: ["distended belly", "unproductive retching", "restlessness", "drooling"],
    ownerGuidance: "This may be GDV (bloat) which is life-threatening. Go to an emergency vet immediately — do not wait.",
    sourceId: "avma",
    hardcoded: true,
  },
  {
    id: "triage_008",
    symptom: "Urinary obstruction or inability to urinate (cats)",
    species: "cat",
    urgency: "EMERGENCY",
    redFlags: ["straining without producing urine", "crying in litter box", "lethargy"],
    ownerGuidance: "This is a life-threatening emergency in male cats. Go to an emergency vet immediately.",
    sourceId: "avma",
    hardcoded: true,
  },
  {
    id: "triage_009",
    symptom: "Eye injury or sudden vision loss",
    species: "both",
    urgency: "EMERGENCY",
    redFlags: ["eye bulging or displaced", "cloudy eye after trauma", "squinting with discharge"],
    ownerGuidance: "Do not touch or flush the eye. Go to an emergency vet immediately.",
    sourceId: "avma",
    hardcoded: true,
  },
  {
    id: "triage_010",
    symptom: "Heatstroke (overheating)",
    species: "both",
    urgency: "EMERGENCY",
    redFlags: ["panting excessively", "bright red gums", "drooling", "staggering"],
    ownerGuidance: "Move to a cool area and apply cool (not ice cold) water to paws and belly. Go to an emergency vet immediately.",
    sourceId: "avma",
    hardcoded: true,
  },

  // ── VET TODAY ──────────────────────────────────────────────────────────────

  {
    id: "triage_020",
    symptom: "Vomiting more than 3 times in 24 hours",
    species: "both",
    urgency: "VET_TODAY",
    redFlags: ["blood in vomit", "also not eating", "also lethargic"],
    ownerGuidance: "Withhold food but offer small amounts of water. Book a same-day vet appointment.",
    sourceId: "vca_hospitals",
    hardcoded: false,
  },
  {
    id: "triage_021",
    symptom: "Not eating for more than 24 hours (cats) / 48 hours (dogs)",
    species: "both",
    urgency: "VET_TODAY",
    redFlags: ["also lethargic", "also hiding", "also vomiting"],
    ownerGuidance: "Prolonged inappetence can indicate illness, especially in cats. See a vet today.",
    sourceId: "vca_hospitals",
    hardcoded: false,
  },
  {
    id: "triage_022",
    symptom: "Severe diarrhoea or bloody stool",
    species: "both",
    urgency: "VET_TODAY",
    redFlags: ["blood in stool", "more than 5 episodes", "also vomiting"],
    ownerGuidance: "Ensure access to water. Book a same-day vet appointment and bring a stool sample if possible.",
    sourceId: "vca_hospitals",
    hardcoded: false,
  },
  {
    id: "triage_023",
    symptom: "Limping or sudden lameness",
    species: "both",
    urgency: "VET_TODAY",
    redFlags: ["non-weight-bearing", "swelling visible", "known trauma"],
    ownerGuidance: "Restrict activity. If your pet cannot bear weight at all, see a vet today.",
    sourceId: "vca_hospitals",
    hardcoded: false,
  },
  {
    id: "triage_024",
    symptom: "Pawing at face or eye",
    species: "both",
    urgency: "VET_TODAY",
    redFlags: ["discharge present", "squinting", "redness"],
    ownerGuidance: "Do not apply any eye drops unless prescribed. See a vet today to rule out corneal injury.",
    sourceId: "vca_hospitals",
    hardcoded: false,
  },

  // ── VET SOON (within 24–72h) ───────────────────────────────────────────────

  {
    id: "triage_030",
    symptom: "Excessive scratching or skin irritation",
    species: "both",
    urgency: "VET_SOON",
    redFlags: ["open sores", "hair loss", "skin odour"],
    ownerGuidance: "Check for fleas or visible skin changes. Book a vet appointment within 48–72 hours.",
    sourceId: "vca_hospitals",
    hardcoded: false,
  },
  {
    id: "triage_031",
    symptom: "Bad breath (halitosis)",
    species: "both",
    urgency: "VET_SOON",
    redFlags: ["sweet or fruity smell", "brown tartar visible", "reluctance to eat hard food"],
    ownerGuidance: "Dental disease is common and treatable. Book a dental check-up within the week.",
    sourceId: "vca_hospitals",
    hardcoded: false,
  },
  {
    id: "triage_032",
    symptom: "Increased thirst or urination",
    species: "both",
    urgency: "VET_SOON",
    redFlags: ["sudden onset", "also weight loss", "also lethargy"],
    ownerGuidance: "This can indicate kidney, thyroid, or endocrine conditions. Book a vet visit this week.",
    sourceId: "vca_hospitals",
    hardcoded: false,
  },
  {
    id: "triage_033",
    symptom: "Mild sneezing or nasal discharge",
    species: "both",
    urgency: "VET_SOON",
    redFlags: ["bloody discharge", "lasting > 5 days", "also eye discharge"],
    ownerGuidance: "Monitor for 48 hours. If symptoms persist or worsen, book a vet appointment.",
    sourceId: "vca_hospitals",
    hardcoded: false,
  },
  {
    id: "triage_034",
    symptom: "Weight loss without change in diet",
    species: "both",
    urgency: "VET_SOON",
    redFlags: ["more than 10% body weight", "also increased appetite", "also vomiting"],
    ownerGuidance: "Unexplained weight loss always warrants a vet check. Book within 3–5 days.",
    sourceId: "vca_hospitals",
    hardcoded: false,
  },

  // ── MONITOR (watch at home) ────────────────────────────────────────────────

  {
    id: "triage_040",
    symptom: "Single episode of vomiting",
    species: "both",
    urgency: "MONITOR",
    redFlags: ["blood present", "foreign object visible", "lethargy following"],
    ownerGuidance: "Withhold food for 2–4 hours then offer a small bland meal. Monitor closely for 24 hours. Contact a vet if it recurs.",
    sourceId: "vca_hospitals",
    hardcoded: false,
  },
  {
    id: "triage_041",
    symptom: "Soft stool or mild diarrhoea (1–2 episodes)",
    species: "both",
    urgency: "MONITOR",
    redFlags: ["blood present", "also vomiting", "puppy or kitten"],
    ownerGuidance: "Ensure fresh water is available. A bland diet for 24 hours may help. Monitor for 48 hours.",
    sourceId: "vca_hospitals",
    hardcoded: false,
  },
  {
    id: "triage_042",
    symptom: "Mild limping without known trauma",
    species: "both",
    urgency: "MONITOR",
    redFlags: ["gets worse", "swelling", "reluctance to move"],
    ownerGuidance: "Rest your pet and monitor for 24 hours. If limping persists or worsens, book a vet visit.",
    sourceId: "vca_hospitals",
    hardcoded: false,
  },
];

/**
 * Returns all EMERGENCY rules with hardcoded: true.
 * Used by the safety rail to check BEFORE any AI processing.
 */
export function getHardcodedEmergencyRules(): SymptomTriageRule[] {
  return SYMPTOM_TRIAGE_RULES.filter(r => r.hardcoded && r.urgency === "EMERGENCY");
}

/**
 * Match user-reported symptoms against triage rules.
 * Always returns the highest urgency found.
 */
export function triageSymptoms(
  symptoms: string[],
  species: "dog" | "cat"
): SymptomTriageRule[] {
  const symptomsLower = symptoms.map(s => s.toLowerCase());
  return SYMPTOM_TRIAGE_RULES.filter(rule => {
    const speciesMatch = rule.species === "both" || rule.species === species;
    if (!speciesMatch) return false;
    return symptomsLower.some(s =>
      rule.symptom.toLowerCase().includes(s) ||
      s.includes(rule.symptom.toLowerCase().split(" ")[0])
    );
  }).sort((a, b) => {
    const order: Record<string, number> = { EMERGENCY: 0, VET_TODAY: 1, VET_SOON: 2, MONITOR: 3 };
    return order[a.urgency] - order[b.urgency];
  });
}
