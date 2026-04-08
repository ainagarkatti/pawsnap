/**
 * History tab — all scans across all pets, newest first
 */

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../../lib/store";
import type { ScanResult } from "../../lib/types";

const BRAND = "#FF6B35";

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state } = useStore();

  // Flatten all scans, attach petName, sort newest first
  const allScans: (ScanResult & { petName: string; petEmoji: string })[] =
    Object.entries(state.scans)
      .flatMap(([petId, scans]) => {
        const pet = state.pets.find(p => p.id === petId);
        return scans.map(s => ({
          ...s,
          petName: pet?.name ?? "Unknown",
          petEmoji: pet?.species === "cat" ? "🐱" : "🐶",
        }));
      })
      .sort(
        (a, b) =>
          new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
      );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.heading}>History</Text>

      {allScans.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No scans yet</Text>
          <Text style={styles.emptyBody}>
            Your wellness scan history will appear here.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push("/(tabs)")}
          >
            <Text style={styles.emptyBtnText}>Take your first snap</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={allScans}
          keyExtractor={s => s.scanId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <HistoryRow
              scan={item}
              petName={item.petName}
              petEmoji={item.petEmoji}
              onPress={() => router.push(`/snap/${item.scanId}`)}
            />
          )}
        />
      )}
    </View>
  );
}

function HistoryRow({
  scan,
  petName,
  petEmoji,
  onPress,
}: {
  scan: ScanResult;
  petName: string;
  petEmoji: string;
  onPress: () => void;
}) {
  const hasEmergency = !!scan.emergencyAlert;
  const hasConsultVet = scan.healthSignals.some(
    s => s.signalStatus === "consult_vet"
  );
  const hasMonitor = scan.healthSignals.some(
    s => s.signalStatus === "needs_monitoring"
  );

  const badge = hasEmergency
    ? { label: "Emergency", color: "#DC2626" }
    : hasConsultVet
    ? { label: "See vet", color: "#EF4444" }
    : hasMonitor
    ? { label: "Monitor", color: "#F59E0B" }
    : { label: "All clear", color: "#10B981" };

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.rowEmoji}>{petEmoji}</Text>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.petName}>{petName}</Text>
          <Text style={styles.date}>
            {new Date(scan.capturedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </Text>
        </View>
        <Text style={styles.summary} numberOfLines={2}>
          {scan.overallSummary}
        </Text>
        <View style={[styles.badge, { backgroundColor: badge.color + "22" }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>
            {badge.label}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  heading: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  list: { paddingHorizontal: 20, gap: 10, paddingBottom: 24 },
  row: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  rowEmoji: { fontSize: 28, marginTop: 2 },
  rowBody: { flex: 1, gap: 5 },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  petName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  date: { fontSize: 12, color: "#9CA3AF" },
  summary: { fontSize: 13, color: "#6B7280", lineHeight: 18 },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  emptyBody: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginTop: 8,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
