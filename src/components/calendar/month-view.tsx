"use client";

import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isToday,
  isSameMonth,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

type TaskSummary = {
  id: string;
  title: string;
  due_date: string | null;
  color: string;
  status: string;
};

interface MonthViewProps {
  tasks: TaskSummary[];
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthView({ tasks }: MonthViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, TaskSummary[]>();
    for (const task of tasks) {
      if (!task.due_date) continue;
      const key = format(new Date(task.due_date), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return map;
  }, [tasks]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth((d) => subMonths(d, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth((d) => addMonths(d, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-hidden rounded-lg border">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const key = format(day, "yyyy-MM-dd");
            const dayTasks = tasksByDay.get(key) || [];
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);

            return (
              <div
                key={i}
                className={cn(
                  "min-h-24 border-b border-r p-1",
                  !inMonth && "bg-muted/30",
                  i % 7 === 6 && "border-r-0",
                  i >= days.length - 7 && "border-b-0"
                )}
              >
                {/* Day number */}
                <div className="mb-1 flex justify-end">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                      today && "bg-primary font-bold text-primary-foreground",
                      !today && !inMonth && "text-muted-foreground/50",
                      !today && inMonth && "text-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {/* Tasks */}
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map((task) => (
                    <Link key={task.id} href={`/tasks/${task.id}`}>
                      <div
                        className={cn(
                          "truncate rounded px-1 py-0.5 text-xs text-white transition-opacity hover:opacity-80",
                          task.status === "completed" && "opacity-50 line-through"
                        )}
                        style={{ backgroundColor: task.color }}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    </Link>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="px-1 text-xs text-muted-foreground">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
