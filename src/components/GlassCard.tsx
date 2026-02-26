import React from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { colors, radius } from "../theme";

const DEFAULT_INTENSITY = 70;
const DEFAULT_TINT = "dark" as const;

export interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: "light" | "dark" | "default";
}

/** Shared glass-style card: BlurView with border and radius. Use for consistent cards across Profile, Activity, Level, etc. */
export function GlassCard({
  children,
  style,
  intensity = DEFAULT_INTENSITY,
  tint = DEFAULT_TINT,
}: GlassCardProps): React.ReactElement {
  return (
    <BlurView
      intensity={intensity}
      tint={tint}
      style={StyleSheet.flatten([baseStyle, style])}
    >
      {children}
    </BlurView>
  );
}

const baseStyle: ViewStyle = {
  overflow: "hidden",
  borderRadius: radius.lg,
  borderWidth: 1,
  borderColor: colors.glassBorder,
};
