import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { Bell, ChevronLeft } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useAlert } from "../contexts/AlertContext";
import { getRunSchedule, setRunSchedule } from "../utils/runScheduleStorage";
import {
  requestNotificationPermission,
  scheduleRunReminders,
  cancelRunReminders,
} from "../utils/runReminders";
import { Loader } from "../components/Loaders";
import { colors, radius, spacing, typography } from "../theme";
import { DAY_LABELS, type RunSchedule } from "../types/runSchedule";

function formatTime(hour: number, minute: number): string {
  const h = hour % 12 || 12;
  const am = hour < 12 ? "AM" : "PM";
  const m = minute.toString().padStart(2, "0");
  return `${h}:${m} ${am}`;
}

function adjustTime(hour: number, minute: number, delta: number): { hour: number; minute: number } {
  let total = hour * 60 + minute + delta;
  if (total < 0) total += 24 * 60;
  total = total % (24 * 60);
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

export default function RunReminderScreen(): React.ReactElement {
  const navigation = useNavigation();
  const alert = useAlert();
  const [schedule, setSchedule] = useState<RunSchedule | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getRunSchedule().then((s) => {
      if (!cancelled) setSchedule(s);
    });
    return () => { cancelled = true; };
  }, []);

  const updateSchedule = (next: Partial<RunSchedule>) => {
    if (!schedule) return;
    setSchedule({ ...schedule, ...next });
  };

  const toggleDay = (day: number) => {
    if (!schedule) return;
    const days = schedule.days.includes(day)
      ? schedule.days.filter((d) => d !== day)
      : [...schedule.days, day].sort((a, b) => a - b);
    updateSchedule({ days });
  };

  const handleSave = async () => {
    if (!schedule) return;
    setSaving(true);
    try {
      if (schedule.enabled && schedule.days.length > 0) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          alert.show({
            title: "Notifications off",
            message: "Enable notifications in Settings to get run reminders.",
            buttons: [{ text: "OK" }],
          });
          updateSchedule({ enabled: false });
        }
      }
      await setRunSchedule(schedule);
      if (schedule.enabled && schedule.days.length > 0) {
        await scheduleRunReminders(schedule);
      } else {
        await cancelRunReminders();
      }
      navigation.goBack();
    } catch (e) {
      alert.show("Error", "Could not save reminders. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (schedule === null) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft size={24} stroke={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Run reminders</Text>
        </View>
        <View style={[styles.centered, styles.loadingRow]}>
          <Loader type="dots" color={colors.primary} />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </View>
    );
  }

  const timeForward = () => {
    const { hour, minute } = adjustTime(schedule.hour, schedule.minute, 30);
    updateSchedule({ hour, minute });
  };
  const timeBack = () => {
    const { hour, minute } = adjustTime(schedule.hour, schedule.minute, -30);
    updateSchedule({ hour, minute });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={24} stroke={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Run reminders</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <BlurView intensity={70} tint="dark" style={styles.card}>
          <View style={styles.row}>
            <Bell size={20} stroke={colors.primary} />
            <Text style={styles.cardTitle}>Daily habit</Text>
            <Switch
              value={schedule.enabled}
              onValueChange={(enabled) => updateSchedule({ enabled })}
              trackColor={{ false: colors.border, true: colors.primary + "80" }}
              thumbColor={schedule.enabled ? colors.primary : colors.mutedForeground}
            />
          </View>
          <Text style={styles.hint}>
            Get a reminder on the days you choose so you can build a running habit.
          </Text>
        </BlurView>

        <Text style={styles.label}>Remind me on</Text>
        <View style={styles.daysRow}>
          {DAY_LABELS.map((label, day) => {
            const selected = schedule.days.includes(day);
            return (
              <TouchableOpacity
                key={day}
                onPress={() => toggleDay(day)}
                style={[styles.dayChip, selected && styles.dayChipSelected]}
                activeOpacity={0.8}
              >
                <Text style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Time</Text>
        <View style={styles.timeRow}>
          <TouchableOpacity onPress={timeBack} style={styles.timeButton}>
            <Text style={styles.timeButtonText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.timeDisplay}>
            {formatTime(schedule.hour, schedule.minute)}
          </Text>
          <TouchableOpacity onPress={timeForward} style={styles.timeButton}>
            <Text style={styles.timeButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>Steps of 30 minutes. Tap ± to change.</Text>

        <TouchableOpacity
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel="Save reminders"
          disabled={saving}
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          activeOpacity={0.9}
        >
          {saving ? (
            <View style={styles.saveButtonContent}>
              <Text style={styles.saveButtonText}>Saving</Text>
              <Loader type="dots" color={colors.primaryForeground} style={styles.saveButtonDots} />
            </View>
          ) : (
            <Text style={styles.saveButtonText}>Save reminders</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 56 : 48,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  backButton: { padding: spacing.sm, marginRight: spacing.xs },
  headerTitle: {
    fontFamily: typography.display,
    fontSize: 18,
    fontWeight: "700",
    color: colors.foreground,
    letterSpacing: 1,
  },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  loadingText: { fontSize: 14, color: colors.mutedForeground },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 80 },
  card: {
    overflow: "hidden",
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  cardTitle: { flex: 1, fontFamily: typography.display, fontSize: 16, fontWeight: "600", color: colors.foreground },
  hint: { fontSize: 12, color: colors.mutedForeground, marginTop: spacing.sm },
  label: {
    fontFamily: typography.display,
    fontSize: 12,
    fontWeight: "600",
    color: colors.mutedForeground,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  daysRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.xl },
  dayChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  dayChipSelected: {
    backgroundColor: colors.primary + "20",
    borderColor: colors.primary,
  },
  dayChipText: { fontSize: 13, color: colors.mutedForeground, fontWeight: "500" },
  dayChipTextSelected: { color: colors.primary },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
    marginBottom: spacing.sm,
  },
  timeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  timeButtonText: { fontSize: 24, color: colors.foreground, fontWeight: "600" },
  timeDisplay: {
    fontFamily: typography.mono,
    fontSize: 28,
    fontWeight: "700",
    color: colors.foreground,
    minWidth: 100,
    textAlign: "center",
  },
  saveButton: {
    marginTop: spacing["2xl"],
    paddingVertical: 16,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonContent: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  saveButtonDots: { marginLeft: 0 },
  saveButtonText: {
    fontFamily: typography.display,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.primaryForeground,
  },
});
