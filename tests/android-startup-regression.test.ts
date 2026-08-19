import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Android startup regression guards", () => {
  it("keeps session, notification and icon startup safeguards in place", async () => {
    const [authSource, pushSource, iconSource, rootLayout] = await Promise.all([
      readFile(join(process.cwd(), "hooks/use-auth.ts"), "utf8"),
      readFile(join(process.cwd(), "components/push-notification-bootstrap.tsx"), "utf8"),
      readFile(join(process.cwd(), "components/ui/icon-symbol.tsx"), "utf8"),
      readFile(join(process.cwd(), "app/_layout.tsx"), "utf8"),
    ]);

    expect(authSource).toContain("SESSION_CHECK_TIMEOUT_MS");
    expect(authSource).toContain("La comprobación de sesión tardó demasiado");
    expect(authSource).toContain("setLoading(false)");
    expect(pushSource).toContain("Initial push route unavailable");
    expect(pushSource).toContain("Push response listener unavailable");
    expect(pushSource).toContain("Push token listener unavailable");
    expect(pushSource).toContain("PUSH_NOTIFICATIONS_ENABLED");
    expect(iconSource).toContain('MAPPING[name] ?? "help-outline"');
    expect(rootLayout).toContain("AppErrorBoundary");
  });

  it("declares the native Expo assets needed by standalone Android builds", async () => {
    const packageJson = JSON.parse(await readFile(join(process.cwd(), "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    };
    const appConfig = await readFile(join(process.cwd(), "app.config.js"), "utf8");

    expect(packageJson.dependencies["expo-asset"]).toBeTruthy();
    expect(appConfig).toContain('"expo-asset"');
    expect(appConfig).toContain('"expo-font"');
    expect(appConfig).toContain('"expo-web-browser"');
    expect(appConfig).toContain('f4eb060a-a0e9-4124-9b02-2087982bdd05');
  });

  it("keeps the Supabase callback registered as an exact Android deep link", async () => {
    const [appConfig, manifest, supabaseSource] = await Promise.all([
      readFile(join(process.cwd(), "app.config.js"), "utf8"),
      readFile(join(process.cwd(), "android/app/src/main/AndroidManifest.xml"), "utf8"),
      readFile(join(process.cwd(), "lib/supabase.ts"), "utf8"),
    ]);

    expect(supabaseSource).toContain('Linking.createURL("auth/callback", { scheme: "socialsip" })');
    expect(appConfig).toContain('host: "auth", pathPrefix: "/callback"');
    expect(appConfig).toContain('scheme: "socialsip"');
    expect(appConfig).toContain('experimentalLauncherActivity: true');
    expect(appConfig).not.toContain('host: "*"');
    expect(manifest).toContain('android:scheme="socialsip" android:host="auth" android:pathPrefix="/callback"');
    expect(manifest).not.toContain('android:host="*"');
  });

  it("keeps a root-level handler for browser-to-app Supabase callbacks", async () => {
    const [rootLayout, authHandler, loginScreen, callbackScreen, supabaseSource] = await Promise.all([
      readFile(join(process.cwd(), "app/_layout.tsx"), "utf8"),
      readFile(join(process.cwd(), "components/auth-redirect-handler.tsx"), "utf8"),
      readFile(join(process.cwd(), "app/login.tsx"), "utf8"),
      readFile(join(process.cwd(), "app/auth/callback.tsx"), "utf8"),
      readFile(join(process.cwd(), "lib/supabase.ts"), "utf8"),
    ]);

    expect(rootLayout).toContain("<AuthRedirectHandler />");
    expect(authHandler).toContain("Linking.useLinkingURL()");
    expect(authHandler).toContain("completeSupabaseAuthUrl(url)");
    expect(authHandler).toContain("WebBrowser.dismissBrowser()");
    expect(loginScreen).toContain('result.type !== "success"');
    expect(callbackScreen).not.toContain("completeSupabaseAuthUrl");
    expect(supabaseSource).toContain("const authCodeExchanges = new Map");
    expect(supabaseSource).toContain("return existingExchange");
  });

  it("pins an EAS preview environment compatible with the Android lockfile and Gradle", async () => {
    const easConfig = JSON.parse(await readFile(join(process.cwd(), "eas.json"), "utf8")) as {
      build: { preview: { corepack?: boolean; pnpm?: string; android?: { image?: string; buildType?: string } } };
    };

    expect(easConfig.build.preview.corepack).toBe(true);
    expect(easConfig.build.preview.pnpm).toBe("9.12.0");
    expect(easConfig.build.preview.android?.image).toBe("ubuntu-24.04-jdk-17-ndk-r27b");
    expect(easConfig.build.preview.android?.buildType).toBe("apk");
  });

  it("keeps the Android browser launcher needed for OAuth Custom Tab returns", async () => {
    const appConfig = await readFile(join(process.cwd(), "app.config.js"), "utf8");
    const manifest = await readFile(join(process.cwd(), "android/app/src/main/AndroidManifest.xml"), "utf8");
    const launcher = await readFile(
      join(process.cwd(), "android/app/src/main/java/com/app/socialsip/BrowserLauncherActivity.kt"),
      "utf8",
    );
    const application = await readFile(
      join(process.cwd(), "android/app/src/main/java/com/app/socialsip/MainApplication.kt"),
      "utf8",
    );

    expect(appConfig).toContain("experimentalLauncherActivity: true");
    expect(manifest).toContain('android:name=".BrowserLauncherActivity"');
    expect(launcher).toContain("class BrowserLauncherActivity : Activity()");
    expect(application).toContain("registerActivityLifecycleCallbacks(lifecycleCallbacks)");
  });
});
