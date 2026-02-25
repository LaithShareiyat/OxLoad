"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Task, TaskInsert, TaskUpdate, TaskStatus, TaskType, Priority } from "@/types/database";
import { MOCK_TASKS, MOCK_COURSES, MOCK_USER } from "@/lib/mock-data";

const isMock = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

interface TaskFilters {
  status?: TaskStatus | TaskStatus[];
  priority?: Priority;
  course_id?: string;
  task_type?: TaskType;
}

type TaskWithCourse = Task & { courses: { name: string; code: string | null; color: string } | null };

export function useTasks(filters?: TaskFilters) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: async (): Promise<TaskWithCourse[]> => {
      if (isMock) {
        let result = [...MOCK_TASKS] as TaskWithCourse[];

        if (filters?.status) {
          const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
          result = result.filter((t) => statuses.includes(t.status));
        }
        if (filters?.priority) result = result.filter((t) => t.priority === filters.priority);
        if (filters?.course_id) result = result.filter((t) => t.course_id === filters.course_id);
        if (filters?.task_type) result = result.filter((t) => t.task_type === filters.task_type);

        return result.sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });
      }

      let query = supabase
        .from("tasks")
        .select("*, courses(name, code, color)")
        .order("due_date", { ascending: true, nullsFirst: false });

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in("status", filters.status);
        } else {
          query = query.eq("status", filters.status);
        }
      }

      if (filters?.priority) {
        query = query.eq("priority", filters.priority);
      }

      if (filters?.course_id) {
        query = query.eq("course_id", filters.course_id);
      }

      if (filters?.task_type) {
        query = query.eq("task_type", filters.task_type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TaskWithCourse[];
    },
  });
}

export function useTask(id: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["tasks", id],
    queryFn: async () => {
      if (isMock) {
        return MOCK_TASKS.find((t) => t.id === id) || null;
      }

      const { data, error } = await supabase
        .from("tasks")
        .select("*, courses(name, code, color), subtasks(*)")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: Omit<TaskInsert, "user_id">) => {
      if (isMock) {
        const now = new Date().toISOString();
        const course = task.course_id
          ? MOCK_COURSES.find((c) => c.id === task.course_id) ?? null
          : null;
        const newTask: TaskWithCourse = {
          id: `mock-${Date.now()}`,
          user_id: MOCK_USER.id,
          course_id: task.course_id ?? null,
          canvas_assignment_id: null,
          canvas_submission_id: null,
          title: task.title,
          description: task.description ?? null,
          task_type: (task.task_type ?? "todo") as TaskType,
          due_date: task.due_date ?? null,
          start_date: task.start_date ?? null,
          estimated_minutes: task.estimated_minutes ?? null,
          actual_minutes: 0,
          priority: (task.priority ?? "medium") as Priority,
          status: (task.status ?? "pending") as TaskStatus,
          completed_at: null,
          points_possible: task.points_possible ?? null,
          points_earned: null,
          grade_letter: null,
          weight: null,
          url: null,
          tags: [],
          recurrence_rule: null,
          notification_sent: false,
          canvas_last_synced_at: null,
          created_at: now,
          updated_at: now,
          courses: course
            ? { name: course.name, code: course.code, color: course.color }
            : null,
        };
        MOCK_TASKS.push(newTask);
        return newTask;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...task, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useUpdateTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: TaskUpdate & { id: string }) => {
      if (isMock) {
        const idx = MOCK_TASKS.findIndex((t) => t.id === id);
        if (idx !== -1) {
          const existing = MOCK_TASKS[idx];
          const resolvedCourse =
            updates.course_id !== undefined
              ? (MOCK_COURSES.find((c) => c.id === updates.course_id) ?? null)
              : existing.courses
              ? MOCK_COURSES.find(
                  (c) => c.code === existing.courses?.code
                ) ?? null
              : null;
          const updated: TaskWithCourse = {
            ...existing,
            ...updates,
            updated_at: new Date().toISOString(),
            completed_at:
              updates.status === "completed" && !existing.completed_at
                ? new Date().toISOString()
                : existing.completed_at,
            courses:
              updates.course_id !== undefined
                ? resolvedCourse
                  ? {
                      name: resolvedCourse.name,
                      code: resolvedCourse.code,
                      color: resolvedCourse.color,
                    }
                  : null
                : existing.courses,
          };
          MOCK_TASKS[idx] = updated;
          return updated;
        }
        return { id, ...updates };
      }

      const updateData: TaskUpdate = { ...updates };

      if (updates.status === "completed" && !updates.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isMock) {
        const idx = MOCK_TASKS.findIndex((t) => t.id === id);
        if (idx !== -1) MOCK_TASKS.splice(idx, 1);
        return;
      }

      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
