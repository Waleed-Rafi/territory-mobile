// Load .env so EXPO_PUBLIC_* are available when config is evaluated
require("dotenv").config({ path: ".env" });

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export default ({ config }) => {
  const expo = config?.expo ?? {};
  const ios = expo.ios ?? {};
  const android = expo.android ?? {};
  return {
    ...config,
    expo: {
      ...expo,
      ios: {
        supportsTablet: ios.supportsTablet ?? true,
        bundleIdentifier: ios.bundleIdentifier ?? "com.territory.app",
        infoPlist: ios.infoPlist ?? {},
        ...ios,
      },
      android: {
        ...android,
        package: android.package ?? "com.territory.app",
        config: {
          ...android.config,
          ...(googleMapsApiKey && {
            googleMaps: { apiKey: googleMapsApiKey },
          }),
        },
      },
    },
    extra: {
      ...config?.extra,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? "",
    },
  };
};
