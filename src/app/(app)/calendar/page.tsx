"use client";

import { useMemo } from "react";
import { useTasks } from "@/hooks/use-tasks";
import { useCalendarEvents } from "@/hooks/use-calendar-events";
import { MonthView } from "@/components/calendar/month-view";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarPage() {
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: events, isLoading: eventsLoading } = useCalendarEvents();

  const isLoading = tasksLoading || eventsLoading;

  const taskSummaries = useMemo(
    () =>
      (tasks || []).map((t) => ({
        id: t.id,
        title: t.title,
        due_date: t.due_date,
        color: t.courses?.color ?? "#6B7280",
        status: t.status,
      })),
    [tasks]
  );

  const eventSummaries = useMemo(
    () =>
      (events || []).map((e) => ({
        id: e.id,
        title: e.title,
        start_time: e.start_time,
        end_time: e.end_time,
        color: e.color ?? "#10B981",
      })),
    [events]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="text-muted-foreground">
          View your deadlines and schedule
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      ) : (
        <MonthView tasks={taskSummaries} events={eventSummaries} />
      )}
    </div>
  );
}
