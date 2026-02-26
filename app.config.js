// Load .env so EXPO_PUBLIC_* are available when config is evaluated
require("dotenv").config({ path: ".env" });

export default ({ config }) => ({
  ...config,
  extra: {
    ...config?.extra,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? "",
  },
});
