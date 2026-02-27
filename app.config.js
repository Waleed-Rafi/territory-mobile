// Load .env so EXPO_PUBLIC_* are available when config is evaluated
require("dotenv").config({ path: ".env" });

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export default ({ config }) => ({
  ...config,
  expo: {
    ...config.expo,
    android: {
      ...config.expo?.android,
      package: config.expo?.android?.package ?? "com.territory.app",
      config: {
        ...config.expo?.android?.config,
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
});
