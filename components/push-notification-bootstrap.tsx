import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

import { useAuth } from "@/hooks/use-auth";
import {
  getInitialPushRoute,
  getPushRouteFromResponse,
  PUSH_NOTIFICATIONS_ENABLED,
  registerDeviceForPushNotifications,
  registerRotatedExpoPushToken,
} from "@/lib/push-notifications";

/** Registers the active physical device and routes the user after tapping a push alert. */
export function PushNotificationBootstrap() {
  const { user } = useAuth({ autoFetch: true });
  const router = useRouter();

  useEffect(() => {
    if (!PUSH_NOTIFICATIONS_ENABLED || Platform.OS === "web") return;
    let active = true;
    let responseSubscription: Notifications.Subscription | undefined;

    void getInitialPushRoute()
      .then((route) => {
        if (active && route) router.push(route as never);
      })
      .catch((error) => {
        console.warn("Initial push route unavailable:", error);
      });

    try {
      responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
        router.push(getPushRouteFromResponse(response) as never);
      });
    } catch (error) {
      console.warn("Push response listener unavailable:", error);
    }

    return () => {
      active = false;
      responseSubscription?.remove();
    };
  }, [router]);

  useEffect(() => {
    if (!PUSH_NOTIFICATIONS_ENABLED || !user) return;
    void registerDeviceForPushNotifications().catch((error) => {
      // Push is optional: activity and realtime continue working if setup is incomplete.
      console.warn("Push registration unavailable:", error);
    });
    let tokenSubscription: Notifications.Subscription | undefined;
    try {
      tokenSubscription = Notifications.addPushTokenListener((token) => {
        void registerRotatedExpoPushToken(token.data).catch((error: unknown) => {
          console.warn("Push token refresh unavailable:", error);
        });
      });
    } catch (error) {
      console.warn("Push token listener unavailable:", error);
    }
    return () => tokenSubscription?.remove();
  }, [user]);

  return null;
}
