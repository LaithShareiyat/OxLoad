"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  usePomodoroStore,
  getPhaseDurations,
  PHASE_LABELS,
  PomodoroPhase,
} from "@/stores/pomodoro-store";
import { useUpdateTask, useTasks } from "@/hooks/use-tasks";
import { useCreateStudySession } from "@/hooks/use-study-sessions";
import { useCourses } from "@/hooks/use-courses";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Play, Pause, RotateCcw, Timer, Settings2, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const RING_RADIUS = 80;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const PHASE_COLORS: Record<PomodoroPhase, string> = {
  idle: "hsl(var(--primary))",
  work: "#EF4444",
  short_break: "#10B981",
  long_break: "#3B82F6",
};

function playBeep(type: "complete" | "start" = "complete") {
  if (typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(type === "complete" ? 523 : 440, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // AudioContext not available
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function SettingsPanel() {
  const { settings, updateSettings, isRunning } = usePomodoroStore();
  const [local, setLocal] = useState(settings);

  // Keep local in sync when settings change externally
  useEffect(() => setLocal(settings), [settings]);

  const spinner = (
    label: string,
    key: keyof typeof local,
    min: number,
    max: number,
    unit: string
  ) => (
    <div key={key} className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <button
          disabled={isRunning || (local[key] as number) <= min}
          onClick={() =>
            setLocal((p) => ({ ...p, [key]: Math.max(min, (p[key] as number) - 1) }))
          }
          className="flex h-6 w-6 items-center justify-center rounded border text-sm hover:bg-muted disabled:opacity-40"
        >
          −
        </button>
        <span className="w-14 text-center text-sm font-mono font-medium tabular-nums">
          {local[key]}{unit}
        </span>
        <button
          disabled={isRunning || (local[key] as number) >= max}
          onClick={() =>
            setLocal((p) => ({ ...p, [key]: Math.min(max, (p[key] as number) + 1) }))
          }
          className="flex h-6 w-6 items-center justify-center rounded border text-sm hover:bg-muted disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );

  const isDirty = JSON.stringify(local) !== JSON.stringify(settings);

  return (
    <div className="w-full rounded-md border bg-muted/40 p-3 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Timer Settings
      </p>
      {spinner("Focus duration", "workMinutes", 1, 90, " min")}
      {spinner("Short break", "shortBreakMinutes", 1, 30, " min")}
      {spinner("Long break", "longBreakMinutes", 1, 60, " min")}
      {spinner("Long break every", "longBreakInterval", 2, 8, " sessions")}
      {isRunning && (
        <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
          Stop the timer to apply changes
        </p>
      )}
      {!isRunning && isDirty && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => updateSettings(local)}
          >
            Apply
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 h-7 text-xs"
            onClick={() => setLocal(settings)}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

export function PomodoroTimer() {
  const {
    phase,
    timeLeft,
    isRunning,
    pomodoroCount,
    totalPomodoros,
    linkedTaskId,
    settings,
    start,
    pause,
    reset,
    tick,
    setLinkedTask,
    onPhaseComplete,
  } = usePomodoroStore();

  const [showSettings, setShowSettings] = useState(false);

  const updateTask = useUpdateTask();
  const createSession = useCreateStudySession();
  const { data: tasks } = useTasks({ status: ["pending", "in_progress"] });
  const { data: courses } = useCourses();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<string | null>(null);

  const durations = getPhaseDurations(settings);

  const handlePhaseComplete = useCallback(() => {
    playBeep("complete");

    const sessionStartedAt = startedAtRef.current ?? new Date().toISOString();
    const { wasWork, durationMinutes } = onPhaseComplete();

    if (wasWork) {
      const linkedTask = tasks?.find((t) => t.id === linkedTaskId);
      createSession.mutate({
        task_id: linkedTaskId,
        course_id: linkedTask?.course_id ?? null,
        session_type: "pomodoro",
        started_at: sessionStartedAt,
        ended_at: new Date().toISOString(),
        duration_minutes: durationMinutes,
        pomodoro_count: 1,
      });

      if (linkedTaskId) {
        const currentMinutes = linkedTask?.actual_minutes ?? 0;
        updateTask.mutate({
          id: linkedTaskId,
          actual_minutes: currentMinutes + durationMinutes,
        });
      }

      toast.success("Pomodoro complete! Time for a break.", {
        description: `${durationMinutes} minutes logged`,
      });
    } else {
      toast.success("Break over! Ready to focus?");
    }
  }, [onPhaseComplete, linkedTaskId, tasks, createSession, updateTask]);

  // Start/stop the interval
  useEffect(() => {
    if (isRunning) {
      if (!startedAtRef.current) {
        startedAtRef.current = new Date().toISOString();
      }
      intervalRef.current = setInterval(() => {
        const store = usePomodoroStore.getState();
        if (store.timeLeft <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          startedAtRef.current = null;
          store.tick();
          handlePhaseComplete();
        } else {
          store.tick();
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, handlePhaseComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  void tick;

  const totalDuration = durations[phase === "idle" ? "work" : phase];
  const progress = phase === "idle" ? 0 : 1 - timeLeft / totalDuration;
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);
  const color = PHASE_COLORS[phase];

  const dots = Array.from({ length: settings.longBreakInterval }, (_, i) => i);

  const linkedTask = tasks?.find((t) => t.id === linkedTaskId);
  const linkedTaskCourse = courses?.find((c) => c.id === linkedTask?.course_id);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Timer className="h-5 w-5" />
          Pomodoro Timer
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="ml-auto flex items-center gap-1 rounded px-2 py-0.5 text-xs font-normal text-muted-foreground hover:bg-muted transition-colors"
            title="Configure timer durations"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Settings
            {showSettings ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6">
        {/* Collapsible settings panel */}
        {showSettings && <SettingsPanel />}

        {/* Phase badge */}
        <Badge
          variant="outline"
          className="text-sm"
          style={{ borderColor: color, color }}
        >
          {PHASE_LABELS[phase]}
        </Badge>

        {/* Circular progress ring */}
        <div className="relative flex items-center justify-center">
          <svg width="200" height="200" className="-rotate-90">
            {/* Background ring */}
            <circle
              cx="100"
              cy="100"
              r={RING_RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted"
            />
            {/* Progress ring */}
            <circle
              cx="100"
              cy="100"
              r={RING_RADIUS}
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              className="transition-all duration-1000"
            />
          </svg>
          {/* Timer text overlay */}
          <div className="absolute flex flex-col items-center">
            <span className="text-4xl font-mono font-bold tabular-nums">
              {formatTime(timeLeft)}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              {isRunning ? "running" : phase === "idle" ? "ready" : "paused"}
            </span>
          </div>
        </div>

        {/* Pomodoro dots */}
        <div className="flex items-center gap-2">
          {dots.map((i) => (
            <div
              key={i}
              className={cn(
                "h-3 w-3 rounded-full transition-colors",
                i < (pomodoroCount % settings.longBreakInterval)
                  ? "bg-red-500"
                  : "bg-muted"
              )}
            />
          ))}
          {totalPomodoros > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">
              {totalPomodoros} total today
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              reset();
              startedAtRef.current = null;
            }}
            title="Reset"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button
            size="lg"
            className="w-24"
            style={{ backgroundColor: color, color: "white" }}
            onClick={() => {
              if (isRunning) {
                pause();
              } else {
                start();
                playBeep("start");
              }
            }}
          >
            {isRunning ? (
              <>
                <Pause className="mr-2 h-4 w-4" /> Pause
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" /> {phase === "idle" ? "Start" : "Resume"}
              </>
            )}
          </Button>
        </div>

        {/* Task selector */}
        <div className="w-full space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Linked Task (optional)
          </label>
          <select
            value={linkedTaskId ?? ""}
            onChange={(e) => setLinkedTask(e.target.value || null)}
            className={cn(
              "w-full rounded-md border bg-background px-3 py-2 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            <option value="">— No task selected —</option>
            {tasks?.map((task) => {
              const taskCourse = courses?.find((c) => c.id === task.course_id);
              return (
                <option key={task.id} value={task.id}>
                  {taskCourse ? `[${taskCourse.code ?? taskCourse.name}] ` : ""}
                  {task.title}
                </option>
              );
            })}
          </select>
          {linkedTask && linkedTaskCourse && (
            <p className="text-xs text-muted-foreground">
              <span
                className="font-medium"
                style={{ color: linkedTaskCourse.color }}
              >
                {linkedTaskCourse.code}
              </span>
              {" · "}
              {linkedTask.actual_minutes ?? 0}min logged so far
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
