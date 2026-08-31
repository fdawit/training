"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  accessoryGuidance,
  adjustedSetCount,
  bulgarianGuidance,
  currentModuleIndex,
  dateForModule,
  dayKey,
  formatWeight,
  modules,
  phaseForWeek,
  program,
  weekPlan,
  workingWeight,
  type DayModule,
  type Exercise,
} from "./data/program";
import {
  defaultData,
  downloadBackup,
  loadData,
  storageKey,
  type AppData,
  type DayLog,
  type SetLog,
} from "./storage";
import {
  BoltIcon,
  CheckIcon,
  ChevronIcon,
  DownloadIcon,
  DumbbellIcon,
  FlameIcon,
  PathIcon,
  PauseIcon,
  PlayIcon,
  ProgressIcon,
  SettingsIcon,
  TimerIcon,
  TodayIcon,
  UploadIcon,
  XIcon,
} from "./components/Icons";

type View = "today" | "path" | "progress" | "settings";

interface TimerState {
  label: string;
  duration: number;
  remaining: number;
  endAt: number | null;
  running: boolean;
  preferenceKey?: string;
}

const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });
const longDateFormatter = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });

const emptyTimer: TimerState = { label: "Rest", duration: 90, remaining: 90, endAt: null, running: false };
const timerStorageKey = "training-path-15:timer:v1";

