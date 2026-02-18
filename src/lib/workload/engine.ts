import {
  startOfDay,
  endOfDay,
  addDays,
  differenceInDays,
  isWithinInterval,
  format,
  isBefore,
  isAfter,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { Task } from "@/types/database";

// ─── Types ──────────────────────────────────────────────────

export interface DayPlan {
  date: string; // ISO date string (YYYY-MM-DD)
  totalMinutes: number;
  tasks: DayTask[];
  loadLevel: LoadLevel;
}

export interface DayTask {
  taskId: string;
  title: string;
  courseCode: string | null;
  courseColor: string;
  allocatedMinutes: number;
  dueDate: string | null;
  priority: string;
  isOverdue: boolean;
}

export type LoadLevel = "free" | "light" | "moderate" | "heavy" | "overloaded";

export interface WeekSummary {
  weekStart: string;
  totalMinutes: number;
  avgDailyMinutes: number;
  loadLevel: LoadLevel;
  taskCount: number;
}

export interface WorkloadInsight {
  type: "overloaded" | "imbalanced" | "deadline_cluster" | "suggestion";
  severity: "info" | "warning" | "critical";
  message: string;
  affectedDates?: string[];
  suggestedAction?: string;
}

// ─── Constants ──────────────────────────────────────────────

const LOAD_THRESHOLDS = {
  free: 0,          // 0 minutes
  light: 60,        // up to 1 hour
  moderate: 180,    // up to 3 hours
  heavy: 360,       // up to 6 hours
  overloaded: 480,  // 6+ hours
};

// ─── Core Engine ────────────────────────────────────────────

type TaskWithCourse = Task & {
  courses: { name: string; code: string | null; color: string } | null;
};

/**
 * Generates a daily work plan by distributing task work across available days.
 *
 * Algorithm:
 * 1. For each incomplete task with a due date:
 *    - Calculate the work window (start_date or today → due_date)
 *    - Distribute estimated_minutes evenly across days in the window
 *    - Subtract actual_minutes already completed
 * 2. Tasks without due dates are placed in a "backlog" pool
 * 3. Load levels are calculated for each day
 */
export function generateDayPlans(
  tasks: TaskWithCourse[],
  rangeStart: Date,
  rangeEnd: Date
): DayPlan[] {
  const plans = new Map<string, DayPlan>();

  // Initialize all days in range
  let current = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);
  while (!isAfter(current, end)) {
    const dateKey = format(current, "yyyy-MM-dd");
    plans.set(dateKey, {
      date: dateKey,
      totalMinutes: 0,
      tasks: [],
      loadLevel: "free",
    });
    current = addDays(current, 1);
  }

  // Process each active task
  const activeTasks = tasks.filter(
    (t) => t.status !== "completed" && t.status !== "cancelled"
  );

  for (const task of activeTasks) {
    const remainingMinutes = Math.max(
      (task.estimated_minutes || 30) - (task.actual_minutes || 0),
      0
    );

    if (remainingMinutes === 0) continue;

    const today = startOfDay(new Date());
    const taskStart = task.start_date
      ? startOfDay(new Date(task.start_date))
      : today;
    const taskDue = task.due_date
      ? startOfDay(new Date(task.due_date))
      : addDays(today, 7); // Default: spread over next 7 days

    // The effective work window
    const effectiveStart = isBefore(taskStart, today) ? today : taskStart;
    const effectiveEnd = isBefore(taskDue, today) ? today : taskDue;

    // Calculate days available
    const daysAvailable = Math.max(
      differenceInDays(effectiveEnd, effectiveStart) + 1,
      1
    );
    const minutesPerDay = Math.ceil(remainingMinutes / daysAvailable);

    // Distribute across days
    let remainingToAllocate = remainingMinutes;
    let day = effectiveStart;

    while (remainingToAllocate > 0 && !isAfter(day, effectiveEnd)) {
      const dateKey = format(day, "yyyy-MM-dd");
      const plan = plans.get(dateKey);

      if (plan) {
        const allocated = Math.min(minutesPerDay, remainingToAllocate);
        plan.tasks.push({
          taskId: task.id,
          title: task.title,
          courseCode: task.courses?.code || null,
          courseColor: task.courses?.color || "#6B7280",
          allocatedMinutes: allocated,
          dueDate: task.due_date,
          priority: task.priority,
          isOverdue:
            task.due_date !== null && isBefore(new Date(task.due_date), today),
        });
        plan.totalMinutes += allocated;
        remainingToAllocate -= allocated;
      }

      day = addDays(day, 1);
    }
  }

  // Calculate load levels
  for (const plan of plans.values()) {
    plan.loadLevel = getLoadLevel(plan.totalMinutes);
  }

  return Array.from(plans.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

/**
 * Generates weekly summaries from day plans.
 */
export function generateWeekSummaries(
  dayPlans: DayPlan[],
  weeks: number = 4
): WeekSummary[] {
  const summaries: WeekSummary[] = [];
  const today = new Date();

  for (let w = 0; w < weeks; w++) {
    const weekStart = startOfWeek(addDays(today, w * 7), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(addDays(today, w * 7), { weekStartsOn: 1 });

    const weekPlans = dayPlans.filter((p) => {
      const d = new Date(p.date);
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    });

    const totalMinutes = weekPlans.reduce((s, p) => s + p.totalMinutes, 0);
    const taskIds = new Set(weekPlans.flatMap((p) => p.tasks.map((t) => t.taskId)));

    summaries.push({
      weekStart: format(weekStart, "yyyy-MM-dd"),
      totalMinutes,
      avgDailyMinutes: Math.round(totalMinutes / 7),
      loadLevel: getLoadLevel(Math.round(totalMinutes / 7)),
      taskCount: taskIds.size,
    });
  }

  return summaries;
}

/**
 * Analyzes workload patterns and generates actionable insights.
 * This is the foundation for AI-powered suggestions.
 */
export function generateInsights(
  dayPlans: DayPlan[],
  tasks: TaskWithCourse[]
): WorkloadInsight[] {
  const insights: WorkloadInsight[] = [];
  const today = format(new Date(), "yyyy-MM-dd");

  // 1. Detect overloaded days
  const overloadedDays = dayPlans.filter(
    (p) => p.loadLevel === "overloaded" && p.date >= today
  );
  if (overloadedDays.length > 0) {
    insights.push({
      type: "overloaded",
      severity: overloadedDays.length >= 3 ? "critical" : "warning",
      message: `You have ${overloadedDays.length} overloaded day${overloadedDays.length > 1 ? "s" : ""} coming up (${overloadedDays.length >= 3 ? "6+" : "5+"} hours of work).`,
      affectedDates: overloadedDays.map((d) => d.date),
      suggestedAction:
        "Consider starting some tasks earlier to spread the load.",
    });
  }

  // 2. Detect deadline clusters (3+ tasks due on the same day)
  const dueDateCounts = new Map<string, number>();
  for (const task of tasks) {
    if (task.due_date && task.status !== "completed") {
      const dueDay = format(new Date(task.due_date), "yyyy-MM-dd");
      dueDateCounts.set(dueDay, (dueDateCounts.get(dueDay) || 0) + 1);
    }
  }

  for (const [date, count] of dueDateCounts) {
    if (count >= 3 && date >= today) {
      insights.push({
        type: "deadline_cluster",
        severity: count >= 5 ? "critical" : "warning",
        message: `${count} tasks are due on ${format(new Date(date), "EEEE, MMM d")}. Start working on some of them early.`,
        affectedDates: [date],
        suggestedAction: `Begin the largest tasks at least ${Math.ceil(count / 2)} days in advance.`,
      });
    }
  }

  // 3. Detect imbalanced weeks
  const futurePlans = dayPlans.filter((p) => p.date >= today);
  if (futurePlans.length >= 14) {
    const week1Total = futurePlans.slice(0, 7).reduce((s, p) => s + p.totalMinutes, 0);
    const week2Total = futurePlans.slice(7, 14).reduce((s, p) => s + p.totalMinutes, 0);

    if (week1Total > 0 && week2Total > 0) {
      const ratio = Math.max(week1Total, week2Total) / Math.min(week1Total, week2Total);
      if (ratio > 2) {
        const heavierWeek = week1Total > week2Total ? "This week" : "Next week";
        insights.push({
          type: "imbalanced",
          severity: "info",
          message: `${heavierWeek} is ${ratio.toFixed(1)}x heavier than the other. Try to balance your workload.`,
          suggestedAction:
            "Move start dates for some tasks to spread work more evenly.",
        });
      }
    }
  }

  // 4. Suggest starting unstarted high-priority tasks
  const unstartedCritical = tasks.filter(
    (t) =>
      t.status === "pending" &&
      (t.priority === "critical" || t.priority === "high") &&
      t.due_date &&
      differenceInDays(new Date(t.due_date), new Date()) <= 3 &&
      differenceInDays(new Date(t.due_date), new Date()) >= 0
  );

  for (const task of unstartedCritical.slice(0, 3)) {
    const daysLeft = differenceInDays(new Date(task.due_date!), new Date());
    insights.push({
      type: "suggestion",
      severity: daysLeft <= 1 ? "critical" : "warning",
      message: `"${task.title}" is ${task.priority} priority and due in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}. Start now!`,
      suggestedAction: "Change status to 'In Progress' and begin working.",
    });
  }

  return insights.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

// ─── Helpers ────────────────────────────────────────────────

function getLoadLevel(minutes: number): LoadLevel {
  if (minutes >= LOAD_THRESHOLDS.overloaded) return "overloaded";
  if (minutes >= LOAD_THRESHOLDS.heavy) return "heavy";
  if (minutes >= LOAD_THRESHOLDS.moderate) return "moderate";
  if (minutes >= LOAD_THRESHOLDS.light) return "light";
  return "free";
}

export const loadLevelColors: Record<LoadLevel, string> = {
  free: "#E5E7EB",       // gray-200
  light: "#86EFAC",      // green-300
  moderate: "#FDE047",   // yellow-300
  heavy: "#FB923C",      // orange-400
  overloaded: "#EF4444", // red-500
};

export const loadLevelLabels: Record<LoadLevel, string> = {
  free: "Free",
  light: "Light",
  moderate: "Moderate",
  heavy: "Heavy",
  overloaded: "Overloaded",
};
