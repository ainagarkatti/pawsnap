/**
 * PawSnap API client
 *
 * Thin wrapper around the /api/analyze and /api/symptoms endpoints.
 * In dev, points to the local Next.js server.
 * In production, BASE_URL = EXPO_PUBLIC_API_URL env var.
 */

import type { ScanResult, SymptomCheckResult, Species } from "./types";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

// ─── Auth ─────────────────────────────────────────────────────────────────────
// Token is injected via SecureStore in production. Mocked here for v1 dev.

let _authToken: string | null = "dev-token";

export function setAuthToken(token: string | null) {
  _authToken = token;
}

function authHeaders(): Record<string, string> {
  return _authToken
    ? { Authorization: `Bearer ${_authToken}` }
    : {};
}

// ─── analyze ─────────────────────────────────────────────────────────────────

export interface AnalyzeParams {
  imageBase64: string;
  imageMediaType: "image/jpeg" | "image/png" | "image/webp";
  petId: string;
  species: Species;
  reportedSymptoms?: string[];
  userContext?: string;
  userJurisdiction?: string;
}

export async function analyzePetPhoto(
  params: AnalyzeParams
): Promise<ScanResult> {
  const res = await fetch(`${BASE_URL}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({
      ...params,
      reportedSymptoms: params.reportedSymptoms ?? [],
      userContext: params.userContext ?? "",
      userJurisdiction: params.userJurisdiction ?? "US",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      err.error ?? "Analysis failed",
      res.status,
      err
    );
  }

  return res.json() as Promise<ScanResult>;
}

// ─── symptoms ─────────────────────────────────────────────────────────────────

export interface SymptomCheckParams {
  petId: string;
  species: Species;
  symptoms: string[];
  userContext?: string;
  petAgeYears?: number;
  breedId?: string;
}

export async function checkSymptoms(
  params: SymptomCheckParams
): Promise<SymptomCheckResult> {
  const res = await fetch(`${BASE_URL}/api/symptoms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({
      ...params,
      userContext: params.userContext ?? "",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      err.error ?? "Symptom check failed",
      res.status,
      err
    );
  }

  return res.json() as Promise<SymptomCheckResult>;
}

// ─── Error type ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isRateLimit() {
    return this.status === 429;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
}
