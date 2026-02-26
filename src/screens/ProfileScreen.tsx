import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Shield, Flame, MapPin, TrendingUp, LogOut, Bell, ChevronRight, Trophy, Target, Calendar, FileText, Info, Zap } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabase/client";
import { formatDistance } from "../lib/gps";
import { colors, radius, spacing, typography } from "../theme";
import type { ProfileDisplay } from "../types/domain";
import { getWeeklyGoalKm, setWeeklyGoalKm } from "../utils/weeklyGoalStorage";
import {
  getRunDates,
  getCurrentStreak,
  getLongestStreak,
  getWeekStart,
  getMonthStart,
  statsInPeriod,
} from "../utils/streaks";

const NINETY_DAYS_AGO = new Date(Date.now() - 90 * 864e5).toISOString();

export default function ProfileScreen(): React.ReactElement {
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileDisplay | null>(null);
  const [runsForStats, setRunsForStats] = useState<{ started_at: string; distance: number }[]>([]);
  const [weeklyGoalKm, setWeeklyGoalKmState] = useState(0);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  const openRunReminders = () => {
    (navigation.getParent() as { navigate: (name: string) => void } | undefined)?.navigate("RunReminder");
  };

  const loadProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("username, display_name, city, total_distance, total_runs, territories_owned, territories_defended, level")
      .eq("user_id", user.id)
      .single();
    if (data) setProfile(data as ProfileDisplay);
  }, [user]);

  const loadRunsForStats = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("runs")
      .select("started_at, distance")
      .eq("user_id", user.id)
      .gte("started_at", NINETY_DAYS_AGO);
    if (data) setRunsForStats(data as { started_at: string; distance: number }[]);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadProfile();
    loadRunsForStats();
    getWeeklyGoalKm().then(setWeeklyGoalKmState);
  }, [user, loadProfile, loadRunsForStats]);

  const handleSignOut = async () => {
    await signOut();
  };

  const rootNav = navigation.getParent() as { navigate: (name: string) => void } | undefined;

  const runDates = getRunDates(runsForStats.map((r) => r.started_at));
  const currentStreak = getCurrentStreak(runDates);
  const longestStreak = getLongestStreak(runDates);
  const weekStart = getWeekStart(new Date());
  const monthStart = getMonthStart(new Date());
  const thisWeek = statsInPeriod(runsForStats, weekStart);
  const thisMonth = statsInPeriod(runsForStats, monthStart);

  const openGoalModal = () => {
    setGoalInput(weeklyGoalKm > 0 ? String(weeklyGoalKm) : "");
    setGoalModalVisible(true);
  };
  const saveGoal = async () => {
    const km = parseFloat(goalInput.replace(",", "."));
    if (Number.isFinite(km) && km >= 0) {
      await setWeeklyGoalKm(km);
      setWeeklyGoalKmState(km);
    }
    setGoalModalVisible(false);
  };

  const streakLabel = currentStreak === 1 ? "1 day" : `${currentStreak} days`;
  const stats = [
    { icon: Flame, label: "Total Runs", value: profile?.total_runs?.toString() || "0" },
    { icon: MapPin, label: "Territories", value: profile?.territories_owned?.toString() || "0" },
    { icon: TrendingUp, label: "Distance", value: formatDistance(profile?.total_distance || 0) },
    { icon: Zap, label: "Streak", value: currentStreak > 0 ? streakLabel : "0" },
  ];

  const weeksForCalendar = 5;
  const runDateSet = new Set(runDates);
  const today = new Date();
  const thisWeekSunday = new Date(today);
  thisWeekSunday.setDate(today.getDate() - today.getDay());
  type WeekColumn = { label: string; cells: { dateKey: string; hasRun: boolean }[] };
  const calendarWeeks: WeekColumn[] = [];
  for (let w = 0; w < weeksForCalendar; w++) {
    const label = w === 0 ? "Current week" : `Week ${weeksForCalendar - w}`;
    const cells: { dateKey: string; hasRun: boolean }[] = [];
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const d = new Date(thisWeekSunday);
      d.setDate(thisWeekSunday.getDate() + dayOfWeek - w * 7);
      const key = d.toISOString().slice(0, 10);
      cells.push({ dateKey: key, hasRun: runDateSet.has(key) });
    }
    calendarWeeks.push({ label, cells });
  }

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

      {currentStreak > 0 && (
        <BlurView intensity={70} tint="dark" style={styles.streakCard}>
          <Flame size={20} stroke={colors.primary} />
          <View style={styles.streakTextWrap}>
            <Text style={styles.streakTitle}>{currentStreak} day streak</Text>
            <Text style={styles.streakSub}>Longest: {longestStreak} days</Text>
          </View>
        </BlurView>
      )}

      <TouchableOpacity onPress={openGoalModal} style={styles.remindersRow} activeOpacity={0.8}>
        <BlurView intensity={70} tint="dark" style={styles.remindersCard}>
          <Target size={18} stroke={colors.primary} style={styles.remindersIcon} />
          <View style={styles.remindersTextWrap}>
            <Text style={styles.remindersTitle}>Weekly goal</Text>
            <Text style={styles.remindersSub}>
              {weeklyGoalKm > 0
                ? `This week: ${thisWeek.distanceKm.toFixed(1)} / ${weeklyGoalKm} km · ${thisWeek.runCount} runs`
                : "Set a distance target to stay motivated"}
            </Text>
          </View>
          <ChevronRight size={20} stroke={colors.mutedForeground} />
        </BlurView>
      </TouchableOpacity>

      <TouchableOpacity onPress={openRunReminders} style={styles.remindersRow} activeOpacity={0.8}>
        <BlurView intensity={70} tint="dark" style={styles.remindersCard}>
          <Bell size={18} stroke={colors.primary} style={styles.remindersIcon} />
          <View style={styles.remindersTextWrap}>
            <Text style={styles.remindersTitle}>Run reminders</Text>
            <Text style={styles.remindersSub}>Set days & time to build a habit</Text>
          </View>
          <ChevronRight size={20} stroke={colors.mutedForeground} />
        </BlurView>
      </TouchableOpacity>

      <View style={styles.remindersRow}>
        <BlurView intensity={70} tint="dark" style={[styles.remindersCard, styles.leaderboardCard]}>
          <Trophy size={18} stroke={colors.mutedForeground} style={styles.remindersIcon} />
          <View style={styles.remindersTextWrap}>
            <Text style={[styles.remindersTitle, styles.leaderboardTitle]}>Leaderboard</Text>
            <Text style={styles.remindersSub}>Compete with other runners</Text>
          </View>
          <View style={styles.comingSoonChip}>
            <Text style={styles.comingSoonText}>Coming soon</Text>
          </View>
        </BlurView>
      </View>

      <View style={styles.periodRow}>
        <BlurView intensity={70} tint="dark" style={styles.periodCard}>
          <Text style={styles.periodLabel}>This week</Text>
          <Text style={styles.periodValue}>{thisWeek.distanceKm.toFixed(1)} km</Text>
          <Text style={styles.periodSub}>{thisWeek.runCount} runs</Text>
        </BlurView>
        <BlurView intensity={70} tint="dark" style={styles.periodCard}>
          <Text style={styles.periodLabel}>This month</Text>
          <Text style={styles.periodValue}>{thisMonth.distanceKm.toFixed(1)} km</Text>
          <Text style={styles.periodSub}>{thisMonth.runCount} runs</Text>
        </BlurView>
      </View>

      <View style={styles.calendarWrap}>
        <View style={styles.calendarHeader}>
          <Calendar size={14} stroke={colors.mutedForeground} />
          <Text style={styles.calendarTitle}>Last 5 weeks</Text>
        </View>
        <View style={styles.calendarRows}>
          {calendarWeeks.map((week, wIdx) => (
            <View key={wIdx} style={styles.calendarRow}>
              <View style={styles.calendarLabelCell}>
                <Text style={styles.calendarWeekLabel} numberOfLines={1}>
                  {week.label}
                </Text>
              </View>
              <View style={styles.calendarDotsRow}>
                {week.cells.map((cell) => (
                  <View
                    key={cell.dateKey}
                    style={[styles.calendarDot, cell.hasRun && styles.calendarDotActive]}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity onPress={() => rootNav?.navigate("Terms")} style={styles.remindersRow} activeOpacity={0.8}>
        <BlurView intensity={70} tint="dark" style={styles.remindersCard}>
          <FileText size={18} stroke={colors.primary} style={styles.remindersIcon} />
          <View style={styles.remindersTextWrap}>
            <Text style={styles.remindersTitle}>Terms and Conditions</Text>
            <Text style={styles.remindersSub}>Read our terms of use</Text>
          </View>
          <ChevronRight size={20} stroke={colors.mutedForeground} />
        </BlurView>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => rootNav?.navigate("About")} style={styles.remindersRow} activeOpacity={0.8}>
        <BlurView intensity={70} tint="dark" style={styles.remindersCard}>
          <Info size={18} stroke={colors.primary} style={styles.remindersIcon} />
          <View style={styles.remindersTextWrap}>
            <Text style={styles.remindersTitle}>About & Privacy</Text>
            <Text style={styles.remindersSub}>App info and privacy policy</Text>
          </View>
          <ChevronRight size={20} stroke={colors.mutedForeground} />
        </BlurView>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleSignOut}
        style={styles.signOutButton}
        activeOpacity={0.8}
      >
        <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
        <LogOut size={16} stroke={colors.destructive} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Modal
        visible={goalModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGoalModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setGoalModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalContentWrap}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <BlurView intensity={90} tint="dark" style={styles.goalModalCard}>
                <Text style={styles.goalModalTitle}>Weekly goal (km)</Text>
                <Text style={styles.goalModalHint}>Distance you want to run per week</Text>
                <TextInput
                  style={styles.goalInput}
                  value={goalInput}
                  onChangeText={setGoalInput}
                  placeholder="e.g. 10"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                />
                <View style={styles.goalModalButtons}>
                  <TouchableOpacity style={styles.goalModalButtonSecondary} onPress={() => setGoalModalVisible(false)}>
                    <Text style={styles.goalModalButtonSecondaryText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.goalModalButtonPrimary} onPress={saveGoal}>
                    <Text style={styles.goalModalButtonPrimaryText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
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
    marginBottom: spacing.md,
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
  streakCard: {
    overflow: "hidden",
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  streakTextWrap: { marginLeft: spacing.md },
  streakTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  streakSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  remindersRow: { marginBottom: spacing.md },
  remindersCard: {
    overflow: "hidden",
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  leaderboardCard: { opacity: 0.9 },
  leaderboardTitle: { color: colors.mutedForeground },
  remindersIcon: { marginRight: spacing.md },
  remindersTextWrap: { flex: 1 },
  remindersTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  remindersSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  comingSoonChip: {
    backgroundColor: colors.muted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  comingSoonText: { fontSize: 11, color: colors.mutedForeground, fontWeight: "600" },
  periodRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  periodCard: {
    flex: 1,
    overflow: "hidden",
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  periodLabel: { fontSize: 11, color: colors.mutedForeground, letterSpacing: 1 },
  periodValue: { fontFamily: typography.mono, fontSize: 18, fontWeight: "700", color: colors.primary, marginTop: 4 },
  periodSub: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  calendarWrap: { marginBottom: spacing.xl },
  calendarHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm },
  calendarTitle: { fontSize: 12, color: colors.mutedForeground },
  calendarRows: { gap: 6 },
  calendarRow: { flexDirection: "row", alignItems: "center" },
  calendarLabelCell: { width: 100, justifyContent: "center" },
  calendarWeekLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontFamily: typography.mono,
  },
  calendarDotsRow: { flexDirection: "row", gap: 4, flex: 0 },
  calendarDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: colors.secondary,
  },
  calendarDotActive: {
    backgroundColor: colors.primary,
  },
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalContentWrap: { justifyContent: "center" },
  goalModalCard: {
    overflow: "hidden",
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  goalModalTitle: { fontFamily: typography.display, fontSize: 18, fontWeight: "700", color: colors.foreground },
  goalModalHint: { fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
  goalInput: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    color: colors.foreground,
  },
  goalModalButtons: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl },
  goalModalButtonSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
    backgroundColor: colors.secondary,
  },
  goalModalButtonSecondaryText: { color: colors.foreground },
  goalModalButtonPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  goalModalButtonPrimaryText: { color: colors.primaryForeground, fontWeight: "700" },
});
