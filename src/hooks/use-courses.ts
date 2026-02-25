"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Course, CourseInsert, CourseUpdate } from "@/types/database";
import { MOCK_COURSES, MOCK_USER } from "@/lib/mock-data";

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
        const now = new Date().toISOString();
        const newCourse: Course = {
          id: `mock-course-${Date.now()}`,
          user_id: MOCK_USER.id,
          canvas_course_id: null,
          name: course.name,
          code: course.code ?? null,
          color: course.color ?? "#3B82F6",
          term: course.term ?? null,
          instructor: course.instructor ?? null,
          credits: course.credits ?? null,
          is_active: true,
          canvas_last_synced_at: null,
          created_at: now,
          updated_at: now,
        };
        MOCK_COURSES.push(newCourse);
        return newCourse;
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
        const idx = MOCK_COURSES.findIndex((c) => c.id === id);
        if (idx !== -1) {
          MOCK_COURSES[idx] = {
            ...MOCK_COURSES[idx],
            ...updates,
            updated_at: new Date().toISOString(),
          };
          return MOCK_COURSES[idx];
        }
        return { id, ...updates } as Course;
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
