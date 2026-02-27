import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ChevronLeft } from "lucide-react-native";
import { colors, spacing, typography } from "../theme";

export interface ProfileStackHeaderProps {
  title: string;
  /** Optional right-side element (e.g. Share button). */
  rightElement?: React.ReactNode;
}

/** Shared header for screens opened from Profile stack: back button + title. Matches Run Reminder screen style. */
export function ProfileStackHeader({ title, rightElement }: ProfileStackHeaderProps): React.ReactElement {
  const navigation = useNavigation();

  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <ChevronLeft size={24} stroke={colors.foreground} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      {rightElement ? <View style={styles.rightSlot}>{rightElement}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 56 : 48,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.xs,
  },
  headerTitle: {
    fontFamily: typography.display,
    fontSize: 18,
    fontWeight: "700",
    color: colors.foreground,
    letterSpacing: 1,
  },
  rightSlot: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
  },
});
