import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { Platform } from "react-native";
import { createClient, type Session, type SupportedStorage } from "@supabase/supabase-js";

const extra = Constants.expoConfig?.extra as
  | { supabaseUrl?: string; supabaseAnonKey?: string }
  | undefined;

const publicSupabaseUrl = "https://cymhbwgxmezrwofkbdqz.supabase.co";
const publicSupabaseAnonKey = "sb_publishable_V-Tjv6qV2JaEdXyumlGZ8w_HbdPp7iD";
const supabaseUrl = extra?.supabaseUrl ?? process.env.SUPABASE_URL ?? publicSupabaseUrl;
const supabaseAnonKey = extra?.supabaseAnonKey ?? process.env.SUPABASE_ANON_KEY ?? publicSupabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
}

const serverStorage: SupportedStorage = {
  getItem: async () => null,
  setItem: async () => undefined,
  removeItem: async () => undefined,
};

const storage: SupportedStorage =
  Platform.OS !== "web"
    ? AsyncStorage
    : typeof window !== "undefined"
      ? window.localStorage
      : serverStorage;

/**
 * Single native callback used by both Google OAuth and e-mail confirmation.
 * It is built from the registered standalone scheme instead of relying on a
 * browser-specific URL shape.
 */
export const SUPABASE_AUTH_REDIRECT =
  Platform.OS === "web"
    ? Linking.createURL("auth/callback")
    : Linking.createURL("auth/callback", { scheme: "socialsip" });
/**
 * The Android deep link can be observed simultaneously by Expo Router and the
 * root Linking handler. Keep one shared promise per PKCE code so only one
 * network exchange occurs and every observer receives the same session.
 */
const authCodeExchanges = new Map<string, Promise<Session | null>>();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
    flowType: "pkce",
  },
});

export async function completeSupabaseAuthUrl(url: string) {
  const parsedUrl = new URL(url);
  const errorDescription = parsedUrl.searchParams.get("error_description");
  if (errorDescription) throw new Error(errorDescription);

  const code = parsedUrl.searchParams.get("code");
  if (code) {
    const existingExchange = authCodeExchanges.get(code);
    if (existingExchange) {
      return existingExchange;
    }

    const exchange = supabase.auth
      .exchangeCodeForSession(code)
      .then(({ data, error }) => {
        if (error) throw error;
        return data.session;
      })
      .catch((error) => {
        authCodeExchanges.delete(code);
        throw error;
      });
    authCodeExchanges.set(code, exchange);
    return exchange;
  }

  const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ""));
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");
  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return data.session;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
