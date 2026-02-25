"use client";

import { useMemo } from "react";
import { format, subDays } from "date-fns";
import { PomodoroTimer } from "@/components/study/pomodoro-timer";
import { SessionHistory } from "@/components/study/session-history";
import { useStudySessions } from "@/hooks/use-study-sessions";
import { usePomodoroStore } from "@/stores/pomodoro-store";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function StudyPage() {
  const { totalPomodoros } = usePomodoroStore();

  // Load sessions from the past 7 days
  const sevenDaysAgo = useMemo(
    () => format(subDays(new Date(), 7), "yyyy-MM-dd'T'00:00:00"),
    []
  );

  const { data: sessions, isLoading } = useStudySessions({
    startDate: sevenDaysAgo,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Study</h1>
          <p className="text-muted-foreground">
            Track your focus sessions and study time
          </p>
        </div>
        {totalPomodoros > 0 && (
          <Badge variant="secondary" className="text-sm">
            {totalPomodoros} pomodoro{totalPomodoros !== 1 ? "s" : ""} today
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pomodoro timer */}
        <PomodoroTimer />

        {/* Session history + weekly stats */}
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
            <Skeleton className="h-40" />
            <Skeleton className="h-48" />
          </div>
        ) : (
          <SessionHistory sessions={sessions ?? []} />
        )}
      </div>
    </div>
  );
}
