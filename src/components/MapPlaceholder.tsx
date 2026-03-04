import React from "react";
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { MapPin } from "lucide-react-native";
import { colors, spacing, typography } from "../theme";

export interface MapPlaceholderProps {
  message?: string;
  style?: StyleProp<ViewStyle>;
}

export function MapPlaceholder({
  message = "Map unavailable in Expo Go",
  style,
}: MapPlaceholderProps): React.ReactElement {
  return (
    <View style={[styles.container, style]}>
      <MapPin size={32} stroke={colors.mutedForeground} style={styles.icon} />
      <Text style={styles.text}>{message}</Text>
      <Text style={styles.hint}>Build the app to see maps</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  icon: { opacity: 0.5, marginBottom: spacing.md },
  text: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  hint: {
    fontSize: 12,
    color: colors.mutedForeground,
    opacity: 0.7,
    marginTop: spacing.xs,
  },
});