function safeNumber(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function completionPercent(log: DayLog | undefined): number {
  if (log?.status === "completed") return 100;
  const checks = Object.values(log?.checks ?? {});
  if (!checks.length) return 0;
  return Math.min(95, Math.round((checks.filter(Boolean).length / checks.length) * 100));
}

function countCompleted(data: AppData): number {
  return Object.values(data.dayLogs).filter((log) => log.status === "completed").length;
}

function countSkipped(data: AppData): number {
  return Object.values(data.dayLogs).filter((log) => log.status === "skipped").length;
}

function momentum(data: AppData, currentIndex: number): number {
  let score = 0;
  for (let index = Math.min(currentIndex, 104); index >= 0 && index > currentIndex - 7; index -= 1) {
    const dayModule = modules[index];
    if (data.dayLogs[dayKey(dayModule.week, dayModule.day)]?.status === "completed") score += 1;
  }
  return score;
}

function phaseClass(phase: number, deload = false): string {
  return deload ? "phase-deload" : `phase-${phase}`;
}

function Setup({ data, onSave }: { data: AppData; onSave: (next: AppData) => void }) {
  const [draft, setDraft] = useState(data);
  const updateLoad = (id: string, value: string) => setDraft((old) => ({ ...old, referenceLoads: { ...old.referenceLoads, [id]: value } }));
  const updateStartingMeasurement = (field: "bodyweight" | "waist", value: string) => setDraft((old) => ({ ...old, measurements: old.measurements.map((item) => item.week === 1 ? { ...item, date: old.startDate, [field]: value } : item) }));
  const startIsMonday = Boolean(draft.startDate) && new Date(`${draft.startDate}T12:00:00`).getDay() === 1;

  return (
    <main className="setup-shell">
      <section className="setup-panel">
        <div className="brand-lockup">
          <span className="brand-mark"><BoltIcon size={26} /></span>
          <div><p className="eyebrow">Your private training companion</p><h1>Training Path <span>15</span></h1></div>
        </div>
        <div className="setup-intro">
          <p className="phase-kicker">15 weeks · 105 daily modules</p>
          <h2>Set your starting line.</h2>
          <p>The calendar keeps moving even when a session is missed—exactly as the program requires. Your entries stay on this device.</p>
        </div>
        <label className="field-label">
          <span>Week 1 starts</span>
          <input type="date" value={draft.startDate} onChange={(event) => setDraft((old) => ({ ...old, startDate: event.target.value }))} />
          <small>Choose a Monday. You can change this later.</small>
          {!startIsMonday && <small className="field-error">The training week must start on a Monday.</small>}
        </label>
        <div className="reference-loads">
          <div className="section-heading compact"><div><p className="eyebrow">Optional now</p><h3>Test-day estimated 1RMs</h3></div><span className="pill">lb</span></div>
          <p className="muted-copy">These generate the workbook’s rounded weekly targets. Blank values simply show no recommendation.</p>
          <div className="load-grid">
            {program.referenceLifts.map((lift) => (
              <label className="mini-field" key={lift.id}>
                <span>{lift.name}</span>
                <small>{lift.prescription} · Week 14 at {Math.round(lift.week14Target * 100)}%</small>
                <input inputMode="decimal" placeholder="—" value={draft.referenceLoads[lift.id]} onChange={(event) => updateLoad(lift.id, event.target.value)} />
              </label>
            ))}
          </div>
        </div>
        <div className="starting-measurements">
          <label className="mini-field"><span>Starting bodyweight</span><small>Optional · 7-day average</small><input inputMode="decimal" placeholder="lb" value={draft.measurements[0].bodyweight} onChange={(event) => updateStartingMeasurement("bodyweight", event.target.value)} /></label>
          <label className="mini-field"><span>Starting waist</span><small>Optional</small><input inputMode="decimal" placeholder="in" value={draft.measurements[0].waist} onChange={(event) => updateStartingMeasurement("waist", event.target.value)} /></label>
        </div>
        <button className="primary-button full" disabled={!startIsMonday} onClick={() => onSave({ ...draft, setupComplete: true, measurements: draft.measurements.map((item) => item.week === 1 ? { ...item, date: draft.startDate } : item) })}>
          Enter the path <ChevronIcon size={20} />
        </button>
        <p className="privacy-note">No account. No cloud database. Export a backup whenever you want.</p>
      </section>
      <aside className="setup-map" aria-hidden="true">
        {[1, 2, 3].map((phase) => (
          <div className={`setup-phase ${phaseClass(phase)}`} key={phase}>
            <span>0{phase}</span><strong>{program.phases[phase - 1].name}</strong>
            <div className="setup-nodes">{Array.from({ length: 5 }, (_, i) => <i key={i} />)}</div>
          </div>
        ))}
      </aside>
    </main>
  );
}

function AppHeader({ data, currentIndex, onTimer }: { data: AppData; currentIndex: number; onTimer: () => void }) {
  const plan = weekPlan(modules[currentIndex].week);
  return (
    <header className="app-header">
      <div className="mini-brand"><span className="brand-mark small"><BoltIcon size={18} /></span><span>TP<span>15</span></span></div>
      <div className="header-stats">
        <span title="Current week"><DumbbellIcon size={18} /> W{modules[currentIndex].week}</span>
        <span title="Seven-day momentum"><FlameIcon size={18} /> {momentum(data, currentIndex)}</span>
        <button className="icon-button" onClick={onTimer} aria-label="Open timer"><TimerIcon size={20} /></button>
      </div>
      {plan.deload && <span className="header-deload">Deload</span>}
    </header>
  );
}

function BottomNav({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const items: { id: View; label: string; Icon: typeof PathIcon }[] = [
    { id: "path", label: "Path", Icon: PathIcon },
    { id: "today", label: "Today", Icon: TodayIcon },
    { id: "progress", label: "Progress", Icon: ProgressIcon },
    { id: "settings", label: "Settings", Icon: SettingsIcon },
  ];
  return <nav className="bottom-nav" aria-label="Primary navigation">{items.map(({ id, label, Icon }) => <button key={id} className={view === id ? "active" : ""} onClick={() => onChange(id)}><Icon /><span>{label}</span></button>)}</nav>;
}

function TimerTray({ timer, setTimer, open, setOpen, data, setData }: { timer: TimerState; setTimer: React.Dispatch<React.SetStateAction<TimerState>>; open: boolean; setOpen: (open: boolean) => void; data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>> }) {
  const presets = [30, 60, 90, 120, 180];
  const format = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const start = (duration = timer.remaining || timer.duration, label = timer.label) => setTimer((old) => ({ ...old, label, duration, remaining: duration, endAt: Date.now() + duration * 1000, running: true }));
  const pause = () => setTimer((old) => ({ ...old, running: false, endAt: null }));
  const adjust = (delta: number) => setTimer((old) => {
    const remaining = Math.max(0, old.remaining + delta);
    return { ...old, duration: Math.max(1, old.duration + delta), remaining, endAt: old.running ? Date.now() + remaining * 1000 : null };
  });
  const progress = timer.duration ? 1 - timer.remaining / timer.duration : 0;

  if (!open && !timer.running) return null;
  if (!open) return <button className="timer-mini" onClick={() => setOpen(true)}><span className="timer-mini-ring" style={{ "--timer-progress": `${progress * 360}deg` } as React.CSSProperties}><TimerIcon size={18} /></span><strong>{format(timer.remaining)}</strong><span>{timer.label}</span></button>;

  return (
    <div className="timer-backdrop" role="dialog" aria-modal="true" aria-label="Workout timer">
      <section className="timer-sheet">
        <div className="sheet-handle" />
        <button className="sheet-close" onClick={() => setOpen(false)} aria-label="Close timer"><XIcon /></button>
        <p className="eyebrow">Internal timer</p>
        <input className="timer-label" value={timer.label} onChange={(event) => setTimer((old) => ({ ...old, label: event.target.value }))} aria-label="Timer label" />
        <div className="timer-dial" style={{ "--timer-progress": `${progress * 360}deg` } as React.CSSProperties}><div><strong>{format(timer.remaining)}</strong><span>{timer.running ? "RUNNING" : "READY"}</span></div></div>
        <div className="timer-adjust"><button onClick={() => adjust(-15)}>−15</button><button className="timer-play" onClick={() => timer.running ? pause() : start()}>{timer.running ? <PauseIcon /> : <PlayIcon />}</button><button onClick={() => adjust(15)}>+15</button></div>
        <div className="preset-row">{presets.map((seconds) => <button key={seconds} className={timer.duration === seconds ? "active" : ""} onClick={() => { setTimer((old) => ({ ...old, duration: seconds, remaining: seconds, endAt: null, running: false })); if (timer.preferenceKey) setData((old) => ({ ...old, restPreferences: { ...old.restPreferences, [timer.preferenceKey!]: seconds } })); }}>{seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}</button>)}</div>
        <p className="timer-note">Rest periods are intentionally flexible because the workbook does not prescribe them. {data.settings.sound ? "Sound is on." : "Sound is off."}</p>
      </section>
    </div>
  );
}

function TodayPage({ data, currentIndex, onOpen, onViewPath }: { data: AppData; currentIndex: number; onOpen: (module: DayModule) => void; onViewPath: () => void }) {
  const dayModule = modules[currentIndex];
  const plan = weekPlan(dayModule.week);
  const loadWeek = data.loadWeekOverrides[String(dayModule.week)] ?? dayModule.week;
  const loadPlan = weekPlan(loadWeek);
  const phase = phaseForWeek(dayModule.week);
  const log = data.dayLogs[dayKey(dayModule.week, dayModule.day)];
  const completed = countCompleted(data);
  const phaseComplete = modules.filter((item) => weekPlan(item.week).phase === phase.id && data.dayLogs[dayKey(item.week, item.day)]?.status === "completed").length;

  return (
    <main className="page today-page">
      <section className={`today-hero ${phaseClass(phase.id, plan.deload)}`}>
        <div className="hero-topline"><span>Week {dayModule.week} · Day {dayModule.day}</span><span>{longDateFormatter.format(dateForModule(data.startDate, dayModule.index))}</span></div>
        <div className="hero-grid">
          <div>
            <p className="phase-kicker">Phase {phase.id} · {phase.name}</p>
            <h1>{dayModule.title}</h1>
            <p>{dayModule.kind === "workout" ? `Mobility → Workout ${dayModule.workout}` : dayModule.kind === "field" ? "Mobility → Field Hour → Jefferson Curl" : dayModule.kind === "jefferson" ? "Standalone curl session" : "Big Three + 10,000 steps"}</p>
          </div>
          <div className="rpe-orbit"><span>RPE CAP</span><strong>{plan.rpeCap}</strong></div>
        </div>
        <div className="hero-progress"><div><span>Today</span><strong>{completionPercent(log)}%</strong></div><div className="progress-track"><i style={{ width: `${completionPercent(log)}%` }} /></div></div>
        <button className="hero-action" onClick={() => onOpen(dayModule)}>{log?.status === "completed" ? "Review today" : "Start today"}<ChevronIcon /></button>
      </section>

      <section className="today-strip">
        <div><span className="stat-icon"><CheckIcon size={19} /></span><p><strong>{completed}</strong><small>days complete</small></p></div>
        <div><span className="stat-icon"><FlameIcon size={19} /></span><p><strong>{momentum(data, currentIndex)}/7</strong><small>momentum</small></p></div>
        <div><span className="stat-icon"><BoltIcon size={19} /></span><p><strong>{phaseComplete}/35</strong><small>phase days</small></p></div>
      </section>

      <section className="content-section">
        <div className="section-heading"><div><p className="eyebrow">This week</p><h2>The prescription</h2></div><button className="text-button" onClick={onViewPath}>View path</button></div>
        <div className="prescription-grid">
          <article><span>SETS</span><strong>{plan.setsLabel}</strong></article>
          <article><span>MAIN LIFTS</span><strong>{Math.round(loadPlan.loadMultiplier * 100)}% of W14 target{loadWeek !== dayModule.week ? ` · W${loadWeek} repeat` : ""}</strong></article>
          <article><span>JEFFERSON</span><strong>{plan.jeffersonLoad == null ? "Unloaded" : `${plan.jeffersonLoad} lb`}</strong></article>
          <article><span>FIELD</span><strong>{plan.fieldLabel}</strong></article>
        </div>
      </section>

      <section className="content-section rule-callout">
        <span className="callout-number">{String(phase.id).padStart(2, "0")}</span>
        <div><p className="eyebrow">Phase intent</p><h2>{phase.purpose}</h2><p>{phase.lifting}. {phase.field}.</p></div>
      </section>
    </main>
  );
}

function PathPage({ data, currentIndex, onOpen }: { data: AppData; currentIndex: number; onOpen: (module: DayModule) => void }) {
  return (
    <main className="page path-page">
      <div className="page-title"><p className="eyebrow">105 daily modules</p><h1>Your training path</h1><p>Future days can be previewed. The calendar—not a streak—controls progression.</p></div>
      {program.phases.map((phase) => (
        <section className={`path-phase ${phaseClass(phase.id)}`} key={phase.id}>
          <div className="phase-banner"><div><span>PHASE {String(phase.id).padStart(2, "0")}</span><h2>{phase.name}</h2></div><p>{phase.purpose}</p></div>
          {program.weeks.slice(phase.weeks[0] - 1, phase.weeks[1]).map((week) => (
            <div className={`week-path ${week.deload ? "is-deload" : ""}`} key={week.week}>
              <div className="week-label"><div><span>WEEK {String(week.week).padStart(2, "0")}</span><strong>{week.deload ? "DELOAD" : week.setsLabel.toUpperCase()}</strong></div><small>RPE {week.rpeCap} · {week.fieldLabel}</small></div>
              <div className="node-path">
                {modules.filter((item) => item.week === week.week).map((module) => {
                  const log = data.dayLogs[dayKey(module.week, module.day)];
                  const state = log?.status === "completed" ? "complete" : log?.status === "skipped" ? "skipped" : module.index === currentIndex ? "current" : module.index > currentIndex ? "future" : "available";
                  return <button className={`path-node ${state}`} key={module.index} onClick={() => onOpen(module)} aria-label={`Week ${module.week}, ${module.dayName}: ${module.title}, ${state}`}><span>{state === "complete" ? <CheckIcon /> : module.shortDay}</span><small>{module.title.replace("Workout ", "Lift ")}</small></button>;
                })}
              </div>
            </div>
          ))}
        </section>
      ))}
    </main>
  );
}

function ProgressPage({ data }: { data: AppData }) {
  const exerciseOptions = useMemo(() => {
    const seen = new Set<string>();
    return Object.values(program.workouts).flat().filter((exercise) => seen.has(exercise.id) ? false : (seen.add(exercise.id), true));
  }, []);
  const [selectedExercise, setSelectedExercise] = useState("back-squat");
  const completed = countCompleted(data);
  const skipped = countSkipped(data);
  const loggedMeasurements = data.measurements.filter((item) => item.bodyweight || item.waist);
  const first = loggedMeasurements[0];
  const last = loggedMeasurements.at(-1);
  const bodyChange = first && last && safeNumber(first.bodyweight) != null && safeNumber(last.bodyweight) != null ? safeNumber(last.bodyweight)! - safeNumber(first.bodyweight)! : null;
  const waistChange = first && last && safeNumber(first.waist) != null && safeNumber(last.waist) != null ? safeNumber(last.waist)! - safeNumber(first.waist)! : null;
  const weekBars = program.weeks.map((week) => modules.filter((module) => module.week === week.week && data.dayLogs[dayKey(module.week, module.day)]?.status === "completed").length);
  const selectedDefinition = exerciseOptions.find((exercise) => exercise.id === selectedExercise);
  const strengthRows = modules.flatMap((dayModule) => {
    const sets = data.dayLogs[dayKey(dayModule.week, dayModule.day)]?.exerciseLogs?.[selectedExercise];
    if (!sets?.length) return [];
    const actual = sets.map((set) => safeNumber(set.weight)).find((value) => value != null) ?? null;
    const rpeValues = sets.map((set) => safeNumber(set.rpe)).filter((value): value is number => value != null);
    const rpe = rpeValues.length ? Math.max(...rpeValues) : null;
    const targetLift = selectedDefinition && "targetLift" in selectedDefinition ? selectedDefinition.targetLift : undefined;
    const oneRm = targetLift ? safeNumber(data.referenceLoads[targetLift]) : null;
    const loadWeek = data.loadWeekOverrides[String(dayModule.week)] ?? dayModule.week;
    const target = oneRm != null && targetLift ? workingWeight(oneRm, data.week14Targets[targetLift], weekPlan(loadWeek).loadMultiplier) : null;
    return [{ week: dayModule.week, date: dateForModule(data.startDate, dayModule.index), actual, rpe, target, weightText: sets.find((set) => set.weight)?.weight ?? "—" }];
  });
  const maxStrengthWeight = Math.max(1, ...strengthRows.map((row) => row.actual ?? 0), ...strengthRows.map((row) => row.target ?? 0));

  return (
    <main className="page progress-page">
      <div className="page-title"><p className="eyebrow">Useful trends, no fake points</p><h1>Progress</h1><p>Your permanent record of consistency, measurements, and working loads.</p></div>
      <section className="progress-overview">
        <article className="adherence-ring" style={{ "--adherence": `${(completed / 105) * 360}deg` } as React.CSSProperties}><div><strong>{Math.round((completed / 105) * 100)}%</strong><span>program</span></div></article>
        <div className="progress-totals"><p><span>Completed</span><strong>{completed}</strong></p><p><span>Skipped</span><strong>{skipped}</strong></p><p><span>Remaining</span><strong>{105 - completed - skipped}</strong></p></div>
      </section>
      <section className="content-section">
        <div className="section-heading"><div><p className="eyebrow">Adherence</p><h2>Days completed by week</h2></div><span className="pill">out of 7</span></div>
        <div className="week-chart" aria-label="Completed days by week">{weekBars.map((count, index) => <div key={index}><i style={{ height: `${Math.max(5, (count / 7) * 100)}%` }} /><span>{index + 1}</span><small>{count}</small></div>)}</div>
      </section>
      <section className="content-section strength-section">
        <div className="section-heading"><div><p className="eyebrow">Strength history</p><h2>Target versus actual</h2></div><select aria-label="Choose exercise" value={selectedExercise} onChange={(event) => setSelectedExercise(event.target.value)}>{exerciseOptions.map((exercise) => <option value={exercise.id} key={exercise.id}>{exercise.name}</option>)}</select></div>
        {strengthRows.length ? <><div className="strength-chart" aria-label={`${selectedDefinition?.name ?? "Exercise"} weight history`}>{strengthRows.map((row) => <div key={`${row.week}-${row.date.toISOString()}`}><span className="target-bar" style={{ height: `${((row.target ?? 0) / maxStrengthWeight) * 100}%` }} /><i style={{ height: `${((row.actual ?? 0) / maxStrengthWeight) * 100}%` }} /><small>W{row.week}</small></div>)}</div><div className="strength-legend"><span><i />Actual</span><span><i />Target</span></div><div className="strength-history">{strengthRows.map((row) => <div key={`row-${row.week}`}><strong>W{row.week}</strong><span>{dayFormatter.format(row.date)}</span><span>{row.weightText} lb</span><span>RPE {row.rpe ?? "—"}</span><span>Target {row.target ?? "—"}</span></div>)}</div></> : <div className="empty-state"><DumbbellIcon size={28} /><strong>No logged sets yet</strong><p>Weights and RPE will appear here after you log this exercise.</p></div>}
      </section>
      <section className="content-section">
        <div className="section-heading"><div><p className="eyebrow">Measurements</p><h2>Weekly check-in</h2></div><div className="change-pills"><span>{bodyChange == null ? "—" : `${bodyChange > 0 ? "+" : ""}${bodyChange.toFixed(1)} lb`}</span><span>{waistChange == null ? "—" : `${waistChange > 0 ? "+" : ""}${waistChange.toFixed(1)} in`}</span></div></div>
        <div className="measurement-table"><div className="measurement-head"><span>WK</span><span>DATE</span><span>7-DAY LB</span><span>WAIST</span></div>{data.measurements.map((item) => <div className="measurement-row" key={item.week}><strong>{item.week}</strong><span>{item.date || "—"}</span><span>{item.bodyweight || "—"}</span><span>{item.waist || "—"}</span></div>)}</div>
      </section>
    </main>
  );
}

function SettingsPage({ data, setData }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>> }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const updateSetting = <K extends keyof AppData["settings"]>(key: K, value: AppData["settings"][K]) => setData((old) => ({ ...old, settings: { ...old.settings, [key]: value } }));
  const currentIndex = currentModuleIndex(data.startDate);
  const currentDayModule = modules[currentIndex];
  const moveCurrentDayToWeek = (targetWeek: number) => {
    const today = new Date();
    const newStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
    newStart.setDate(newStart.getDate() - ((targetWeek - 1) * 7 + currentDayModule.day - 1));
    setData((old) => ({ ...old, startDate: newStart.toISOString().slice(0, 10) }));
  };
  const applyResumeRule = (rule: "one" | "two-three" | "four-plus" | "vacation") => {
    if (rule === "one") {
      const sourceWeek = Math.max(1, currentDayModule.week - 1);
      setData((old) => ({ ...old, loadWeekOverrides: { ...old.loadWeekOverrides, [String(currentDayModule.week)]: sourceWeek } }));
      window.alert(`Week ${currentDayModule.week} will now use Week ${sourceWeek}'s working-load targets. The calendar stays on schedule.`);
      return;
    }
    if (rule === "vacation") {
      window.alert("No training is required. On return, use the Field Hour two-week rule if more than 14 days have passed.");
      return;
    }
    const targetWeek = rule === "four-plus" ? 2 : phaseForWeek(currentDayModule.week).weeks[0];
    if (window.confirm(`Move the current training position to Week ${targetWeek}? Existing history will be preserved.`)) moveCurrentDayToWeek(targetWeek);
  };
  const importBackup = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as AppData;
      if (parsed.schemaVersion !== 1 || !parsed.startDate || !Array.isArray(parsed.measurements)) throw new Error("Invalid backup");
      if (window.confirm("Replace all current Training Path data with this backup?")) setData({ ...defaultData, ...parsed, setupComplete: true });
    } catch { window.alert("That file is not a valid Training Path 15 backup."); }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <main className="page settings-page">
      <div className="page-title"><p className="eyebrow">Private, local, adjustable</p><h1>Settings</h1><p>Program rules stay fixed. Reference values and interface preferences remain yours.</p></div>
      <section className="settings-card">
        <div className="section-heading compact"><div><p className="eyebrow">Calendar</p><h2>Program position</h2></div></div>
        <label className="field-label"><span>Week 1 starts</span><input type="date" value={data.startDate} onChange={(event) => setData((old) => ({ ...old, startDate: event.target.value }))} /></label>
      </section>
      <section className="settings-card">
        <div className="section-heading compact"><div><p className="eyebrow">Workbook formula inputs</p><h2>Reference loads</h2></div></div>
        <div className="settings-loads">{program.referenceLifts.map((lift) => <div className="settings-load" key={lift.id}><div><strong>{lift.name}</strong><small>{lift.prescription}</small></div><label><span>1RM</span><input inputMode="decimal" value={data.referenceLoads[lift.id]} onChange={(event) => setData((old) => ({ ...old, referenceLoads: { ...old.referenceLoads, [lift.id]: event.target.value } }))} /></label><label><span>W14 %</span><input inputMode="decimal" value={Math.round(data.week14Targets[lift.id] * 100)} onChange={(event) => setData((old) => ({ ...old, week14Targets: { ...old.week14Targets, [lift.id]: Number(event.target.value) / 100 } }))} /></label></div>)}</div>
        {Object.keys(data.loadWeekOverrides).length > 0 && <div className="override-list">{Object.entries(data.loadWeekOverrides).map(([week, source]) => <span key={week}>Week {week} uses Week {source} loads <button onClick={() => setData((old) => { const next = { ...old.loadWeekOverrides }; delete next[week]; return { ...old, loadWeekOverrides: next }; })}><XIcon size={13} /></button></span>)}</div>}
      </section>
      <section className="settings-card">
        <div className="section-heading compact"><div><p className="eyebrow">Workbook return rules</p><h2>Resume assistant</h2></div><span className="pill">W{currentDayModule.week}</span></div>
        <p className="muted-copy">Choose what was missed. Calendar changes preserve every existing log.</p>
        <div className="resume-grid"><button onClick={() => applyResumeRule("one")}><strong>One week</strong><span>Repeat prior loads</span></button><button onClick={() => applyResumeRule("two-three")}><strong>2–3 weeks</strong><span>Phase start</span></button><button onClick={() => applyResumeRule("four-plus")}><strong>4+ weeks</strong><span>Restart Week 2</span></button><button onClick={() => applyResumeRule("vacation")}><strong>Vacation</strong><span>Nothing required</span></button></div>
      </section>
      <section className="settings-card">
        <div className="section-heading compact"><div><p className="eyebrow">Feedback</p><h2>Timer & motion</h2></div></div>
        <label className="toggle-row"><span><strong>Timer sound</strong><small>Off by default</small></span><input type="checkbox" checked={data.settings.sound} onChange={(event) => updateSetting("sound", event.target.checked)} /><i /></label>
        <label className="toggle-row"><span><strong>Vibration</strong><small>When supported by your browser</small></span><input type="checkbox" checked={data.settings.vibration} onChange={(event) => updateSetting("vibration", event.target.checked)} /><i /></label>
        <label className="toggle-row"><span><strong>Reduced motion</strong><small>Disables pulses and transitions</small></span><input type="checkbox" checked={data.settings.reducedMotion} onChange={(event) => updateSetting("reducedMotion", event.target.checked)} /><i /></label>
        <div className="hold-choice"><span><strong>Big Three hold</strong><small>Use 8 seconds if quality at 10 regresses</small></span><div><button className={data.settings.holdSeconds === 8 ? "active" : ""} onClick={() => updateSetting("holdSeconds", 8)}>8 sec</button><button className={data.settings.holdSeconds === 10 ? "active" : ""} onClick={() => updateSetting("holdSeconds", 10)}>10 sec</button></div></div>
      </section>
      <section className="settings-card">
        <div className="section-heading compact"><div><p className="eyebrow">Portable data</p><h2>Backup & restore</h2></div></div>
        <div className="backup-actions"><button onClick={() => downloadBackup(data)}><DownloadIcon />Export backup</button><button onClick={() => fileRef.current?.click()}><UploadIcon />Import backup</button><input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={(event) => void importBackup(event.target.files?.[0])} /></div>
        <p className="muted-copy">Your workout history is stored only in this browser. Export before clearing site data or switching devices.</p>
      </section>
      <details className="rules-panel"><summary>Full program rules <ChevronIcon /></summary><div>{program.rules.map((rule) => <article key={rule.id}><strong>{rule.title}</strong><p>{rule.text}</p></article>)}</div></details>
      <details className="rules-panel"><summary>Missed-week guidance <ChevronIcon /></summary><div>{program.missedRules.map((rule) => <article key={rule.id}><strong>{rule.title}</strong><p>{rule.text}</p></article>)}</div></details>
      <button className="danger-button" onClick={() => { if (window.confirm("Reset every logged workout, measurement, and setting? This cannot be undone unless you exported a backup.")) { window.localStorage.removeItem(storageKey); setData(defaultData); } }}>Reset all app data</button>
    </main>
  );
}

