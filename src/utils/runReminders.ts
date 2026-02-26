import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { RunSchedule } from "../types/runSchedule";

const RUN_REMINDER_PREFIX = "run-reminder-";
const FOLLOWUP_SUFFIX = "-followup";

/** Motivational title/body pairs for the main reminder (randomized per day). */
const MOTIVATIONAL_MESSAGES: Array<{ title: string; body: string }> = [
  { title: "Your run is calling", body: "Lace up and show the streets who's boss. Open Territory and START RUN." },
  { title: "Time to own your route", body: "Every run counts. Hit START RUN and add another win to your map." },
  { title: "Ready when you are", body: "A short run beats no run. Open Territory and get moving." },
  { title: "Territory waits for no one", body: "Your map is ready. Open Territory, hit START RUN, and claim your ground." },
  { title: "Move it", body: "The best run is the one you do. Open Territory and START RUN." },
  { title: "Run o'clock", body: "Your scheduled run is now. Open Territory and hit START RUN." },
  { title: "Let's go", body: "You set the reminder—now own it. Open Territory and START RUN." },
];

/** Short "delayed run" nudge for the 15-min follow-up (randomized per day). */
const DELAYED_MESSAGES: Array<{ title: string; body: string }> = [
  { title: "Run is already delayed", body: "No worries—start now and you'll still crush it. Open Territory → START RUN." },
  { title: "Still time to run", body: "Your scheduled run is waiting. A late start beats no start. Open Territory." },
  { title: "Quick reminder", body: "You planned to run—slide in now. Open Territory and hit START RUN." },
  { title: "Don't skip it", body: "Your run is delayed but not cancelled. Open Territory and go." },
  { title: "One tap away", body: "Your scheduled run is waiting. Open Territory and START RUN when you're ready." },
  { title: "Back on track", body: "Get back to your plan. Open Territory and start your run." },
  { title: "You've got this", body: "Fifteen minutes late is still a win. Open Territory and START RUN." },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

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

/** Cancel follow-up reminders so they don't fire after user has started a run. Pass current weekday (0–6) to cancel only that day's follow-up. */
export async function cancelRunReminderFollowUp(weekday?: number): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const suffix = FOLLOWUP_SUFFIX;
  for (const n of scheduled) {
    if (!n.identifier.startsWith(RUN_REMINDER_PREFIX) || !n.identifier.endsWith(suffix)) continue;
    if (weekday !== undefined) {
      const dayStr = n.identifier.slice(RUN_REMINDER_PREFIX.length, -suffix.length);
      if (dayStr !== String(weekday)) continue;
    }
    await Notifications.cancelScheduledNotificationAsync(n.identifier);
  }
}

/** Compute (hour, minute) 15 minutes after given hour/minute; if past midnight, return next day (1–7). */
function addFifteenMinutes(
  hour: number,
  minute: number
): { hour: number; minute: number; nextDay: boolean } {
  const m = minute + 15;
  const min = m % 60;
  const carry = Math.floor(m / 60);
  const h = hour + carry;
  if (h >= 24) return { hour: h % 24, minute: min, nextDay: true };
  return { hour: h, minute: min, nextDay: false };
}

/**
 * Schedule weekly run reminders for the given schedule.
 * For each day: main reminder at set time (random motivational message) and follow-up 15 min later (delayed nudge).
 * Android: one notification per selected weekday (WeeklyTrigger).
 * iOS: one per selected weekday (CalendarTrigger with weekday + repeats).
 */
export async function scheduleRunReminders(schedule: RunSchedule): Promise<void> {
  await cancelRunReminders();
  if (!schedule.enabled || schedule.days.length === 0) return;

  const channelId = Platform.OS === "android" ? "run-reminders" : undefined;

  for (const day of schedule.days) {
    const motivational = pickRandom(MOTIVATIONAL_MESSAGES);
    const delayed = pickRandom(DELAYED_MESSAGES);
    const { hour: followHour, minute: followMinute, nextDay: followNextDay } = addFifteenMinutes(
      schedule.hour,
      schedule.minute
    );
    const followWeekday = followNextDay ? ((day + 2) % 7) || 7 : day + 1;
    const mainIdentifier = `${RUN_REMINDER_PREFIX}${day}`;
    const followIdentifier = `${RUN_REMINDER_PREFIX}${day}${FOLLOWUP_SUFFIX}`;

    if (Platform.OS === "android") {
      const weekday = day + 1;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: motivational.title,
          body: motivational.body,
          sound: "default",
          channelId,
          data: { day },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour: schedule.hour,
          minute: schedule.minute,
          channelId,
        },
        identifier: mainIdentifier,
      });
      await Notifications.scheduleNotificationAsync({
        content: {
          title: delayed.title,
          body: delayed.body,
          sound: "default",
          channelId,
          data: { day },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: followWeekday,
          hour: followHour,
          minute: followMinute,
          channelId,
        },
        identifier: followIdentifier,
      });
    } else {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: motivational.title,
          body: motivational.body,
          sound: "default",
          data: { day },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          weekday: day + 1,
          hour: schedule.hour,
          minute: schedule.minute,
          repeats: true,
        },
        identifier: mainIdentifier,
      });
      await Notifications.scheduleNotificationAsync({
        content: {
          title: delayed.title,
          body: delayed.body,
          sound: "default",
          data: { day },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          weekday: followWeekday,
          hour: followHour,
          minute: followMinute,
          repeats: true,
        },
        identifier: followIdentifier,
      });
    }
  }
}
