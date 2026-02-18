"use client";

import { useMemo } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DayPlan,
  loadLevelColors,
  loadLevelLabels,
} from "@/lib/workload/engine";
import { cn } from "@/lib/utils";

interface WorkloadHeatmapProps {
  dayPlans: DayPlan[];
}

export function WorkloadHeatmap({ dayPlans }: WorkloadHeatmapProps) {
  const weeks = useMemo(() => {
    const result: DayPlan[][] = [];
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });

    for (let w = 0; w < 4; w++) {
      const week: DayPlan[] = [];
      for (let d = 0; d < 7; d++) {
        const date = format(addDays(start, w * 7 + d), "yyyy-MM-dd");
        const plan = dayPlans.find((p) => p.date === date) || {
          date,
          totalMinutes: 0,
          tasks: [],
          loadLevel: "free" as const,
        };
        week.push(plan);
      }
      result.push(week);
    }

    return result;
  }, [dayPlans]);

  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Workload Heatmap</CardTitle>
        <p className="text-sm text-muted-foreground">
          Next 4 weeks - colored by estimated study hours per day
        </p>
      </CardHeader>
      <CardContent>
        {/* Day labels */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {dayLabels.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="space-y-1">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 gap-1">
              {week.map((day) => {
                const hours = (day.totalMinutes / 60).toFixed(1);
                const isToday =
                  day.date === format(new Date(), "yyyy-MM-dd");

                return (
                  <Tooltip key={day.date}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "aspect-square rounded-md border transition-transform hover:scale-110 cursor-default",
                          isToday && "ring-2 ring-primary ring-offset-1"
                        )}
                        style={{
                          backgroundColor:
                            loadLevelColors[day.loadLevel],
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-sm">
                        <p className="font-medium">
                          {format(new Date(day.date), "EEE, MMM d")}
                        </p>
                        <p>
                          {hours}h - {loadLevelLabels[day.loadLevel]}
                        </p>
                        {day.tasks.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {day.tasks.slice(0, 3).map((t, i) => (
                              <p key={i} className="text-xs text-muted-foreground">
                                {t.courseCode ? `[${t.courseCode}] ` : ""}
                                {t.title} ({t.allocatedMinutes}min)
                              </p>
                            ))}
                            {day.tasks.length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                +{day.tasks.length - 3} more
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground">Less</span>
          {(
            ["free", "light", "moderate", "heavy", "overloaded"] as const
          ).map((level) => (
            <div
              key={level}
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: loadLevelColors[level] }}
              title={loadLevelLabels[level]}
            />
          ))}
          <span className="text-xs text-muted-foreground">More</span>
        </div>
      </CardContent>
    </Card>
  );
}
