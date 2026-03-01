"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { CalendarEvent } from "@/types/database";
import { MOCK_CALENDAR_EVENTS, MOCK_USER } from "@/lib/mock-data";

const isMock = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

interface CalendarEventFilters {
  startDate?: string;
  endDate?: string;
}

export function useCalendarEvents(filters?: CalendarEventFilters) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["calendar-events", filters],
    queryFn: async (): Promise<CalendarEvent[]> => {
      if (isMock) {
        let result = [...MOCK_CALENDAR_EVENTS];
        if (filters?.startDate) {
          result = result.filter((e) => e.start_time >= filters.startDate!);
        }
        if (filters?.endDate) {
          result = result.filter((e) => e.start_time <= filters.endDate!);
        }
        return result;
      }

      let query = supabase
        .from("calendar_events")
        .select("*")
        .order("start_time", { ascending: true });

      if (filters?.startDate) {
        query = query.gte("start_time", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("start_time", filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCalendarEvent() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      event: Omit<CalendarEvent, "id" | "user_id" | "created_at" | "updated_at">
    ): Promise<CalendarEvent> => {
      if (isMock) {
        const now = new Date().toISOString();
        const newEvent: CalendarEvent = {
          id: `cal-${Date.now()}`,
          user_id: MOCK_USER.id,
          created_at: now,
          updated_at: now,
          ...event,
        };
        MOCK_CALENDAR_EVENTS.push(newEvent);
        return newEvent;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("calendar_events")
        .insert({ ...event, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });
}
