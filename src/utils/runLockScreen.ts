/**
 * Lock-screen run stats: iOS Live Activity, Android ongoing notification.
 * Lets users see duration, distance, pace, and elevation without unlocking.
 * Not available in Expo Go — use a development build (npx expo run:ios / run:android).
 */

import { Platform } from "react-native";
import Constants from "expo-constants";
import { formatDistance, formatDuration, formatPace, formatElevation } from "../lib/gps";

/** Expo Go doesn't include Live Activity or Notifee; lock screen features need a dev build. */
const isExpoGo = Constants.executionEnvironment === "storeClient";

export interface RunLockScreenStats {
  distanceMeters: number;
  durationSeconds: number;
  paceMps: number;
  elevationMeters: number;
  /** Epoch ms when run started (for iOS elapsed timer). */
  startDateMs: number;
}

const ANDROID_CHANNEL_ID = "territory-run";
const ANDROID_NOTIFICATION_ID = "territory-run";

let liveActivityId: string | undefined;
let androidChannelCreated = false;

function buildSubtitle(stats: RunLockScreenStats): string {
  const dist = formatDistance(stats.distanceMeters);
  const pace = stats.paceMps > 0 ? formatPace(stats.paceMps) + "/km" : "—";
  const elev = stats.elevationMeters > 0 ? formatElevation(stats.elevationMeters) : "";
  const parts = [dist, pace];
  if (elev) parts.push(elev);
  return parts.join(" · ");
}

/** Call from app init (e.g. App.tsx) so foreground service is registered before first run. */
export function registerRunLockScreenService(): void {
  if (isExpoGo || Platform.OS !== "android") return;
  try {
    const notifee = require("@notifee/react-native").default;
    notifee.registerForegroundService(() => new Promise(() => {}));
  } catch {
    // Notifee not linked or not available
  }
}

async function ensureAndroidChannel(): Promise<void> {
  if (androidChannelCreated) return;
  try {
    const notifee = require("@notifee/react-native").default;
    await notifee.createChannel({
      id: ANDROID_CHANNEL_ID,
      name: "Active run",
      importance: 4,
      visibility: 1,
    });
    androidChannelCreated = true;
  } catch {
    // ignore
  }
}

/**
 * Start showing run stats on lock screen (Live Activity on iOS, ongoing notification on Android).
 */
export async function startRunLockScreen(stats: RunLockScreenStats): Promise<void> {
  if (isExpoGo) return;
  if (Platform.OS === "ios") {
    try {
      const LiveActivity = require("expo-live-activity");
      const subtitle = buildSubtitle(stats);
      const state = {
        title: "Territory Run",
        subtitle,
        progressBar: {
          elapsedTimer: { startDate: stats.startDateMs },
        },
      };
      const config = {
        backgroundColor: "#0f1729",
        titleColor: "#e0f5ea",
        subtitleColor: "#94a3b8",
        progressViewTint: "#22c55e",
        progressViewLabelColor: "#e0f5ea",
      };
      const id = LiveActivity.startActivity(state, config);
      if (id) liveActivityId = id;
    } catch {
      // expo-live-activity not available or prebuild not run
    }
    return;
  }

  if (Platform.OS === "android") {
    await ensureAndroidChannel();
    try {
      const notifee = require("@notifee/react-native").default;
      const { AndroidForegroundServiceType } = require("@notifee/react-native");
      const subtitle = buildSubtitle(stats);
      const duration = formatDuration(stats.durationSeconds);
      await notifee.displayNotification({
        id: ANDROID_NOTIFICATION_ID,
        title: "Territory Run",
        body: `${duration} · ${subtitle}`,
        android: {
          channelId: ANDROID_CHANNEL_ID,
          asForegroundService: true,
          ongoing: true,
          smallIcon: "ic_launcher",
          foregroundServiceTypes: [AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_LOCATION],
        },
      });
    } catch {
      // Notifee not available
    }
  }
}

/**
 * Update lock-screen run stats. Call every few seconds while running.
 */
export async function updateRunLockScreen(stats: RunLockScreenStats): Promise<void> {
  if (isExpoGo) return;
  if (Platform.OS === "ios") {
    if (!liveActivityId) return;
    try {
      const LiveActivity = require("expo-live-activity");
      const subtitle = buildSubtitle(stats);
      LiveActivity.updateActivity(liveActivityId, {
        title: "Territory Run",
        subtitle,
        progressBar: {
          elapsedTimer: { startDate: stats.startDateMs },
        },
      });
    } catch {
      // ignore
    }
    return;
  }

  if (Platform.OS === "android") {
    try {
      const notifee = require("@notifee/react-native").default;
      const { AndroidForegroundServiceType } = require("@notifee/react-native");
      const subtitle = buildSubtitle(stats);
      const duration = formatDuration(stats.durationSeconds);
      await notifee.displayNotification({
        id: ANDROID_NOTIFICATION_ID,
        title: "Territory Run",
        body: `${duration} · ${subtitle}`,
        android: {
          channelId: ANDROID_CHANNEL_ID,
          asForegroundService: true,
          ongoing: true,
          smallIcon: "ic_launcher",
          foregroundServiceTypes: [AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_LOCATION],
        },
      });
    } catch {
      // ignore
    }
  }
}

/**
 * Stop showing run stats on lock screen.
 */
export async function stopRunLockScreen(stats: RunLockScreenStats): Promise<void> {
  if (isExpoGo) return;
  if (Platform.OS === "ios") {
    if (liveActivityId) {
      try {
        const LiveActivity = require("expo-live-activity");
        const subtitle = buildSubtitle(stats);
        LiveActivity.stopActivity(liveActivityId, {
          title: "Territory Run",
          subtitle,
          progressBar: { elapsedTimer: { startDate: stats.startDateMs } },
        });
      } catch {
        // ignore
      }
      liveActivityId = undefined;
    }
    return;
  }

  if (Platform.OS === "android") {
    try {
      const notifee = require("@notifee/react-native").default;
      await notifee.stopForegroundService();
      await notifee.cancelNotification(ANDROID_NOTIFICATION_ID);
    } catch {
      // ignore
    }
  }
}
