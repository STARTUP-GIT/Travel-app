const { withAppDelegate } = require("expo/config-plugins");
const { mergeContents } = require("expo/config-plugins/build/utils/generateCode");

/**
 * Expo config plugin that injects Google Maps API key into iOS AppDelegate.
 * Adds `GMSServices.provideAPIKey(...)` call.
 */
function withGoogleMapsIos(config, apiKey) {
  if (!apiKey) return config;

  return withAppDelegate(config, (config) => {
    let contents = config.modResults.contents;

    // Add import if not present
    contents = mergeContents({
      tag: "google-maps-import",
      src: contents,
      newSrc: '#import <GoogleMaps/GoogleMaps.h>',
      anchor: /#import "AppDelegate\.h"/,
      offset: 1,
      comment: "//",
    }).contents;

    // Add provideAPIKey call in application:didFinishLaunchingWithOptions:
    contents = mergeContents({
      tag: "google-maps-api-key",
      src: contents,
      newSrc: `  [GMSServices provideAPIKey:@"${apiKey}"];`,
      anchor: /didFinishLaunchingWithOptions/,
      offset: 1,
      comment: "//",
    }).contents;

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withGoogleMapsIos;