function CheckRow({ label, detail, checked, onChange, timerSeconds, onTimer }: { label: string; detail: string; checked: boolean; onChange: (checked: boolean) => void; timerSeconds?: number | null; onTimer: (seconds: number, label: string, preferenceKey?: string) => void }) {
  return <div className={`check-row ${checked ? "checked" : ""}`}><button className="round-check" onClick={() => onChange(!checked)} aria-label={`${checked ? "Uncheck" : "Check"} ${label}`}>{checked && <CheckIcon size={18} />}</button><div><strong>{label}</strong><span>{detail}</span></div>{timerSeconds ? <button className="row-timer" onClick={() => onTimer(timerSeconds, label)}><TimerIcon size={17} />{timerSeconds}s</button> : null}</div>;
}

function RoutineBlock({ title, eyebrow, items, log, updateLog, onTimer, holdSeconds }: { title: string; eyebrow: string; items: { id: string; name: string; prescription: string; timerSeconds?: number | null }[]; log: DayLog; updateLog: (patch: Partial<DayLog>) => void; onTimer: (seconds: number, label: string, preferenceKey?: string) => void; holdSeconds: number }) {
  const checks = log.checks ?? {};
  return <section className="session-block"><div className="session-block-title"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><span>{items.filter((item) => checks[item.id]).length}/{items.length}</span></div><div className="check-list">{items.map((item) => <CheckRow key={item.id} label={item.name} detail={item.prescription.replaceAll("10 sec", `${holdSeconds} sec`)} checked={Boolean(checks[item.id])} onChange={(checked) => updateLog({ checks: { ...checks, [item.id]: checked } })} timerSeconds={item.timerSeconds === 10 ? holdSeconds : item.timerSeconds} onTimer={onTimer} />)}</div></section>;
}

