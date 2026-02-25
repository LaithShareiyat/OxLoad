"use client";

import { useMemo, useState } from "react";
import { useTasks } from "@/hooks/use-tasks";
import { useCourses } from "@/hooks/use-courses";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Calculator, ArrowRight } from "lucide-react";
import {
  calculateClassification,
  whatIfClassification,
  percentageToClassification,
} from "@/lib/utils/gpa";

export default function GradesPage() {
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const [whatIfGrades, setWhatIfGrades] = useState<
    Record<string, { earned: string; possible: string }>
  >({});

  // Get graded tasks
  const gradedTasks = useMemo(
    () =>
      tasks?.filter(
        (t) =>
          t.points_earned !== null &&
          t.points_possible !== null &&
          t.points_possible > 0
      ) || [],
    [tasks]
  );

  // Calculate overall classification
  const overallResult = useMemo(() => {
    const entries = gradedTasks.map((t) => ({
      pointsEarned: t.points_earned!,
      pointsPossible: t.points_possible!,
      weight: t.weight || undefined,
    }));
    return calculateClassification(entries);
  }, [gradedTasks]);

  // Calculate per-course grades
  const courseGrades = useMemo(() => {
    if (!courses || !gradedTasks) return [];

    return courses
      .map((course) => {
        const courseTasks = gradedTasks.filter((t) => t.course_id === course.id);
        const totalEarned = courseTasks.reduce((s, t) => s + (t.points_earned || 0), 0);
        const totalPossible = courseTasks.reduce((s, t) => s + (t.points_possible || 0), 0);
        const percentage = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : null;
        const classification = percentage !== null ? percentageToClassification(percentage) : null;

        return {
          course,
          gradedCount: courseTasks.length,
          totalEarned,
          totalPossible,
          percentage,
          classification,
        };
      })
      .filter((c) => c.gradedCount > 0);
  }, [courses, gradedTasks]);

  // What-if calculation
  const whatIfResult = useMemo(() => {
    const realEntries = gradedTasks.map((t) => ({
      pointsEarned: t.points_earned!,
      pointsPossible: t.points_possible!,
      weight: t.weight || undefined,
    }));

    const hypothetical = Object.values(whatIfGrades)
      .filter((g) => g.earned && g.possible)
      .map((g) => ({
        pointsEarned: parseFloat(g.earned),
        pointsPossible: parseFloat(g.possible),
      }));

    if (hypothetical.length === 0) return null;

    return whatIfClassification(realEntries, hypothetical);
  }, [gradedTasks, whatIfGrades]);

  const isLoading = tasksLoading || coursesLoading;
  const { result: overall } = overallResult;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Grades</h1>
        <p className="text-muted-foreground">
          Track your grades and degree classification across courses
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <>
          {/* Classification overview */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Classification</p>
                {gradedTasks.length > 0 && overall ? (
                  <>
                    <p className="mt-1 text-4xl font-bold" style={{ color: overall.color }}>
                      {overall.shortLabel}
                    </p>
                    <p className="mt-1 text-sm font-medium">{overall.classification}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {overall.percentage.toFixed(1)}% overall
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-4xl font-bold text-muted-foreground">N/A</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Graded Items</p>
                <p className="mt-1 text-4xl font-bold">{gradedTasks.length}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  across {courseGrades.length} course
                  {courseGrades.length !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">What-If Projection</p>
                {whatIfResult?.projected ? (
                  <div className="mt-2 flex flex-col items-center gap-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span
                        className="font-semibold"
                        style={{ color: whatIfResult.current?.color ?? "#6B7280" }}
                      >
                        {whatIfResult.current?.shortLabel ?? "N/A"}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span
                        className="font-semibold"
                        style={{ color: whatIfResult.projected.color }}
                      >
                        {whatIfResult.projected.shortLabel}
                      </span>
                    </div>
                    <p
                      className="text-2xl font-bold"
                      style={{ color: whatIfResult.projected.color }}
                    >
                      {whatIfResult.projected.percentage.toFixed(1)}%
                    </p>
                    {whatIfResult.current?.classification !==
                      whatIfResult.projected.classification && (
                      <Badge
                        variant="default"
                        style={{ backgroundColor: whatIfResult.projected.color }}
                      >
                        {whatIfResult.projected.classification}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-4xl font-bold text-muted-foreground">--</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Per-course grades */}
          {courseGrades.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5" />
                  Grades by Course
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {courseGrades.map(
                    ({ course, gradedCount, totalEarned, totalPossible, percentage, classification }) => (
                      <div key={course.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: course.color }}
                            />
                            <span className="font-medium">
                              {course.code || course.name}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({gradedCount} graded)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {totalEarned.toFixed(1)}/{totalPossible.toFixed(1)}
                            </span>
                            {percentage !== null && classification && (
                              <>
                                <span className="font-medium">
                                  {percentage.toFixed(1)}%
                                </span>
                                <Badge
                                  variant="outline"
                                  style={{
                                    borderColor: classification.color,
                                    color: classification.color,
                                  }}
                                >
                                  {classification.shortLabel}
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                        {percentage !== null && (
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${Math.min(percentage, 100)}%`,
                                backgroundColor: course.color,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* What-if calculator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="h-5 w-5" />
                What-If Calculator
              </CardTitle>
              <CardDescription>
                Add hypothetical grades to see how they would affect your classification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[0, 1, 2].map((idx) => {
                const key = `hyp-${idx}`;
                const grade = whatIfGrades[key] || { earned: "", possible: "" };
                return (
                  <div key={key} className="grid grid-cols-3 gap-4">
                    <div className="flex items-end pb-1">
                      <span className="text-sm text-muted-foreground">
                        Assignment {idx + 1}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Score</Label>
                      <Input
                        type="number"
                        placeholder="68"
                        value={grade.earned}
                        onChange={(e) =>
                          setWhatIfGrades((prev) => ({
                            ...prev,
                            [key]: { ...grade, earned: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Out of</Label>
                      <Input
                        type="number"
                        placeholder="100"
                        value={grade.possible}
                        onChange={(e) =>
                          setWhatIfGrades((prev) => ({
                            ...prev,
                            [key]: { ...grade, possible: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {gradedTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
              <BarChart3 className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">No grades yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sync with Canvas or manually add grades to your tasks
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
