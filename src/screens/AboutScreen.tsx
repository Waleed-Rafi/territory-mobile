import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ProfileStackHeader } from "../components/ProfileStackHeader";
import { useAuth } from "../contexts/AuthContext";
import type { RootStackParamList } from "../types/navigation";
import { useAlert } from "../contexts/AlertContext";
import { supabase } from "../supabase/client";
import Constants from "expo-constants";
import { colors, spacing, typography } from "../theme";

/** Replace with your real support email before store submission. */
const SUPPORT_EMAIL = "support@territory.app";

/** Official privacy policy URL – hosted on territory-runner (e.g. territoryy.netlify.app). */
const PRIVACY_POLICY_URL = "https://territoryy.netlify.app/privacy";

export default function AboutScreen(): React.ReactElement {
  const { user, signOut } = useAuth();
  const alert = useAlert();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, "About">>();

  const handleDeactivateAccount = async () => {
    const idx = await alert.showAsync({
      title: "Deactivate account",
      message:
        "Your account will be set to inactive and you will be signed out. Your data is kept. Sign in again to reactivate your account.",
      variant: "info",
      buttons: [
        { text: "Cancel", style: "cancel" },
        { text: "Deactivate", style: "destructive" },
      ],
    });
    if (idx !== 1 || !user) return;
    const { error } = await supabase.from("profiles").update({ status: "inactive" }).eq("user_id", user.id);
    if (error) {
      alert.show("Error", "Could not deactivate account. Try again.");
      return;
    }
    await signOut();
  };

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <View style={styles.container}>
      <ProfileStackHeader title="About & Privacy" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
      <Text style={styles.appName}>Territory</Text>
      <Text style={styles.tagline}>Run. Claim. Defend.</Text>
      <Text style={styles.version}>Version {appVersion}</Text>
      <Text style={styles.intro}>
        Territory is a running and fitness app that lets you track runs, claim territory on the map, and build
        habits with goals and streaks.
      </Text>

      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.body}>
        Our full privacy policy is available on the web. You can read it anytime at the link below.
      </Text>
      <TouchableOpacity
        onPress={() => navigation.navigate("WebView", { url: PRIVACY_POLICY_URL, title: "Privacy Policy" })}
        style={styles.linkButton}
        accessibilityRole="button"
        accessibilityLabel="Open privacy policy"
      >
        <Text style={styles.linkText}>View Privacy Policy</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>Contact</Text>
      <Text style={styles.body}>
        For privacy questions, data requests, or support, contact us at:
      </Text>
      <TouchableOpacity onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} style={styles.supportLink}>
        <Text style={styles.supportLinkText}>{SUPPORT_EMAIL}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deactivateButton} onPress={handleDeactivateAccount}>
        <Text style={styles.deactivateButtonText}>Deactivate my account</Text>
      </TouchableOpacity>

      <View style={styles.footer} />
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  appName: {
    fontFamily: typography.display,
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
  },
  tagline: { fontSize: 14, color: colors.mutedForeground, marginTop: 4, letterSpacing: 1 },
  version: { fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
  intro: {
    fontSize: 14,
    color: colors.secondaryForeground,
    lineHeight: 22,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: typography.display,
    fontSize: 20,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  body: {
    fontSize: 14,
    color: colors.secondaryForeground,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  linkButton: { marginBottom: spacing.lg },
  linkText: { fontSize: 14, color: colors.primary, textDecorationLine: "underline", fontWeight: "600" },
  heading: {
    fontFamily: typography.display,
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  supportLink: { marginTop: spacing.sm },
  supportLinkText: { fontSize: 14, color: colors.primary, textDecorationLine: "underline" },
  deactivateButton: {
    marginTop: spacing["2xl"],
    paddingVertical: 12,
    alignItems: "center",
  },
  deactivateButtonText: {
    fontSize: 12,
    color: colors.mutedForeground,
    textDecorationLine: "underline",
  },
  footer: { height: spacing.lg },
});
