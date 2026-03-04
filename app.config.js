// Load .env so EXPO_PUBLIC_* are available when config is evaluated
require("dotenv").config({ path: ".env" });

export default ({ config }) => {
  const expo = config?.expo ?? {};
  const ios = expo.ios ?? {};
  const android = expo.android ?? {};
  const plugins = [...(expo.plugins ?? []).filter((p: unknown) => (Array.isArray(p) ? p[0] : p) !== "@rnmapbox/maps"), "@rnmapbox/maps"];
  return {
    ...config,
    expo: {
      ...expo,
      plugins,
      ios: {
        supportsTablet: ios.supportsTablet ?? true,
        bundleIdentifier: ios.bundleIdentifier ?? "com.territory.app",
        infoPlist: ios.infoPlist ?? {},
        ...ios,
      },
      android: {
        ...android,
        package: android.package ?? "com.territory.app",
        config: android.config ?? {},
      },
    },
    extra: {
      ...config?.extra,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? "",
    },
  };
};
