/**
 * Navigation screen names and route constants.
 */

export const ROOT_SCREENS = {
  Auth: "Auth",
} as const;

export const TAB_SCREENS = {
  Map: "Map",
  Run: "Run",
  Activity: "Activity",
  Profile: "Profile",
} as const;

export type TabScreenName = keyof typeof TAB_SCREENS;
