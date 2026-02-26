import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RunSchedule } from "../types/runSchedule";
import { DEFAULT_RUN_SCHEDULE } from "../types/runSchedule";

const STORAGE_KEY = "territory_run_schedule";

export async function getRunSchedule(): Promise<RunSchedule> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RUN_SCHEDULE;
    const parsed = JSON.parse(raw) as RunSchedule;
    return {
      enabled: Boolean(parsed.enabled),
      days: Array.isArray(parsed.days) ? parsed.days.filter((d) => d >= 0 && d <= 6) : DEFAULT_RUN_SCHEDULE.days,
      hour: typeof parsed.hour === "number" ? Math.max(0, Math.min(23, parsed.hour)) : DEFAULT_RUN_SCHEDULE.hour,
      minute: typeof parsed.minute === "number" ? Math.max(0, Math.min(59, parsed.minute)) : DEFAULT_RUN_SCHEDULE.minute,
    };
  } catch {
    return DEFAULT_RUN_SCHEDULE;
  }
}

export async function setRunSchedule(schedule: RunSchedule): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
}
