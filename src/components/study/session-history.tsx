"use client";

import { useMemo } from "react";
import { format, isToday, subDays, startOfDay } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudySession } from "@/types/database";
import { MOCK_COURSES } from "@/lib/mock-data";
import { useCourses } from "@/hooks/use-courses";
import { BookOpen, Star } from "lucide-react";

const isMock = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

interface SessionHistoryProps {
  sessions: StudySession[];
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Get day-of-week label (Mon=0, Sun=6) matching ISO week
function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=Sun
  return DAYS[day === 0 ? 6 : day - 1];
}

export function SessionHistory({ sessions }: SessionHistoryProps) {
  const { data: courses } = useCourses();
  const allCourses = isMock ? MOCK_COURSES : courses ?? [];

  const todaySessions = useMemo(
    () => sessions.filter((s) => isToday(new Date(s.started_at))),
    [sessions]
  );

  // Weekly chart data: last 7 days
  const weeklyData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const day = startOfDay(subDays(now, 6 - i));
      const dayStr = format(day, "yyyy-MM-dd");
      const dayMinutes = sessions
        .filter((s) => s.started_at.startsWith(dayStr))
        .reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);
      return {
        label: getDayLabel(day.toISOString()),
        date: dayStr,
        hours: Math.round((dayMinutes / 60) * 10) / 10,
        isToday: dayStr === format(now, "yyyy-MM-dd"),
      };
    });
  }, [sessions]);

  const weeklyMinutes = sessions
    .filter((s) => s.started_at >= format(subDays(new Date(), 7), "yyyy-MM-dd"))
    .reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);

  const todayMinutes = todaySessions.reduce(
    (sum, s) => sum + (s.duration_minutes ?? 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{Math.round(todayMinutes)}</p>
            <p className="text-xs text-muted-foreground">Minutes today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">
              {(weeklyMinutes / 60).toFixed(1)}h
            </p>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Study Hours (7 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}h`}
              />
              <Tooltip
                formatter={(value: number | undefined) => [`${value ?? 0}h`, "Study"]}
                labelFormatter={(label) => label}
              />
              <Bar dataKey="hours" radius={[3, 3, 0, 0]}>
                {weeklyData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.isToday ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                    opacity={entry.isToday ? 1 : 0.5}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Today's sessions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" />
            Today&apos;s Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaySessions.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No sessions yet today. Start the timer to begin!
            </p>
          ) : (
            <div className="space-y-2">
              {todaySessions.map((session) => {
                const course = allCourses.find((c) => c.id === session.course_id);
                return (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 rounded-md border p-3"
                  >
                    {course && (
                      <div
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: course.color }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {session.duration_minutes}min
                        {session.pomodoro_count > 0 &&
                          ` · ${session.pomodoro_count} pomodoro${session.pomodoro_count !== 1 ? "s" : ""}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(session.started_at), "h:mm a")}
                        {course && ` · ${course.code ?? course.name}`}
                      </p>
                    </div>
                    {session.focus_rating !== null && (
                      <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Star className="h-3 w-3" />
                        {session.focus_rating}/5
                      </div>
                    )}
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {session.session_type}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
