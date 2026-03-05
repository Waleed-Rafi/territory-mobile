// Load .env so EXPO_PUBLIC_* are available when config is evaluated
require("dotenv").config({ path: ".env" });

export default ({ config }) => {
  const expo = config?.expo ?? {};
  const ios = expo.ios ?? {};
  const android = expo.android ?? {};
  const plugins = [
    ...(expo.plugins ?? []).filter((p: unknown) => {
      const name = Array.isArray(p) ? p[0] : p;
      return name !== "@rnmapbox/maps" && name !== "expo-image-picker";
    }),
    ["expo-image-picker", { cameraPermission: false }],
    "@rnmapbox/maps",
  ];
  return {
    ...config,
    expo: {
      ...expo,
      name: "Territory",
      slug: expo.slug ?? "territory",
      plugins,
      ios: {
        ...ios,
        supportsTablet: ios.supportsTablet ?? true,
        bundleIdentifier: ios.bundleIdentifier ?? "com.territory.app",
        icon: ios.icon ?? expo.icon ?? "./assets/icon.png",
        infoPlist: {
          ...(ios.infoPlist ?? {}),
          CFBundleDisplayName: "Territory",
        },
      },
      android: {
        ...android,
        package: android.package ?? "com.territory.app",
        label: "Territory",
        config: android.config ?? {},
        blockedPermissions: ["android.permission.RECORD_AUDIO", "android.permission.CAMERA"],
      },
      extra: {
        ...(expo.extra ?? {}),
        ...(config?.expo?.extra ?? {}),
        eas: {
          projectId: expo.extra?.eas?.projectId ?? config?.expo?.extra?.eas?.projectId ?? "14efef35-0809-45fc-8fa7-fd264ad2b9de",
        },
        supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
        supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? "",
      },
    },
  };
};
