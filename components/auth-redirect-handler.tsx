import { completeSupabaseAuthUrl, SUPABASE_AUTH_REDIRECT } from "@/lib/supabase";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef } from "react";

/**
 * Completes a Supabase session from the raw Android deep link. Expo Router
 * renders the callback route too, but this root-level handler prevents a
 * custom-tab return from being lost while navigation is still mounting.
 */
export function AuthRedirectHandler() {
  const url = Linking.useLinkingURL();
  const lastHandledUrl = useRef<string | null>(null);

  useEffect(() => {
    const callbackPrefix = SUPABASE_AUTH_REDIRECT.split("?")[0];
    if (!url || !url.startsWith(callbackPrefix)) return;
    if (lastHandledUrl.current === url) return;

    lastHandledUrl.current = url;
    void (async () => {
      try {
        await completeSupabaseAuthUrl(url);
      } catch (error) {
        console.warn("Unable to complete incoming Supabase auth link", error);
      } finally {
        // Android Custom Tabs does not always close itself after a deep link.
        // This is intentionally best-effort because some devices do not expose
        // a dismissible browser session.
        void WebBrowser.dismissBrowser().catch(() => undefined);
      }
    })();
  }, [url]);

  return null;
}
