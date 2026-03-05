import Constants from "expo-constants";

/**
 * True when Mapbox can be used: dev/standalone build with a valid access token.
 * Without a token, Mapbox SDK crashes on load — show placeholder instead.
 */
export function isMapboxAvailable(): boolean {
  if (Constants.appOwnership === "expo") return false;
  const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
  return typeof token === "string" && token.length > 0;
}
