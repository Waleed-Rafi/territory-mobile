/**
 * Activity feed – icon and color mapping by activity type.
 */

import type { ComponentType } from "react";
import { Swords, Shield, AlertTriangle, MapPin, Flame } from "lucide-react-native";
import { ActivityType } from "../types/domain";
import { colors } from "../theme";

export type ActivityIconProps = { size: number; color: string };

/** Icons used in the activity feed (accept size + color). */
export const ACTIVITY_ICON_MAP: Record<ActivityType, ComponentType<ActivityIconProps>> = {
  [ActivityType.TerritoryClaimed]: MapPin as ComponentType<ActivityIconProps>,
  [ActivityType.TerritoryAttacked]: Swords as ComponentType<ActivityIconProps>,
  [ActivityType.TerritoryDefended]: Shield as ComponentType<ActivityIconProps>,
  [ActivityType.TerritoryLost]: Swords as ComponentType<ActivityIconProps>,
  [ActivityType.TerritoryDecaying]: AlertTriangle as ComponentType<ActivityIconProps>,
  [ActivityType.RunCompleted]: Flame as ComponentType<ActivityIconProps>,
};

export const ACTIVITY_COLOR_MAP: Record<ActivityType, string> = {
  [ActivityType.TerritoryClaimed]: colors.primary,
  [ActivityType.TerritoryAttacked]: colors.enemy,
  [ActivityType.TerritoryDefended]: colors.primary,
  [ActivityType.TerritoryLost]: colors.enemy,
  [ActivityType.TerritoryDecaying]: colors.warning,
  [ActivityType.RunCompleted]: colors.primary,
};

/** Default icon/color when type is unknown */
export const ACTIVITY_DEFAULT_ICON = Flame;
export const ACTIVITY_DEFAULT_COLOR = colors.primary;

/** Get icon component for an activity type string (e.g. from API). */
export function getActivityIcon(type: string): ComponentType<ActivityIconProps> {
  return ACTIVITY_ICON_MAP[type as ActivityType] ?? ACTIVITY_DEFAULT_ICON;
}

/** Get color for an activity type string. */
export function getActivityColor(type: string): string {
  return ACTIVITY_COLOR_MAP[type as ActivityType] ?? ACTIVITY_DEFAULT_COLOR;
}
