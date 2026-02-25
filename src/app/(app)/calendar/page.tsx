"use client";

import { useMemo } from "react";
import { useTasks } from "@/hooks/use-tasks";
import { MonthView } from "@/components/calendar/month-view";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarPage() {
  const { data: tasks, isLoading } = useTasks();

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
        <MonthView tasks={taskSummaries} />
      )}
    </div>
  );
}
