import { CanvasClient } from "./client";
import { transformCanvasCourse, transformCanvasAssignment } from "./transform";
import { SyncResult } from "./types";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

/**
 * Performs a full Canvas sync for a user.
 *
 * Sync strategy:
 * - Courses: upsert by canvas_course_id
 * - Assignments: upsert by canvas_assignment_id
 * - Conflict resolution: Canvas owns due_date, title, description, points_possible, grade
 *   User owns priority, status (if manually changed), estimated_minutes, tags, start_date
 */
export async function syncCanvas(
  userId: string,
  canvasBaseUrl: string,
  canvasApiToken: string,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<SyncResult> {
  const canvas = new CanvasClient(canvasBaseUrl, canvasApiToken);

  // Use service role client for server-side operations (bypasses RLS)
  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

  const result: SyncResult = {
    courses: { created: 0, updated: 0 },
    tasks: { created: 0, updated: 0 },
    grades: { updated: 0 },
    errors: [],
    synced_at: new Date().toISOString(),
  };

  // Step 1: Sync courses
  let canvasCourses;
  try {
    canvasCourses = await canvas.getCourses();
  } catch (error) {
    result.errors.push(
      `Failed to fetch courses: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return result;
  }

  // Map canvas_course_id -> our course UUID
  const courseMap = new Map<number, string>();

  for (const canvasCourse of canvasCourses) {
    try {
      const courseData = transformCanvasCourse(canvasCourse, userId);

      // Check if course already exists
      const { data: existing } = await supabase
        .from("courses")
        .select("id")
        .eq("user_id", userId)
        .eq("canvas_course_id", canvasCourse.id)
        .single();

      if (existing) {
        // Update existing course
        await supabase
          .from("courses")
          .update({
            name: courseData.name,
            code: courseData.code,
            term: courseData.term,
            instructor: courseData.instructor,
            canvas_last_synced_at: result.synced_at,
          })
          .eq("id", existing.id);

        courseMap.set(canvasCourse.id, existing.id);
        result.courses.updated++;
      } else {
        // Create new course
        const { data: newCourse, error } = await supabase
          .from("courses")
          .insert({
            ...courseData,
            canvas_last_synced_at: result.synced_at,
          })
          .select("id")
          .single();

        if (error) {
          result.errors.push(`Failed to create course "${canvasCourse.name}": ${error.message}`);
          continue;
        }

        courseMap.set(canvasCourse.id, newCourse.id);
        result.courses.created++;
      }
    } catch (error) {
      result.errors.push(
        `Error syncing course "${canvasCourse.name}": ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // Step 2: Sync assignments for each course
  for (const [canvasCourseId, courseId] of courseMap) {
    let assignments;
    try {
      assignments = await canvas.getAssignments(canvasCourseId);
    } catch (error) {
      result.errors.push(
        `Failed to fetch assignments for course ${canvasCourseId}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      continue;
    }

    for (const assignment of assignments) {
      // Skip unpublished assignments
      if (!assignment.published) continue;

      try {
        const taskData = transformCanvasAssignment(assignment, userId, courseId);

        // Check if task already exists
        const { data: existing } = await supabase
          .from("tasks")
          .select("id, status, priority, estimated_minutes, start_date, tags")
          .eq("user_id", userId)
          .eq("canvas_assignment_id", assignment.id)
          .single();

        if (existing) {
          // Update existing task - preserve user's local fields
          const updateData: Record<string, unknown> = {
            title: taskData.title,
            description: taskData.description,
            due_date: taskData.due_date,
            points_possible: taskData.points_possible,
            url: taskData.url,
            canvas_last_synced_at: result.synced_at,
          };

          // Update grade if available
          if (assignment.submission?.score !== null && assignment.submission?.score !== undefined) {
            updateData.points_earned = assignment.submission.score;
            updateData.grade_letter = assignment.submission.grade;
            updateData.canvas_submission_id = assignment.submission.id;
            result.grades.updated++;
          }

          // Only update status if user hasn't manually changed it
          // (i.e., don't overwrite a user's "in_progress" with Canvas's "pending")
          if (existing.status === "pending" && taskData.status === "completed") {
            updateData.status = "completed";
            updateData.completed_at = new Date().toISOString();
          }

          await supabase
            .from("tasks")
            .update(updateData)
            .eq("id", existing.id);

          result.tasks.updated++;
        } else {
          // Create new task
          const { error } = await supabase.from("tasks").insert({
            ...taskData,
            canvas_last_synced_at: result.synced_at,
          });

          if (error) {
            result.errors.push(
              `Failed to create task "${assignment.name}": ${error.message}`
            );
            continue;
          }

          result.tasks.created++;
        }
      } catch (error) {
        result.errors.push(
          `Error syncing assignment "${assignment.name}": ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }
  }

  // Step 3: Update profile sync timestamp
  await supabase
    .from("profiles")
    .update({ canvas_base_url: canvasBaseUrl })
    .eq("id", userId);

  return result;
}
