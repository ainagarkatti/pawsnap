/**
 * PawSnap Safety Rails
 *
 * Hardcoded rules that override AI output — never delegated to the model.
 * These are product rules, not model constraints.
 *
 * Sources: AVMA Emergency Guidelines, ASPCA, Pet Poison Helpline
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type HealthFlag = 'green' | 'yellow' | 'red'
export type UrgencyLevel = 'monitor' | 'vet_soon' | 'emergency'

export interface SafetyCheckResult {
  triggered: boolean
  rule?: string
  urgency?: UrgencyLevel
  message?: string
  actionLabel?: string
  phoneNumbers?: EmergencyContact[]
  blockAIResponse: boolean  // if true, show this instead of AI output
}

export interface EmergencyContact {
  label: string
  number: string
  url?: string
  region?: string
}

export interface AnalysisOutput {
  breedName?: string
  breedConfidence?: number
  healthFlag?: HealthFlag
  healthSummary?: string
  recommendations?: string[]
  urgency?: UrgencyLevel
  disclaimer: string
}

// ─── Emergency Contacts ───────────────────────────────────────────────────────

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  { label: 'ASPCA Poison Control (US)',    number: '(888) 426-4435', region: 'US' },
  { label: 'Pet Poison Helpline (US/CA)',  number: '(855) 764-7661', region: 'US' },
  { label: 'Animal Poison Line (UK)',      number: '01202 509000',   region: 'GB' },
  { label: 'Animal Poisons Helpline (AU)', number: '1300 869 738',   region: 'AU' },
]

// ─── Emergency Keyword Triggers ───────────────────────────────────────────────
// Any user input matching these patterns immediately shows emergency screen
// — AI analysis is bypassed entirely

const EMERGENCY_PATTERNS: Array<{ pattern: RegExp; message: string; rule: string }> = [
  {
    pattern: /not\s+breathing|stopped\s+breathing|no\s+breath|can'?t\s+breathe|struggling\s+to\s+breathe|gasping/i,
    message: 'Your pet may be having difficulty breathing. This is a life-threatening emergency.',
    rule: 'BREATHING_EMERGENCY',
  },
  {
    pattern: /seizure|convuls|fitting|tremor|shaking\s+uncontrollably/i,
    message: 'Seizures require immediate veterinary attention.',
    rule: 'SEIZURE_EMERGENCY',
  },
  {
    pattern: /unconscious|unresponsive|collapsed|passed\s+out|won'?t\s+wake/i,
    message: 'Your pet is unresponsive. This is a medical emergency.',
    rule: 'UNRESPONSIVE_EMERGENCY',
  },
  {
    pattern: /bleeding\s+heavy|heavy\s+bleed|blood\s+everywhere|won'?t\s+stop\s+bleed|severe\s+bleed/i,
    message: 'Severe bleeding requires emergency veterinary care immediately.',
    rule: 'BLEEDING_EMERGENCY',
  },
  {
    pattern: /ate\s+poison|ate\s+chocolate|swallowed\s+(medication|medicine|pill|tablet)|ingested\s+(toxic|poison)/i,
    message: 'Possible poisoning. Contact an emergency vet or Pet Poison Helpline immediately. Do not induce vomiting unless directed by a vet.',
    rule: 'POISONING_EMERGENCY',
  },
  {
    pattern: /broken\s+bone|fracture|leg\s+(hanging|dragging|dangling)|compound\s+fracture/i,
    message: 'A suspected fracture requires emergency veterinary care.',
    rule: 'FRACTURE_EMERGENCY',
  },
  {
    pattern: /bloat|GDV|stomach\s+(twisted|bloated|distended)|distended\s+(belly|abdomen|stomach)/i,
    message: 'Suspected bloat (GDV) in dogs is life-threatening without immediate surgery. Go to an emergency vet now.',
    rule: 'GDV_EMERGENCY',
  },
  {
    pattern: /can'?t\s+urinate|straining\s+to\s+(urinate|pee|go)|no\s+urine|blocked\s+bladder|urinary\s+block/i,
    message: 'A urinary blockage, especially in cats, is life-threatening. Go to an emergency vet immediately.',
    rule: 'URINARY_BLOCK_EMERGENCY',
  },
  {
    pattern: /heatstroke|heat\s+stroke|overheating|hypertherm/i,
    message: 'Heatstroke is a medical emergency. Move your pet to a cool area, apply cool (not cold) water, and go to a vet immediately.',
    rule: 'HEATSTROKE_EMERGENCY',
  },
  {
    pattern: /eye\s+(popped|bulging\s+out|came\s+out|prolapsed)|proptosis/i,
    message: 'Eye prolapse is a veterinary emergency — go immediately.',
    rule: 'EYE_PROLAPSE_EMERGENCY',
  },
]

// ─── Forbidden Output Patterns ────────────────────────────────────────────────
// AI response is scanned for these — if found, the response is blocked and replaced

const FORBIDDEN_OUTPUT_PATTERNS: Array<{ pattern: RegExp; rule: string }> = [
  { pattern: /\b(amoxicillin|metronidazole|prednisone|prednisolone|gabapentin|meloxicam|carprofen|rimadyl|apoquel|cytopoint|bravecto|nexgard|heartgard|interceptor)\b/i, rule: 'PRESCRIPTION_MEDICATION_NAMED' },
  { pattern: /\b(\d+\s*mg|\d+\s*ml|\d+\s*dose|\d+\s*tablet|\d+\s*cc)\b/i, rule: 'DOSAGE_SPECIFIED' },
  { pattern: /you\s+can\s+(give|use|administer|apply)\s+\w+\s+(to|for|on)\s+(your\s+)?(dog|cat|pet)/i, rule: 'MEDICATION_INSTRUCTION' },
  { pattern: /this\s+is\s+(definitely|certainly|definitely|100%|guaranteed)\s+(a\s+)?(diagnosis|condition|disease)/i, rule: 'DEFINITIVE_DIAGNOSIS_CLAIM' },
  { pattern: /no\s+need\s+to\s+(see\s+a\s+vet|go\s+to\s+the\s+vet|visit\s+a\s+vet)/i, rule: 'VET_DISCOURAGED' },
]

// ─── Confidence Thresholds ────────────────────────────────────────────────────

export const CONFIDENCE_THRESHOLDS = {
  breed_id: {
    show_result: 0.70,       // below this → "unable to determine breed"
    high_confidence: 0.90,   // above this → show breed name with confidence
  },
  health_scan: {
    show_result: 0.75,       // below this → "recommend in-person vet check"
    flag_green: 0.85,        // only show green flag if high confidence
  },
  symptom_check: {
    show_result: 0.65,       // lower threshold — better to show something
    escalate_to_vet: 0.50,   // if unsure, default to vet_soon
  },
} as const

// ─── Legal Disclaimer ─────────────────────────────────────────────────────────

export const STANDARD_DISCLAIMER =
  'PawSnap provides wellness suggestions only. This is not a veterinary diagnosis or medical advice. ' +
  'Always consult a licensed veterinarian for your pet\'s health concerns.'

export const PHOTO_SCAN_DISCLAIMER =
  'This health scan is based on visual cues only and may be affected by photo quality, ' +
  'lighting, and breed variation. It is not a clinical examination. When in doubt, see your vet.'

// ─── Core Safety Functions ────────────────────────────────────────────────────

/**
 * checkEmergency — run BEFORE any AI analysis.
 * If triggered, show emergency screen and skip AI entirely.
 */
