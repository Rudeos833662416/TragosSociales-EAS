import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image as ExpoImage } from "expo-image";

type PublicProfile = {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
};

type Friendship = { user_id: string; friend_id: string; status: string };

function displayName(profile: PublicProfile) {
  return profile.name?.trim() || profile.email?.split("@")[0]?.trim() || "Usuario de Tragos Sociales";
}

export default function PublicProfileScreen() {
  const colors = useColors();
  const { user } = useAuth({ autoFetch: true });
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [friendship, setFriendship] = useState<Friendship | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");

  const loadProfile = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("public_profiles")
        .select("id, name, avatar_url, cover_url, bio")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      setProfile(data as PublicProfile | null);

      if (user && user.id !== id) {
        const { data: friendshipRows } = await supabase
          .from("friendships")
          .select("user_id, friend_id, status")
          .or(`and(user_id.eq.${user.id},friend_id.eq.${id}),and(user_id.eq.${id},friend_id.eq.${user.id})`)
          .limit(1);
        setFriendship((friendshipRows?.[0] as Friendship | undefined) ?? null);
      }
    } catch (error) {
      Alert.alert("No se pudo abrir el perfil", error instanceof Error ? error.message : "Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const sendFriendRequest = async () => {
    if (!user || !profile || user.id === profile.id || isSending) return;
    try {
      setIsSending(true);
      const { data, error } = await supabase
        .from("friendships")
        .insert({ user_id: user.id, friend_id: profile.id, status: "pending", request_message: requestMessage.trim() || null })
        .select("user_id, friend_id, status")
        .single();
      if (error) throw error;
      setFriendship(data as Friendship);
      Alert.alert("Solicitud enviada", `Tu solicitud para conectar con ${displayName(profile)} quedó pendiente.`);
    } catch (error) {
      Alert.alert("No se pudo enviar", error instanceof Error ? error.message : "Es posible que ya exista una solicitud.");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center p-6">
        <ActivityIndicator color={colors.primary} />
        <Text className="mt-3 text-sm text-muted">Cargando perfil…</Text>
      </ScreenContainer>
    );
  }

  if (!profile) {
    return (
      <ScreenContainer className="items-center justify-center p-6">
        <Text className="text-xl font-bold text-foreground">Perfil no disponible</Text>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ marginTop: 18, padding: 14, borderRadius: 14, backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 })}>
          <Text className="font-bold text-background">Volver</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  const name = displayName(profile);
  const isSelf = user?.id === profile.id;
  const isAccepted = friendship?.status === "accepted";
  const isPending = friendship?.status === "pending";

  return (
    <ScreenContainer className="p-5">
      <ScrollView contentContainerStyle={{ paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ alignSelf: "flex-start", paddingVertical: 8, opacity: pressed ? 0.55 : 1 })}>
          <Text className="font-semibold" style={{ color: colors.primary }}>‹ Volver</Text>
        </Pressable>
        <View className="mt-2 overflow-hidden rounded-3xl border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          {profile.cover_url ? <ExpoImage source={profile.cover_url} className="h-40 w-full" contentFit="cover" cachePolicy="disk" transition={180} /> : <View className="h-40" style={{ backgroundColor: `${colors.primary}20` }} />}
          <View className="items-center px-5 pb-6">
            <View className="-mt-11 h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4" style={{ borderColor: colors.surface, backgroundColor: colors.primary }}>
              {profile.avatar_url ? <ExpoImage source={profile.avatar_url} className="h-full w-full" contentFit="cover" cachePolicy="disk" transition={180} /> : <Text className="text-3xl font-bold" style={{ color: colors.background }}>{name[0]?.toUpperCase() ?? "?"}</Text>}
            </View>
            <Text className="mt-3 text-2xl font-bold text-foreground">{name}</Text>
            <Text className="mt-1 text-sm text-muted">Perfil de Tragos Sociales</Text>
            {profile.bio ? <Text className="mt-3 max-w-[300px] text-center text-sm leading-5 text-foreground">{profile.bio}</Text> : null}
            {!isSelf ? (
              <>
                {!isAccepted && !isPending ? (
                  <TextInput
                    value={requestMessage}
                    onChangeText={setRequestMessage}
                    placeholder="Escribe un saludo (opcional)"
                    placeholderTextColor={colors.muted}
                    maxLength={140}
                    className="mt-4 w-full rounded-xl border bg-background px-3 py-3 text-center text-foreground"
                    style={{ borderColor: colors.border }}
                  />
                ) : null}
                <Pressable
                disabled={isSending || isAccepted || isPending}
                onPress={() => void sendFriendRequest()}
                style={({ pressed }) => ({ marginTop: 18, minHeight: 48, minWidth: 220, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: isAccepted || isPending ? colors.surface : colors.primary, borderWidth: isAccepted || isPending ? 1 : 0, borderColor: colors.border, opacity: isSending ? 0.55 : pressed ? 0.82 : 1 })}
              >
                <Text className="font-bold" style={{ color: isAccepted || isPending ? colors.foreground : colors.background }}>
                  {isAccepted ? "Ya son amigos" : isPending ? "Solicitud pendiente" : isSending ? "Enviando…" : "Enviar solicitud"}
                </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
        <View className="mt-5 rounded-2xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <View className="flex-row items-center gap-3">
            <IconSymbol name="person.fill" size={20} color={colors.primary} />
            <Text className="flex-1 text-sm leading-5 text-muted">Conecta cara a cara escaneando un código QR. Solo tú decides cuándo aceptar solicitudes.</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
