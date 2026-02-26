import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useAlert } from "../contexts/AlertContext";
import { supabase } from "../supabase/client";
import Constants from "expo-constants";
import { colors, spacing, typography } from "../theme";

/** Replace with your real support email before store submission. */
const SUPPORT_EMAIL = "support@territory.app";

export default function AboutScreen(): React.ReactElement {
  const { user, signOut } = useAuth();
  const alert = useAlert();

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
    <ScrollView
      style={styles.container}
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
      <Text style={styles.updated}>Last updated: February 2025</Text>

      <Text style={styles.heading}>1. Information We Collect</Text>
      <Text style={styles.body}>
        We collect information you provide directly: account details (email, username, display name),
        run data (GPS routes, distance, duration, timestamps), optional run names and descriptions, and
        photos you attach to runs. We also collect device-related information necessary to provide the
        service (e.g. for push notifications and app stability). We do not sell your personal information.
      </Text>

      <Text style={styles.heading}>2. How We Use Your Information</Text>
      <Text style={styles.body}>
        We use your information to provide and improve the App: to create and manage your account, to store
        and display your runs and territory data, to send you reminders if you enable them, to show your
        activity in the feed, and to compute stats such as streaks and weekly goals. We may use aggregated,
        non-identifying data to improve the product.
      </Text>

      <Text style={styles.heading}>3. Data Storage and Security</Text>
      <Text style={styles.body}>
        Your data is stored on secure servers provided by Supabase (database and authentication) and, for
        run photos, in Supabase Storage. Data is transmitted over HTTPS. We implement reasonable measures to
        protect your data; no system is completely secure, and you use the App at your own risk.
      </Text>

      <Text style={styles.heading}>4. Third-Party Services</Text>
      <Text style={styles.body}>
        The App uses the following third-party services: Supabase (authentication, database, storage),
        Expo (app framework, notifications, device APIs), and platform services (Apple/Google for sign-in
        and push notifications where applicable). These providers have their own privacy policies. We do not
        control and are not responsible for their practices. By using the App you acknowledge use of these
        services.
      </Text>

      <Text style={styles.heading}>5. Data Retention</Text>
      <Text style={styles.body}>
        We retain your account and run data for as long as your account is active. If you deactivate your
        account, we retain your data in inactive state; you may reactivate by signing in again. If you request
        account or data deletion, we will delete or anonymize your data in accordance with applicable law and
        our retention policy.
      </Text>

      <Text style={styles.heading}>6. Your Rights</Text>
      <Text style={styles.body}>
        Depending on your jurisdiction, you may have the right to access, correct, or delete your personal
        data, to object to or restrict processing, and to data portability. You can update profile information
        and run data within the App. To request deletion or exercise other rights, contact us using the
        information below. You may also deactivate your account from this screen.
      </Text>

      <Text style={styles.heading}>7. Children's Privacy</Text>
      <Text style={styles.body}>
        The App is not directed at children under 13 (or higher age where required). We do not knowingly
        collect personal information from children. If you believe we have collected such information, please
        contact us and we will take steps to delete it.
      </Text>

      <Text style={styles.heading}>8. International Transfer</Text>
      <Text style={styles.body}>
        Your data may be processed and stored in countries other than your own. By using the App you consent
        to such transfer. We take steps to ensure your data receives an adequate level of protection
        where required by law.
      </Text>

      <Text style={styles.heading}>9. Changes to This Policy</Text>
      <Text style={styles.body}>
        We may update this Privacy Policy from time to time. We will update the "Last updated" date and, where
        appropriate, notify you in the App. Your continued use after changes constitutes acceptance of the
        updated policy.
      </Text>

      <Text style={styles.heading}>10. Contact Us</Text>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  updated: { fontSize: 12, color: colors.mutedForeground, marginBottom: spacing.lg },
  heading: {
    fontFamily: typography.display,
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 14,
    color: colors.secondaryForeground,
    lineHeight: 22,
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
