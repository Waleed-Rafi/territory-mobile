import React from "react";
import { View, ActivityIndicator, StyleSheet, ViewStyle } from "react-native";
import { colors } from "../../theme";

type Size = "small" | "large";

interface SpinnerProps {
  size?: Size;
  color?: string;
  style?: ViewStyle;
}

export function Spinner({ size = "small", color = colors.primary, style }: SpinnerProps) {
  const indicatorSize = size === "large" ? "large" : "small";
  return (
    <View style={[styles.wrap, size === "large" && styles.wrapLarge, style]}>
      <ActivityIndicator size={indicatorSize} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: "center", alignItems: "center" },
  wrapLarge: { padding: 24 },
});
