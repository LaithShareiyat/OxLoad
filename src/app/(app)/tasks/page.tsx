"use client";

import { useState } from "react";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/use-tasks";
import { useCourses } from "@/hooks/use-courses";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskForm } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { TaskStatus } from "@/types/database";
import { toast } from "sonner";

export default function TasksPage() {
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const statusMap: Record<string, TaskStatus | TaskStatus[] | undefined> = {
    all: undefined,
    active: ["pending", "in_progress", "overdue"],
    completed: "completed",
    pending: "pending",
    in_progress: "in_progress",
    overdue: "overdue",
  };

  const { data: tasks, isLoading } = useTasks({
    status: statusMap[statusFilter],
    course_id: courseFilter !== "all" ? courseFilter : undefined,
  });
  const { data: courses } = useCourses();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const handleCreate = (values: Record<string, unknown>) => {
    createTask.mutate(
      {
        title: values.title as string,
        description: (values.description as string) || undefined,
        task_type: values.task_type as "todo",
        priority: values.priority as "medium",
        due_date: (values.due_date as string) ? new Date(values.due_date as string).toISOString() : undefined,
        start_date: (values.start_date as string) ? new Date(values.start_date as string).toISOString() : undefined,
        estimated_minutes: values.estimated_minutes as number | undefined,
        course_id: (values.course_id as string) || undefined,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          toast.success("Task created");
        },
        onError: (error) => {
          toast.error("Failed to create task: " + error.message);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">
            Manage your assignments and to-dos
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
            </DialogHeader>
            <TaskForm
              onSubmit={handleCreate}
              isLoading={createTask.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Tabs
          value={statusFilter}
          onValueChange={setStatusFilter}
          className="w-auto"
        >
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Courses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courses?.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.code || course.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : tasks && tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={(id, status) =>
                updateTask.mutate(
                  { id, status },
                  {
                    onSuccess: () =>
                      toast.success(
                        status === "completed"
                          ? "Task completed!"
                          : "Task updated"
                      ),
                  }
                )
              }
              onDelete={(id) =>
                deleteTask.mutate(id, {
                  onSuccess: () => toast.success("Task deleted"),
                  onError: (error) =>
                    toast.error("Failed to delete: " + error.message),
                })
              }
              onEdit={(id) => {
                // TODO: navigate to edit page or open edit dialog
                window.location.href = `/tasks/${id}`;
              }}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <p className="text-muted-foreground">No tasks found</p>
          <Button
            variant="link"
            onClick={() => setDialogOpen(true)}
            className="mt-2"
          >
            Create your first task
          </Button>
        </div>
      )}
    </div>
  );
}
