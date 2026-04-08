import { Tabs } from "expo-router";
import { Platform } from "react-native";

// Simple inline SVG-free tab icons using text — swap for lucide-react-native if added later
function TabIcon({ label }: { label: string }) {
  const icons: Record<string, string> = {
    snap: "📷",
    pets: "🐾",
    history: "📋",
    profile: "👤",
  };
  return null; // icon rendered via tabBarIcon below
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#FF6B35",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#F3F4F6",
          paddingBottom: Platform.OS === "ios" ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === "ios" ? 80 : 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Snap",
          tabBarIcon: ({ color }) => (
            // Camera emoji as icon — replace with proper icon lib
            <TabIconText emoji="📷" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pets"
        options={{
          title: "My Pets",
          tabBarIcon: ({ color }) => (
            <TabIconText emoji="🐾" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }) => (
            <TabIconText emoji="📋" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <TabIconText emoji="👤" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIconText({ emoji, color }: { emoji: string; color: string }) {
  const { Text } = require("react-native");
  return <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}
