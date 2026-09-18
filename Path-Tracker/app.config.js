module.exports = {
  expo: {
    name: 'Path Tracker',
    slug: 'path-tracker',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'pathtracker',
    userInterfaceStyle: 'dark',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#0F1115',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.pathtracker.app',
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
      infoPlist: {
        UIBackgroundModes: ['location'],
        NSLocationWhenInUseUsageDescription:
          'Path Tracker uses your location to record your trip, show your travelled path, and guide you back to the start.',
        NSLocationAlwaysAndWhenInUseUsageDescription:
          'Path Tracker needs location access in the background to keep recording your trip when the screen is locked.',
        NSLocationAlwaysUsageDescription:
          'Path Tracker needs location access in the background to keep recording your trip when the screen is locked.',
      },
    },
    android: {
      package: 'com.pathtracker.app',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0F1115',
      },
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
        'FOREGROUND_SERVICE',
        'FOREGROUND_SERVICE_LOCATION',
        'VIBRATE',
        'RECEIVE_BOOT_COMPLETED',
        'WAKE_LOCK',
        'POST_NOTIFICATIONS',
      ],
    },
    web: {
      bundler: 'metro',
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      // Inject Google Maps API key into AndroidManifest.xml
      [require.resolve('./plugins/withGoogleMapsApiKey'), process.env.GOOGLE_MAPS_API_KEY],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow Path Tracker to use your location to record trips and guide you back to the start.',
          locationAlwaysPermission:
            'Allow Path Tracker to use your location to record trips while the app is in the background.',
          locationWhenInUsePermission:
            'Allow Path Tracker to use your location to record trips.',
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true,
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#208AEF',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: '20e8e109-af47-4344-aa86-7f4f4a5f509b',
      },
    },
    owner: process.env.EXPO_OWNER,
  },
};
