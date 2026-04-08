/**
 * PawSnap Toxic Substance Registry — Seed Data
 *
 * Source: ASPCA Animal Poison Control Center
 * https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants
 *
 * RULES:
 * - ownerGuidance/immediateAction MUST NOT recommend inducing vomiting,
 *   administering any substance, or give dosing instructions of any kind.
 * - Always direct to vet or ASPCA Poison Control (888-426-4435).
 * - Symptoms listed are for information only — never presented as a diagnosis.
 */

import type { ToxicSubstance } from "../types";

export const TOXIC_SUBSTANCES: ToxicSubstance[] = [
  // ── FOODS ────────────────────────────────────────────────────────────────

  {
    id: "tox_food_001",
    name: "Chocolate",
    aliases: ["cocoa", "cacao", "dark chocolate", "baking chocolate"],
    species: "both",
    toxicityLevel: "severe",
    category: "food",
    symptoms: ["vomiting", "diarrhoea", "restlessness", "muscle tremors", "seizures", "rapid heart rate"],
    immediateAction: "Contact your vet or ASPCA Poison Control (888-426-4435) immediately. Do not wait for symptoms.",
    sourceId: "aspca",
  },
  {
    id: "tox_food_002",
    name: "Grapes and Raisins",
    aliases: ["currants", "sultanas", "dried grapes"],
    species: "dog",
    toxicityLevel: "potentially_fatal",
    category: "food",
    symptoms: ["vomiting", "lethargy", "loss of appetite", "abdominal pain", "decreased urination"],
    immediateAction: "This can cause sudden kidney failure. Contact your vet or ASPCA Poison Control (888-426-4435) immediately.",
    sourceId: "aspca",
  },
  {
    id: "tox_food_003",
    name: "Xylitol",
    aliases: ["birch sugar", "sugar alcohol", "sugar-free sweetener"],
    species: "dog",
    toxicityLevel: "potentially_fatal",
    category: "food",
    symptoms: ["vomiting", "lethargy", "loss of coordination", "seizures", "jaundice"],
    immediateAction: "Found in sugar-free gum, peanut butter, and some baked goods. Contact vet or ASPCA Poison Control immediately.",
    sourceId: "aspca",
  },
  {
    id: "tox_food_004",
    name: "Onions, Garlic, Chives, Leeks",
    aliases: ["onion powder", "garlic powder", "shallots"],
    species: "both",
    toxicityLevel: "severe",
    category: "food",
    symptoms: ["vomiting", "lethargy", "pale gums", "reduced appetite", "red or brown urine"],
    immediateAction: "Toxic in all forms — raw, cooked, powdered. Contact your vet if more than trace amounts were eaten.",
    sourceId: "aspca",
  },
  {
    id: "tox_food_005",
    name: "Macadamia Nuts",
    aliases: ["macadamia"],
    species: "dog",
    toxicityLevel: "moderate",
    category: "food",
    symptoms: ["weakness", "vomiting", "tremors", "hyperthermia", "lethargy"],
    immediateAction: "Contact your vet. Symptoms usually develop within 12 hours.",
    sourceId: "aspca",
  },
  {
    id: "tox_food_006",
    name: "Alcohol",
    aliases: ["ethanol", "beer", "wine", "spirits"],
    species: "both",
    toxicityLevel: "severe",
    category: "food",
    symptoms: ["vomiting", "disorientation", "lethargy", "difficulty breathing", "low body temperature"],
    immediateAction: "Contact your vet or ASPCA Poison Control immediately.",
    sourceId: "aspca",
  },
  {
    id: "tox_food_007",
    name: "Caffeine",
    aliases: ["coffee", "tea", "energy drinks", "coffee grounds"],
    species: "both",
    toxicityLevel: "severe",
    category: "food",
    symptoms: ["restlessness", "rapid breathing", "muscle tremors", "seizures", "rapid heart rate"],
    immediateAction: "Contact your vet or ASPCA Poison Control immediately.",
    sourceId: "aspca",
  },
  {
    id: "tox_food_008",
    name: "Raw Yeast Dough",
    aliases: ["bread dough", "pizza dough"],
    species: "both",
    toxicityLevel: "severe",
    category: "food",
    symptoms: ["bloating", "vomiting", "disorientation", "difficulty breathing"],
    immediateAction: "Dough expands in the stomach and ferments. Contact your vet immediately.",
    sourceId: "aspca",
  },

  // ── PLANTS ───────────────────────────────────────────────────────────────

  {
    id: "tox_plant_001",
    name: "Lilies (true lilies)",
    aliases: ["Easter lily", "Tiger lily", "Asiatic lily", "Day lily", "Stargazer lily"],
    species: "cat",
    toxicityLevel: "potentially_fatal",
    category: "plant",
    symptoms: ["vomiting", "lethargy", "loss of appetite", "kidney failure within 24–72h"],
    immediateAction: "Even small amounts can cause fatal kidney failure in cats. Emergency vet visit required immediately.",
    sourceId: "aspca",
  },
  {
    id: "tox_plant_002",
    name: "Sago Palm",
    aliases: ["cycad", "Cycas revoluta", "Zamia"],
    species: "both",
    toxicityLevel: "potentially_fatal",
    category: "plant",
    symptoms: ["vomiting", "diarrhoea", "jaundice", "increased thirst", "liver failure"],
    immediateAction: "All parts are toxic, especially seeds. Contact your vet or ASPCA Poison Control immediately.",
    sourceId: "aspca",
  },
  {
    id: "tox_plant_003",
    name: "Tulip bulbs",
    aliases: ["tulip", "hyacinth bulb"],
    species: "both",
    toxicityLevel: "moderate",
    category: "plant",
    symptoms: ["intense gastrointestinal irritation", "drooling", "loss of appetite", "depression", "convulsions"],
    immediateAction: "Contact your vet if your pet has chewed on tulip bulbs.",
    sourceId: "aspca",
  },
  {
    id: "tox_plant_004",
    name: "Azalea / Rhododendron",
    aliases: ["azalea", "rhododendron"],
    species: "both",
    toxicityLevel: "severe",
    category: "plant",
    symptoms: ["vomiting", "diarrhoea", "drooling", "weakness", "potentially coma"],
    immediateAction: "Contact your vet or ASPCA Poison Control immediately.",
    sourceId: "aspca",
  },

  // ── MEDICATIONS (human medications toxic to pets) ─────────────────────────

  {
    id: "tox_med_001",
    name: "Ibuprofen",
    aliases: ["Advil", "Nurofen", "ibuprofen"],
    species: "both",
    toxicityLevel: "potentially_fatal",
    category: "medication",
    symptoms: ["vomiting", "diarrhoea", "stomach ulcers", "kidney failure"],
    immediateAction: "Never give human pain medications to pets. If ingested, contact your vet or ASPCA Poison Control immediately.",
    sourceId: "aspca",
  },
  {
    id: "tox_med_002",
    name: "Paracetamol / Acetaminophen",
    aliases: ["Tylenol", "paracetamol", "acetaminophen", "Panadol"],
    species: "cat",
    toxicityLevel: "potentially_fatal",
    category: "medication",
    symptoms: ["facial swelling", "difficulty breathing", "brown gums", "lethargy"],
    immediateAction: "Extremely dangerous for cats. Contact your vet or ASPCA Poison Control immediately.",
    sourceId: "aspca",
  },
  {
    id: "tox_med_003",
    name: "Permethrin",
    aliases: ["permethrin", "some flea treatments for dogs"],
    species: "cat",
    toxicityLevel: "potentially_fatal",
    category: "medication",
    symptoms: ["tremors", "seizures", "hypersalivation", "difficulty walking"],
    immediateAction: "Never use dog flea products on cats. If exposed, contact your vet or ASPCA Poison Control immediately.",
    sourceId: "aspca",
  },

  // ── HOUSEHOLD CHEMICALS ───────────────────────────────────────────────────

  {
    id: "tox_chem_001",
    name: "Antifreeze / Ethylene Glycol",
    aliases: ["antifreeze", "coolant", "ethylene glycol"],
    species: "both",
    toxicityLevel: "potentially_fatal",
    category: "chemical",
    symptoms: ["apparent intoxication", "vomiting", "excessive thirst", "lethargy", "seizures"],
    immediateAction: "Acts fast. Contact your vet or emergency vet immediately — time is critical.",
    sourceId: "aspca",
  },
  {
    id: "tox_chem_002",
    name: "Rat / Mouse Poison (rodenticides)",
    aliases: ["rat poison", "mouse poison", "rodenticide", "bromadiolone", "brodifacoum"],
    species: "both",
    toxicityLevel: "potentially_fatal",
    category: "chemical",
    symptoms: ["bleeding", "bruising", "lethargy", "difficulty breathing", "pale gums"],
    immediateAction: "Contact your vet or ASPCA Poison Control immediately. Bring the product packaging.",
    sourceId: "aspca",
  },
];

/**
 * Returns all potentially_fatal toxin entries.
 * Used to populate quick-reference danger list in UI.
 */
export function getCriticalToxins(): ToxicSubstance[] {
  return TOXIC_SUBSTANCES.filter(t => t.toxicityLevel === "potentially_fatal");
}

export function getToxinByName(name: string): ToxicSubstance | undefined {
  const normalized = name.toLowerCase();
  return TOXIC_SUBSTANCES.find(
    t =>
      t.name.toLowerCase().includes(normalized) ||
      t.aliases.some(a => a.toLowerCase().includes(normalized))
  );
}
