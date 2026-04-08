/**
 * Scan results screen — /snap/:scanId
 *
 * Looks up the scan from the store (already saved before navigation).
 * If emergencyAlert is triggered, emergency UI is shown first.
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../../lib/store";
import type { HealthSignal, ScanResult, SignalStatus } from "../../lib/types";

const BRAND = "#FF6B35";

export default function ScanResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state } = useStore();

  // Find scan across all pets
  const scan = Object.values(state.scans)
    .flat()
    .find(s => s.scanId === id);

  if (!scan) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Scan not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pet = state.pets.find(p => p.id === scan.petId);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 32 },
      ]}
    >
      {/* Emergency alert — always shown first if triggered */}
      {scan.emergencyAlert && (
        <EmergencyBanner
          reason={scan.emergencyAlert.reason}
          action={scan.emergencyAlert.immediateAction}
          poison={scan.emergencyAlert.aspca_poison_control}
        />
      )}

      {/* Image quality warning */}
      {!scan.imageQuality.imageUsable && (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Photo quality too low</Text>
          <Text style={styles.warningBody}>
            {scan.imageQuality.issues
              .map(humanizeIssue)
              .join(" · ")}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.retryBtnText}>Try again with a better photo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Pet + summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.petLabel}>
          {pet ? `${pet.species === "dog" ? "🐶" : "🐱"} ${pet.name}` : "Your pet"}
        </Text>
        <Text style={styles.summaryText}>{scan.overallSummary}</Text>
        <Text style={styles.timestamp}>
          {new Date(scan.capturedAt).toLocaleString()}
        </Text>
      </View>

      {/* Breed identification */}
      {scan.breedIdentification && (
        <BreedCard breed={scan.breedIdentification} />
      )}

      {/* Body condition score */}
      {scan.bodyConditionScore?.score !== null && (
        <BCSCard bcs={scan.bodyConditionScore} />
      )}

      {/* Health signals */}
      {scan.healthSignals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Signals</Text>
          {scan.healthSignals.map((sig, i) => (
            <SignalRow key={i} signal={sig} />
          ))}
        </View>
      )}

      {/* Disclaimer */}
      <View style={styles.disclaimerCard}>
        <Text style={styles.disclaimerText}>{scan.disclaimer}</Text>
      </View>

      {/* Done button */}
      <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
        <Text style={styles.doneBtnText}>Done</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Emergency Banner ─────────────────────────────────────────────────────────

