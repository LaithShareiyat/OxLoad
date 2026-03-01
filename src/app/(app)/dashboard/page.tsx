"use client";

import { useMemo } from "react";
import { useTasks } from "@/hooks/use-tasks";
import { useCourses } from "@/hooks/use-courses";
import { useUpdateTask } from "@/hooks/use-tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkloadHeatmap } from "@/components/dashboard/workload-heatmap";
import { InsightsCard } from "@/components/dashboard/insights-card";
import { SyncButton } from "@/components/dashboard/sync-button";
import { WeeklyReviewCard } from "@/components/dashboard/weekly-review-card";
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  GraduationCap,
  Timer,
} from "lucide-react";
import { format, isToday, isTomorrow, isPast, addDays, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { generateDayPlans, generateInsights } from "@/lib/workload/engine";
import { useStudySessions } from "@/hooks/use-study-sessions";
import Link from "next/link";

export default function DashboardPage() {
  const { data: tasks, isLoading: tasksLoading } = useTasks({
    status: ["pending", "in_progress", "overdue"],
  });
  const { data: allTasks } = useTasks();
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const updateTask = useUpdateTask();

  // Today's study sessions
  const todayStart = format(startOfDay(new Date()), "yyyy-MM-dd'T'00:00:00");
  const { data: todaySessions } = useStudySessions({ startDate: todayStart });
  const studyMinutesToday = (todaySessions ?? []).reduce(
    (sum, s) => sum + (s.duration_minutes ?? 0),
    0
  );

  // Last 7 days study sessions (for AI weekly review)
  const sevenDaysAgo = format(addDays(new Date(), -7), "yyyy-MM-dd'T'00:00:00");
  const { data: weekSessions } = useStudySessions({ startDate: sevenDaysAgo });

  // Generate workload data
  const { dayPlans, insights } = useMemo(() => {
    if (!allTasks) return { dayPlans: [], insights: [] };

    const plans = generateDayPlans(allTasks, new Date(), addDays(new Date(), 28));
    const ins = generateInsights(plans, allTasks);
    return { dayPlans: plans, insights: ins };
  }, [allTasks]);

  const upcomingTasks = tasks
    ?.filter((t) => t.due_date)
    .sort(
      (a, b) =>
        new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
    )
    .slice(0, 8);

  const overdueTasks = tasks?.filter(
    (t) => t.due_date && isPast(new Date(t.due_date))
  );

  const todayTasks = tasks?.filter(
    (t) => t.due_date && isToday(new Date(t.due_date))
  );

  const totalEstimatedHours = tasks
    ? tasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0) / 60
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Your workload at a glance</p>
        </div>
        <SyncButton />
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title="Active Tasks"
          value={tasksLoading ? "-" : String(tasks?.length || 0)}
          icon={<CheckSquare className="h-4 w-4 text-muted-foreground" />}
          loading={tasksLoading}
        />
        <StatsCard
          title="Due Today"
          value={tasksLoading ? "-" : String(todayTasks?.length || 0)}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          loading={tasksLoading}
        />
        <StatsCard
          title="Overdue"
          value={tasksLoading ? "-" : String(overdueTasks?.length || 0)}
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          loading={tasksLoading}
          variant={
            overdueTasks && overdueTasks.length > 0 ? "destructive" : undefined
          }
        />
        <StatsCard
          title="Active Courses"
          value={coursesLoading ? "-" : String(courses?.length || 0)}
          icon={<GraduationCap className="h-4 w-4 text-muted-foreground" />}
          loading={coursesLoading}
        />
        <StatsCard
          title="Study Today"
          value={studyMinutesToday >= 60
            ? `${(studyMinutesToday / 60).toFixed(1)}h`
            : `${studyMinutesToday}m`}
          icon={<Timer className="h-4 w-4 text-muted-foreground" />}
          loading={false}
        />
      </div>

      {/* Workload heatmap + Insights */}
      <div className="grid gap-6 lg:grid-cols-2">
        <WorkloadHeatmap dayPlans={dayPlans} />
        <InsightsCard insights={insights} />
      </div>

      {/* AI Weekly Review */}
      <WeeklyReviewCard
        tasks={allTasks ?? []}
        sessions={weekSessions ?? []}
        insights={insights}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Upcoming Tasks</CardTitle>
            <Link
              href="/tasks"
              className="text-sm text-muted-foreground hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : upcomingTasks && upcomingTasks.length > 0 ? (
              <div className="space-y-2">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-md border p-3"
                  >
                    <Checkbox
                      checked={task.status === "completed"}
                      onCheckedChange={() =>
                        updateTask.mutate({
                          id: task.id,
                          status: "completed",
                        })
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {task.title}
                      </p>
                      <p
                        className={cn(
                          "text-xs",
                          task.due_date && isPast(new Date(task.due_date))
                            ? "text-destructive"
                            : "text-muted-foreground"
                        )}
                      >
                        {task.due_date &&
                          (isToday(new Date(task.due_date))
                            ? `Today at ${format(new Date(task.due_date), "h:mm a")}`
                            : isTomorrow(new Date(task.due_date))
                              ? `Tomorrow at ${format(new Date(task.due_date), "h:mm a")}`
                              : format(
                                  new Date(task.due_date),
                                  "MMM d, h:mm a"
                                ))}
                      </p>
                    </div>
                    {task.courses && (
                      <Badge
                        variant="outline"
                        className="shrink-0"
                        style={{
                          borderColor: task.courses.color,
                          color: task.courses.color,
                        }}
                      >
                        {task.courses.code || task.courses.name}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No upcoming tasks. Create one to get started!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Workload summary by course */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Workload by Course</CardTitle>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total estimated work remaining
                  </span>
                  <span className="font-medium">
                    {totalEstimatedHours.toFixed(1)} hours
                  </span>
                </div>

                {courses && courses.length > 0 && (
                  <div className="space-y-3">
                    {courses.map((course) => {
                      const courseTasks = tasks?.filter(
                        (t) => t.course_id === course.id
                      );
                      const courseMinutes =
                        courseTasks?.reduce(
                          (sum, t) => sum + (t.estimated_minutes || 0),
                          0
                        ) || 0;
                      const courseHours = courseMinutes / 60;
                      const percentage =
                        totalEstimatedHours > 0
                          ? (courseHours / totalEstimatedHours) * 100
                          : 0;

                      return (
                        <div key={course.id} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: course.color }}
                              />
                              <span className="text-sm">
                                {course.code || course.name}
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {courseTasks?.length || 0} tasks (
                              {courseHours.toFixed(1)}h)
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${Math.min(percentage, 100)}%`,
                                backgroundColor: course.color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {(!courses || courses.length === 0) && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Add courses to see workload breakdown
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon,
  loading,
  variant,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  loading?: boolean;
  variant?: "destructive";
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon}
        </div>
        {loading ? (
          <Skeleton className="mt-2 h-8 w-16" />
        ) : (
          <p
            className={cn(
              "mt-2 text-2xl font-bold",
              variant === "destructive" && "text-destructive"
            )}
          >
            {value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
