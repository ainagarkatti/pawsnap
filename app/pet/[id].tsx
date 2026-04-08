/**
 * Pet detail screen — /pet/:id
 * Shows pet profile, scan history, and quick-action buttons.
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../../lib/store";
import type { ScanResult } from "../../lib/types";

const BRAND = "#FF6B35";

export default function PetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, removePet, scansForPet } = useStore();

  const pet = state.pets.find(p => p.id === id);
  const scans = pet ? scansForPet(pet.id) : [];

  if (!pet) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Pet not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      `Remove ${pet.name}?`,
      "This will delete all scan history for this pet. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            removePet(pet.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 32 },
      ]}
    >
      {/* Avatar + name */}
      <View style={styles.heroCard}>
        <View style={styles.avatar}>
          {pet.photoUri ? (
            <Image source={{ uri: pet.photoUri }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarEmoji}>
              {pet.species === "dog" ? "🐶" : "🐱"}
            </Text>
          )}
        </View>
        <Text style={styles.petName}>{pet.name}</Text>
        <Text style={styles.petMeta}>
          {pet.breedName ?? (pet.species === "dog" ? "Dog" : "Cat")}
          {pet.birthYear
            ? ` · ${new Date().getFullYear() - pet.birthYear} yr old`
            : ""}
        </Text>

        {/* Quick actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push("/(tabs)")}
          >
            <Text style={styles.actionBtnText}>📷 New Snap</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scan history */}
      <Text style={styles.sectionTitle}>
        Scan History ({scans.length})
      </Text>

      {scans.length === 0 ? (
        <View style={styles.noScans}>
          <Text style={styles.noScansText}>
            No scans yet. Snap a photo to get your first wellness report.
          </Text>
        </View>
      ) : (
        scans.map(scan => (
          <ScanRow
            key={scan.scanId}
            scan={scan}
            onPress={() => router.push(`/snap/${scan.scanId}`)}
          />
        ))
      )}

      {/* Danger zone */}
      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <Text style={styles.deleteBtnText}>Remove {pet.name}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ScanRow({
  scan,
  onPress,
}: {
  scan: ScanResult;
  onPress: () => void;
}) {
  const hasEmergency = !!scan.emergencyAlert;
  const signalStatuses = scan.healthSignals.map(s => s.signalStatus);
  const hasConsultVet = signalStatuses.includes("consult_vet");
  const hasMonitor = signalStatuses.includes("needs_monitoring");

  const badge = hasEmergency
    ? { label: "Emergency", color: "#DC2626" }
    : hasConsultVet
    ? { label: "See vet", color: "#EF4444" }
    : hasMonitor
    ? { label: "Monitor", color: "#F59E0B" }
    : { label: "All clear", color: "#10B981" };

  return (
    <TouchableOpacity style={styles.scanRow} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.scanRowLeft}>
        <Text style={styles.scanDate}>
          {new Date(scan.capturedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </Text>
        <Text style={styles.scanSummary} numberOfLines={2}>
          {scan.overallSummary}
        </Text>
      </View>
      <View style={[styles.scanBadge, { backgroundColor: badge.color + "22" }]}>
        <Text style={[styles.scanBadgeText, { color: badge.color }]}>
          {badge.label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  content: { padding: 20, gap: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 16, color: "#6B7280" },
  link: { color: BRAND, fontWeight: "600" },

  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 4,
  },
  avatarImage: { width: 88, height: 88 },
  avatarEmoji: { fontSize: 44 },
  petName: { fontSize: 24, fontWeight: "800", color: "#111827" },
  petMeta: { fontSize: 14, color: "#6B7280" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  actionBtn: {
    backgroundColor: BRAND,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },

  noScans: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
  },
  noScansText: { fontSize: 14, color: "#9CA3AF", textAlign: "center", lineHeight: 20 },

  scanRow: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  scanRowLeft: { flex: 1, gap: 4 },
  scanDate: { fontSize: 12, color: "#9CA3AF", fontWeight: "600" },
  scanSummary: { fontSize: 13, color: "#374151", lineHeight: 18 },
  scanBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  scanBadgeText: { fontSize: 11, fontWeight: "700" },

  deleteBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    marginTop: 8,
  },
  deleteBtnText: { color: "#EF4444", fontWeight: "700" },
});
