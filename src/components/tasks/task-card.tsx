"use client";

import { format, formatDistanceToNow, isPast } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, Edit, Clock } from "lucide-react";
import { Task, Priority, TaskStatus } from "@/types/database";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task & {
    courses: { name: string; code: string | null; color: string } | null;
  };
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

const priorityColors: Record<Priority, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  low: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const typeLabels: Record<string, string> = {
  todo: "To-Do",
  assignment: "Assignment",
  exam: "Exam",
  reading: "Reading",
  project: "Project",
  study: "Study",
};

export function TaskCard({
  task,
  onStatusChange,
  onDelete,
  onEdit,
}: TaskCardProps) {
  const isCompleted = task.status === "completed";
  const isOverdue =
    task.due_date && isPast(new Date(task.due_date)) && !isCompleted;

  const handleToggle = () => {
    onStatusChange(
      task.id,
      isCompleted ? "pending" : "completed"
    );
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50",
        isCompleted && "opacity-60"
      )}
    >
      <Checkbox
        checked={isCompleted}
        onCheckedChange={handleToggle}
        className="mt-1"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3
            className={cn(
              "font-medium leading-tight",
              isCompleted && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task.id)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(task.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {task.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className={priorityColors[task.priority]}>
            {task.priority}
          </Badge>

          <Badge variant="outline">{typeLabels[task.task_type]}</Badge>

          {task.courses && (
            <Badge
              variant="outline"
              style={{
                borderColor: task.courses.color,
                color: task.courses.color,
              }}
            >
              {task.courses.code || task.courses.name}
            </Badge>
          )}

          {task.due_date && (
            <span
              className={cn(
                "flex items-center gap-1 text-xs",
                isOverdue
                  ? "text-destructive font-medium"
                  : "text-muted-foreground"
              )}
            >
              <Clock className="h-3 w-3" />
              {isOverdue
                ? `Overdue by ${formatDistanceToNow(new Date(task.due_date))}`
                : format(new Date(task.due_date), "MMM d, h:mm a")}
            </span>
          )}

          {task.estimated_minutes && (
            <span className="text-xs text-muted-foreground">
              ~{task.estimated_minutes}min
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
