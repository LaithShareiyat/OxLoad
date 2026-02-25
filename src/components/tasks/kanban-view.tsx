"use client";

import { useState } from "react";
import { format, isPast } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Task, Priority, TaskStatus } from "@/types/database";
import { cn } from "@/lib/utils";

interface KanbanTask extends Task {
  courses: { name: string; code: string | null; color: string } | null;
}

interface KanbanViewProps {
  tasks: KanbanTask[];
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "pending", label: "To Do", color: "border-t-slate-400" },
  { id: "in_progress", label: "In Progress", color: "border-t-blue-500" },
  { id: "completed", label: "Done", color: "border-t-green-500" },
];

const PRIORITY_COLORS: Record<Priority, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  low: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

function KanbanCard({
  task,
  onStatusChange,
  onEdit,
}: {
  task: KanbanTask;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEdit: (id: string) => void;
}) {
  const isOverdue =
    task.due_date && isPast(new Date(task.due_date)) && task.status !== "completed";

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("taskId", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onEdit(task.id)}
      className={cn(
        "group cursor-grab rounded-md border bg-card p-3 shadow-sm active:cursor-grabbing",
        "hover:shadow-md transition-shadow"
      )}
    >
      {/* Course badge */}
      {task.courses && (
        <div className="mb-1.5 flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: task.courses.color }}
          />
          <span className="text-xs text-muted-foreground truncate">
            {task.courses.code ?? task.courses.name}
          </span>
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-medium leading-snug line-clamp-2">{task.title}</p>

      {/* Footer row */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge
          variant="secondary"
          className={cn("text-xs px-1.5 py-0", PRIORITY_COLORS[task.priority])}
        >
          {task.priority}
        </Badge>

        {task.due_date && (
          <span
            className={cn(
              "text-xs",
              isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"
            )}
          >
            {isOverdue ? "Overdue · " : ""}
            {format(new Date(task.due_date), "d MMM")}
          </span>
        )}

        {task.estimated_minutes && (
          <span className="ml-auto text-xs text-muted-foreground">
            {task.estimated_minutes >= 60
              ? `${(task.estimated_minutes / 60).toFixed(1)}h`
              : `${task.estimated_minutes}m`}
          </span>
        )}
      </div>

      {/* Quick status move buttons — visible on hover */}
      <div className="mt-2 hidden gap-1 group-hover:flex" onClick={(e) => e.stopPropagation()}>
        {COLUMNS.filter((c) => c.id !== task.status).map((col) => (
          <button
            key={col.id}
            onClick={() => onStatusChange(task.id, col.id)}
            className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            → {col.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function KanbanColumn({
  column,
  tasks,
  onStatusChange,
  onEdit,
}: {
  column: (typeof COLUMNS)[number];
  tasks: KanbanTask[];
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEdit: (id: string) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) {
      onStatusChange(taskId, column.id);
    }
  };

  return (
    <div className="flex flex-col gap-3 min-w-0">
      <Card
        className={cn(
          "border-t-4 transition-colors",
          column.color,
          isDragOver && "ring-2 ring-primary ring-offset-1"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="flex items-center justify-between text-sm font-semibold">
            {column.label}
            <span className="text-xs font-normal text-muted-foreground">
              {tasks.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent
          className={cn(
            "flex flex-col gap-2 px-3 pb-3 min-h-[120px]",
            isDragOver && "bg-muted/50 rounded-b-lg"
          )}
        >
          {tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Drop tasks here
            </p>
          ) : (
            tasks.map((task) => (
              <KanbanCard
                key={task.id}
                task={task}
                onStatusChange={onStatusChange}
                onEdit={onEdit}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function KanbanView({ tasks, onStatusChange, onEdit }: KanbanViewProps) {
  const tasksByStatus: Record<string, KanbanTask[]> = {
    pending: [],
    in_progress: [],
    completed: [],
  };

  for (const task of tasks) {
    const key = task.status === "overdue" ? "pending" : task.status;
    if (tasksByStatus[key]) {
      tasksByStatus[key].push(task);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {COLUMNS.map((col) => (
        <KanbanColumn
          key={col.id}
          column={col}
          tasks={tasksByStatus[col.id]}
          onStatusChange={onStatusChange}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
