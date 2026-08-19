import { supabase } from "@/lib/supabase";

export type FriendCheckinMarker = {
  id: number;
  userId: string;
  name: string;
  venueName: string;
  latitude: number;
  longitude: number;
  createdAt: string;
};

type CheckinRow = {
  id: number;
  user_id: string;
  created_at: string;
  venues: { name?: string | null; latitude?: number | null; longitude?: number | null } | null;
};

export async function fetchFriendCheckinMarkers(userId: string): Promise<FriendCheckinMarker[]> {
  const { data, error } = await supabase
    .from("checkins")
    .select("id, user_id, created_at, venues(name, latitude, longitude)")
    .eq("status", "active")
    .neq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;

  const rows = (data ?? []) as unknown as CheckinRow[];
  const withCoordinates = rows.filter((row) => Number.isFinite(row.venues?.latitude) && Number.isFinite(row.venues?.longitude));
  if (withCoordinates.length === 0) return [];

  const profileIds = [...new Set(withCoordinates.map((row) => row.user_id))];
  const { data: profiles, error: profilesError } = await supabase.rpc("get_visible_profiles", { p_ids: profileIds });
  if (profilesError) throw profilesError;
  const names = new Map(((profiles ?? []) as { id: string; name: string | null }[]).map((profile) => [profile.id, profile.name?.trim() || "Usuario"]));

  return withCoordinates.map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: names.get(row.user_id) || "Usuario",
    venueName: row.venues?.name?.trim() || "Lugar compartido",
    latitude: row.venues?.latitude as number,
    longitude: row.venues?.longitude as number,
    createdAt: row.created_at,
  }));
}
