import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { colors, radius } from "../../theme";

interface ProgressBarProps {
  progress: number; // 0..1
  height?: number;
  trackColor?: string;
  fillColor?: string;
  style?: ViewStyle;
}

export function ProgressBar({
  progress,
  height = 6,
  trackColor = colors.muted,
  fillColor = colors.primary,
  style,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.track, { height, backgroundColor: trackColor }, style]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clamped * 100}%`,
            height,
            backgroundColor: fillColor,
            borderRadius: radius.sm,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: radius.sm, overflow: "hidden" },
  fill: {},
});
