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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Calculator } from "lucide-react";
import {
  calculateGpa,
  percentageToLetter,
  type GpaScale,
} from "@/lib/utils/gpa";

export default function GradesPage() {
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const [gpaScale, setGpaScale] = useState<GpaScale>("4.0");
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

  // Calculate GPA from actual grades
  const gpaResult = useMemo(() => {
    const entries = gradedTasks.map((t) => ({
      pointsEarned: t.points_earned!,
      pointsPossible: t.points_possible!,
      weight: t.weight || undefined,
    }));
    return calculateGpa(entries, gpaScale);
  }, [gradedTasks, gpaScale]);

  // Calculate per-course grades
  const courseGrades = useMemo(() => {
    if (!courses || !gradedTasks) return [];

    return courses.map((course) => {
      const courseTasks = gradedTasks.filter(
        (t) => t.course_id === course.id
      );
      const totalEarned = courseTasks.reduce(
        (s, t) => s + (t.points_earned || 0),
        0
      );
      const totalPossible = courseTasks.reduce(
        (s, t) => s + (t.points_possible || 0),
        0
      );
      const percentage =
        totalPossible > 0 ? (totalEarned / totalPossible) * 100 : null;
      const letter = percentage !== null ? percentageToLetter(percentage, gpaScale) : null;

      return {
        course,
        gradedCount: courseTasks.length,
        totalEarned,
        totalPossible,
        percentage,
        letter,
      };
    }).filter((c) => c.gradedCount > 0);
  }, [courses, gradedTasks, gpaScale]);

  // What-if calculation
  const projectedGpa = useMemo(() => {
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

    return calculateGpa([...realEntries, ...hypothetical], gpaScale);
  }, [gradedTasks, whatIfGrades, gpaScale]);

  const isLoading = tasksLoading || coursesLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Grades</h1>
          <p className="text-muted-foreground">
            Track your grades and GPA across courses
          </p>
        </div>
        <Select
          value={gpaScale}
          onValueChange={(v) => setGpaScale(v as GpaScale)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="4.0">4.0 Scale</SelectItem>
            <SelectItem value="4.3">4.3 Scale</SelectItem>
            <SelectItem value="uk">UK Classification</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <>
          {/* GPA Overview */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Current GPA</p>
                <p className="mt-1 text-4xl font-bold">
                  {gradedTasks.length > 0 ? gpaResult.gpa.toFixed(2) : "N/A"}
                </p>
                {gradedTasks.length > 0 && (
                  <Badge variant="secondary" className="mt-2">
                    {gpaResult.letterGrade}
                  </Badge>
                )}
                {gpaResult.classification && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {gpaResult.classification}
                  </p>
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
                <p className="text-sm text-muted-foreground">
                  {projectedGpa ? "Projected GPA" : "What-If GPA"}
                </p>
                <p className="mt-1 text-4xl font-bold">
                  {projectedGpa ? projectedGpa.gpa.toFixed(2) : "--"}
                </p>
                {projectedGpa && (
                  <Badge
                    variant={
                      projectedGpa.gpa >= gpaResult.gpa
                        ? "default"
                        : "destructive"
                    }
                    className="mt-2"
                  >
                    {projectedGpa.gpa >= gpaResult.gpa ? "+" : ""}
                    {(projectedGpa.gpa - gpaResult.gpa).toFixed(2)}
                  </Badge>
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
                    ({ course, gradedCount, totalEarned, totalPossible, percentage, letter }) => (
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
                            <span className="text-sm">
                              {totalEarned.toFixed(1)}/{totalPossible.toFixed(1)}
                            </span>
                            {percentage !== null && (
                              <>
                                <span className="font-medium">
                                  {percentage.toFixed(1)}%
                                </span>
                                <Badge variant="outline">{letter}</Badge>
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
                Add hypothetical grades to see how they would affect your GPA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[0, 1, 2].map((idx) => {
                const key = `hyp-${idx}`;
                const grade = whatIfGrades[key] || { earned: "", possible: "" };
                return (
                  <div key={key} className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Assignment {idx + 1}</Label>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Score</Label>
                      <Input
                        type="number"
                        placeholder="85"
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
