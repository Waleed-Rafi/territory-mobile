/**
 * React Navigation type safety – param lists and typed hooks.
 */

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { ActivityDisplay, ProfileDisplay } from "./domain";

/** Params for NameYourRun (post-run details: name, description, photos, route) */
export type NameYourRunParams = {
  runId: string;
  routePolyline: [number, number][];
  activityType: "run_completed" | "territory_claimed";
  suggestedTitle: string;
  suggestedDescription: string;
};

/** Params for ActivityDetail (tap from Activity feed) */
export type ActivityDetailParams = {
  activity: ActivityDisplay;
};

/** Params for LevelProgression (optional profile when opened from Profile) */
export type LevelProgressionParams = {
  profile?: ProfileDisplay;
};

/** Root stack: Auth when unauthenticated; Main + RunReminder + NameYourRun + Terms + About + ActivityDetail + LevelProgression + PersonalRecords + RunHistory when authenticated */
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  RunReminder: undefined;
  NameYourRun: NameYourRunParams;
  Terms: undefined;
  About: undefined;
  ActivityDetail: ActivityDetailParams;
  LevelProgression: LevelProgressionParams;
  PersonalRecords: undefined;
  RunHistory: undefined;
};

/** Main tab screens (authenticated) */
export type TabParamList = {
  Map: undefined;
  Run: undefined;
  Activity: undefined;
  Profile: undefined;
};

/** Props for Auth screen from root stack */
export type AuthScreenProps = NativeStackScreenProps<RootStackParamList, "Auth">;

/** Props for each tab screen */
export type MapScreenProps = BottomTabScreenProps<TabParamList, "Map">;
export type RunScreenProps = BottomTabScreenProps<TabParamList, "Run">;
export type ActivityScreenProps = BottomTabScreenProps<TabParamList, "Activity">;
export type ProfileScreenProps = BottomTabScreenProps<TabParamList, "Profile">;

/** Navigation prop for Map screen (so we can navigate to Run) */
export type MapScreenNavigationProp = MapScreenProps["navigation"];

