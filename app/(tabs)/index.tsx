/**
 * Snap tab — main screen
 *
 * Flow:
 *   1. User picks a pet (or is prompted to add one)
 *   2. Taps camera CTA → image picker opens
 *   3. Optional: add reported symptoms
 *   4. Submit → POST /api/analyze → navigate to results
 */

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from "react-native";
import { useState, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { useRouter } from "expo-router";

async function uriToBase64(uri: string): Promise<string> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../../lib/store";
import { analyzePetPhoto, ApiError } from "../../lib/api";
import type { Pet } from "../../lib/types";

const BRAND = "#FF6B35";

export default function SnapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, addScan, snapsRemaining } = useStore();

  const [selectedPetId, setSelectedPetId] = useState<string | null>(
    state.pets[0]?.id ?? null
  );
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const remaining = snapsRemaining();
  const selectedPet = state.pets.find(p => p.id === selectedPetId) ?? null;

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Allow photo access so PawSnap can analyse your pet's photo."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Allow camera access so you can take a photo of your pet."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!selectedPet || !imageUri) return;

    if (remaining === 0) {
      Alert.alert(
        "Monthly limit reached",
        "Upgrade to Pro for unlimited snaps.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Upgrade", onPress: () => router.push("/profile") },
        ]
      );
      return;
    }

    setLoading(true);
    try {
      // Resize to 1024px max for API efficiency
      const manipulated = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 1024 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );

      const base64 = await uriToBase64(manipulated.uri);

      const result = await analyzePetPhoto({
        imageBase64: base64,
        imageMediaType: "image/jpeg",
        petId: selectedPet.id,
        species: selectedPet.species,
        reportedSymptoms: symptoms,
      });

      addScan(selectedPet.id, result);
      setImageUri(null);
      setSymptoms([]);
      router.push(`/snap/${result.scanId}`);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.isRateLimit
            ? "Monthly scan limit reached. Upgrade to Pro for unlimited snaps."
            : err.message
          : "Something went wrong. Please try again.";
      Alert.alert("Analysis failed", msg);
    } finally {
      setLoading(false);
    }
  }, [selectedPet, imageUri, remaining, symptoms, addScan, router]);

  if (!state.loaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={BRAND} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <Text style={styles.heading}>PawSnap</Text>
      <Text style={styles.sub}>Snap a photo, get a wellness report</Text>

      {/* Snaps remaining badge */}
      {state.userTier === "free" && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {remaining} free snap{remaining !== 1 ? "s" : ""} remaining this month
          </Text>
        </View>
      )}

      {/* Pet selector */}
      {state.pets.length === 0 ? (
        <TouchableOpacity
          style={styles.addPetCta}
          onPress={() => router.push("/pet/new")}
        >
          <Text style={styles.addPetCtaText}>+ Add your first pet to get started</Text>
        </TouchableOpacity>
      ) : (
        <PetSelector
          pets={state.pets}
          selectedId={selectedPetId}
          onSelect={setSelectedPetId}
        />
      )}

      {/* Camera buttons */}
      {selectedPet && (
        <>
          {imageUri ? (
            <View style={styles.preview}>
              <Image
                source={{ uri: imageUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.changePhotoBtn}
                onPress={() => setImageUri(null)}
              >
                <Text style={styles.changePhotoBtnText}>Change photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cameraRow}>
              <TouchableOpacity
                style={[styles.cameraBtn, styles.cameraBtnPrimary]}
                onPress={takePhoto}
              >
                <Text style={styles.cameraBtnPrimaryText}>📷  Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cameraBtn} onPress={pickImage}>
                <Text style={styles.cameraBtnText}>🖼  Library</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Symptom chips */}
          <SymptomInput symptoms={symptoms} onChange={setSymptoms} />

          {/* Analyse button */}
          <TouchableOpacity
            style={[
              styles.analyzeBtn,
              (!imageUri || loading) && styles.analyzeBtnDisabled,
            ]}
            onPress={handleAnalyze}
            disabled={!imageUri || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.analyzeBtnText}>Analyse my pet</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

// ─── Pet Selector ─────────────────────────────────────────────────────────────

function PetSelector({
  pets,
  selectedId,
  onSelect,
}: {
  pets: Pet[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.petSelector}>
      <Text style={styles.sectionLabel}>Which pet?</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {pets.map(pet => (
          <TouchableOpacity
            key={pet.id}
            style={[
              styles.petChip,
              selectedId === pet.id && styles.petChipSelected,
            ]}
            onPress={() => onSelect(pet.id)}
          >
            <Text
              style={[
                styles.petChipText,
                selectedId === pet.id && styles.petChipTextSelected,
              ]}
            >
              {pet.species === "dog" ? "🐶" : "🐱"} {pet.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Symptom Input ────────────────────────────────────────────────────────────

const COMMON_SYMPTOMS = [
  "Lethargy",
  "Vomiting",
  "Not eating",
  "Scratching",
  "Limping",
  "Coughing",
  "Diarrhoea",
  "Eye discharge",
];

function SymptomInput({
  symptoms,
  onChange,
}: {
  symptoms: string[];
  onChange: (s: string[]) => void;
}) {
  const toggle = useCallback(
    (s: string) => {
      onChange(
        symptoms.includes(s) ? symptoms.filter(x => x !== s) : [...symptoms, s]
      );
    },
    [symptoms, onChange]
  );

  return (
    <View style={styles.symptomSection}>
      <Text style={styles.sectionLabel}>Any concerns? (optional)</Text>
      <View style={styles.symptomChips}>
        {COMMON_SYMPTOMS.map(s => (
          <TouchableOpacity
            key={s}
            style={[
              styles.symptomChip,
              symptoms.includes(s) && styles.symptomChipSelected,
            ]}
            onPress={() => toggle(s)}
          >
            <Text
              style={[
                styles.symptomChipText,
                symptoms.includes(s) && styles.symptomChipTextSelected,
              ]}
            >
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  content: { paddingHorizontal: 20, gap: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  heading: { fontSize: 28, fontWeight: "800", color: "#111827" },
  sub: { fontSize: 15, color: "#6B7280", marginTop: -12 },
  badge: {
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 13, color: "#92400E", fontWeight: "600" },
  addPetCta: {
    backgroundColor: BRAND,
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
  },
  addPetCtaText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  petSelector: { gap: 10 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#374151", textTransform: "uppercase", letterSpacing: 0.5 },
  petChip: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  petChipSelected: { borderColor: BRAND, backgroundColor: "#FFF5F2" },
  petChipText: { fontSize: 14, color: "#6B7280", fontWeight: "600" },
  petChipTextSelected: { color: BRAND },
  preview: { borderRadius: 16, overflow: "hidden", gap: 8 },
  previewImage: { width: "100%", height: 220, borderRadius: 16 },
  changePhotoBtn: { alignSelf: "flex-end" },
  changePhotoBtnText: { color: BRAND, fontWeight: "600" },
  cameraRow: { flexDirection: "row", gap: 12 },
  cameraBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  cameraBtnPrimary: { backgroundColor: BRAND, borderColor: BRAND },
  cameraBtnText: { fontWeight: "700", color: "#374151", fontSize: 15 },
  cameraBtnPrimaryText: { fontWeight: "700", color: "#fff", fontSize: 15 },
  symptomSection: { gap: 10 },
  symptomChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  symptomChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#F3F4F6",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  symptomChipSelected: { borderColor: BRAND, backgroundColor: "#FFF5F2" },
  symptomChipText: { fontSize: 13, color: "#6B7280", fontWeight: "600" },
  symptomChipTextSelected: { color: BRAND },
  analyzeBtn: {
    backgroundColor: BRAND,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
  },
  analyzeBtnDisabled: { opacity: 0.45 },
  analyzeBtnText: { color: "#fff", fontWeight: "800", fontSize: 17 },
});
