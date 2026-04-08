/**
 * PawSnap app store — React Context + AsyncStorage
 *
 * Manages: pet profiles, scan history (last 50 per pet), app tier.
 * All data is persisted to AsyncStorage and loaded on mount.
 *
 * Why not Redux/Zustand: scope is small — 3 entities, simple CRUD.
 * Add a proper store if multi-device sync is needed in v1.1.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
} from "react";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import type { Pet, ScanResult, SymptomCheckResult } from "./types";

// ─── Storage abstraction (native: expo-file-system, web: localStorage) ────────

const STORE_KEY = "pawsnap_store_v1";

async function readStore(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(STORE_KEY);
  }
  try {
    return await FileSystem.readAsStringAsync(
      FileSystem.documentDirectory + STORE_KEY + ".json"
    );
  } catch {
    return null;
  }
}

async function writeStore(data: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(STORE_KEY, data);
    return;
  }
  await FileSystem.writeAsStringAsync(
    FileSystem.documentDirectory + STORE_KEY + ".json",
    data
  );
}

function newId(): string {
  // crypto.randomUUID() is available in RN 0.73+ via JSI
  return (globalThis.crypto as Crypto).randomUUID();
}

// ─── State ────────────────────────────────────────────────────────────────────

interface AppState {
  pets: Pet[];
  scans: Record<string, ScanResult[]>;      // petId → scans[]
  symptomChecks: Record<string, SymptomCheckResult[]>;
  userTier: "free" | "pro" | "family";
  loaded: boolean;
}

const initialState: AppState = {
  pets: [],
  scans: {},
  symptomChecks: {},
  userTier: "free",
  loaded: false,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: "HYDRATE"; payload: Omit<AppState, "loaded"> }
  | { type: "ADD_PET"; payload: Pet }
  | { type: "UPDATE_PET"; payload: Pet }
  | { type: "REMOVE_PET"; payload: string }
  | { type: "ADD_SCAN"; payload: { petId: string; scan: ScanResult } }
  | { type: "ADD_SYMPTOM_CHECK"; payload: { petId: string; check: SymptomCheckResult } }
  | { type: "SET_TIER"; payload: "free" | "pro" | "family" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, ...action.payload, loaded: true };

    case "ADD_PET":
      return { ...state, pets: [...state.pets, action.payload] };

    case "UPDATE_PET":
      return {
        ...state,
        pets: state.pets.map(p =>
          p.id === action.payload.id ? action.payload : p
        ),
      };

    case "REMOVE_PET": {
      const { [action.payload]: _, ...restScans } = state.scans;
      const { [action.payload]: __, ...restChecks } = state.symptomChecks;
      return {
        ...state,
        pets: state.pets.filter(p => p.id !== action.payload),
        scans: restScans,
        symptomChecks: restChecks,
      };
    }

    case "ADD_SCAN": {
      const { petId, scan } = action.payload;
      const existing = state.scans[petId] ?? [];
      return {
        ...state,
        scans: {
          ...state.scans,
          [petId]: [scan, ...existing].slice(0, 50),
        },
      };
    }

    case "ADD_SYMPTOM_CHECK": {
      const { petId, check } = action.payload;
      const existing = state.symptomChecks[petId] ?? [];
      return {
        ...state,
        symptomChecks: {
          ...state.symptomChecks,
          [petId]: [check, ...existing].slice(0, 20),
        },
      };
    }

    case "SET_TIER":
      return { ...state, userTier: action.payload };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface StoreContextValue {
  state: AppState;
  addPet: (data: Omit<Pet, "id" | "createdAt">) => Pet;
  updatePet: (pet: Pet) => void;
  removePet: (id: string) => void;
  addScan: (petId: string, scan: ScanResult) => void;
  addSymptomCheck: (petId: string, check: SymptomCheckResult) => void;
  scansForPet: (petId: string) => ScanResult[];
  snapsUsedThisMonth: () => number;
  snapsRemaining: () => number;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const TIER_LIMITS = {
  free: 5,
  pro: Infinity,
  family: Infinity,
} as const;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const emptyStore: Omit<AppState, "loaded"> = {
    pets: [],
    scans: {},
    symptomChecks: {},
    userTier: "free",
  };

  // Hydrate from storage on mount
  useEffect(() => {
    readStore()
      .then(raw => {
        dispatch({ type: "HYDRATE", payload: raw ? JSON.parse(raw) : emptyStore });
      })
      .catch(() => {
        dispatch({ type: "HYDRATE", payload: emptyStore });
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist on every state change (after hydration)
  useEffect(() => {
    if (!state.loaded) return;
    const { loaded: _, ...toSave } = state;
    writeStore(JSON.stringify(toSave)).catch(() => {});
  }, [state]);

  const addPet = useCallback(
    (data: Omit<Pet, "id" | "createdAt">): Pet => {
      const pet: Pet = {
        ...data,
        id: newId(),
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: "ADD_PET", payload: pet });
      return pet;
    },
    []
  );

  const updatePet = useCallback((pet: Pet) => {
    dispatch({ type: "UPDATE_PET", payload: pet });
  }, []);

  const removePet = useCallback((id: string) => {
    dispatch({ type: "REMOVE_PET", payload: id });
  }, []);

  const addScan = useCallback((petId: string, scan: ScanResult) => {
    dispatch({ type: "ADD_SCAN", payload: { petId, scan } });
  }, []);

  const addSymptomCheck = useCallback(
    (petId: string, check: SymptomCheckResult) => {
      dispatch({ type: "ADD_SYMPTOM_CHECK", payload: { petId, check } });
    },
    []
  );

  const scansForPet = useCallback(
    (petId: string) => state.scans[petId] ?? [],
    [state.scans]
  );

  const snapsUsedThisMonth = useCallback(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    return Object.values(state.scans)
      .flat()
      .filter(s => s.capturedAt >= monthStart).length;
  }, [state.scans]);

  const snapsRemaining = useCallback(() => {
    const limit = TIER_LIMITS[state.userTier];
    if (limit === Infinity) return Infinity;
    return Math.max(0, limit - snapsUsedThisMonth());
  }, [state.userTier, snapsUsedThisMonth]);

  return (
    <StoreContext.Provider
      value={{
        state,
        addPet,
        updatePet,
        removePet,
        addScan,
        addSymptomCheck,
        scansForPet,
        snapsUsedThisMonth,
        snapsRemaining,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
