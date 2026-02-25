import { create } from "zustand";

export type PomodoroPhase = "idle" | "work" | "short_break" | "long_break";

export interface PomodoroSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number; // number of pomodoros before a long break
}

export const DEFAULT_SETTINGS: PomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
};

// Computed from settings — used by timer component
export function getPhaseDurations(settings: PomodoroSettings): Record<PomodoroPhase, number> {
  return {
    idle: settings.workMinutes * 60,
    work: settings.workMinutes * 60,
    short_break: settings.shortBreakMinutes * 60,
    long_break: settings.longBreakMinutes * 60,
  };
}

// Static durations used as fallback / for display before settings load
export const PHASE_DURATIONS: Record<PomodoroPhase, number> = getPhaseDurations(DEFAULT_SETTINGS);

export const PHASE_LABELS: Record<PomodoroPhase, string> = {
  idle: "Ready",
  work: "Focus",
  short_break: "Short Break",
  long_break: "Long Break",
};

interface PomodoroStore {
  phase: PomodoroPhase;
  timeLeft: number;
  isRunning: boolean;
  pomodoroCount: number;
  totalPomodoros: number;
  linkedTaskId: string | null;
  startedAt: string | null;
  settings: PomodoroSettings;

  start: () => void;
  pause: () => void;
  reset: () => void;
  tick: () => void;
  setLinkedTask: (taskId: string | null) => void;
  updateSettings: (settings: Partial<PomodoroSettings>) => void;
  onPhaseComplete: () => { wasWork: boolean; durationMinutes: number };
}

export const usePomodoroStore = create<PomodoroStore>((set, get) => ({
  phase: "idle",
  timeLeft: DEFAULT_SETTINGS.workMinutes * 60,
  isRunning: false,
  pomodoroCount: 0,
  totalPomodoros: 0,
  linkedTaskId: null,
  startedAt: null,
  settings: DEFAULT_SETTINGS,

  start: () => {
    const { phase } = get();
    set({
      isRunning: true,
      phase: phase === "idle" ? "work" : phase,
      startedAt: get().startedAt ?? new Date().toISOString(),
    });
  },

  pause: () => set({ isRunning: false }),

  reset: () => {
    const { settings } = get();
    set({
      phase: "idle",
      timeLeft: settings.workMinutes * 60,
      isRunning: false,
      startedAt: null,
    });
  },

  tick: () => {
    const { timeLeft, isRunning } = get();
    if (!isRunning) return;
    set({ timeLeft: Math.max(0, timeLeft - 1) });
  },

  setLinkedTask: (taskId) => set({ linkedTaskId: taskId }),

  updateSettings: (newSettings) => {
    const { settings, phase, isRunning } = get();
    const merged = { ...settings, ...newSettings };
    const durations = getPhaseDurations(merged);

    // Only reset timeLeft if timer is idle (not running)
    const updates: Partial<PomodoroStore> = { settings: merged };
    if (!isRunning && phase === "idle") {
      updates.timeLeft = durations.work;
    }
    set(updates);
  },

  onPhaseComplete: () => {
    const { phase, pomodoroCount, totalPomodoros, settings } = get();
    const durations = getPhaseDurations(settings);
    const wasWork = phase === "work";
    const durationMinutes = durations[phase] / 60;

    let nextPhase: PomodoroPhase;
    let newPomodoroCount = pomodoroCount;
    let newTotalPomodoros = totalPomodoros;

    if (wasWork) {
      newPomodoroCount = pomodoroCount + 1;
      newTotalPomodoros = totalPomodoros + 1;
      nextPhase =
        newPomodoroCount % settings.longBreakInterval === 0
          ? "long_break"
          : "short_break";
      if (nextPhase === "long_break") newPomodoroCount = 0;
    } else {
      nextPhase = "work";
    }

    set({
      phase: nextPhase,
      timeLeft: durations[nextPhase],
      isRunning: false,
      pomodoroCount: newPomodoroCount,
      totalPomodoros: newTotalPomodoros,
      startedAt: null,
    });

    return { wasWork, durationMinutes };
  },
}));