function EmergencyBanner({
  reason,
  action,
  poison,
}: {
  reason: string;
  action: string;
  poison: string;
}) {
  return (
    <View style={styles.emergencyCard}>
      <Text style={styles.emergencyTitle}>⚠️ Possible Emergency</Text>
      <Text style={styles.emergencyReason}>{reason}</Text>
      <Text style={styles.emergencyAction}>{action}</Text>
      <TouchableOpacity
        style={styles.callBtn}
        onPress={() => Linking.openURL(`tel:${poison.replace(/-/g, "")}`)}
      >
        <Text style={styles.callBtnText}>📞 ASPCA Poison Control: {poison}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Breed Card ───────────────────────────────────────────────────────────────

function BreedCard({ breed }: { breed: ScanResult["breedIdentification"] }) {
  const confident = breed.confidence >= 0.7 && breed.primaryBreedName;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Breed</Text>
      {confident ? (
        <>
          <Text style={styles.breedName}>{breed.primaryBreedName}</Text>
          {breed.isMixedBreed && (
            <Text style={styles.cardMeta}>Mixed breed</Text>
          )}
          {breed.estimatedLifeStage && (
            <Text style={styles.cardMeta}>
              Life stage: {humanizeLifeStage(breed.estimatedLifeStage)}
            </Text>
          )}
          {breed.estimatedAgeRangeYears && (
            <Text style={styles.cardMeta}>
              Est. age: {breed.estimatedAgeRangeYears.min}–
              {breed.estimatedAgeRangeYears.max} years
            </Text>
          )}
        </>
      ) : (
        <Text style={styles.cardMeta}>
          {breed.uncertaintyReason ?? "Breed could not be determined from this photo."}
        </Text>
      )}
    </View>
  );
}

// ─── Body Condition Score Card ────────────────────────────────────────────────

function BCSCard({ bcs }: { bcs: ScanResult["bodyConditionScore"] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Body Condition Score</Text>
      {bcs.score !== null && bcs.label !== null ? (
        <>
          <View style={styles.bcsRow}>
            <Text style={styles.bcsScore}>{bcs.score}/9</Text>
            <Text style={styles.bcsLabel}>{humanizeBCS(bcs.label)}</Text>
          </View>
          {bcs.ownerGuidance && (
            <Text style={styles.cardMeta}>{bcs.ownerGuidance}</Text>
          )}
          {bcs.vetConsultRecommended && (
            <Text style={styles.vetNote}>💡 Vet consultation recommended</Text>
          )}
        </>
      ) : (
        <Text style={styles.cardMeta}>{bcs.ownerGuidance}</Text>
      )}
    </View>
  );
}

// ─── Health Signal Row ────────────────────────────────────────────────────────

function SignalRow({ signal }: { signal: HealthSignal }) {
  const { color, icon } = statusStyle(signal.signalStatus);
  return (
    <View style={styles.signalRow}>
      <Text style={[styles.signalIcon]}>{icon}</Text>
      <View style={styles.signalBody}>
        <Text style={styles.signalArea}>{humanizeArea(signal.area)}</Text>
        <Text style={styles.signalObs}>{signal.observation}</Text>
        {signal.ownerTip && (
          <Text style={styles.signalTip}>{signal.ownerTip}</Text>
        )}
      </View>
      <View style={[styles.signalBadge, { backgroundColor: color + "22" }]}>
        <Text style={[styles.signalBadgeText, { color }]}>
          {humanizeStatus(signal.signalStatus)}
        </Text>
      </View>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function humanizeArea(area: HealthSignal["area"]): string {
  const map: Record<HealthSignal["area"], string> = {
    coat_fur: "Coat & Fur",
    eyes: "Eyes",
    ears: "Ears",
    body_condition: "Body Condition",
    nose: "Nose",
    posture: "Posture",
    visible_skin: "Skin",
  };
  return map[area] ?? area;
}

function humanizeStatus(status: SignalStatus): string {
  const map: Record<SignalStatus, string> = {
    appears_normal: "Normal",
    needs_monitoring: "Monitor",
    consult_vet: "See Vet",
    insufficient_view: "Unclear",
  };
  return map[status] ?? status;
}

function statusStyle(status: SignalStatus): { color: string; icon: string } {
  switch (status) {
    case "appears_normal":
      return { color: "#10B981", icon: "✅" };
    case "needs_monitoring":
      return { color: "#F59E0B", icon: "👁" };
    case "consult_vet":
      return { color: "#EF4444", icon: "⚠️" };
    case "insufficient_view":
    default:
      return { color: "#9CA3AF", icon: "❓" };
  }
}

function humanizeBCS(label: string): string {
  return label
    .split("_")
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function humanizeLifeStage(stage: string): string {
  const map: Record<string, string> = {
    puppy_kitten: "Puppy / Kitten",
    junior: "Junior",
    adult: "Adult",
    mature: "Mature",
    senior: "Senior",
    geriatric: "Geriatric",
  };
  return map[stage] ?? stage;
}

function humanizeIssue(issue: string): string {
  return issue.replace(/_/g, " ");
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  content: { padding: 20, gap: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 16, color: "#6B7280" },
  link: { color: BRAND, fontWeight: "600" },

  emergencyCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    gap: 8,
  },
  emergencyTitle: { fontSize: 18, fontWeight: "800", color: "#DC2626" },
  emergencyReason: { fontSize: 14, color: "#7F1D1D", fontWeight: "600" },
  emergencyAction: { fontSize: 14, color: "#374151" },
  callBtn: {
    backgroundColor: "#DC2626",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  callBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  warningCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FCD34D",
    gap: 8,
  },
  warningTitle: { fontWeight: "700", color: "#92400E" },
  warningBody: { color: "#78350F", fontSize: 13 },
  retryBtn: {
    backgroundColor: "#F59E0B",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  retryBtnText: { color: "#fff", fontWeight: "700" },

  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  petLabel: { fontSize: 13, fontWeight: "700", color: BRAND },
  summaryText: { fontSize: 15, color: "#374151", lineHeight: 22 },
  timestamp: { fontSize: 11, color: "#9CA3AF" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 12, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5 },
  cardMeta: { fontSize: 14, color: "#6B7280" },
  breedName: { fontSize: 20, fontWeight: "700", color: "#111827" },
  bcsRow: { flexDirection: "row", alignItems: "baseline", gap: 10 },
  bcsScore: { fontSize: 28, fontWeight: "800", color: "#111827" },
  bcsLabel: { fontSize: 15, color: "#6B7280" },
  vetNote: { fontSize: 13, color: "#F59E0B", fontWeight: "600" },

  section: { gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  signalRow: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  signalIcon: { fontSize: 20, marginTop: 2 },
  signalBody: { flex: 1, gap: 3 },
  signalArea: { fontSize: 13, fontWeight: "700", color: "#374151" },
  signalObs: { fontSize: 13, color: "#6B7280", lineHeight: 18 },
  signalTip: { fontSize: 12, color: "#9CA3AF", fontStyle: "italic" },
  signalBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  signalBadgeText: { fontSize: 11, fontWeight: "700" },

  disclaimerCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  disclaimerText: { fontSize: 11, color: "#9CA3AF", lineHeight: 16 },

  doneBtn: {
    backgroundColor: BRAND,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
  },
  doneBtnText: { color: "#fff", fontWeight: "800", fontSize: 17 },
});
