/**
 * Level progression: XP formula and tier definitions.
 * XP is earned from distance, runs, and territories (computed client-side from profile stats).
 */

/** XP per km run */
export const XP_PER_KM = 12;
/** XP per run completed */
export const XP_PER_RUN = 20;
/** XP per territory claimed */
export const XP_PER_TERRITORY = 80;

export interface LevelTier {
  level: number;
  minXp: number;
  name: string;
  tagline: string;
  /** Short description of what this level represents */
  description: string;
  /** What you "unlock" or get at this level (flavor) */
  unlock: string;
}

/** Level 1–10 with progressive XP thresholds (roughly 2x growth per tier). */
export const LEVEL_TIERS: LevelTier[] = [
  { level: 1, minXp: 0, name: "Scout", tagline: "Just getting started", description: "You're new to the map. Every run counts.", unlock: "Full access to map & run tracking" },
  { level: 2, minXp: 100, name: "Explorer", tagline: "Finding your stride", description: "You're building consistency. Keep showing up.", unlock: "Activity feed & run history" },
  { level: 3, minXp: 250, name: "Pathfinder", tagline: "Making your mark", description: "You're no longer just passing through.", unlock: "Territory claiming unlocked" },
  { level: 4, minXp: 500, name: "Trailblazer", tagline: "Leaving a trail", description: "Your routes are becoming part of the landscape.", unlock: "Stronger presence on the map" },
  { level: 5, minXp: 900, name: "Territory Hunter", tagline: "Claiming ground", description: "You don't just run—you own the path.", unlock: "Territory strength visibility" },
  { level: 6, minXp: 1500, name: "Champion", tagline: "Proven on the road", description: "Your stats speak for themselves.", unlock: "Champion badge on profile" },
  { level: 7, minXp: 2400, name: "Vanguard", tagline: "Ahead of the pack", description: "You've put in the miles and the claims.", unlock: "Vanguard title" },
  { level: 8, minXp: 3600, name: "Legend", tagline: "Stories are told about you", description: "Your name is known on the map.", unlock: "Legend status" },
  { level: 9, minXp: 5200, name: "Dominator", tagline: "The map bends to you", description: "You've shaped the territory.", unlock: "Dominator flair" },
  { level: 10, minXp: 7200, name: "Elite", tagline: "Peak runner", description: "You've reached the top tier.", unlock: "Elite recognition" },
];

const MAX_LEVEL = LEVEL_TIERS.length;
const MAX_XP = LEVEL_TIERS[MAX_LEVEL - 1].minXp;

/** Compute total XP from profile stats (distance in meters). */
export function computeXp(totalDistanceM: number, totalRuns: number, territoriesOwned: number): number {
  const km = totalDistanceM / 1000;
  return Math.floor(km * XP_PER_KM + totalRuns * XP_PER_RUN + territoriesOwned * XP_PER_TERRITORY);
}

/** Get the tier for a given XP amount (1-based level). */
export function getLevelFromXp(xp: number): number {
  let level = 1;
  for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_TIERS[i].minXp) {
      level = LEVEL_TIERS[i].level;
      break;
    }
  }
  return level;
}

/** Get full tier info for a level. */
export function getTierForLevel(level: number): LevelTier | null {
  return LEVEL_TIERS.find((t) => t.level === level) ?? null;
}

/** Get tier for current XP. */
export function getTierFromXp(xp: number): LevelTier | null {
  return getTierForLevel(getLevelFromXp(xp));
}

/** XP at which the current level started. */
export function getXpFloorForLevel(level: number): number {
  const tier = getTierForLevel(level);
  return tier ? tier.minXp : 0;
}

/** XP required to reach the next level (null if max). */
export function getXpToNextLevel(xp: number): { nextLevel: number; xpRequired: number; xpIntoCurrent: number } | null {
  const currentLevel = getLevelFromXp(xp);
  if (currentLevel >= MAX_LEVEL) return null;
  const currentTier = getTierForLevel(currentLevel);
  const nextTier = getTierForLevel(currentLevel + 1);
  if (!currentTier || !nextTier) return null;
  const xpIntoCurrent = xp - currentTier.minXp;
  const xpRequired = nextTier.minXp - currentTier.minXp;
  return { nextLevel: nextTier.level, xpRequired, xpIntoCurrent };
}

/** Progress 0–1 within current level. */
export function getLevelProgress(xp: number): number {
  const info = getXpToNextLevel(xp);
  if (!info) return 1;
  return Math.min(1, info.xpIntoCurrent / info.xpRequired);
}
