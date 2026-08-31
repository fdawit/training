import source from "./program.json";

export type SetMode = "minus-one" | "full" | "deload";
export type DayKind = "workout" | "jefferson" | "recovery" | "field";
export type WorkoutKey = "A" | "B" | "C";

export type WeekPlan = (typeof source.weeks)[number];
export type Exercise = (typeof source.workouts.A)[number] & {
  timerSeconds?: number;
  targetLift?: string;
  alternatives?: string[];
  pair?: string;
};

export interface DayModule {
  index: number;
  week: number;
  day: number;
  dayName: string;
  shortDay: string;
  title: string;
  kind: DayKind;
  workout?: WorkoutKey;
  includesMobility: boolean;
  includesBigThree: true;
  includesSteps: true;
}

const dayTemplates: Omit<DayModule, "index" | "week">[] = [
  { day: 1, dayName: "Monday", shortDay: "M", title: "Workout A", kind: "workout", workout: "A", includesMobility: true, includesBigThree: true, includesSteps: true },
  { day: 2, dayName: "Tuesday", shortDay: "T", title: "Jefferson Curl", kind: "jefferson", includesMobility: false, includesBigThree: true, includesSteps: true },
  { day: 3, dayName: "Wednesday", shortDay: "W", title: "Workout B", kind: "workout", workout: "B", includesMobility: true, includesBigThree: true, includesSteps: true },
  { day: 4, dayName: "Thursday", shortDay: "T", title: "Jefferson Curl", kind: "jefferson", includesMobility: false, includesBigThree: true, includesSteps: true },
  { day: 5, dayName: "Friday", shortDay: "F", title: "Workout C", kind: "workout", workout: "C", includesMobility: true, includesBigThree: true, includesSteps: true },
  { day: 6, dayName: "Saturday", shortDay: "S", title: "Recovery", kind: "recovery", includesMobility: false, includesBigThree: true, includesSteps: true },
  { day: 7, dayName: "Sunday", shortDay: "S", title: "Field Hour", kind: "field", includesMobility: true, includesBigThree: true, includesSteps: true },
];

export const program = source;

export const modules: DayModule[] = source.weeks.flatMap((week) =>
  dayTemplates.map((day) => ({ ...day, week: week.week, index: (week.week - 1) * 7 + day.day - 1 })),
);

export const phaseForWeek = (week: number) => source.phases.find((phase) => phase.id === source.weeks[week - 1].phase)!;
export const weekPlan = (week: number) => source.weeks[week - 1];
export const dayKey = (week: number, day: number) => `w${week}d${day}`;

export function adjustedSetCount(baseSets: number, mode: SetMode): number {
  if (mode === "minus-one") return Math.max(1, baseSets - 1);
  if (mode === "deload") return Math.max(1, Math.round(baseSets * 0.6));
  return baseSets;
}

export function roundToNearestFive(value: number): number {
  return Math.round(value / 5) * 5;
}

export function workingWeight(estimatedOneRepMax: number, week14Target: number, multiplier: number): number {
  return roundToNearestFive(estimatedOneRepMax * week14Target * multiplier);
}

export function formatWeight(value: number | null | undefined, mode?: string): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (mode === "per-hand") return `2 × ${value} lb`;
  return `${value} lb`;
}

export function mondayIso(date = new Date()): string {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = local.getDay();
  const offset = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  local.setDate(local.getDate() + offset);
  return local.toISOString().slice(0, 10);
}

export function dateForModule(startDate: string, index: number): Date {
  const date = new Date(`${startDate}T12:00:00`);
  date.setDate(date.getDate() + index);
  return date;
}

export function currentModuleIndex(startDate: string, now = new Date()): number {
  const start = new Date(`${startDate}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.min(104, Math.floor((today.getTime() - start.getTime()) / 86_400_000)));
}

export function bulgarianGuidance(week: number): string {
  if (week <= 2) return "Bodyweight only";
  if (week <= 5) return "Light dumbbells";
  return "Progress normally";
}

export function accessoryGuidance(phase: number): string {
  return phase === 1 ? "Leave 3+ reps in reserve" : phase === 2 ? "Leave 2 reps in reserve" : "Leave 1–2 reps in reserve";
}
