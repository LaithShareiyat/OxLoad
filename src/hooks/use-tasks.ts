"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Task, TaskInsert, TaskUpdate, TaskStatus, TaskType, Priority } from "@/types/database";
import { MOCK_TASKS } from "@/lib/mock-data";

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
        return { ...task, id: `mock-${Date.now()}`, user_id: "mock-user-id" };
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
      if (isMock) return;

      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
