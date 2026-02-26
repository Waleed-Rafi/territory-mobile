import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { BlurView } from "expo-blur";
import { GlassCard } from "../components/GlassCard";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Shield, TrendingUp, Flame, MapPin, ChevronRight, Target, Zap } from "lucide-react-native";
import { useAuth } from "../contexts/AuthContext";
import { useAlert } from "../contexts/AlertContext";
import { supabase } from "../supabase/client";
import { colors, radius, spacing, typography } from "../theme";
import type { RootStackParamList } from "../types/navigation";
import type { ProfileDisplay } from "../types/domain";
import { ProfileStackHeader } from "../components/ProfileStackHeader";
import { parseProfileLevelSelect } from "../types/supabase-responses";
import { strings } from "../l10n/strings";
import {
  LEVEL_TIERS,
  computeXp,
  getLevelFromXp,
  getTierFromXp,
  getXpToNextLevel,
  getLevelProgress,
  getTierForLevel,
  XP_PER_KM,
  XP_PER_RUN,
  XP_PER_TERRITORY,
} from "../constants/levels";

type LevelProgressionRouteProp = RouteProp<RootStackParamList, "LevelProgression">;

export default function LevelProgressionScreen(): React.ReactElement {
  const route = useRoute<LevelProgressionRouteProp>();
  const { profile: profileParam } = route.params ?? {};
  const { user } = useAuth();
  const alert = useAlert();
  const [profile, setProfile] = useState<ProfileDisplay | null>(profileParam ?? null);

  useEffect(() => {
    if (profileParam || !user) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("username, display_name, city, total_distance, total_runs, territories_owned, level")
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          alert.show(strings.common.error, error.message || strings.errors.loadProfile);
          return;
        }
        const parsed = data != null ? parseProfileLevelSelect(data) : null;
        if (parsed) setProfile(parsed);
      });
    return () => { cancelled = true; };
  }, [user, profileParam, alert]);

  const totalDistanceM = profile?.total_distance ?? 0;
  const totalRuns = profile?.total_runs ?? 0;
  const territoriesOwned = profile?.territories_owned ?? 0;

  const xp = computeXp(totalDistanceM, totalRuns, territoriesOwned);
  const level = getLevelFromXp(xp);
  const tier = getTierFromXp(xp);
  const progress = getLevelProgress(xp);
  const nextInfo = getXpToNextLevel(xp);
  const nextTier = nextInfo ? getTierForLevel(nextInfo.nextLevel) : null;

  const tips = [
    { icon: Flame, text: "Complete a run this week", sub: "Every run earns 20 XP" },
    { icon: TrendingUp, text: "Add more distance", sub: "12 XP per km" },
    { icon: MapPin, text: "Claim a territory", sub: "80 XP per territory" },
    { icon: Zap, text: "Keep your streak alive", sub: "Consistency pays off" },
  ];

  return (
    <View style={styles.container}>
      <ProfileStackHeader title="Level progression" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero: level badge + name */}
        <BlurView intensity={80} tint="dark" style={styles.hero}>
          <View style={styles.heroBadge}>
            <Shield size={44} stroke={colors.primary} strokeWidth={2} />
            <Text style={styles.heroLevel}>LEVEL {level}</Text>
          </View>
          {tier && (
            <>
              <Text style={styles.heroName}>{tier.name}</Text>
              <Text style={styles.heroTagline}>{tier.tagline}</Text>
              <Text style={styles.heroDesc}>{tier.description}</Text>
            </>
          )}
        </BlurView>

        {/* Progress to next level */}
        {nextInfo && nextTier && (
          <GlassCard style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Progress to Level {nextInfo.nextLevel}</Text>
              <Text style={styles.cardSub}>
                {nextInfo.xpRequired - nextInfo.xpIntoCurrent} XP to go
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>{xp} XP</Text>
              <Text style={styles.progressLabelNext}>{nextTier.name}</Text>
            </View>
          </GlassCard>
        )}

        {!nextInfo && tier && (
          <GlassCard style={styles.card}>
            <Text style={styles.maxLevelTitle}>You've reached max level</Text>
            <Text style={styles.maxLevelSub}>{tier.name} — {tier.tagline}</Text>
          </GlassCard>
        )}

        {/* How you earn XP */}
        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>How you earn XP</Text>
          <View style={styles.xpRow}>
            <TrendingUp size={18} stroke={colors.primary} />
            <Text style={styles.xpText}>Distance</Text>
            <Text style={styles.xpValue}>{XP_PER_KM} XP per km</Text>
          </View>
          <View style={styles.xpRow}>
            <Flame size={18} stroke={colors.primary} />
            <Text style={styles.xpText}>Runs</Text>
            <Text style={styles.xpValue}>{XP_PER_RUN} XP per run</Text>
          </View>
          <View style={styles.xpRow}>
            <MapPin size={18} stroke={colors.primary} />
            <Text style={styles.xpText}>Territories</Text>
            <Text style={styles.xpValue}>{XP_PER_TERRITORY} XP per territory</Text>
          </View>
        </GlassCard>

        {/* Your current XP breakdown */}
        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>Your XP breakdown</Text>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Distance</Text>
            <Text style={styles.breakdownValue}>
              {Math.floor(totalDistanceM / 1000 * XP_PER_KM)} XP
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Runs</Text>
            <Text style={styles.breakdownValue}>{totalRuns * XP_PER_RUN} XP</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Territories</Text>
            <Text style={styles.breakdownValue}>{territoriesOwned * XP_PER_TERRITORY} XP</Text>
          </View>
          <View style={[styles.breakdownRow, styles.breakdownTotal]}>
            <Text style={styles.breakdownTotalLabel}>Total</Text>
            <Text style={styles.breakdownTotalValue}>{xp} XP</Text>
          </View>
        </GlassCard>

        {/* Level up faster */}
        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>Level up faster</Text>
          {tips.map((t, i) => (
            <View key={i} style={styles.tipRow}>
              <t.icon size={20} stroke={colors.primary} style={styles.tipIcon} />
              <View style={styles.tipTextWrap}>
                <Text style={styles.tipText}>{t.text}</Text>
                <Text style={styles.tipSub}>{t.sub}</Text>
              </View>
              <ChevronRight size={18} stroke={colors.mutedForeground} />
            </View>
          ))}
        </GlassCard>

        {/* Next level preview */}
        {nextTier && (
          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>Next: Level {nextTier.level}</Text>
            <Text style={styles.nextLevelName}>{nextTier.name}</Text>
            <Text style={styles.nextLevelTagline}>{nextTier.tagline}</Text>
            <Text style={styles.nextLevelUnlock}>Unlock: {nextTier.unlock}</Text>
          </GlassCard>
        )}

        {/* All levels preview */}
        <View style={styles.levelsPreview}>
          <Text style={styles.levelsPreviewTitle}>All levels</Text>
          {LEVEL_TIERS.map((t) => (
            <View
              key={t.level}
              style={[
                styles.levelRow,
                t.level === level && styles.levelRowCurrent,
              ]}
            >
              <Text style={styles.levelRowNum}>{t.level}</Text>
              <Text style={[styles.levelRowName, t.level === level && styles.levelRowNameCurrent]}>
                {t.name}
              </Text>
              <Text style={styles.levelRowXp}>{t.minXp} XP</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: 48 },
  hero: {
    overflow: "hidden",
    borderRadius: radius.xl,
    padding: spacing["2xl"],
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: "center",
  },
  heroBadge: {
    width: 110,
    minHeight: 100,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: "rgba(0, 255, 136, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: spacing.lg,
  },
  heroLevel: {
    fontFamily: typography.display,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.primary,
  },
  heroName: {
    fontFamily: typography.display,
    fontSize: 24,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: 4,
  },
  heroTagline: {
    fontSize: 14,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  heroDesc: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    overflow: "hidden",
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  cardTitle: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  cardSub: { fontSize: 12, color: colors.mutedForeground },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  progressLabels: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 11, color: colors.mutedForeground },
  progressLabelNext: { fontSize: 11, color: colors.primary, fontWeight: "600" },
  maxLevelTitle: { fontSize: 16, fontWeight: "700", color: colors.primary, textAlign: "center" },
  maxLevelSub: { fontSize: 13, color: colors.mutedForeground, textAlign: "center", marginTop: 4 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.mutedForeground,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  xpRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  xpText: { flex: 1, fontSize: 14, color: colors.foreground },
  xpValue: { fontSize: 13, color: colors.primary, fontWeight: "600" },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  breakdownLabel: { fontSize: 13, color: colors.mutedForeground },
  breakdownValue: { fontSize: 13, color: colors.foreground, fontWeight: "500" },
  breakdownTotal: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  breakdownTotalLabel: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  breakdownTotalValue: { fontSize: 14, fontWeight: "700", color: colors.primary },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  tipIcon: { marginRight: spacing.md },
  tipTextWrap: { flex: 1 },
  tipText: { fontSize: 14, fontWeight: "500", color: colors.foreground },
  tipSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  nextLevelName: { fontSize: 18, fontWeight: "700", color: colors.primary, marginBottom: 4 },
  nextLevelTagline: { fontSize: 13, color: colors.mutedForeground, marginBottom: 8 },
  nextLevelUnlock: { fontSize: 13, color: colors.foreground, lineHeight: 20 },
  levelsPreview: { marginTop: spacing.sm },
  levelsPreviewTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.mutedForeground,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    gap: spacing.md,
  },
  levelRowCurrent: { backgroundColor: "rgba(0, 255, 136, 0.12)" },
  levelRowNum: { width: 24, fontSize: 12, fontWeight: "600", color: colors.mutedForeground },
  levelRowName: { flex: 1, fontSize: 13, color: colors.mutedForeground },
  levelRowNameCurrent: { color: colors.primary, fontWeight: "600" },
  levelRowXp: { fontSize: 11, color: colors.mutedForeground },
});
