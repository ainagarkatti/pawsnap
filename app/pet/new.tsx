/**
 * Add new pet modal — /pet/new
 */

import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { useState, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../../lib/store";
import type { Species } from "../../lib/types";

const BRAND = "#FF6B35";

export default function NewPetScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addPet } = useStore();

  const [name, setName] = useState("");
  const [species, setSpecies] = useState<Species>("dog");
  const [breedName, setBreedName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const pickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  const handleSave = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Name required", "Give your pet a name.");
      return;
    }
    const year = birthYear ? parseInt(birthYear, 10) : null;
    if (birthYear && (isNaN(year!) || year! < 1990 || year! > new Date().getFullYear())) {
      Alert.alert("Invalid year", "Enter a valid birth year.");
      return;
    }
    addPet({
      name: trimmed,
      species,
      breedId: null,
      breedName: breedName.trim() || null,
      birthYear: year,
      photoUri,
    });
    router.back();
  }, [name, species, breedName, birthYear, photoUri, addPet, router]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 32 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Photo picker */}
      <TouchableOpacity style={styles.photoPicker} onPress={pickPhoto}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photoImage} />
        ) : (
          <Text style={styles.photoPlaceholder}>
            {species === "dog" ? "🐶" : "🐱"}
            {"\n"}
            <Text style={styles.photoHint}>Tap to add photo</Text>
          </Text>
        )}
      </TouchableOpacity>

      {/* Species toggle */}
      <View style={styles.field}>
        <Text style={styles.label}>Species</Text>
        <View style={styles.speciesRow}>
          {(["dog", "cat"] as Species[]).map(s => (
            <TouchableOpacity
              key={s}
              style={[
                styles.speciesBtn,
                species === s && styles.speciesBtnSelected,
              ]}
              onPress={() => setSpecies(s)}
            >
              <Text style={styles.speciesBtnText}>
                {s === "dog" ? "🐶 Dog" : "🐱 Cat"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Name */}
      <View style={styles.field}>
        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Buddy"
          placeholderTextColor="#9CA3AF"
          maxLength={40}
        />
      </View>

      {/* Breed */}
      <View style={styles.field}>
        <Text style={styles.label}>Breed (optional)</Text>
        <TextInput
          style={styles.input}
          value={breedName}
          onChangeText={setBreedName}
          placeholder="e.g. Golden Retriever"
          placeholderTextColor="#9CA3AF"
          maxLength={60}
        />
      </View>

      {/* Birth year */}
      <View style={styles.field}>
        <Text style={styles.label}>Birth year (optional)</Text>
        <TextInput
          style={styles.input}
          value={birthYear}
          onChangeText={setBirthYear}
          placeholder={`e.g. ${new Date().getFullYear() - 3}`}
          placeholderTextColor="#9CA3AF"
          keyboardType="number-pad"
          maxLength={4}
        />
      </View>

      {/* Save */}
      <TouchableOpacity
        style={[styles.saveBtn, !name.trim() && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={!name.trim()}
      >
        <Text style={styles.saveBtnText}>Add Pet</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  content: { padding: 20, gap: 20, alignItems: "stretch" },
  photoPicker: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F3F4F6",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  photoImage: { width: 120, height: 120 },
  photoPlaceholder: {
    fontSize: 36,
    textAlign: "center",
    lineHeight: 44,
  },
  photoHint: { fontSize: 11, color: "#9CA3AF" },
  field: { gap: 6 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: "#111827",
  },
  speciesRow: { flexDirection: "row", gap: 12 },
  speciesBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderWidth: 2,
    borderColor: "transparent",
  },
  speciesBtnSelected: { borderColor: BRAND, backgroundColor: "#FFF5F2" },
  speciesBtnText: { fontSize: 16, fontWeight: "600", color: "#374151" },
  saveBtn: {
    backgroundColor: BRAND,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 17 },
});
