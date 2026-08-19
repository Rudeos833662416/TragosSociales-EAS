const { withAndroidManifest } = require("@expo/config-plugins");

/** Inyecta la clave de Google Maps en el AndroidManifest durante expo prebuild. */
module.exports = function withGoogleMapsAndroid(config) {
  return withAndroidManifest(config, (manifestConfig) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return manifestConfig;

    const application = manifestConfig.modResults.manifest.application?.[0];
    if (!application) return manifestConfig;

    const metadata = application["meta-data"] ?? [];
    const keyMetadata = {
      $: {
        "android:name": "com.google.android.geo.API_KEY",
        "android:value": apiKey,
      },
    };
    const existingIndex = metadata.findIndex((item) => item.$?.["android:name"] === "com.google.android.geo.API_KEY");

    if (existingIndex >= 0) {
      metadata[existingIndex] = keyMetadata;
    } else {
      metadata.push(keyMetadata);
    }
    application["meta-data"] = metadata;

    return manifestConfig;
  });
};