function ExerciseCard({ exercise, week, log, updateLog, onTimer, previousWeight, restSeconds }: { exercise: Exercise; week: number; log: DayLog; updateLog: (patch: Partial<DayLog>) => void; onTimer: (seconds: number, label: string, preferenceKey?: string) => void; previousWeight?: string; restSeconds: number }) {
  const plan = weekPlan(week);
  const setCount = adjustedSetCount(exercise.sets, plan.setMode as "minus-one" | "full" | "deload");
  const existing = log.exerciseLogs?.[exercise.id] ?? [];
  const setLogs: SetLog[] = Array.from({ length: setCount }, (_, index) => existing[index] ?? { weight: previousWeight ?? "", reps: String(exercise.reps).replace(" per side", ""), rpe: "", done: false });
  const choices = log.exerciseChoices ?? {};
  const selectedChoice = choices[exercise.id] ?? exercise.alternatives?.[(week - 1) % (exercise.alternatives?.length ?? 1)] ?? exercise.name;
  const estimated = exercise.targetLift ? safeNumber((log as DayLog & { referenceLoads?: Record<string, string> }).referenceLoads?.[exercise.targetLift]) : null;
  void estimated;
  const setExerciseLogs = (next: SetLog[]) => updateLog({ exerciseLogs: { ...(log.exerciseLogs ?? {}), [exercise.id]: next } });
  const updateSet = (index: number, patch: Partial<SetLog>) => setExerciseLogs(setLogs.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const allDone = setLogs.every((set) => set.done);
  const warning = setLogs.some((set) => safeNumber(set.rpe) != null && safeNumber(set.rpe)! > plan.rpeCap);
  const special = exercise.id === "bulgarian-split-squat" ? bulgarianGuidance(week) : exercise.category === "primer" ? "Light and explosive—all 15 weeks" : exercise.category === "accessory" ? accessoryGuidance(plan.phase) : "RPE cap overrides the target";

  return (
    <article className={`exercise-card ${allDone ? "done" : ""} ${warning ? "warning" : ""}`}>
      <div className="exercise-head"><span className="exercise-order">{exercise.order}</span><div><p className="eyebrow">{exercise.category === "main" ? "Main lift" : exercise.category}</p><h3>{selectedChoice}</h3><p>{setCount}×{exercise.reps}{setCount !== exercise.sets ? ` · adjusted from ${exercise.prescription}` : ""}</p></div>{allDone && <span className="done-badge"><CheckIcon size={17} /></span>}</div>
      {exercise.alternatives && <div className="choice-row">{exercise.alternatives.map((choice) => <button className={selectedChoice === choice ? "active" : ""} key={choice} onClick={() => updateLog({ exerciseChoices: { ...choices, [exercise.id]: choice } })}>{choice}</button>)}</div>}
      <div className="guidance-line"><BoltIcon size={16} /><span>{special}</span>{previousWeight && <small>Previous: {previousWeight}</small>}</div>
      <div className="set-table"><div className="set-head"><span>SET</span><span>{exercise.weightMode === "per-hand" ? "LB / HAND" : "WEIGHT"}</span><span>REPS</span><span>RPE</span><span>DONE</span></div>{setLogs.map((set, index) => <div className="set-row" key={index}><strong>{index + 1}</strong><input aria-label={`${exercise.name} set ${index + 1} weight`} inputMode="decimal" placeholder={exercise.weightMode === "per-hand" ? "each" : "lb / BW"} value={set.weight} onChange={(event) => updateSet(index, { weight: event.target.value })} /><input aria-label={`${exercise.name} set ${index + 1} reps`} inputMode="numeric" value={set.reps} onChange={(event) => updateSet(index, { reps: event.target.value })} /><input aria-label={`${exercise.name} set ${index + 1} RPE`} inputMode="decimal" placeholder="—" value={set.rpe} onChange={(event) => updateSet(index, { rpe: event.target.value })} /><button className={set.done ? "complete" : ""} onClick={() => { updateSet(index, { done: !set.done }); if (!set.done) onTimer(restSeconds, `${exercise.name} rest`, exercise.id); }} aria-label={`Complete ${exercise.name} set ${index + 1}`}>{set.done && <CheckIcon size={16} />}</button></div>)}</div>
      {setCount > 1 && <button className="repeat-weight" onClick={() => { const weight = setLogs.find((set) => set.weight)?.weight ?? ""; setExerciseLogs(setLogs.map((set) => ({ ...set, weight }))); }}>Use first weight for all sets</button>}
      {exercise.timerSeconds && <button className="inline-timer" onClick={() => onTimer(exercise.timerSeconds!, exercise.name)}><TimerIcon size={18} />Start {exercise.timerSeconds}-second timer</button>}
      {warning && <p className="rpe-warning">Entered RPE exceeds this week’s cap of {plan.rpeCap}. Reduce the next set if needed.</p>}
    </article>
  );
}

function JeffersonBlock({ module, plan, log, updateLog, onTimer }: { module: DayModule; plan: ReturnType<typeof weekPlan>; log: DayLog; updateLog: (patch: Partial<DayLog>) => void; onTimer: (seconds: number, label: string, preferenceKey?: string) => void }) {
  const checks = log.checks ?? {};
  const quality = log.jeffersonQuality ?? { fullRange: false, noHesitation: false, controlled: false };
  const weight = plan.jeffersonLoad == null ? "Unloaded" : `${plan.jeffersonLoad} lb`;
  const items = module.kind === "field" ? [] : [
    { id: "awake-two-hours", label: "Awake for at least two hours", detail: "Never perform within two hours of waking" },
    { id: "not-before-lift", label: "Not before a lifting session", detail: "This is a separate session" },
    { id: "jefferson-warmup", label: "Five-minute easy walk or bike", detail: "Then Cat-Cow and World's Greatest Stretch" },
  ];
  const setLogs = log.exerciseLogs?.["jefferson-curl"] ?? Array.from({ length: 2 }, () => ({ weight: plan.jeffersonLoad == null ? "BW" : String(plan.jeffersonLoad), reps: "5", rpe: "", done: false }));
  const updateSets = (next: SetLog[]) => updateLog({ exerciseLogs: { ...(log.exerciseLogs ?? {}), "jefferson-curl": next } });
  return <section className="session-block jefferson-block"><div className="session-block-title"><div><p className="eyebrow">Separate session · 2×5</p><h2>Jefferson Curl</h2></div><span className="load-chip">{weight}</span></div>{items.length > 0 && <div className="check-list">{items.map((item) => <CheckRow key={item.id} label={item.label} detail={item.detail} checked={Boolean(checks[item.id])} onChange={(checked) => updateLog({ checks: { ...checks, [item.id]: checked } })} timerSeconds={item.id === "jefferson-warmup" ? 300 : null} onTimer={onTimer} />)}</div>}
    {module.kind === "field" && <p className="info-note">No separate warm-up: perform immediately after the Field Hour.</p>}
    <div className="set-table"><div className="set-head"><span>SET</span><span>WEIGHT</span><span>REPS</span><span>RPE</span><span>DONE</span></div>{setLogs.map((set, index) => <div className="set-row" key={index}><strong>{index + 1}</strong><input value={set.weight} onChange={(event) => updateSets(setLogs.map((item, i) => i === index ? { ...item, weight: event.target.value } : item))} /><input value={set.reps} onChange={(event) => updateSets(setLogs.map((item, i) => i === index ? { ...item, reps: event.target.value } : item))} /><input inputMode="decimal" value={set.rpe} placeholder="—" onChange={(event) => updateSets(setLogs.map((item, i) => i === index ? { ...item, rpe: event.target.value } : item))} /><button className={set.done ? "complete" : ""} onClick={() => updateSets(setLogs.map((item, i) => i === index ? { ...item, done: !item.done } : item))}>{set.done && <CheckIcon size={16} />}</button></div>)}</div>
    <div className="quality-grid">{([['fullRange','Full range'],['noHesitation','No hesitation'],['controlled','Control maintained']] as const).map(([key, label]) => <button className={quality[key] ? "active" : ""} key={key} onClick={() => updateLog({ jeffersonQuality: { ...quality, [key]: !quality[key] } })}><span>{quality[key] && <CheckIcon size={16} />}</span>{label}</button>)}</div>
    {Object.values(quality).some((value) => !value) && <p className="info-note caution">Hold or reduce the load if range, hesitation, or control regressed. Calendar week alone does not earn an increase.</p>}
  </section>;
}

function FieldBlock({ plan, log, updateLog, returnStage }: { plan: ReturnType<typeof weekPlan>; log: DayLog; updateLog: (patch: Partial<DayLog>) => void; returnStage: 0 | 1 | 2 }) {
  const checks = log.checks ?? {};
  const blockLimit = returnStage === 1 ? Math.min(4, plan.fieldBlocksUpTo) : returnStage === 2 ? Math.min(5, plan.fieldBlocksUpTo) : plan.fieldBlocksUpTo;
  const visibleBlocks = program.fieldBlocks.filter((block) => block.number <= blockLimit);
  const sprintTarget = returnStage > 0 ? null : plan.sprintReps;
  const fieldLabel = returnStage === 1 ? "Return session 1: drills and build-ups only" : returnStage === 2 ? "Return session 2: restore bounds, no intervals" : plan.fieldLabel;
  return <section className="session-block field-block"><div className="session-block-title"><div><p className="eyebrow">Week {plan.week} field progression</p><h2>Field Hour</h2></div><span>{visibleBlocks.filter((block) => checks[`field-${block.number}`]).length}/{visibleBlocks.length}</span></div><div className="field-spec"><strong>{fieldLabel}</strong><span>Controlled work, not a time trial.</span></div><div className="field-list">{visibleBlocks.map((block) => <button key={block.number} className={checks[`field-${block.number}`] ? "done" : ""} onClick={() => updateLog({ checks: { ...checks, [`field-${block.number}`]: !checks[`field-${block.number}`] } })}><span className="field-number">0{block.number}</span><div><strong>{block.name}</strong><small>{block.number === 4 && plan.buildupPercent ? `Build-ups at ${plan.buildupPercent}%` : block.number === 5 && plan.boundSets ? `${plan.boundSets}×${plan.boundContacts} contacts, both legs` : block.drills.join(" · ")}</small></div><span className="field-check">{checks[`field-${block.number}`] && <CheckIcon size={17} />}</span></button>)}</div>{sprintTarget && <div className="sprint-counter"><div><p className="eyebrow">Long-side tempo reps</p><strong>{log.sprintReps ?? 0}<span> / {sprintTarget}</span></strong></div><div><button onClick={() => updateLog({ sprintReps: Math.max(0, (log.sprintReps ?? 0) - 1) })}>−</button><button onClick={() => updateLog({ sprintReps: Math.min(sprintTarget, (log.sprintReps ?? 0) + 1) })}>+</button></div><p>Run at ~85%, controlled. Jog the short sides.</p></div>}{returnStage > 0 ? <p className="info-note caution">The two-week field rule is active. This app has limited the session while you earn bounds and intervals back.</p> : <p className="info-note">Ski bounds always happen before intervals. Contacts shown are per set, both legs.</p>}</section>;
}

function DayDetail({ module, data, setData, currentIndex, onClose, onTimer }: { module: DayModule; data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; currentIndex: number; onClose: () => void; onTimer: (seconds: number, label: string, preferenceKey?: string) => void }) {
  const key = dayKey(module.week, module.day);
  const log = data.dayLogs[key] ?? {};
  const plan = weekPlan(module.week);
  const loadWeek = data.loadWeekOverrides[String(module.week)] ?? module.week;
  const loadPlan = weekPlan(loadWeek);
  const phase = phaseForWeek(module.week);
  const isFuture = module.index > currentIndex;
  const updateLog = (patch: Partial<DayLog>) => setData((old) => ({ ...old, dayLogs: { ...old.dayLogs, [key]: { ...(old.dayLogs[key] ?? {}), ...patch } } }));
  const updateMeasurement = (field: "date" | "bodyweight" | "waist", value: string) => setData((old) => ({ ...old, measurements: old.measurements.map((item) => item.week === module.week ? { ...item, [field]: value } : item) }));
  const workoutExercises = module.workout ? (program.workouts[module.workout] as Exercise[]) : [];
  const previousWorkoutModule = module.workout ? modules.slice(0, module.index).reverse().find((item) => item.workout === module.workout) : undefined;
  const previousLog = previousWorkoutModule ? data.dayLogs[dayKey(previousWorkoutModule.week, previousWorkoutModule.day)] : undefined;
  const completedFieldIndices = modules.filter((item) => item.kind === "field" && item.index < module.index && data.dayLogs[dayKey(item.week, item.day)]?.status === "completed").map((item) => item.index);
  const lastFieldIndex = completedFieldIndices.at(-1);
  const priorFieldIndex = completedFieldIndices.at(-2);
  const previousFieldWasReturn = lastFieldIndex != null && ((priorFieldIndex == null && modules[lastFieldIndex].week > 1) || (priorFieldIndex != null && lastFieldIndex - priorFieldIndex > 14));
  const fieldReturnStage: 0 | 1 | 2 = module.kind !== "field" || (module.week === 1 && lastFieldIndex == null) ? 0 : lastFieldIndex == null || module.index - lastFieldIndex > 14 ? 1 : previousFieldWasReturn ? 2 : 0;

  const targetFor = (exercise: Exercise): number | null => {
    if (!exercise.targetLift) return null;
    const oneRm = safeNumber(data.referenceLoads[exercise.targetLift]);
    if (oneRm == null) return null;
    return workingWeight(oneRm, data.week14Targets[exercise.targetLift], loadPlan.loadMultiplier);
  };

  return (
    <div className="detail-shell">
      <header className={`detail-header ${phaseClass(phase.id, plan.deload)}`}>
        <button className="detail-close" onClick={onClose}><XIcon /><span>Close</span></button>
        <div className="detail-meta"><span>Week {module.week} · {module.dayName}</span><span>{dayFormatter.format(dateForModule(data.startDate, module.index))}</span></div>
        <div className="detail-title"><div><p className="phase-kicker">{phase.name}{plan.deload ? " · Deload" : ""}</p><h1>{module.title}</h1></div><div className="rpe-orbit small"><span>RPE</span><strong>{plan.rpeCap}</strong></div></div>
        {isFuture && <div className="preview-banner">Preview mode · logging unlocks on this training date</div>}
      </header>
      <main className={`detail-content ${isFuture ? "preview-only" : ""}`}>
        <RoutineBlock title="Big Three" eyebrow="Daily · any time" items={program.bigThree} log={log} updateLog={updateLog} onTimer={onTimer} holdSeconds={data.settings.holdSeconds} />
        <section className="session-block step-block"><div><span className="step-icon">10K</span><div><p className="eyebrow">Daily movement</p><h2>Steps</h2><p>Goal completes at 10,000.</p></div></div><label><input inputMode="numeric" value={log.steps ?? ""} placeholder="0" onChange={(event) => updateLog({ steps: Number(event.target.value) || 0 })} /><span>/ 10,000</span></label><div className="progress-track"><i style={{ width: `${Math.min(100, ((log.steps ?? 0) / program.dailyStepGoal) * 100)}%` }} /></div></section>
        {module.includesMobility && <RoutineBlock title="Mobility" eyebrow="Before the session" items={program.mobility} log={log} updateLog={updateLog} onTimer={onTimer} holdSeconds={data.settings.holdSeconds} />}
        {module.kind === "workout" && <section className="workout-block"><div className="section-heading"><div><p className="eyebrow">Ordered lifting session</p><h2>Workout {module.workout}</h2></div><span className="pill">{plan.setsLabel}</span></div><div className="workout-guidance"><span><strong>{Math.round(loadPlan.loadMultiplier * 100)}%</strong> of W14 target</span><p>{loadWeek !== module.week ? `Week ${loadWeek} loads · ` : ""}RPE {plan.rpeCap} overrides every calculated load.</p></div>{workoutExercises.map((exercise) => { const target = targetFor(exercise); const previousSets = previousLog?.exerciseLogs?.[exercise.id]; const previousWeight = previousSets?.find((set) => set.weight)?.weight; return <div key={exercise.id}>{target != null && <div className="target-ribbon"><span>{exercise.name} target</span><strong>{formatWeight(target, exercise.weightMode)}</strong><small>Workbook formula · nearest 5 lb</small></div>}<ExerciseCard exercise={exercise} week={module.week} log={log} updateLog={updateLog} onTimer={onTimer} previousWeight={previousWeight} restSeconds={data.restPreferences[exercise.id] ?? 90} /></div>; })}</section>}
        {module.kind === "field" && <FieldBlock plan={plan} log={log} updateLog={updateLog} returnStage={fieldReturnStage} />}
        {(module.kind === "jefferson" || module.kind === "field") && <JeffersonBlock module={module} plan={plan} log={log} updateLog={updateLog} onTimer={onTimer} />}
        {module.kind === "recovery" && <section className="session-block recovery-card"><span><FlameIcon size={34} /></span><h2>Recovery is the work.</h2><p>Nothing else is scheduled. Complete the Big Three and your 10,000 steps, then leave room for adaptation.</p></section>}
        {module.day === 7 && <section className="session-block weekly-check"><div className="session-block-title"><div><p className="eyebrow">7-day average</p><h2>Weekly measurement</h2></div><span>W{module.week}</span></div><div className="weekly-fields"><label><span>Date</span><input type="date" value={data.measurements[module.week - 1].date} onChange={(event) => updateMeasurement("date", event.target.value)} /></label><label><span>Bodyweight (lb)</span><input inputMode="decimal" value={data.measurements[module.week - 1].bodyweight} onChange={(event) => updateMeasurement("bodyweight", event.target.value)} /></label><label><span>Waist (in)</span><input inputMode="decimal" value={data.measurements[module.week - 1].waist} onChange={(event) => updateMeasurement("waist", event.target.value)} /></label></div></section>}
        <section className="session-block notes-block"><label><span>Session notes</span><textarea rows={3} placeholder="Anything worth remembering…" value={log.notes ?? ""} onChange={(event) => updateLog({ notes: event.target.value })} /></label></section>
        <div className="detail-actions"><button className="secondary-button" disabled={isFuture} onClick={() => updateLog({ status: log.status === "skipped" ? undefined : "skipped" })}>{log.status === "skipped" ? "Undo skip" : "Mark skipped"}</button><button className="primary-button" disabled={isFuture} onClick={() => updateLog({ status: log.status === "completed" ? undefined : "completed" })}>{log.status === "completed" ? "Mark incomplete" : "Complete day"}<CheckIcon size={20} /></button></div>
        <p className="session-rule">Missed sessions are skipped, never doubled up.</p>
      </main>
    </div>
  );
}

export default function TrainingApp() {
  const [data, setData] = useState<AppData>(defaultData);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("today");
  const [selectedModule, setSelectedModule] = useState<DayModule | null>(null);
  const [timer, setTimer] = useState<TimerState>(emptyTimer);
  const [timerOpen, setTimerOpen] = useState(false);
  const timerFinished = useRef(false);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setData(loadData());
      try {
        const savedTimer = window.localStorage.getItem(timerStorageKey);
        if (savedTimer) setTimer({ ...emptyTimer, ...JSON.parse(savedTimer) as TimerState });
      } catch { /* Ignore malformed timer state. */ }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timerId);
  }, []);
  useEffect(() => { if (ready) window.localStorage.setItem(storageKey, JSON.stringify(data)); }, [data, ready]);
  useEffect(() => { if (ready) window.localStorage.setItem(timerStorageKey, JSON.stringify(timer)); }, [timer, ready]);
  useEffect(() => { document.documentElement.dataset.reducedMotion = data.settings.reducedMotion ? "true" : "false"; }, [data.settings.reducedMotion]);
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };
    if (timer.running && nav.wakeLock) void nav.wakeLock.request("screen").then((value) => { lock = value; }).catch(() => undefined);
    return () => { if (lock) void lock.release(); };
  }, [timer.running]);
  useEffect(() => {
    if (!timer.running || !timer.endAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((timer.endAt! - Date.now()) / 1000));
      setTimer((old) => ({ ...old, remaining, running: remaining > 0, endAt: remaining > 0 ? old.endAt : null }));
      if (remaining === 0 && !timerFinished.current) {
        timerFinished.current = true;
        if (data.settings.vibration && navigator.vibrate) navigator.vibrate([180, 80, 180]);
        if (data.settings.sound) {
          try { const context = new AudioContext(); const oscillator = context.createOscillator(); oscillator.connect(context.destination); oscillator.frequency.value = 740; oscillator.start(); oscillator.stop(context.currentTime + 0.22); } catch { /* Browser may block audio. */ }
        }
      }
    };
    timerFinished.current = false;
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [timer.running, timer.endAt, data.settings.sound, data.settings.vibration]);

  const currentIndex = useMemo(() => currentModuleIndex(data.startDate), [data.startDate]);
  const startTimer = (seconds: number, label: string, preferenceKey?: string) => { setTimer({ label, duration: seconds, remaining: seconds, endAt: Date.now() + seconds * 1000, running: true, preferenceKey }); setTimerOpen(true); };

  if (!ready) return <main className="loading-screen"><span className="brand-mark"><BoltIcon /></span><p>Loading your path…</p></main>;
  if (!data.setupComplete) return <Setup data={data} onSave={setData} />;

  return (
    <div className="app-shell">
      <AppHeader data={data} currentIndex={currentIndex} onTimer={() => setTimerOpen(true)} />
      {view === "today" && <TodayPage data={data} currentIndex={currentIndex} onOpen={setSelectedModule} onViewPath={() => setView("path")} />}
      {view === "path" && <PathPage data={data} currentIndex={currentIndex} onOpen={setSelectedModule} />}
      {view === "progress" && <ProgressPage data={data} />}
      {view === "settings" && <SettingsPage data={data} setData={setData} />}
      <BottomNav view={view} onChange={setView} />
      <TimerTray timer={timer} setTimer={setTimer} open={timerOpen} setOpen={setTimerOpen} data={data} setData={setData} />
      {selectedModule && <DayDetail module={selectedModule} data={data} setData={setData} currentIndex={currentIndex} onClose={() => setSelectedModule(null)} onTimer={startTimer} />}
    </div>
  );
}
