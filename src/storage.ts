import { mondayIso, program } from "./data/program";

export interface SetLog {
  weight: string;
  reps: string;
  rpe: string;
  done: boolean;
}

export interface DayLog {
  status?: "completed" | "skipped";
  steps?: number;
  checks?: Record<string, boolean>;
  exerciseLogs?: Record<string, SetLog[]>;
  exerciseChoices?: Record<string, string>;
  sprintReps?: number;
  notes?: string;
  jeffersonQuality?: { fullRange: boolean; noHesitation: boolean; controlled: boolean };
}

export interface Measurement {
  week: number;
  date: string;
  bodyweight: string;
  waist: string;
}

export interface AppData {
  schemaVersion: 1;
  setupComplete: boolean;
  startDate: string;
  referenceLoads: Record<string, string>;
  week14Targets: Record<string, number>;
  dayLogs: Record<string, DayLog>;
  measurements: Measurement[];
  restPreferences: Record<string, number>;
  loadWeekOverrides: Record<string, number>;
  settings: {
    sound: boolean;
    vibration: boolean;
    reducedMotion: boolean;
    holdSeconds: 8 | 10;
  };
}

export const storageKey = "training-path-15:v1";

export const defaultData: AppData = {
  schemaVersion: 1,
  setupComplete: false,
  startDate: mondayIso(),
  referenceLoads: Object.fromEntries(program.referenceLifts.map((lift) => [lift.id, ""])),
  week14Targets: Object.fromEntries(program.referenceLifts.map((lift) => [lift.id, lift.week14Target])),
  dayLogs: {},
  measurements: Array.from({ length: 15 }, (_, index) => ({ week: index + 1, date: "", bodyweight: "", waist: "" })),
  restPreferences: {},
  loadWeekOverrides: {},
  settings: { sound: false, vibration: true, reducedMotion: false, holdSeconds: 10 },
};

export function loadData(): AppData {
  if (typeof window === "undefined") return defaultData;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaultData;
    const parsed = JSON.parse(raw) as Partial<AppData>;
    if (parsed.schemaVersion !== 1) return defaultData;
    return {
      ...defaultData,
      ...parsed,
      referenceLoads: { ...defaultData.referenceLoads, ...parsed.referenceLoads },
      week14Targets: { ...defaultData.week14Targets, ...parsed.week14Targets },
      dayLogs: parsed.dayLogs ?? {},
      measurements: parsed.measurements?.length === 15 ? parsed.measurements : defaultData.measurements,
      restPreferences: parsed.restPreferences ?? {},
      loadWeekOverrides: parsed.loadWeekOverrides ?? {},
      settings: { ...defaultData.settings, ...parsed.settings },
    };
  } catch {
    return defaultData;
  }
}

export function downloadBackup(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `training-path-15-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
