"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { StudySession } from "@/types/database";
import { MOCK_STUDY_SESSIONS } from "@/lib/mock-data";

const isMock = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

interface SessionFilters {
  startDate?: string;
  endDate?: string;
  task_id?: string;
  course_id?: string;
}

export function useStudySessions(filters?: SessionFilters) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["study_sessions", filters],
    queryFn: async (): Promise<StudySession[]> => {
      if (isMock) {
        let result = [...MOCK_STUDY_SESSIONS];
        if (filters?.startDate) {
          result = result.filter((s) => s.started_at >= filters.startDate!);
        }
        if (filters?.endDate) {
          result = result.filter((s) => s.started_at <= filters.endDate!);
        }
        if (filters?.task_id) {
          result = result.filter((s) => s.task_id === filters.task_id);
        }
        return result.sort(
          (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        );
      }

      let query = supabase
        .from("study_sessions")
        .select("*")
        .order("started_at", { ascending: false });

      if (filters?.startDate) query = query.gte("started_at", filters.startDate);
      if (filters?.endDate) query = query.lte("started_at", filters.endDate);
      if (filters?.task_id) query = query.eq("task_id", filters.task_id);
      if (filters?.course_id) query = query.eq("course_id", filters.course_id);

      const { data, error } = await query;
      if (error) throw error;
      return data as StudySession[];
    },
  });
}

type CreateSessionInput = {
  task_id?: string | null;
  course_id?: string | null;
  session_type?: "pomodoro" | "free" | "timed";
  started_at: string;
  ended_at?: string;
  duration_minutes: number;
  pomodoro_count?: number;
  notes?: string | null;
  focus_rating?: number | null;
};

export function useCreateStudySession() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (session: CreateSessionInput) => {
      if (isMock) {
        const newSession: StudySession = {
          id: `session-${Date.now()}`,
          user_id: "mock-user-id",
          task_id: session.task_id ?? null,
          course_id: session.course_id ?? null,
          session_type: session.session_type ?? "pomodoro",
          started_at: session.started_at,
          ended_at: session.ended_at ?? new Date().toISOString(),
          duration_minutes: session.duration_minutes,
          pomodoro_count: session.pomodoro_count ?? 1,
          notes: session.notes ?? null,
          focus_rating: session.focus_rating ?? null,
          created_at: new Date().toISOString(),
        };
        MOCK_STUDY_SESSIONS.unshift(newSession);
        return newSession;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("study_sessions")
        .insert({
          ...session,
          user_id: user.id,
          ended_at: session.ended_at ?? new Date().toISOString(),
          session_type: session.session_type ?? "pomodoro",
          pomodoro_count: session.pomodoro_count ?? 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study_sessions"] });
    },
  });
}
