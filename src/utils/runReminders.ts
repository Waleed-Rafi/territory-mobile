import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { RunSchedule } from "../types/runSchedule";

const RUN_REMINDER_PREFIX = "run-reminder-";

/** Ensure notification handler shows banner/sound when app is in foreground */
export function setRunReminderNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowList: true,
    }),
  });
}

/** Create Android channel for run reminders (required for Android 8+). */
export async function ensureRunReminderChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("run-reminders", {
    name: "Run reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
  });
}

/** Request notification permission. Returns true if granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  await ensureRunReminderChannel();
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/** Cancel all scheduled run reminders (by identifier prefix). */
export async function cancelRunReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier.startsWith(RUN_REMINDER_PREFIX)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

/**
 * Schedule weekly run reminders for the given schedule.
 * Android: one notification per selected weekday (WeeklyTrigger).
 * iOS: one per selected weekday (CalendarTrigger with weekday + repeats).
 */
export async function scheduleRunReminders(schedule: RunSchedule): Promise<void> {
  await cancelRunReminders();
  if (!schedule.enabled || schedule.days.length === 0) return;

  const channelId = Platform.OS === "android" ? "run-reminders" : undefined;
  const content = {
    title: "Time to run",
    body: "Your run is waiting. Open Territory and hit START RUN.",
    sound: "default",
    channelId,
  };

  for (const day of schedule.days) {
    const identifier = `${RUN_REMINDER_PREFIX}${day}`;
    if (Platform.OS === "android") {
      const weekday = day + 1;
      await Notifications.scheduleNotificationAsync({
        content: { ...content, data: { day } },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour: schedule.hour,
          minute: schedule.minute,
          channelId,
        },
        identifier,
      });
    } else {
      await Notifications.scheduleNotificationAsync({
        content: { ...content, data: { day } },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          weekday: day + 1,
          hour: schedule.hour,
          minute: schedule.minute,
          repeats: true,
        },
        identifier,
      });
    }
  }
}
