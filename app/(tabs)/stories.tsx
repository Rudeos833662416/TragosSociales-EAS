import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { useAppRefresh } from "@/lib/app-refresh";
import { supabase } from "@/lib/supabase";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Image as ExpoImage } from "expo-image";

type SelectedMedia = {
  uri: string;
  mimeType: string;
  type: "image" | "video";
  name: string;
};

type StoryItem = {
  id: number;
  user_id: string;
  media_url: string;
  media_type: "image" | "video";
  audio_url: string | null;
  audio_name: string | null;
  music_title?: string | null;
  caption: string | null;
  visibility: "friends" | "public";
  privacy?: "all_friends" | "close_friends" | "public";
  created_at: string;
  expires_at: string;
  user_name?: string;
  avatar_url?: string | null;
};

type GroupedStoryUser = {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  isSelf: boolean;
  stories: StoryItem[];
  latestCreatedAt: string;
};

const MAX_STORY_VIDEO_BYTES = 80_000_000;
const MAX_COMPRESSED_VIDEO_BYTES = 25_000_000;
const MAX_STORY_DURATION_SECONDS = 15;

async function prepareStoryImage(uri: string) {
  return ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1440 } }],
    { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG },
  );
}

async function prepareStoryVideo(uri: string, onProgress: (progress: number) => void) {
  if (Platform.OS === "web") return uri;
  const { compress, getMetadata } = await import("expo-image-and-video-compressor");
  const sourceMetadata = await getMetadata(uri);
  if (sourceMetadata.duration > MAX_STORY_DURATION_SECONDS) {
    throw new Error("Las historias en vídeo pueden durar como máximo 15 segundos.");
  }
  if (sourceMetadata.size > MAX_STORY_VIDEO_BYTES) {
    throw new Error("El vídeo supera el límite de 80 MB.");
  }
  onProgress(0.1);
  const compressedUri = await compress(uri, {
    bitrate: 2_500_000,
    maxSize: 720,
    codec: "h264",
    speed: "fast",
    minimumFileSizeForCompress: 2_000_000,
    progressDivider: 5,
  }, (progress) => onProgress(0.1 + progress * 0.65));
  const compressedMetadata = await getMetadata(compressedUri);
  if (compressedMetadata.duration > MAX_STORY_DURATION_SECONDS || compressedMetadata.size > MAX_COMPRESSED_VIDEO_BYTES) {
    throw new Error("El vídeo no pudo quedar dentro de 15 segundos y 25 MB.");
  }
  onProgress(0.82);
  return compressedUri;
}

