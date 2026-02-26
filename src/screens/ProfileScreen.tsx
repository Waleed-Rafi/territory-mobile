import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Shield, Flame, MapPin, TrendingUp, LogOut } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabase/client";
import { formatDistance, formatDuration } from "../lib/gps";
import { colors, radius, spacing, typography } from "../theme";
import type { ProfileDisplay, RunDisplay } from "../types/domain";
import { formatRunDate } from "../utils/format";

export default function ProfileScreen(): React.ReactElement {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileDisplay | null>(null);
  const [runs, setRuns] = useState<RunDisplay[]>([]);

  useEffect(() => {
    if (!user) return;
    const loadProfile = async (): Promise<void> => {
      const { data } = await supabase
        .from("profiles")
        .select("username, display_name, city, total_distance, total_runs, territories_owned, territories_defended, level")
        .eq("user_id", user.id)
        .single();
      if (data) setProfile(data as ProfileDisplay);
    };
    const loadRuns = async (): Promise<void> => {
      const { data } = await supabase
        .from("runs")
        .select("id, distance, duration, territory_claimed, started_at")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(10);
      if (data) setRuns(data as RunDisplay[]);
    };
    loadProfile();
    loadRuns();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
  };

  const stats = [
    { icon: Flame, label: "Total Runs", value: profile?.total_runs?.toString() || "0" },
    { icon: MapPin, label: "Territories", value: profile?.territories_owned?.toString() || "0" },
    { icon: TrendingUp, label: "Distance", value: formatDistance(profile?.total_distance || 0) },
    { icon: Shield, label: "Defended", value: profile?.territories_defended?.toString() || "0" },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile?.username || "R")[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.displayName}>
          {profile?.display_name || profile?.username || "Runner"}
        </Text>
        <Text style={styles.city}>{profile?.city || "Location not set"}</Text>
        <View style={styles.levelRow}>
          <Shield size={12} stroke={colors.primary} />
          <Text style={styles.levelText}>LEVEL {profile?.level || 1}</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        {stats.map((s) => (
          <BlurView key={s.label} intensity={70} tint="dark" style={styles.statCard}>
            <s.icon size={16} stroke={colors.primary} style={styles.statIcon} />
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </BlurView>
        ))}
      </View>

      <Text style={styles.sectionTitle}>RECENT RUNS</Text>
      {runs.length === 0 ? (
        <BlurView intensity={70} tint="dark" style={styles.emptyRuns}>
          <Text style={styles.emptyRunsText}>No runs yet. Get out there!</Text>
        </BlurView>
      ) : (
        <View style={styles.runsList}>
          {runs.map((run) => (
            <BlurView key={run.id} intensity={70} tint="dark" style={styles.runCard}>
              <View style={styles.runCardLeft}>
                <Text style={styles.runDate}>{formatRunDate(run.started_at)}</Text>
                <Text style={styles.runMeta}>
                  {formatDistance(run.distance)} · {formatDuration(run.duration)}
                </Text>
              </View>
              {run.territory_claimed && (
                <View style={styles.claimedBadge}>
                  <MapPin size={10} stroke={colors.primary} />
                  <Text style={styles.claimedText}>CLAIMED</Text>
                </View>
              )}
            </BlurView>
          ))}
        </View>
      )}

      <TouchableOpacity
        onPress={handleSignOut}
        style={styles.signOutButton}
        activeOpacity={0.8}
      >
        <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
        <LogOut size={16} stroke={colors.destructive} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: 100 },
  avatarWrap: { alignItems: "center", marginBottom: spacing["2xl"] },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarText: {
    fontFamily: typography.display,
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
  },
  displayName: {
    fontFamily: typography.display,
    fontSize: 20,
    fontWeight: "700",
    color: colors.foreground,
  },
  city: { fontSize: 14, color: colors.mutedForeground, marginTop: 4 },
  levelRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  levelText: { fontSize: 12, color: colors.primary, fontFamily: typography.display, letterSpacing: 2 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing["2xl"],
  },
  statCard: {
    overflow: "hidden",
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: "47%",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  statIcon: { marginBottom: 8 },
  statValue: { fontFamily: typography.mono, fontSize: 22, fontWeight: "700", color: colors.foreground },
  statLabel: { fontSize: 10, color: colors.mutedForeground, marginTop: 4, letterSpacing: 1 },
  sectionTitle: {
    fontFamily: typography.display,
    fontSize: 14,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: spacing.md,
    letterSpacing: 2,
  },
  emptyRuns: {
    overflow: "hidden",
    borderRadius: radius.lg,
    padding: spacing["2xl"],
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  emptyRunsText: { fontSize: 14, color: colors.mutedForeground, textAlign: "center" },
  runsList: { gap: spacing.sm },
  runCard: {
    overflow: "hidden",
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  runCardLeft: {},
  runDate: { fontSize: 14, fontWeight: "500", color: colors.foreground },
  runMeta: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  claimedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 255, 136, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  claimedText: { fontSize: 10, fontWeight: "600", color: colors.primary },
  signOutButton: {
    marginTop: spacing["2xl"],
    paddingVertical: 14,
    borderRadius: radius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  signOutText: { fontSize: 14, color: colors.destructive, fontWeight: "500" },
});
