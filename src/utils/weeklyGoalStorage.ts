import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "territory_weekly_goal_km";

/** Get saved weekly distance goal in km. Default 0 = not set. */
export async function getWeeklyGoalKm(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw == null) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Set weekly distance goal in km. Use 0 to clear. */
export async function setWeeklyGoalKm(km: number): Promise<void> {
  const value = Math.max(0, Math.round(km * 10) / 10);
  await AsyncStorage.setItem(STORAGE_KEY, value.toString());
}
