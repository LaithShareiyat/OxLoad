"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Course, CourseInsert, CourseUpdate } from "@/types/database";
import { MOCK_COURSES } from "@/lib/mock-data";

const isMock = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

export function useCourses(activeOnly = true) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["courses", { activeOnly }],
    queryFn: async (): Promise<Course[]> => {
      if (isMock) {
        return activeOnly ? MOCK_COURSES.filter((c) => c.is_active) : MOCK_COURSES;
      }

      const query = activeOnly
        ? supabase
            .from("courses")
            .select("*")
            .eq("is_active", true)
            .order("name", { ascending: true })
        : supabase
            .from("courses")
            .select("*")
            .order("name", { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCourse() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (course: Omit<CourseInsert, "user_id">) => {
      if (isMock) {
        return { ...course, id: `mock-course-${Date.now()}`, user_id: "mock-user-id" };
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("courses")
        .insert({ ...course, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

export function useUpdateCourse() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: CourseUpdate & { id: string }) => {
      if (isMock) {
        return { id, ...updates };
      }

      const { data, error } = await supabase
        .from("courses")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}