export function checkEmergency(userInput: string): SafetyCheckResult {
  const normalised = userInput.trim().toLowerCase()

  for (const { pattern, message, rule } of EMERGENCY_PATTERNS) {
    if (pattern.test(normalised)) {
      return {
        triggered: true,
        rule,
        urgency: 'emergency',
        message,
        actionLabel: 'Find Emergency Vet Now',
        phoneNumbers: EMERGENCY_CONTACTS,
        blockAIResponse: true,
      }
    }
  }

  return { triggered: false, blockAIResponse: false }
}

/**
 * scanAIOutput — run AFTER AI generates a response.
 * Blocks and replaces any output that violates safety rules.
 */
export function scanAIOutput(aiText: string): SafetyCheckResult {
  for (const { pattern, rule } of FORBIDDEN_OUTPUT_PATTERNS) {
    if (pattern.test(aiText)) {
      return {
        triggered: true,
        rule,
        urgency: 'vet_soon',
        message:
          'For specific treatment advice, medication, or dosage information, ' +
          'please consult your veterinarian directly.',
        actionLabel: 'Find a Vet',
        blockAIResponse: true,
      }
    }
  }

  return { triggered: false, blockAIResponse: false }
}

/**
 * enforceConfidenceThreshold — gates what the UI shows based on confidence score.
 */
export function enforceConfidenceThreshold(
  analysisType: keyof typeof CONFIDENCE_THRESHOLDS,
  confidence: number
): { show: boolean; fallbackMessage: string } {
  const threshold = CONFIDENCE_THRESHOLDS[analysisType].show_result

  if (confidence < threshold) {
    const messages: Record<keyof typeof CONFIDENCE_THRESHOLDS, string> = {
      breed_id:
        'Breed could not be determined from this photo. ' +
        'Try a well-lit photo showing your pet\'s full face and body.',
      health_scan:
        'Photo quality or angle is insufficient for a reliable health scan. ' +
        'For any health concerns, please consult your vet.',
      symptom_check:
        'Not enough information to assess this symptom reliably. ' +
        'Please describe the symptom in more detail or consult your vet.',
    }

    return { show: false, fallbackMessage: messages[analysisType] }
  }

  return { show: true, fallbackMessage: '' }
}

/**
 * sanitiseAnalysisOutput — final check before sending to client.
 * Strips any field that could constitute a medical diagnosis.
 */
export function sanitiseAnalysisOutput(raw: Partial<AnalysisOutput>): AnalysisOutput {
  return {
    breedName:       raw.breedName,
    breedConfidence: raw.breedConfidence,
    healthFlag:      raw.healthFlag,
    healthSummary:   raw.healthSummary,
    recommendations: raw.recommendations?.slice(0, 3), // max 3 recommendations
    urgency:         raw.urgency ?? 'monitor',
    // disclaimer is always overwritten — never trust the model to write it
    disclaimer:      STANDARD_DISCLAIMER,
  }
}

/**
 * buildHealthFlag — maps confidence + urgency to a traffic-light flag.
 * The UI only ever shows green/yellow/red — never a raw diagnosis.
 */
export function buildHealthFlag(
  urgency: UrgencyLevel,
  confidence: number
): HealthFlag {
  // Low confidence always downgrades to yellow — never report green if unsure
  if (confidence < CONFIDENCE_THRESHOLDS.health_scan.flag_green) return 'yellow'

  switch (urgency) {
    case 'emergency': return 'red'
    case 'vet_soon':  return 'yellow'
    case 'monitor':   return 'green'
  }
}
