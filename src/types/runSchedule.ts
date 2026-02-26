/**
 * Run reminder schedule – which days and at what time to remind the user.
 * Days: 0 = Sunday, 1 = Monday, … 6 = Saturday (JS Date.getDay()).
 */
export interface RunSchedule {
  enabled: boolean;
  days: number[];
  hour: number;
  minute: number;
}

export const DEFAULT_RUN_SCHEDULE: RunSchedule = {
  enabled: false,
  days: [1, 3, 5],
  hour: 18,
  minute: 0,
};

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
