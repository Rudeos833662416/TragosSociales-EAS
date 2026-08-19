import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";

function UnreadBadge() {
  const { user } = useAuth({ autoFetch: true });
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!user) return;
    const checkUnread = async () => {
      const { count } = await supabase
        .from("activities")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .is("read_at", null);
      setHasUnread((count ?? 0) > 0);
    };
    void checkUnread();
    const channel = supabase
      .channel(`badge-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "activities", filter: `recipient_id=eq.${user.id}` }, () => {
        void checkUnread();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  if (!hasUnread) return null;
  return (
    <View className="absolute -top-1 -right-2 h-3.5 w-3.5 rounded-full border-2 border-background bg-error" />
  );
}

function LocationConsentPrompt() {
  const colors = useColors();
  const { user } = useAuth({ autoFetch: true });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user || Platform.OS === "web") return;
    const key = `skynight-location-consent:${user.id}`;
    void AsyncStorage.getItem(key).then((value) => {
      if (!value) setVisible(true);
    });
  }, [user]);

  const decide = async (requestPermission: boolean) => {
    if (!user) return;
    if (requestPermission) await Location.requestForegroundPermissionsAsync();
    await AsyncStorage.setItem(`skynight-location-consent:${user.id}`, requestPermission ? "accepted" : "declined");
    setVisible(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => void decide(false)}>
      <View className="flex-1 justify-end bg-black/45">
        <View className="rounded-t-3xl p-6" style={{ backgroundColor: colors.background }}>
          <View className="mb-4 h-1.5 w-12 self-center rounded-full" style={{ backgroundColor: colors.border }} />
          <Text className="text-2xl font-bold text-foreground">Tu ubicación, bajo tu control</Text>
          <Text className="mt-3 text-base leading-6 text-muted">
            Tragos Sociales usa tu ubicación mientras activas el mapa o el descubrimiento cercano para mostrar tu posición aproximada y encontrar personas que también eligieron aparecer.
          </Text>
          <Text className="mt-3 text-sm leading-5 text-muted">
            No mostramos tu dirección exacta. Puedes cambiar esta decisión desde Perfil o desde los ajustes del dispositivo.
          </Text>
          <Pressable onPress={() => void decide(true)} style={({ pressed }) => ({ marginTop: 22, minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 })}>
            <Text className="font-bold text-background">Permitir ubicación</Text>
          </Pressable>
          <Pressable onPress={() => void decide(false)} style={({ pressed }) => ({ marginTop: 10, minHeight: 44, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.55 : 1 })}>
            <Text className="font-semibold" style={{ color: colors.primary }}>Ahora no</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <>
      <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Check-in",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Amigos",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.2.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Mapa",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="map.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Actividad",
          tabBarIcon: ({ color }) => (
            <View>
              <IconSymbol size={28} name="bell.fill" color={color} />
              <UnreadBadge />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="stories"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
      </Tabs>
      <LocationConsentPrompt />
    </>
  );
}
