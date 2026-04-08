/**
 * PawSnap Banned / Restricted Breed Registry
 *
 * Sources:
 *   - UK: Dangerous Dogs Act 1991 (amended 2014) — uk_dda_1991
 *   - UAE: Federal Law No. 22/2016 + Dubai & Abu Dhabi municipal bylaws — uae_municipal_law
 *   - Australia: State Prohibited Dog Declarations — au_biosecurity
 *   - Canada: Ontario DOLA (2005) and municipal bylaws — ca_provincial
 *   - US: No federal ban; city/county MSL varies — not modelled at national level
 *
 * LEGAL DISCLAIMER REQUIREMENT:
 *   Any UI surface showing banned breed data MUST display:
 *   "Laws change. Always verify current regulations with local authorities
 *    before acquiring or travelling with a pet."
 *
 * Last verified: 2026-03
 */

export interface BannedBreedRule {
  breedId: string;
  canonicalName: string;
  jurisdiction: string;            // ISO 3166-1 alpha-2 or ISO 3166-2 for subdivisions
  jurisdictionLabel: string;
  status: "banned" | "restricted"; // banned = prohibited possession; restricted = requires registration/muzzle
  notes: string;
  sourceId: string;
  lastVerified: string;            // ISO 8601
}

export const BANNED_BREED_RULES: BannedBreedRule[] = [
  // ── United Kingdom (uk_dda_1991) ─────────────────────────────────────────
  {
    breedId: "pit_bull_terrier",
    canonicalName: "Pit Bull Terrier",
    jurisdiction: "GB",
    jurisdictionLabel: "United Kingdom",
    status: "banned",
    notes: "Banned under Dangerous Dogs Act 1991. Index offence to own, breed, sell, or give away.",
    sourceId: "uk_dda_1991",
    lastVerified: "2026-01-01",
  },
  {
    breedId: "japanese_tosa",
    canonicalName: "Japanese Tosa",
    jurisdiction: "GB",
    jurisdictionLabel: "United Kingdom",
    status: "banned",
    notes: "Banned under Dangerous Dogs Act 1991.",
    sourceId: "uk_dda_1991",
    lastVerified: "2026-01-01",
  },
  {
    breedId: "dogo_argentino",
    canonicalName: "Dogo Argentino",
    jurisdiction: "GB",
    jurisdictionLabel: "United Kingdom",
    status: "banned",
    notes: "Banned under Dangerous Dogs Act 1991.",
    sourceId: "uk_dda_1991",
    lastVerified: "2026-01-01",
  },
  {
    breedId: "fila_brasileiro",
    canonicalName: "Fila Brasileiro",
    jurisdiction: "GB",
    jurisdictionLabel: "United Kingdom",
    status: "banned",
    notes: "Banned under Dangerous Dogs Act 1991.",
    sourceId: "uk_dda_1991",
    lastVerified: "2026-01-01",
  },
  {
    breedId: "xl_bully",
    canonicalName: "XL Bully",
    jurisdiction: "GB",
    jurisdictionLabel: "United Kingdom",
    status: "banned",
    notes: "Added to UK banned list February 2024. Exempted dogs require registration, neutering, microchip, and muzzle in public.",
    sourceId: "uk_dda_1991",
    lastVerified: "2026-01-01",
  },

  // ── UAE (uae_municipal_law) ───────────────────────────────────────────────
  {
    breedId: "pit_bull_terrier",
    canonicalName: "Pit Bull Terrier",
    jurisdiction: "AE",
    jurisdictionLabel: "United Arab Emirates",
    status: "banned",
    notes: "Prohibited in all UAE emirates under Federal Law No. 22/2016.",
    sourceId: "uae_municipal_law",
    lastVerified: "2026-01-01",
  },
  {
    breedId: "rottweiler",
    canonicalName: "Rottweiler",
    jurisdiction: "AE",
    jurisdictionLabel: "United Arab Emirates",
    status: "restricted",
    notes: "Restricted in Dubai and Abu Dhabi; requires municipal permit, muzzle in public, and liability insurance.",
    sourceId: "uae_municipal_law",
    lastVerified: "2026-01-01",
  },
  {
    breedId: "dobermann",
    canonicalName: "Dobermann",
    jurisdiction: "AE",
    jurisdictionLabel: "United Arab Emirates",
    status: "restricted",
    notes: "Restricted in some UAE emirates; requires permit.",
    sourceId: "uae_municipal_law",
    lastVerified: "2026-01-01",
  },
  {
    breedId: "wolf_hybrid",
    canonicalName: "Wolf Hybrid / Wolfdog",
    jurisdiction: "AE",
    jurisdictionLabel: "United Arab Emirates",
    status: "banned",
    notes: "Banned as a wild animal hybrid under UAE federal law.",
    sourceId: "uae_municipal_law",
    lastVerified: "2026-01-01",
  },

  // ── Australia (au_biosecurity) ────────────────────────────────────────────
  {
    breedId: "pit_bull_terrier",
    canonicalName: "Pit Bull Terrier",
    jurisdiction: "AU",
    jurisdictionLabel: "Australia",
    status: "banned",
    notes: "Declared dangerous in all states. Import prohibited. Existing dogs may be subject to destruction orders.",
    sourceId: "au_biosecurity",
    lastVerified: "2026-01-01",
  },
  {
    breedId: "japanese_tosa",
    canonicalName: "Japanese Tosa",
    jurisdiction: "AU",
    jurisdictionLabel: "Australia",
    status: "banned",
    notes: "Prohibited import and restricted ownership across Australian states.",
    sourceId: "au_biosecurity",
    lastVerified: "2026-01-01",
  },
  {
    breedId: "fila_brasileiro",
    canonicalName: "Fila Brasileiro",
    jurisdiction: "AU",
    jurisdictionLabel: "Australia",
    status: "banned",
    notes: "Prohibited import and restricted ownership across Australian states.",
    sourceId: "au_biosecurity",
    lastVerified: "2026-01-01",
  },
  {
    breedId: "dogo_argentino",
    canonicalName: "Dogo Argentino",
    jurisdiction: "AU",
    jurisdictionLabel: "Australia",
    status: "banned",
    notes: "Prohibited import across Australian states.",
    sourceId: "au_biosecurity",
    lastVerified: "2026-01-01",
  },
  {
    breedId: "perro_de_presa_canario",
    canonicalName: "Perro de Presa Canario",
    jurisdiction: "AU",
    jurisdictionLabel: "Australia",
    status: "banned",
    notes: "Prohibited import and restricted ownership across Australian states.",
    sourceId: "au_biosecurity",
    lastVerified: "2026-01-01",
  },

  // ── Canada — Ontario (ca_provincial) ─────────────────────────────────────
  {
    breedId: "pit_bull_terrier",
    canonicalName: "Pit Bull Terrier",
    jurisdiction: "CA-ON",
    jurisdictionLabel: "Canada — Ontario",
    status: "banned",
    notes: "Banned under Ontario Dog Owners' Liability Act (DOLA) 2005. Includes American Pit Bull Terrier, American Staffordshire Terrier, Staffordshire Bull Terrier, and substantially similar dogs.",
    sourceId: "ca_provincial",
    lastVerified: "2026-01-01",
  },
];

/**
 * Look up breed restrictions for a given jurisdiction.
 * Pass ISO 3166-1 alpha-2 country code (e.g. "GB", "AE", "AU")
 * or ISO 3166-2 subdivision code (e.g. "CA-ON").
 */
export function getBannedBreedsByJurisdiction(
  breedId: string,
  jurisdiction: string
): BannedBreedRule[] {
  const normalized = jurisdiction.toUpperCase();
  return BANNED_BREED_RULES.filter(
    rule =>
      rule.breedId === breedId &&
      (rule.jurisdiction === normalized ||
        // Match country-level rules for sub-national queries
        normalized.startsWith(rule.jurisdiction + "-"))
  );
}

/**
 * Check if a breed is restricted in any of the Phase 1 markets.
 */
export const PHASE_1_JURISDICTIONS = ["US", "GB", "AE", "AU", "CA"];

export function getBreedRestrictions(breedId: string): BannedBreedRule[] {
  return BANNED_BREED_RULES.filter(r => r.breedId === breedId);
}
