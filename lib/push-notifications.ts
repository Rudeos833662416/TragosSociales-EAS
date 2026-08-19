import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase";

export type PushRegistrationStatus =
  | "registered"
  | "permission_denied"
  | "simulator"
  | "missing_project_id"
  | "disabled"
  | "unsupported";

export type PushRegistrationResult = {
  status: PushRegistrationStatus;
  token?: string;
};

/**
 * Push delivery stays disabled until Firebase/FCM credentials are configured and tested on a physical build.
 * This prevents Android from asking for notification permission during startup and keeps the social app usable.
 */
export const PUSH_NOTIFICATIONS_ENABLED = false;
let notificationHandlerConfigured = false;

function configureNotificationHandler() {
  if (notificationHandlerConfigured) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  notificationHandlerConfigured = true;
}

function getExpoProjectId() {
  const extra = Constants.expoConfig?.extra as { easProjectId?: string; eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? extra?.easProjectId ?? null;
}

async function saveExpoPushToken(expoPushToken: string) {
  const { error } = await supabase.rpc("register_push_device", {
    p_expo_push_token: expoPushToken,
    p_platform: Platform.OS,
  });
  if (error) throw error;
}

export async function registerDeviceForPushNotifications(): Promise<PushRegistrationResult> {
  if (!PUSH_NOTIFICATIONS_ENABLED) return { status: "disabled" };
  if (Platform.OS === "web") return { status: "unsupported" };

  configureNotificationHandler();

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("social-activity", {
      name: "Actividad social",
      description: "Check-ins, reacciones y solicitudes de amistad.",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 80, 180],
      lightColor: "#9BC4E5",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  if (!Device.isDevice) return { status: "simulator" };

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") return { status: "permission_denied" };

  const projectId = getExpoProjectId();
  if (!projectId) return { status: "missing_project_id" };

  const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await saveExpoPushToken(expoPushToken);

  return { status: "registered", token: expoPushToken };
}

export async function registerRotatedExpoPushToken(token: string) {
  if (!PUSH_NOTIFICATIONS_ENABLED) return;
  if (Platform.OS === "web") return;
  await saveExpoPushToken(token);
}

function extractPushRoute(notification: Notifications.Notification) {
  const route = notification.request.content.data?.route;
  if (route === "/(tabs)/activity" || route === "/(tabs)/friends" || route === "/(tabs)/map") {
    return route;
  }
  return "/(tabs)/activity";
}

export async function getInitialPushRoute() {
  if (Platform.OS === "web") return null;
  const response = await Notifications.getLastNotificationResponseAsync();
  return response ? extractPushRoute(response.notification) : null;
}

export function getPushRouteFromResponse(response: Notifications.NotificationResponse) {
  return extractPushRoute(response.notification);
}
