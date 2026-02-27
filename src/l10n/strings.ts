/**
 * Centralized user-facing strings for i18n readiness.
 * Use these instead of hardcoded copy in screens.
 */

export const strings = {
  common: {
    ok: "OK",
    cancel: "Cancel",
    save: "Save",
    error: "Error",
    loading: "Loading…",
    refreshing: "Refreshing…",
  },
  profile: {
    signOut: "Sign out",
    weeklyGoal: "Weekly goal",
    weeklyGoalHint: "Set a distance target to stay motivated",
    weeklyGoalProgress: (km: number, target: number, runs: number) =>
      `This week: ${km.toFixed(1)} / ${target} km · ${runs} runs`,
    runReminders: "Run reminders",
    runRemindersHint: "Set days & time to build a habit",
    terms: "Terms and Conditions",
    termsHint: "Read our terms of use",
    about: "About & Privacy",
    aboutHint: "App info and privacy policy",
    leaderboard: "Leaderboard",
    leaderboardHint: "Compete with other runners",
    comingSoon: "Coming soon",
    personalRecords: "Personal records",
    personalRecordsEmpty: "No records yet",
    personalRecordsHint: "Run at least 1 km to see your best times at 5k, 10k, half marathon, and more.",
    runHistory: "Run history",
    runHistoryHint: "View and open any of your past runs.",
    runHistoryEmpty: "No runs yet. Start a run from the Map tab!",
    gettingStarted: "Getting started",
    gettingStartedHint: "Tips to make the most of Territory",
    thisWeek: "This week",
    thisMonth: "This month",
    runs: "runs",
    last5Weeks: "Last 5 weeks",
    currentWeek: "Current week",
    levelLabel: (level: number) =>
      `Level ${level}. Tap to view level details and progress.`,
    weeklyGoalA11y: "Weekly goal. Tap to set or change your weekly distance target.",
    runRemindersA11y: "Run reminders. Tap to set days and time for run reminders.",
    locationNotSet: "Location not set",
    runner: "Runner",
  },
  run: {
    startRun: "Start run",
    stopRun: "Stop run",
    savingRun: "Saving run",
    tapToFinish: "Tap to finish",
    saveRun: "Save run",
    startRunA11y: "Start run",
    stopRunA11y: "Stop run",
    savingRunA11y: "Saving run",
    loopClosed: "Loop closed! Stop to claim territory",
    startToTrack: "Start run to track your route",
    tipLoop: "Run a loop that encloses an area (not a straight line) to claim territory. You can claim multiple loops in one run.",
  },
  map: {
    startRun: "Start run",
    startRunButton: "START RUN",
    myLocationA11y: "Center map on my location",
  },
  auth: {
    signIn: "Sign in",
    signUp: "Sign up",
    signInWithGoogle: "Sign in with Google",
    signInA11y: "Sign in",
    signUpA11y: "Sign up",
  },
  activity: {
    title: "ACTIVITY",
    empty: "No activity yet. Start running to see your feed!",
    tapToViewDetails: (title: string) => `${title}. Tap to view details.`,
    loading: "Loading…",
    share: "Share",
    shareA11y: "Share this activity",
    shareCardTitle: "Share activity",
    saveToPhotos: "Save to photos",
    saveToPhotosA11y: "Save activity card to photos",
    shareToStory: "Share",
    shareToStoryA11y: "Share activity card",
    savedToPhotos: "Saved to photos",
    shareError: "Could not share. Try saving to photos instead.",
    saveError: "Could not save. Allow photo access in Settings.",
  },
  level: {
    activity: "Activity",
    maxLevel: "You've reached max level",
    howYouEarnXp: "How you earn XP",
    yourXpBreakdown: "Your XP breakdown",
    levelUpFaster: "Level up faster",
    nextLevel: (n: number) => `Next: Level ${n}`,
    total: "Total",
    progressToLevel: (n: number) => `Progress to Level ${n}`,
    xpToGo: (n: number) => `${n} XP to go`,
    allLevels: "All levels",
  },
  reminders: {
    saveReminders: "Save reminders",
    saveRemindersA11y: "Save reminders",
    saving: "Saving",
    hint: "Steps of 30 minutes. Tap ± to change.",
  },
  errors: {
    loadProfile: "Failed to load profile.",
    loadRunStats: "Failed to load run stats.",
    loadActivity: "Failed to load activity.",
  },
} as const;

/** Get a string by dot path, e.g. t('common.ok'). Returns the path if not found. */
export function t(path: string): string {
  const parts = path.split(".");
  let v: unknown = strings;
  for (const p of parts) {
    v = (v as Record<string, unknown>)?.[p];
  }
  return typeof v === "string" ? v : path;
}
