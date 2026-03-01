"use client";

import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
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

type EventSummary = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  color: string;
};

interface MonthViewProps {
  tasks: TaskSummary[];
  events?: EventSummary[];
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthView({ tasks, events = [] }: MonthViewProps) {
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

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventSummary[]>();
    for (const event of events) {
      const key = format(new Date(event.start_time), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    return map;
  }, [events]);

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
            const dayEvents = eventsByDay.get(key) || [];
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);
            const totalItems = dayTasks.length + dayEvents.length;
            const maxVisible = 3;

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

                {/* Events (study sessions from AI) */}
                <div className="space-y-0.5">
                  {dayEvents.slice(0, maxVisible).map((event) => (
                    <div
                      key={event.id}
                      className="truncate rounded border border-dashed border-emerald-500 bg-emerald-500/10 px-1 py-0.5 text-xs text-emerald-700 dark:text-emerald-400"
                      title={`${event.title} (${format(new Date(event.start_time), "h:mm a")}–${format(new Date(event.end_time), "h:mm a")})`}
                    >
                      {format(new Date(event.start_time), "h:mm a")} {event.title}
                    </div>
                  ))}

                  {/* Tasks */}
                  {dayTasks.slice(0, Math.max(0, maxVisible - dayEvents.slice(0, maxVisible).length)).map((task) => (
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

                  {totalItems > maxVisible && (
                    <div className="px-1 text-xs text-muted-foreground">
                      +{totalItems - maxVisible} more
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
