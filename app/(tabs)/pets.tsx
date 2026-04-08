/**
 * Pets tab — list of pet profiles
 */

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../../lib/store";
import type { Pet } from "../../lib/types";

const BRAND = "#FF6B35";

export default function PetsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, scansForPet } = useStore();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.heading}>My Pets</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/pet/new")}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {state.pets.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🐾</Text>
          <Text style={styles.emptyTitle}>No pets yet</Text>
          <Text style={styles.emptyBody}>
            Add your first pet to start tracking their wellness.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push("/pet/new")}
          >
            <Text style={styles.emptyBtnText}>Add a pet</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={state.pets}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <PetCard
              pet={item}
              scanCount={scansForPet(item.id).length}
              onPress={() => router.push(`/pet/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}

function PetCard({
  pet,
  scanCount,
  onPress,
}: {
  pet: Pet;
  scanCount: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardAvatar}>
        {pet.photoUri ? (
          <Image
            source={{ uri: pet.photoUri }}
            style={styles.cardAvatarImage}
          />
        ) : (
          <Text style={styles.cardAvatarEmoji}>
            {pet.species === "dog" ? "🐶" : "🐱"}
          </Text>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{pet.name}</Text>
        <Text style={styles.cardMeta}>
          {pet.breedName ?? (pet.species === "dog" ? "Dog" : "Cat")}
          {pet.birthYear ? ` · Born ${pet.birthYear}` : ""}
        </Text>
        <Text style={styles.cardScans}>
          {scanCount} scan{scanCount !== 1 ? "s" : ""}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  heading: { fontSize: 24, fontWeight: "800", color: "#111827" },
  addBtn: {
    backgroundColor: BRAND,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  list: { paddingHorizontal: 20, gap: 12, paddingBottom: 24 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cardAvatarImage: { width: 56, height: 56 },
  cardAvatarEmoji: { fontSize: 28 },
  cardBody: { flex: 1, gap: 2 },
  cardName: { fontSize: 17, fontWeight: "700", color: "#111827" },
  cardMeta: { fontSize: 13, color: "#6B7280" },
  cardScans: { fontSize: 12, color: BRAND, fontWeight: "600", marginTop: 2 },
  chevron: { fontSize: 22, color: "#D1D5DB" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  emptyBody: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 20 },
  emptyBtn: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginTop: 8,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
