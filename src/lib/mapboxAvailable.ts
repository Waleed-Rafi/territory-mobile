import Constants from "expo-constants";

/** True when running in a dev/standalone build where Mapbox native code is linked. */
export function isMapboxAvailable(): boolean {
  return Constants.appOwnership !== "expo";
}
