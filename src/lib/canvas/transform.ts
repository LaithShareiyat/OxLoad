import { CanvasCourse, CanvasAssignment } from "./types";
import { CourseInsert, TaskInsert, TaskType } from "@/types/database";

/**
 * Infers task type from Canvas assignment submission types and name.
 */
function inferTaskType(assignment: CanvasAssignment): TaskType {
  const name = assignment.name.toLowerCase();

  if (name.includes("exam") || name.includes("midterm") || name.includes("final")) {
    return "exam";
  }
  if (name.includes("read") || name.includes("chapter")) {
    return "reading";
  }
  if (name.includes("project") || name.includes("presentation")) {
    return "project";
  }
  if (
    name.includes("quiz") ||
    name.includes("homework") ||
    name.includes("assignment") ||
    name.includes("problem set") ||
    name.includes("lab")
  ) {
    return "assignment";
  }

  return "assignment";
}

/**
 * Estimates minutes for an assignment based on points and type.
 * This is a rough heuristic that the user can override.
 */
function estimateMinutes(assignment: CanvasAssignment, taskType: TaskType): number {
  const points = assignment.points_possible || 0;

  const baseMinutes: Record<TaskType, number> = {
    exam: 120,
    project: 300,
    assignment: 60,
    reading: 45,
    study: 60,
    todo: 30,
  };

  let estimate = baseMinutes[taskType];

  // Scale by points relative to a "standard" assignment (10-20 points)
  if (points > 0) {
    const pointsMultiplier = Math.min(Math.max(points / 15, 0.5), 4);
    estimate = Math.round(estimate * pointsMultiplier);
  }

  return estimate;
}

export function transformCanvasCourse(
  course: CanvasCourse,
  userId: string
): CourseInsert {
  const instructor = course.teachers?.[0]?.display_name || null;
  const termName = course.term?.name || null;

  return {
    user_id: userId,
    canvas_course_id: course.id,
    name: course.name,
    code: course.course_code || null,
    term: termName,
    instructor,
    is_active: true,
  };
}

export function transformCanvasAssignment(
  assignment: CanvasAssignment,
  userId: string,
  courseId: string
): Omit<TaskInsert, "user_id"> & { user_id: string } {
  const taskType = inferTaskType(assignment);
  const estimatedMinutes = estimateMinutes(assignment, taskType);

  return {
    user_id: userId,
    course_id: courseId,
    canvas_assignment_id: assignment.id,
    title: assignment.name,
    description: stripHtml(assignment.description),
    task_type: taskType,
    due_date: assignment.due_at,
    estimated_minutes: estimatedMinutes,
    priority: inferPriority(assignment),
    points_possible: assignment.points_possible,
    url: assignment.html_url,

    // Grade data from submission
    points_earned: assignment.submission?.score ?? undefined,
    grade_letter: assignment.submission?.grade ?? undefined,
    canvas_submission_id: assignment.submission?.id ?? undefined,

    // Status based on submission state
    status: inferStatus(assignment),
  };
}

function inferPriority(
  assignment: CanvasAssignment
): "critical" | "high" | "medium" | "low" {
  const points = assignment.points_possible || 0;

  if (points >= 100) return "critical";
  if (points >= 50) return "high";
  if (points >= 20) return "medium";
  return "low";
}

function inferStatus(
  assignment: CanvasAssignment
): "pending" | "completed" | "overdue" {
  const submission = assignment.submission;

  if (submission?.workflow_state === "graded" || submission?.submitted_at) {
    return "completed";
  }

  if (assignment.due_at && new Date(assignment.due_at) < new Date()) {
    if (submission?.missing) return "overdue";
  }

  return "pending";
}

function stripHtml(html: string | null): string | null {
  if (!html) return null;
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
