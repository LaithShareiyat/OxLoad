"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { useTask, useUpdateTask, useDeleteTask } from "@/hooks/use-tasks";
import { useCourses } from "@/hooks/use-courses";
import { TaskForm } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Clock,
  Calendar,
  BookOpen,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { TaskStatus, Priority } from "@/types/database";
import { cn } from "@/lib/utils";

const PRIORITY_COLORS: Record<Priority, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  low: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "To Do",
  in_progress: "In Progress",
  completed: "Completed",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  const { data: task, isLoading } = useTask(id);
  const { data: courses } = useCourses();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-muted-foreground">Task not found.</p>
        <Button asChild variant="link" className="mt-2">
          <Link href="/tasks">Back to Tasks</Link>
        </Button>
      </div>
    );
  }

  const course = courses?.find((c) => c.id === task.course_id);
  const isOverdue =
    task.due_date && isPast(new Date(task.due_date)) && task.status !== "completed";

  const handleStatusChange = (status: TaskStatus) => {
    updateTask.mutate(
      { id: task.id, status },
      {
        onSuccess: () =>
          toast.success(status === "completed" ? "Task completed!" : "Task updated"),
        onError: (err) => toast.error("Failed: " + err.message),
      }
    );
  };

  const handleEdit = (values: Record<string, unknown>) => {
    updateTask.mutate(
      {
        id: task.id,
        title: values.title as string,
        description: (values.description as string) || undefined,
        task_type: values.task_type as "todo",
        priority: values.priority as "medium",
        due_date: (values.due_date as string)
          ? new Date(values.due_date as string).toISOString()
          : undefined,
        start_date: (values.start_date as string)
          ? new Date(values.start_date as string).toISOString()
          : undefined,
        estimated_minutes: values.estimated_minutes as number | undefined,
        course_id: (values.course_id as string) || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Task updated");
          setEditing(false);
        },
        onError: (err) => toast.error("Failed: " + err.message),
      }
    );
  };

  const handleDelete = () => {
    deleteTask.mutate(task.id, {
      onSuccess: () => {
        toast.success("Task deleted");
        router.push("/tasks");
      },
      onError: (err) => toast.error("Failed to delete: " + err.message),
    });
  };

  // Format date for the TaskForm datetime-local input
  const formatForInput = (iso?: string | null) =>
    iso ? iso.slice(0, 16) : "";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/tasks">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Tasks
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing((v) => !v)}
          >
            <Edit2 className="mr-1.5 h-3.5 w-3.5" />
            {editing ? "Cancel" : "Edit"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Task?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete &quot;{task.title}&quot;. This action cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {editing ? (
        /* Edit form */
        <Card>
          <CardHeader>
            <CardTitle>Edit Task</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskForm
              defaultValues={{
                title: task.title,
                description: task.description ?? "",
                task_type: task.task_type,
                priority: task.priority,
                due_date: formatForInput(task.due_date),
                start_date: formatForInput(task.start_date),
                estimated_minutes: task.estimated_minutes ?? undefined,
                course_id: task.course_id ?? "",
              }}
              onSubmit={handleEdit}
              submitLabel="Save Changes"
              isLoading={updateTask.isPending}
            />
          </CardContent>
        </Card>
      ) : (
        /* Detail view */
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <button
                  onClick={() =>
                    handleStatusChange(
                      task.status === "completed" ? "pending" : "completed"
                    )
                  }
                  className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
                >
                  {task.status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <h1
                    className={cn(
                      "text-xl font-bold leading-snug",
                      task.status === "completed" && "line-through text-muted-foreground"
                    )}
                  >
                    {task.title}
                  </h1>
                  {task.description && (
                    <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                      {task.description}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 border-t pt-4">
              {/* Badges row */}
              <div className="flex flex-wrap gap-2">
                <Badge
                  className={cn("text-xs", PRIORITY_COLORS[task.priority])}
                  variant="secondary"
                >
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} priority
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">
                  {task.task_type}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    task.status === "completed" && "text-green-600 border-green-600",
                    task.status === "in_progress" && "text-blue-600 border-blue-600",
                    isOverdue && "text-red-600 border-red-600"
                  )}
                >
                  {STATUS_LABELS[task.status]}
                </Badge>
              </div>

              {/* Meta rows */}
              <div className="grid gap-2 text-sm">
                {course && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BookOpen className="h-4 w-4 shrink-0" />
                    <span
                      className="font-medium"
                      style={{ color: course.color }}
                    >
                      {course.code ?? course.name}
                    </span>
                    <span className="text-muted-foreground">— {course.name}</span>
                  </div>
                )}
                {task.due_date && (
                  <div
                    className={cn(
                      "flex items-center gap-2",
                      isOverdue ? "text-red-500" : "text-muted-foreground"
                    )}
                  >
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>
                      Due {format(new Date(task.due_date), "d MMM yyyy, HH:mm")}
                      {" · "}
                      {isOverdue
                        ? `${formatDistanceToNow(new Date(task.due_date))} overdue`
                        : `in ${formatDistanceToNow(new Date(task.due_date))}`}
                    </span>
                  </div>
                )}
                {task.start_date && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>
                      Starts {format(new Date(task.start_date), "d MMM yyyy")}
                    </span>
                  </div>
                )}
                {(task.estimated_minutes || task.actual_minutes) && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>
                      {task.actual_minutes
                        ? `${task.actual_minutes}min logged`
                        : ""}
                      {task.actual_minutes && task.estimated_minutes ? " / " : ""}
                      {task.estimated_minutes
                        ? `${task.estimated_minutes}min estimated`
                        : ""}
                    </span>
                  </div>
                )}
                {task.points_possible && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-xs font-mono">
                      {task.points_earned !== null && task.points_earned !== undefined
                        ? `${task.points_earned} / ${task.points_possible} pts`
                        : `${task.points_possible} pts possible`}
                      {task.grade_letter ? ` · ${task.grade_letter}` : ""}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick status controls */}
          {task.status !== "completed" && (
            <Card>
              <CardContent className="pt-4">
                <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Quick Status
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { status: "pending" as TaskStatus, label: "Mark To Do" },
                      { status: "in_progress" as TaskStatus, label: "Mark In Progress" },
                      { status: "completed" as TaskStatus, label: "Mark Completed" },
                    ] as const
                  )
                    .filter((s) => s.status !== task.status)
                    .map(({ status, label }) => (
                      <Button
                        key={status}
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(status)}
                        disabled={updateTask.isPending}
                        className={cn(
                          status === "completed" &&
                            "border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                        )}
                      >
                        {label}
                      </Button>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
