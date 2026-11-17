const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Expo config plugin that injects the Google Maps API key into
 * AndroidManifest.xml as a <meta-data> element inside <application>.
 *
 * Usage in app.config.js:
 *   [require.resolve('./plugins/withGoogleMapsApiKey'), process.env.GOOGLE_MAPS_API_KEY]
 */
function withGoogleMapsApiKey(config, apiKey) {
  if (!apiKey) {
    console.warn(
      "withGoogleMapsApiKey: No API key provided. Google Maps will not work on Android."
    );
    return config;
  }

  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    if (!manifest.application || manifest.application.length === 0) {
      console.warn("withGoogleMapsApiKey: No <application> element found in AndroidManifest.");
      return config;
    }

    const application = manifest.application[0];

    if (!application["meta-data"]) {
      application["meta-data"] = [];
    }

    // Remove existing Google Maps API key entry if present
    application["meta-data"] = application["meta-data"].filter(
      (item) => item.$["android:name"] !== "com.google.android.geo.API_KEY"
    );

    // Add the new Google Maps API key
    application["meta-data"].push({
      $: {
        "android:name": "com.google.android.geo.API_KEY",
        "android:value": apiKey,
      },
    });

    return config;
  });
}

module.exports = withGoogleMapsApiKey;
