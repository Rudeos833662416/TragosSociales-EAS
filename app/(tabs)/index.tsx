import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import VenueMapPicker, { type VenueCoordinate } from "@/components/venue-map-picker";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useAppRefresh } from "@/lib/app-refresh";
import { searchNearbyDrinkingPlaces, searchPlacesByAddress, reverseGeocode, type PlaceSearchResult } from "@/lib/openstreetmap";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";

type Venue = {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  source?: string | null;
  source_id?: string | null;
};

type Coordinates = { latitude: number; longitude: number };

type ActiveCheckin = {
  id: number;
  venueId: number;
  venueName: string;
  createdAt: string;
};

const VENUE_FIELDS = "id, name, address, city, country, latitude, longitude, source, source_id";
const LEGACY_VENUE_FIELDS = "id, name, address, city, latitude, longitude";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth({ autoFetch: true });
  const { revision } = useAppRefresh();

  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);
  const [activeCheckin, setActiveCheckin] = useState<ActiveCheckin | null>(null);
  const [isLoadingVenues, setIsLoadingVenues] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVenuePicker, setShowVenuePicker] = useState(false);
  const [showCreateVenue, setShowCreateVenue] = useState(false);
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [venueCity, setVenueCity] = useState("");
  const [venueCountry, setVenueCountry] = useState("Venezuela");
  const [venueQuery, setVenueQuery] = useState("");
  const [deviceCoordinate, setDeviceCoordinate] = useState<Coordinates | null>(null);
  const [selectedCoordinate, setSelectedCoordinate] = useState<Coordinates | null>(null);
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceSearchResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(null);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) {
      setVenues([]);
      setActiveCheckin(null);
      setIsLoadingVenues(false);
      return;
    }

    try {
      setIsLoadingVenues(true);
      let venuesData: Venue[] | null = null;
      const extended = await supabase.from("venues").select(VENUE_FIELDS).order("name", { ascending: true }).limit(100);
      if (!extended.error) {
        venuesData = (extended.data ?? []) as Venue[];
      } else {
        const legacy = await supabase.from("venues").select(LEGACY_VENUE_FIELDS).order("name", { ascending: true }).limit(100);
        if (legacy.error) throw legacy.error;
        venuesData = (legacy.data ?? []) as Venue[];
      }
      setVenues(venuesData);

      const { data: checkinData, error: checkinError } = await supabase
        .from("checkins")
        .select("id, venue_id, created_at, venues(name)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (checkinError && checkinError.code !== "PGRST116") throw checkinError;
      if (checkinData) {
        const venueInfo = checkinData.venues as unknown as { name?: string } | null;
        setActiveCheckin({
          id: checkinData.id,
          venueId: checkinData.venue_id,
          venueName: venueInfo?.name ?? "Lugar seleccionado",
          createdAt: checkinData.created_at,
        });
      } else {
        setActiveCheckin(null);
      }
    } catch (err) {
      console.error("Error loading home data:", err);
    } finally {
      setIsLoadingVenues(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchData();
    if (!user) return;
    const channel = supabase
      .channel(`tragos-sociales-home-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "checkins", filter: `user_id=eq.${user.id}` }, () => void fetchData())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchData, revision, user]);

  const selectedVenue = useMemo(() => venues.find((venue) => venue.id === selectedVenueId) ?? null, [venues, selectedVenueId]);
  const mergedPlaces = useMemo(() => {
    const unique = new Map<string, PlaceSearchResult>();
    [...nearbyPlaces, ...searchResults].forEach((place) => unique.set(place.id, place));
    return Array.from(unique.values());
  }, [nearbyPlaces, searchResults]);

  const resetVenueDraft = () => {
    setVenueName("");
    setVenueAddress("");
    setVenueCity("");
    setVenueCountry("Venezuela");
    setVenueQuery("");
    setSelectedCoordinate(null);
    setSelectedPlace(null);
    setSearchResults([]);
  };

  const loadNearbyPlaces = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Disponible en el APK", "La búsqueda por ubicación se activa en Android y iOS.");
      return;
    }
    try {
      setIsSearchingPlaces(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        Alert.alert("Ubicación necesaria", "Permite la ubicación mientras usas Tragos Sociales para encontrar lugares cercanos.");
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coordinate = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setDeviceCoordinate(coordinate);
      setSelectedCoordinate(coordinate);
      const places = await searchNearbyDrinkingPlaces(coordinate.latitude, coordinate.longitude);
      setNearbyPlaces(places);
    } catch (error) {
      Alert.alert("No se pudieron cargar lugares", error instanceof Error ? error.message : "Inténtalo de nuevo.");
    } finally {
      setIsSearchingPlaces(false);
    }
  };

  const handleSearchPlaces = async () => {
    const query = venueQuery.trim();
    if (query.length < 3) {
      Alert.alert("Escribe una búsqueda", "Indica una dirección, ciudad o nombre de bar en Venezuela.");
      return;
    }
    try {
      setIsSearchingPlaces(true);
      setSearchResults(await searchPlacesByAddress(query, "ve"));
    } catch (error) {
      Alert.alert("No se pudo buscar", error instanceof Error ? error.message : "Inténtalo de nuevo.");
    } finally {
      setIsSearchingPlaces(false);
    }
  };

  const handleSelectPlace = (place: PlaceSearchResult) => {
    setSelectedPlace(place);
    setVenueName(place.name);
    setVenueAddress(place.address);
    setVenueCity(place.city ?? "");
    setVenueCountry(place.country ?? "Venezuela");
    setSelectedCoordinate({ latitude: place.latitude, longitude: place.longitude });
  };

  const handleMapCoordinate = async (coordinate: VenueCoordinate) => {
    setSelectedPlace(null);
    setSelectedCoordinate(coordinate);
    try {
      setVenueAddress(await reverseGeocode(coordinate.latitude, coordinate.longitude));
    } catch {
      setVenueAddress("Punto seleccionado en el mapa");
    }
    if (!venueName.trim()) setVenueName("Lugar seleccionado");
  };

  const handleOpenVenuePicker = () => {
    const next = !showVenuePicker;
    setShowVenuePicker(next);
    if (next) void loadNearbyPlaces();
  };

  const handleCreateVenue = async () => {
    const trimmed = venueName.trim();
    if (!trimmed) {
      Alert.alert("Falta el nombre", "Escribe el nombre del bar o selecciona un resultado.");
      return;
    }
    if (!selectedCoordinate) {
      Alert.alert("Selecciona el punto exacto", "Busca la dirección o toca el mapa para indicar dónde está el lugar.");
      return;
    }

    try {
      setIsSubmitting(true);
      let existing: Venue | null = null;
      if (selectedPlace) {
        const lookup = await supabase
          .from("venues")
          .select("id, name, address, city, latitude, longitude")
          .eq("source", selectedPlace.source)
          .eq("source_id", selectedPlace.id)
          .maybeSingle();
        existing = (lookup.data as Venue | null) ?? null;
      }

      let data: Venue | null = existing;
      if (!data) {
        const payload = {
          name: trimmed,
          address: venueAddress.trim() || null,
          city: venueCity.trim() || null,
          country: venueCountry.trim() || "Venezuela",
          latitude: selectedCoordinate.latitude,
          longitude: selectedCoordinate.longitude,
          source: selectedPlace?.source ?? "user",
          source_id: selectedPlace?.id ?? null,
        };
        let created = await supabase.from("venues").insert(payload).select(VENUE_FIELDS).single();
        if (created.error && /column|schema cache/i.test(created.error.message)) {
          created = await supabase.from("venues").insert({
            name: payload.name,
            address: payload.address,
            city: payload.city,
            latitude: payload.latitude,
            longitude: payload.longitude,
          }).select(LEGACY_VENUE_FIELDS).single();
        }
        if (created.error) throw created.error;
        data = created.data as Venue;
      }

      setVenues((previous) => [data as Venue, ...previous.filter((venue) => venue.id !== data?.id)]);
      setSelectedVenueId((data as Venue).id);
      setShowCreateVenue(false);
      resetVenueDraft();
      Alert.alert("Lugar guardado", "Ya puedes hacer check-in en el lugar exacto seleccionado.");
    } catch (err) {
      Alert.alert("No se pudo guardar", err instanceof Error ? err.message : "Revisa la conexión con Supabase.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckIn = async () => {
    if (!selectedVenue || !user) {
      setShowVenuePicker(true);
      return;
    }

    try {
      setIsSubmitting(true);
      if (Platform.OS !== "web") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await supabase.from("checkins").update({ status: "ended" }).eq("user_id", user.id).eq("status", "active");

      const { data, error } = await supabase.from("checkins").insert({ user_id: user.id, venue_id: selectedVenue.id, status: "active" }).select("id, created_at").single();
      if (error) throw error;

      setActiveCheckin({
        id: data.id,
        venueId: selectedVenue.id,
        venueName: selectedVenue.name,
        createdAt: data.created_at,
      });
      setShowVenuePicker(false);

      if (Platform.OS !== "web") {
        await Notifications.scheduleNotificationAsync({
          content: { title: "Check-in compartido", body: `Tus amigos pueden verte en ${selectedVenue.name}.`, data: { screen: "friends" } },
          trigger: null,
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert("Check-in activo", `Ahora estás en ${selectedVenue.name}.`);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo hacer check-in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    if (!user) return;
    try {
      setIsSubmitting(true);
      const { error } = await supabase.from("checkins").update({ status: "ended" }).eq("user_id", user.id).eq("status", "active");
      if (error) throw error;
      setActiveCheckin(null);
      Alert.alert("Check-out realizado", "Tus amigos verán que terminaste tu visita.");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo hacer check-out.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCheckedIn = Boolean(activeCheckin);

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 justify-center gap-7">
          <View className="items-center gap-2">
            <Text className="text-4xl font-bold text-foreground">{isCheckedIn ? "¡Estás en un lugar!" : "¿Dónde estás?"}</Text>
            <Text className="text-center text-base text-muted">{isCheckedIn ? `Activo en ${activeCheckin?.venueName}` : "Notifica a tus amigos dónde estás tomando algo"}</Text>
          </View>

          <View className="items-center">
            <Pressable onPress={isCheckedIn ? handleCheckOut : handleCheckIn} disabled={isSubmitting} style={({ pressed }) => ({ width: 160, height: 160, alignItems: "center", justifyContent: "center", borderRadius: 80, backgroundColor: isCheckedIn ? colors.success : colors.primary, transform: [{ scale: pressed && !isSubmitting ? 0.95 : 1 }], opacity: isSubmitting ? 0.7 : 1 })}>
              {isSubmitting ? <ActivityIndicator size="large" color={colors.background} /> : <IconSymbol name={isCheckedIn ? "checkmark.circle.fill" : "cup.and.saucer.fill"} size={56} color={colors.background} />}
            </Pressable>
            <Text className="mt-6 text-lg font-semibold text-foreground">{isCheckedIn ? "Hacer Check-out" : "Hacer check-in"}</Text>
          </View>

          <View className="rounded-2xl border bg-surface p-5" style={{ borderColor: colors.border }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="h-3 w-3 rounded-full" style={{ backgroundColor: isCheckedIn ? colors.success : colors.muted }} />
                <Text className="text-sm font-semibold text-foreground">{isCheckedIn ? "Online" : "Offline"}</Text>
              </View>
              <Pressable onPress={handleOpenVenuePicker} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}>
                <Text className="text-right text-sm font-semibold" style={{ color: colors.primary }}>{selectedVenue?.name ?? "Elegir lugar"}</Text>
              </Pressable>
            </View>
            <Text className="mt-3 text-sm leading-5 text-muted">{isCheckedIn ? `Tus amigos pueden verte en ${activeCheckin?.venueName}.` : "Busca un lugar cercano o selecciona su punto exacto en el mapa."}</Text>
          </View>

          {showVenuePicker ? (
            <View className="rounded-2xl border bg-surface p-4" style={{ borderColor: colors.border }}>
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-foreground">Selecciona un lugar</Text>
                <Pressable onPress={() => setShowVenuePicker(false)} style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.65 : 1 })}><Text className="text-sm font-semibold" style={{ color: colors.primary }}>Cerrar</Text></Pressable>
              </View>

              <View className="mt-3 flex-row gap-2">
                <TextInput value={venueQuery} onChangeText={setVenueQuery} onSubmitEditing={() => void handleSearchPlaces()} placeholder="Dirección o bar en Venezuela" placeholderTextColor={colors.muted} returnKeyType="search" className="flex-1 rounded-xl border bg-background px-3 py-3 text-foreground" style={{ borderColor: colors.border }} />
                <Pressable onPress={() => void handleSearchPlaces()} style={({ pressed }) => ({ minWidth: 84, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 })}><Text className="text-xs font-bold text-background">Buscar</Text></Pressable>
              </View>

              <Pressable onPress={() => void loadNearbyPlaces()} style={({ pressed }) => ({ marginTop: 10, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.7 : 1 })}>
                <Text className="text-sm font-semibold text-foreground">{isSearchingPlaces ? "Buscando lugares…" : "Buscar cerca de mí"}</Text>
              </Pressable>

              {isSearchingPlaces ? <ActivityIndicator className="mt-3" color={colors.primary} /> : null}
              {mergedPlaces.length > 0 ? (
                <View className="mt-3 gap-2">
                  <Text className="text-xs font-semibold text-muted">Resultados reales de OpenStreetMap</Text>
                  {mergedPlaces.slice(0, 8).map((place) => (
                    <Pressable key={place.id} onPress={() => handleSelectPlace(place)} style={({ pressed }) => ({ borderRadius: 12, borderWidth: 1, borderColor: selectedPlace?.id === place.id ? colors.primary : colors.border, backgroundColor: selectedPlace?.id === place.id ? `${colors.primary}15` : colors.background, padding: 12, opacity: pressed ? 0.7 : 1 })}>
                      <Text className="font-semibold text-foreground">{place.name}</Text>
                      <Text className="mt-1 text-xs leading-4 text-muted" numberOfLines={2}>{place.address}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <View className="mt-4">
                <VenueMapPicker initialCoordinate={deviceCoordinate} selectedCoordinate={selectedCoordinate} onSelect={(coordinate) => void handleMapCoordinate(coordinate)} />
                <Text className="mt-2 text-[10px] leading-4 text-muted">Mapa y lugares: © OpenStreetMap contributors. La búsqueda se realiza solo cuando tú la solicitas.</Text>
              </View>

              {!showCreateVenue ? (
                <Pressable onPress={() => setShowCreateVenue(true)} style={({ pressed }) => ({ marginTop: 12, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: colors.primary, opacity: pressed ? 0.7 : 1 })}>
                  <Text className="text-sm font-semibold" style={{ color: colors.primary }}>+ Añadir este lugar a Tragos Sociales</Text>
                </Pressable>
              ) : (
                <View className="mt-3 gap-2">
                  <TextInput value={venueName} onChangeText={setVenueName} placeholder="Nombre del bar o lugar" placeholderTextColor={colors.muted} className="rounded-xl border bg-background px-3 py-3 text-foreground" style={{ borderColor: colors.border }} />
                  <TextInput value={venueAddress} onChangeText={setVenueAddress} placeholder="Dirección exacta" placeholderTextColor={colors.muted} className="rounded-xl border bg-background px-3 py-3 text-foreground" style={{ borderColor: colors.border }} />
                  <View className="flex-row gap-2">
                    <TextInput value={venueCity} onChangeText={setVenueCity} placeholder="Ciudad" placeholderTextColor={colors.muted} className="flex-1 rounded-xl border bg-background px-3 py-3 text-foreground" style={{ borderColor: colors.border }} />
                    <TextInput value={venueCountry} onChangeText={setVenueCountry} placeholder="País" placeholderTextColor={colors.muted} className="flex-1 rounded-xl border bg-background px-3 py-3 text-foreground" style={{ borderColor: colors.border }} />
                  </View>
                  <Pressable onPress={() => void handleCreateVenue()} disabled={isSubmitting} style={({ pressed }) => ({ minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.primary, opacity: pressed || isSubmitting ? 0.75 : 1 })}>
                    <Text className="font-semibold text-background">{isSubmitting ? "Guardando…" : "Guardar lugar exacto"}</Text>
                  </Pressable>
                </View>
              )}

              <View className="mt-4 gap-2">
                {isLoadingVenues ? <ActivityIndicator color={colors.primary} /> : null}
                {venues.length === 0 && !isLoadingVenues ? <Text className="text-sm leading-5 text-muted">Todavía no tienes lugares guardados. Busca uno o añade el punto exacto.</Text> : null}
                {venues.map((venue) => (
                  <Pressable key={venue.id} onPress={() => { setSelectedVenueId(venue.id); setShowVenuePicker(false); }} style={({ pressed }) => ({ borderRadius: 12, borderWidth: 1, borderColor: selectedVenue?.id === venue.id ? colors.primary : colors.border, backgroundColor: selectedVenue?.id === venue.id ? `${colors.primary}15` : colors.background, padding: 12, opacity: pressed ? 0.7 : 1 })}>
                    <Text className="font-semibold text-foreground">{venue.name}</Text>
                    {venue.address ? <Text className="mt-1 text-xs text-muted" numberOfLines={2}>{venue.address}</Text> : null}
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {isCheckedIn ? (
            <Pressable onPress={() => router.push("/(tabs)/map")} style={({ pressed }) => ({ alignItems: "center", borderRadius: 12, borderColor: colors.border, borderWidth: 1, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}>
              <Text className="font-semibold text-foreground">Ver amigos en el mapa</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
