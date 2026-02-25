"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCourses, useUpdateCourse } from "@/hooks/use-courses";
import { useTasks, useUpdateTask } from "@/hooks/use-tasks";
import { TaskCard } from "@/components/tasks/task-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  GraduationCap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { TaskStatus } from "@/types/database";
import { cn } from "@/lib/utils";

const COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316",
];

const OXFORD_TERMS = ["Michaelmas", "Hilary", "Trinity"];
const CURRENT_YEAR = new Date().getFullYear();
const TERM_OPTIONS = OXFORD_TERMS.flatMap((t) => [
  `${t} ${CURRENT_YEAR}`,
  `${t} ${CURRENT_YEAR + 1}`,
]);

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("active");

  const { data: courses, isLoading: coursesLoading } = useCourses(false);
  const course = courses?.find((c) => c.id === id);

  const { data: tasks, isLoading: tasksLoading } = useTasks({ course_id: id });
  const updateCourse = useUpdateCourse();
  const updateTask = useUpdateTask();

  // Local edit state
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editInstructor, setEditInstructor] = useState("");
  const [editTerm, setEditTerm] = useState("");
  const [editColor, setEditColor] = useState(COLORS[0]);

  const startEdit = () => {
    if (!course) return;
    setEditName(course.name);
    setEditCode(course.code ?? "");
    setEditInstructor(course.instructor ?? "");
    setEditTerm(course.term ?? "");
    setEditColor(course.color);
    setEditing(true);
  };

  const handleSave = () => {
    if (!course || !editName.trim()) return;
    updateCourse.mutate(
      {
        id: course.id,
        name: editName.trim(),
        code: editCode.trim() || undefined,
        instructor: editInstructor.trim() || undefined,
        term: editTerm.trim() || undefined,
        color: editColor,
      },
      {
        onSuccess: () => {
          toast.success("Course updated");
          setEditing(false);
        },
        onError: (err) => toast.error("Failed: " + err.message),
      }
    );
  };

  if (coursesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-muted-foreground">Course not found.</p>
        <Button asChild variant="link" className="mt-2">
          <Link href="/courses">Back to Courses</Link>
        </Button>
      </div>
    );
  }

  const allTasks = tasks ?? [];
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.status === "completed").length;
  const overdueTasks = allTasks.filter((t) => t.status === "overdue").length;
  const activeTaskCount = allTasks.filter((t) =>
    ["pending", "in_progress"].includes(t.status)
  ).length;
  const totalEstimated = allTasks.reduce(
    (sum, t) => sum + (t.estimated_minutes ?? 0),
    0
  );

  const statusMap: Record<string, TaskStatus | TaskStatus[] | undefined> = {
    active: ["pending", "in_progress", "overdue"],
    completed: "completed",
    all: undefined,
  };

  const filteredTasks = statusMap[statusFilter]
    ? allTasks.filter((t) => {
        const s = statusMap[statusFilter];
        return Array.isArray(s) ? s.includes(t.status) : t.status === s;
      })
    : allTasks;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/courses">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Courses
        </Link>
      </Button>

      {/* Course header */}
      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Course</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Course Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Introduction to Computer Science"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Course Code</Label>
                <Input
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  placeholder="e.g. CS101"
                />
              </div>
              <div className="space-y-2">
                <Label>Term</Label>
                <select
                  value={editTerm}
                  onChange={(e) => setEditTerm(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— None —</option>
                  {TERM_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Instructor</Label>
              <Input
                value={editInstructor}
                onChange={(e) => setEditInstructor(e.target.value)}
                placeholder="e.g. Dr. Smith"
              />
            </div>
            <div className="space-y-2">
              <Label>Colour</Label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditColor(c)}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-transform",
                      editColor === c
                        ? "scale-110 border-foreground"
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={!editName.trim() || updateCourse.isPending}
                className="flex-1"
              >
                {updateCourse.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditing(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: course.color + "20" }}
              >
                <GraduationCap
                  className="h-7 w-7"
                  style={{ color: course.color }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h1 className="text-xl font-bold">{course.name}</h1>
                    {course.code && (
                      <p
                        className="text-sm font-medium"
                        style={{ color: course.color }}
                      >
                        {course.code}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startEdit}
                  >
                    <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {course.instructor && <span>{course.instructor}</span>}
                  {course.term && (
                    <Badge variant="secondary" className="text-xs">
                      {course.term}
                    </Badge>
                  )}
                  {course.credits && (
                    <span>{course.credits} credits</span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{totalTasks}</p>
                <p className="text-xs text-muted-foreground">Total tasks</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{completedTasks}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{activeTaskCount}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p
                  className={cn(
                    "text-2xl font-bold",
                    overdueTasks > 0 ? "text-red-500" : "text-muted-foreground"
                  )}
                >
                  {overdueTasks}
                </p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
            {totalEstimated > 0 && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {totalEstimated >= 60
                  ? `${(totalEstimated / 60).toFixed(1)}h`
                  : `${totalEstimated}min`}{" "}
                total estimated work
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tasks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tasks</h2>
          <Tabs
            value={statusFilter}
            onValueChange={setStatusFilter}
            className="w-auto"
          >
            <TabsList>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="completed">Done</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {tasksLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : filteredTasks.length > 0 ? (
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={{ ...task, courses: { name: course.name, code: course.code, color: course.color } }}
                onStatusChange={(taskId, status) =>
                  updateTask.mutate(
                    { id: taskId, status },
                    {
                      onSuccess: () =>
                        toast.success(
                          status === "completed" ? "Task completed!" : "Task updated"
                        ),
                    }
                  )
                }
                onDelete={() => {}}
                onEdit={(taskId) => {
                  window.location.href = `/tasks/${taskId}`;
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            {statusFilter === "completed" ? (
              <>
                <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No completed tasks yet
                </p>
              </>
            ) : statusFilter === "active" && overdueTasks === 0 ? (
              <>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <p className="mt-2 text-sm text-muted-foreground">
                  All caught up!
                </p>
              </>
            ) : (
              <>
                <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">No tasks found</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
