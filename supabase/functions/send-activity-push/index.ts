// Supabase Edge Function: sends an Expo Push notification for every new activity.
// Deploy with: supabase functions deploy send-activity-push --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ActivityRecord = {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: "check_in" | "check_out" | "friend_request" | "reaction_checkin" | "reaction_story";
  message: string;
  created_at: string;
};

type WebhookPayload = { record?: ActivityRecord } | ActivityRecord;

type EdgeRuntime = {
  Deno: {
    env: { get(name: string): string | undefined };
    serve(handler: (request: Request) => Response | Promise<Response>): void;
  };
};

const edgeRuntime = (globalThis as unknown as EdgeRuntime).Deno;

const corsHeaders = {
  "Content-Type": "application/json",
};

function getActivity(payload: WebhookPayload): ActivityRecord | null {
  const candidate = ("record" in payload ? payload.record : payload) as Partial<ActivityRecord> | undefined;
  if (!candidate?.id || !candidate.recipient_id || !candidate.actor_id || !candidate.message) return null;
  return candidate as ActivityRecord;
}

function routeFor(type: ActivityRecord["type"]) {
  return type === "friend_request" ? "/(tabs)/friends" : "/(tabs)/activity";
}

edgeRuntime.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const expectedSecret = edgeRuntime.env.get("PUSH_WEBHOOK_SECRET");
  if (!expectedSecret || request.headers.get("x-push-webhook-secret") !== expectedSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const payload = (await request.json()) as WebhookPayload;
  const activity = getActivity(payload);
  if (!activity) {
    return new Response(JSON.stringify({ error: "invalid activity payload" }), { status: 400, headers: corsHeaders });
  }

  const supabaseUrl = edgeRuntime.env.get("SUPABASE_URL");
  const serviceRoleKey = edgeRuntime.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "missing Supabase secrets" }), { status: 500, headers: corsHeaders });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const devicesResult = await admin
    .from("user_push_devices")
    .select("expo_push_token")
    .eq("user_id", activity.recipient_id)
    .eq("enabled", true);
  const actorResult = await admin
    .from("profiles")
    .select("name")
    .eq("id", activity.actor_id)
    .maybeSingle();
  const devices = (devicesResult.data ?? []) as { expo_push_token: string }[];
  const actor = actorResult.data as { name: string | null } | null;
  const devicesError = devicesResult.error;

  if (devicesError) {
    return new Response(JSON.stringify({ error: devicesError.message }), { status: 500, headers: corsHeaders });
  }

  const tokens = devices.map((device) => device.expo_push_token).filter(Boolean);
  if (tokens.length === 0) {
    return new Response(JSON.stringify({ delivered: 0, reason: "no registered devices" }), { status: 200, headers: corsHeaders });
  }

  const actorName = actor?.name?.trim() || "Un amigo";
  const messages = tokens.map((to) => ({
    to,
    title: "Tragos Sociales",
    body: `${actorName} ${activity.message}`,
    sound: "default",
    channelId: "social-activity",
    badge: 1,
    data: {
      route: routeFor(activity.type),
      activityId: activity.id,
      activityType: activity.type,
    },
  }));

  const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  const expoPayload = await expoResponse.json().catch(() => null) as { data?: { status?: string; details?: { error?: string } }[] } | null;
  if (!expoResponse.ok) {
    return new Response(JSON.stringify({ error: "Expo Push Service rejected the notification", expoPayload }), { status: 502, headers: corsHeaders });
  }

  const invalidTokens = (expoPayload?.data ?? [])
    .map((ticket, index) => ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered" ? tokens[index] : null)
    .filter((token): token is string => Boolean(token));

  if (invalidTokens.length > 0) {
    await admin.from("user_push_devices").delete().in("expo_push_token", invalidTokens);
  }
  await admin.from("user_push_devices").update({ last_notified_at: new Date().toISOString() }).in("expo_push_token", tokens);

  return new Response(JSON.stringify({ delivered: tokens.length, invalidTokensRemoved: invalidTokens.length }), { status: 200, headers: corsHeaders });
});
