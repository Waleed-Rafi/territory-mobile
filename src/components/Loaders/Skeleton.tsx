import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, ViewStyle } from "react-native";
import { colors, spacing, radius } from "../../theme";

interface SkeletonProps {
  /** Bar heights (default: [12, 12, 24]) */
  lines?: number[];
  /** Optional width multiplier per line 0–1 (default: full, 0.9, 0.7) */
  widths?: number[];
  style?: ViewStyle;
}

const defaultLines = [12, 12, 24];
const defaultWidths = [1, 0.9, 0.7];

export function Skeleton({
  lines = defaultLines,
  widths = defaultWidths,
  style,
}: SkeletonProps) {
  const shine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shine, { toValue: 1, useNativeDriver: true, duration: 1000 }),
        Animated.timing(shine, { toValue: 0, useNativeDriver: true, duration: 1000 }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shine]);

  const opacity = shine.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.2, 0.5, 0.2],
  });

  return (
    <View style={[styles.wrap, style]}>
      {lines.map((h, i) => (
        <View key={i} style={[styles.lineWrap, { width: `${(widths[i] ?? defaultWidths[i] ?? 1) * 100}%` }]}>
          <Animated.View style={[styles.line, { height: h, opacity }]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  lineWrap: { overflow: "hidden" },
  line: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
});