export default function StoriesScreen() {
  const colors = useColors();
  const { user } = useAuth({ autoFetch: true });
  const { revision } = useAppRefresh();

  const [groupedStories, setGroupedStories] = useState<GroupedStoryUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
  const [caption, setCaption] = useState("");
  const [privacy, setPrivacy] = useState<"all_friends" | "close_friends" | "public">("all_friends");
  const [reactionByStory, setReactionByStory] = useState<Record<number, string | null>>({});
  const [viewers, setViewers] = useState<{ viewer_id: string; name: string; avatar_url: string | null; viewed_at: string }[]>([]);
  const [showViewers, setShowViewers] = useState(false);

  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progressTimer, setProgressTimer] = useState(0);

  const fetchStories = useCallback(async () => {
    if (!user) {
      setGroupedStories([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      await supabase.rpc("purge_expired_stories");
      const { data, error } = await supabase
        .from("stories")
        .select("id, user_id, media_url, media_type, audio_url, audio_name, music_title, caption, visibility, privacy, created_at, expires_at")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      const rows = (data ?? []) as StoryItem[];
      const userIds = [...new Set(rows.map((r) => r.user_id))];

      const { data: profiles } = userIds.length
        ? await supabase.rpc("get_visible_profiles", { p_ids: userIds })
        : { data: [] };

      const profileMap = new Map(
        ((profiles ?? []) as { id: string; name: string | null; avatar_url: string | null }[]).map((p) => [
          p.id,
          { name: p.name?.trim() || "", avatarUrl: p.avatar_url },
        ]),
      );

      const map = new Map<string, StoryItem[]>();
      for (const row of rows) {
        const list = map.get(row.user_id) || [];
        list.push({
          ...row,
          user_name: row.user_id === user.id ? user.name : profileMap.get(row.user_id)?.name || "Usuario",
          avatar_url: row.user_id === user.id ? null : profileMap.get(row.user_id)?.avatarUrl,
        });
        map.set(row.user_id, list);
      }

      const groups: GroupedStoryUser[] = [];
      const selfList = map.get(user.id);
      if (selfList) {
        groups.push({
          userId: user.id,
          userName: "Mi estado",
          avatarUrl: null,
          isSelf: true,
          stories: selfList,
          latestCreatedAt: selfList[0]?.created_at || new Date().toISOString(),
        });
        map.delete(user.id);
      }

      for (const [uId, list] of map.entries()) {
        const info = profileMap.get(uId);
        groups.push({
          userId: uId,
          userName: info?.name || "Contacto",
          avatarUrl: info?.avatarUrl || null,
          isSelf: false,
          stories: list,
          latestCreatedAt: list[0]?.created_at || new Date().toISOString(),
        });
      }

      setGroupedStories(groups);
    } catch (err) {
      console.error("Error fetching stories:", err);
      setGroupedStories([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchStories();
    if (!user) return;
    const channel = supabase
      .channel(`tragos-sociales-stories-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, () => void fetchStories())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchStories, revision, user]);

  const pickMedia = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const uri = asset.uri;
        const type = asset.type === "video" ? "video" : "image";
        const durationMs = asset.duration ?? undefined;
        const fileSize = asset.fileSize ?? undefined;
        if (type === "video" && durationMs !== undefined && durationMs > MAX_STORY_DURATION_SECONDS * 1000) {
          Alert.alert("Vídeo demasiado largo", "Las historias en vídeo pueden durar como máximo 15 segundos.");
          return;
        }
        if (type === "video" && fileSize !== undefined && fileSize > MAX_STORY_VIDEO_BYTES) {
          Alert.alert("Vídeo demasiado pesado", "El vídeo seleccionado supera el límite de 80 MB.");
          return;
        }
        const filename = uri.split("/").pop() ?? `story_${Date.now()}.${type === "video" ? "mp4" : "jpg"}`;
        const mimeType = type === "video" ? "video/mp4" : "image/jpeg";
        setSelectedMedia({ uri, mimeType, type, name: filename });
      }
    } catch {
      Alert.alert("Error", "No se pudo seleccionar el archivo multimedia.");
    }
  };

  const publishStory = async () => {
    if (!user || !selectedMedia || isUploading) return;
    try {
      setIsUploading(true);
      setUploadMessage("Preparando contenido…");

      let finalUri = selectedMedia.uri;
      if (selectedMedia.type === "image") {
        const prepared = await prepareStoryImage(selectedMedia.uri);
        finalUri = prepared.uri;
      } else {
        finalUri = await prepareStoryVideo(selectedMedia.uri, (p) => setUploadProgress(p));
      }

      setUploadProgress(0.85);
      setUploadMessage("Subiendo estado…");

      const response = await fetch(finalUri);
      const bytes = await response.arrayBuffer();
      const ext = selectedMedia.type === "video" ? "mp4" : "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("stories").upload(path, bytes, {
        contentType: selectedMedia.type === "video" ? "video/mp4" : "image/jpeg",
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from("stories").getPublicUrl(path);
      const mediaUrl = publicData?.publicUrl;
      if (!mediaUrl) throw new Error("No se pudo obtener la URL pública.");

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error: insertError } = await supabase.from("stories").insert({
        user_id: user.id,
        media_url: mediaUrl,
        media_type: selectedMedia.type,
        caption: caption.trim() || null,
        visibility: privacy === "public" ? "public" : "friends",
        privacy,
        expires_at: expiresAt,
      });
      if (insertError) throw insertError;

      setSelectedMedia(null);
      setCaption("");
      setPrivacy("all_friends");
      setUploadMessage("Estado publicado…");
      await new Promise((r) => setTimeout(r, 600));
      await fetchStories();
    } catch (err) {
      Alert.alert("No se pudo publicar", err instanceof Error ? err.message : "Inténtalo de nuevo.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadMessage(null);
    }
  };

  const recordStoryView = useCallback(async (storyId: number) => {
    if (!user) return;
    const { error } = await supabase.from("story_views").insert({ story_id: storyId, viewer_id: user.id });
    if (error && error.code !== "23505") console.warn("Story view unavailable:", error.message);
  }, [user]);

  const loadReaction = useCallback(async (storyId: number) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("story_reactions")
      .select("emoji")
      .eq("story_id", storyId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      console.warn("Story reactions unavailable:", error.message);
      return;
    }
    setReactionByStory((previous) => ({ ...previous, [storyId]: data?.emoji ?? null }));
  }, [user]);

  const toggleReaction = async (storyId: number, emoji: string) => {
    if (!user) return;
    const current = reactionByStory[storyId] ?? null;
    const next = current === emoji ? null : emoji;
    setReactionByStory((previous) => ({ ...previous, [storyId]: next }));
    const result = next
      ? await supabase.from("story_reactions").upsert(
          { story_id: storyId, user_id: user.id, emoji: next },
          { onConflict: "story_id,user_id" },
        )
      : await supabase.from("story_reactions").delete().eq("story_id", storyId).eq("user_id", user.id);
    if (result.error) {
      setReactionByStory((previous) => ({ ...previous, [storyId]: current }));
      Alert.alert("No se pudo guardar", "Ejecuta la migración 0011 en Supabase y vuelve a intentarlo.");
    }
  };

  const loadViewers = async (storyId: number) => {
    const { data, error } = await supabase
      .from("story_views")
      .select("viewer_id, viewed_at")
      .eq("story_id", storyId)
      .order("viewed_at", { ascending: false });
    if (error) {
      Alert.alert("Vistas no disponibles", "Ejecuta la migración 0011 en Supabase para ver quién abrió este Estado.");
      return;
    }
    const rows = (data ?? []) as { viewer_id: string; viewed_at: string }[];
    const ids = rows.map((row) => row.viewer_id);
    const { data: profiles } = ids.length
      ? await supabase.rpc("get_visible_profiles", { p_ids: ids })
      : { data: [] };
    const profileMap = new Map(
      ((profiles ?? []) as { id: string; name: string | null; avatar_url: string | null }[]).map((profile) => [profile.id, profile]),
    );
    setViewers(rows.map((row) => ({
      viewer_id: row.viewer_id,
      viewed_at: row.viewed_at,
      name: profileMap.get(row.viewer_id)?.name?.trim() || "Usuario",
      avatar_url: profileMap.get(row.viewer_id)?.avatar_url ?? null,
    })));
    setShowViewers(true);
  };

  const deleteStory = async (storyId: number) => {
    Alert.alert("Eliminar estado", "¿Quieres eliminar este estado?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase.from("stories").delete().eq("id", storyId);
            if (error) throw error;
            setActiveGroupIndex(null);
            await fetchStories();
          } catch (err) {
            Alert.alert("Error", err instanceof Error ? err.message : "No se pudo eliminar.");
          }
        },
      },
    ]);
  };

  // Viewer timer logic
  useEffect(() => {
    if (activeGroupIndex === null || isPaused) return;
    const interval = setInterval(() => {
      setProgressTimer((prev) => {
        if (prev >= 1) {
          // Advance story
          const group = groupedStories[activeGroupIndex];
          if (group && activeStoryIndex < group.stories.length - 1) {
            setActiveStoryIndex((i) => i + 1);
            return 0;
          } else {
            // Close viewer or advance group
            if (activeGroupIndex < groupedStories.length - 1) {
              setActiveGroupIndex((g) => (g !== null ? g + 1 : null));
              setActiveStoryIndex(0);
              return 0;
            } else {
              setActiveGroupIndex(null);
              return 0;
            }
          }
        }
        return prev + 0.02; // ~5 seconds per story item
      });
    }, 100);
    return () => clearInterval(interval);
  }, [activeGroupIndex, activeStoryIndex, groupedStories, isPaused]);

  const activeGroup = activeGroupIndex !== null ? groupedStories[activeGroupIndex] : null;
  const activeStory = activeGroup ? activeGroup.stories[activeStoryIndex] : null;

  useEffect(() => {
    const storyId = activeStory?.id;
    if (!storyId) return;
    setShowViewers(false);
    void loadReaction(storyId);
    if (activeGroup && !activeGroup.isSelf) void recordStoryView(storyId);
  }, [activeStory?.id, activeGroup, loadReaction, recordStoryView]);

  return (
    <ScreenContainer className="px-5 pt-3">
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <View className="mb-4">
          <Text className="text-2xl font-black text-foreground">Estados</Text>
          <Text className="text-xs text-muted">Comparte momentos que desaparecen en 24 horas</Text>
        </View>

        {/* Mi estado */}
        <View className="mb-6 rounded-2xl border p-4 shadow-sm" style={{ backgroundColor: colors.surface, borderColor: `${colors.border}AA` }}>
          <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Tu Estado</Text>
          {groupedStories.find((g) => g.isSelf)?.stories.length ? (
            <Pressable
              onPress={() => {
                const idx = groupedStories.findIndex((g) => g.isSelf);
                if (idx >= 0) {
                  setActiveGroupIndex(idx);
                  setActiveStoryIndex(0);
                  setProgressTimer(0);
                }
              }}
              className="flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-3">
                <View className="relative h-14 w-14 items-center justify-center rounded-full border-2" style={{ borderColor: colors.primary }}>
                  <ExpoImage source={groupedStories.find((g) => g.isSelf)?.stories[0]?.media_url} className="h-full w-full rounded-full" contentFit="cover" cachePolicy="disk" />
                </View>
                <View>
                  <Text className="text-base font-bold text-foreground">Mi estado</Text>
                  <Text className="text-xs text-muted">Pulsa para ver tus estados activos</Text>
                </View>
              </View>
              <Pressable onPress={pickMedia} className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: colors.primary }}>
                <IconSymbol name="plus" size={20} color="#FFFFFF" />
              </Pressable>
            </Pressable>
          ) : (
            <Pressable onPress={pickMedia} className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="h-14 w-14 items-center justify-center rounded-full border-2 border-dashed" style={{ borderColor: colors.primary, backgroundColor: `${colors.primary}12` }}>
                  <IconSymbol name="camera.fill" size={24} color={colors.primary} />
                </View>
                <View>
                  <Text className="text-base font-bold text-foreground">Añade una actualización</Text>
                  <Text className="text-xs text-muted">Comparte una foto o vídeo por 24 horas</Text>
                </View>
              </View>
              <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: colors.primary }}>
                <IconSymbol name="plus" size={20} color="#FFFFFF" />
              </View>
            </Pressable>
          )}
        </View>

        {/* Actualizaciones recientes */}
        <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Actualizaciones Recientes</Text>
        {isLoading ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator color={colors.primary} />
            <Text className="mt-2 text-xs text-muted">Cargando estados…</Text>
          </View>
        ) : groupedStories.filter((g) => !g.isSelf).length === 0 ? (
          <View className="rounded-2xl border border-dashed p-8 items-center justify-center" style={{ borderColor: colors.border }}>
            <Text className="text-sm font-medium text-muted text-center">No hay estados recientes de tus amigos.</Text>
          </View>
        ) : (
          <View className="gap-3">
            {groupedStories.filter((g) => !g.isSelf).map((group, groupIdx) => {
              const realIndex = groupedStories.findIndex((g) => g.userId === group.userId);
              return (
                <Pressable
                  key={group.userId}
                  onPress={() => {
                    setActiveGroupIndex(realIndex);
                    setActiveStoryIndex(0);
                    setProgressTimer(0);
                  }}
                  className="flex-row items-center justify-between rounded-2xl border p-3.5 shadow-sm"
                  style={{ backgroundColor: colors.surface, borderColor: `${colors.border}AA` }}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="relative h-14 w-14 items-center justify-center rounded-full border-2 p-0.5" style={{ borderColor: colors.primary }}>
                      {group.avatarUrl ? (
                        <ExpoImage source={group.avatarUrl} className="h-full w-full rounded-full" contentFit="cover" cachePolicy="disk" />
                      ) : (
                        <View className="h-full w-full items-center justify-center rounded-full" style={{ backgroundColor: colors.primary }}>
                          <Text className="text-lg font-bold text-white">{group.userName[0]?.toUpperCase() ?? "?"}</Text>
                        </View>
                      )}
                    </View>
                    <View>
                      <Text className="text-base font-bold text-foreground">{group.userName}</Text>
                      <Text className="text-xs text-muted">{group.stories.length} estado{group.stories.length === 1 ? "" : "s"}</Text>
                    </View>
                  </View>
                  <IconSymbol name="chevron.right" size={18} color={colors.muted} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal Compositor / Previsualización antes de publicar */}
      <Modal visible={Boolean(selectedMedia)} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/80">
          <View className="rounded-t-3xl border-t p-6" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-foreground">Nuevo Estado</Text>
              <Pressable onPress={() => setSelectedMedia(null)} className="p-1">
                <IconSymbol name="xmark.circle.fill" size={24} color={colors.muted} />
              </Pressable>
            </View>

            <View className="h-64 w-full overflow-hidden rounded-2xl bg-black mb-4">
              {selectedMedia?.type === "image" ? (
                <ExpoImage source={selectedMedia.uri} className="h-full w-full" contentFit="contain" />
              ) : (
                <Text className="text-white text-center m-auto">Vídeo seleccionado</Text>
              )}
            </View>

            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Añade un comentario (opcional)…"
              placeholderTextColor={colors.muted}
              className="rounded-xl border px-4 py-3 text-foreground mb-3"
              style={{ borderColor: colors.border, backgroundColor: colors.background }}
            />

            <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Quién puede ver este Estado</Text>
            <View className="mb-4 flex-row gap-2">
              {([
                ["all_friends", "Todos mis amigos"],
                ["close_friends", "Amigos cercanos"],
                ["public", "Público"],
              ] as const).map(([value, label]) => (
                <Pressable
                  key={value}
                  onPress={() => setPrivacy(value)}
                  className="flex-1 rounded-xl border px-2 py-3 items-center"
                  style={{
                    borderColor: privacy === value ? colors.primary : colors.border,
                    backgroundColor: privacy === value ? `${colors.primary}20` : colors.background,
                  }}
                >
                  <Text className="text-center text-[11px] font-bold" style={{ color: privacy === value ? colors.primary : colors.muted }}>{label}</Text>
                </Pressable>
              ))}
            </View>

            {isUploading ? (
              <View className="py-4 items-center">
                <ActivityIndicator color={colors.primary} size="large" />
                <Text className="mt-2 text-xs font-semibold text-foreground">{uploadMessage || "Subiendo…"}</Text>
              </View>
            ) : (
              <Pressable onPress={() => void publishStory()} className="py-4 rounded-xl items-center" style={{ backgroundColor: colors.primary }}>
                <Text className="font-bold text-white">Publicar Estado</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

      {/* Visor Inmersivo Estilo WhatsApp */}
      <Modal visible={activeGroup !== null && activeStory !== null} animationType="fade" transparent onRequestClose={() => setActiveGroupIndex(null)}>
        {activeGroup && activeStory && (
          <View className="flex-1 bg-black justify-between py-12 px-3">
            {/* Barras de progreso superiores */}
            <View className="flex-row gap-1.5 px-1 pt-2">
              {activeGroup.stories.map((st, idx) => {
                const isPassed = idx < activeStoryIndex;
                const isCurrent = idx === activeStoryIndex;
                return (
                  <View key={st.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                    <View
                      className="h-full bg-white"
                      style={{
                        width: isPassed ? "100%" : isCurrent ? `${progressTimer * 100}%` : "0%",
                      }}
                    />
                  </View>
                );
              })}
            </View>

            {/* Cabecera del autor */}
            <View className="mt-3 flex-row items-center justify-between px-2">
              <View className="flex-row items-center gap-3">
                {activeGroup.avatarUrl ? (
                  <ExpoImage source={activeGroup.avatarUrl} className="h-9 w-9 rounded-full" contentFit="cover" />
                ) : (
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-primary">
                    <Text className="font-bold text-white">{activeGroup.userName[0]?.toUpperCase() ?? "?"}</Text>
                  </View>
                )}
                <View>
                  <Text className="text-sm font-bold text-white">{activeGroup.userName}</Text>
                  <Text className="text-[11px] text-white/70">Hace un momento</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-3">
                {activeGroup.isSelf && (
                  <Pressable onPress={() => void deleteStory(activeStory.id)} className="p-2">
                    <IconSymbol name="trash.fill" size={20} color="#FF6B6B" />
                  </Pressable>
                )}
                <Pressable onPress={() => setActiveGroupIndex(null)} className="p-2">
                  <IconSymbol name="xmark" size={22} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>

            {/* Contenido multimedia central (con pausa al presionar y navegación izquierda/derecha) */}
            <Pressable
              onPressIn={() => setIsPaused(true)}
              onPressOut={() => setIsPaused(false)}
              className="absolute inset-0 z-[-1] items-center justify-center"
            >
              {activeStory.media_type === "image" ? (
                <ExpoImage source={activeStory.media_url} className="h-full w-full" contentFit="contain" cachePolicy="disk" />
              ) : (
                <ExpoImage source={activeStory.media_url} className="h-full w-full" contentFit="contain" />
              )}
            </Pressable>

            {/* Zonas táctiles para navegar */}
            <View className="absolute inset-x-0 top-24 bottom-24 flex-row pointer-events-box-none">
              <Pressable
                onPress={() => {
                  if (activeStoryIndex > 0) {
                    setActiveStoryIndex((i) => i - 1);
                    setProgressTimer(0);
                  } else if (activeGroupIndex !== null && activeGroupIndex > 0) {
                    setActiveGroupIndex((g) => (g !== null ? g - 1 : null));
                    setActiveStoryIndex(0);
                    setProgressTimer(0);
                  }
                }}
                className="flex-1"
              />
              <Pressable
                onPress={() => {
                  if (activeStoryIndex < activeGroup.stories.length - 1) {
                    setActiveStoryIndex((i) => i + 1);
                    setProgressTimer(0);
                  } else if (activeGroupIndex !== null && activeGroupIndex < groupedStories.length - 1) {
                    setActiveGroupIndex((g) => (g !== null ? g + 1 : null));
                    setActiveStoryIndex(0);
                    setProgressTimer(0);
                  } else {
                    setActiveGroupIndex(null);
                  }
                }}
                className="flex-1"
              />
            </View>

            <View className="mx-4 mb-3 flex-row items-center justify-center gap-2 rounded-full bg-black/55 px-3 py-2">
              {["🔥", "❤️", "👏", "😂", "😮", "🍻"].map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => void toggleReaction(activeStory.id, emoji)}
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: reactionByStory[activeStory.id] === emoji ? "#FFFFFF33" : "transparent" }}
                >
                  <Text className="text-xl">{emoji}</Text>
                </Pressable>
              ))}
            </View>

            {activeGroup.isSelf ? (
              <Pressable onPress={() => void loadViewers(activeStory.id)} className="mx-4 mb-3 flex-row items-center justify-center gap-2 rounded-full bg-black/55 px-4 py-2.5">
                <IconSymbol name="eye" size={17} color="#FFFFFF" />
                <Text className="text-xs font-bold text-white">Ver quién vio este Estado</Text>
              </Pressable>
            ) : null}

            {/* Pie de página con comentario si existe */}
            {activeStory.caption ? (
              <View className="px-6 pb-6 pt-4 bg-black/40 rounded-2xl mx-4 mb-4">
                <Text className="text-center text-sm font-medium text-white">{activeStory.caption}</Text>
              </View>
            ) : null}
          </View>
        )}
      </Modal>

      <Modal visible={showViewers} transparent animationType="slide" onRequestClose={() => setShowViewers(false)}>
        <View className="flex-1 justify-end bg-black/70">
          <View className="max-h-[70%] rounded-t-3xl p-6" style={{ backgroundColor: colors.surface }}>
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-black text-foreground">Vistas del Estado</Text>
                <Text className="text-xs text-muted">{viewers.length} persona{viewers.length === 1 ? "" : "s"} lo ha visto</Text>
              </View>
              <Pressable onPress={() => setShowViewers(false)} className="p-2">
                <IconSymbol name="xmark" size={22} color={colors.muted} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {viewers.length === 0 ? (
                <Text className="py-8 text-center text-sm text-muted">Todavía nadie ha abierto este Estado.</Text>
              ) : viewers.map((viewer) => (
                <View key={viewer.viewer_id} className="mb-3 flex-row items-center gap-3 rounded-2xl border p-3" style={{ borderColor: colors.border }}>
                  {viewer.avatar_url ? (
                    <ExpoImage source={viewer.avatar_url} className="h-10 w-10 rounded-full" contentFit="cover" cachePolicy="disk" />
                  ) : (
                    <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: colors.primary }}>
                      <Text className="font-bold text-white">{viewer.name[0]?.toUpperCase() ?? "?"}</Text>
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-foreground">{viewer.name}</Text>
                    <Text className="text-xs text-muted">Visto recientemente</Text>
                  </View>
                  <IconSymbol name="checkmark.circle.fill" size={18} color={colors.success} />
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
