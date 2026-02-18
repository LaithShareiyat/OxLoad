"use client";

import { useState } from "react";
import { useCourses, useCreateCourse } from "@/hooks/use-courses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316",
];

export default function CoursesPage() {
  const { data: courses, isLoading } = useCourses(false);
  const createCourse = useCreateCourse();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [instructor, setInstructor] = useState("");
  const [term, setTerm] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  const handleCreate = () => {
    if (!name.trim()) return;
    createCourse.mutate(
      { name: name.trim(), code: code.trim() || undefined, instructor: instructor.trim() || undefined, term: term.trim() || undefined, color },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setName("");
          setCode("");
          setInstructor("");
          setTerm("");
          setColor(COLORS[0]);
          toast.success("Course created");
        },
        onError: (error) => toast.error("Failed: " + error.message),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Courses</h1>
          <p className="text-muted-foreground">Manage your courses</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Course
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Course</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Course Name</Label>
                <Input
                  placeholder="e.g. Introduction to Computer Science"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Course Code</Label>
                  <Input
                    placeholder="e.g. CS101"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Term</Label>
                  <Input
                    placeholder="e.g. Spring 2026"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Instructor</Label>
                <Input
                  placeholder="e.g. Dr. Smith"
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      className={`h-8 w-8 rounded-full border-2 transition-transform ${
                        color === c
                          ? "scale-110 border-foreground"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                      type="button"
                    />
                  ))}
                </div>
              </div>
              <Button
                onClick={handleCreate}
                className="w-full"
                disabled={!name.trim() || createCourse.isPending}
              >
                {createCourse.isPending ? "Creating..." : "Create Course"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : courses && courses.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.id} href={`/courses/${course.id}`}>
              <Card className="transition-shadow hover:shadow-md cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: course.color + "20" }}
                    >
                      <GraduationCap
                        className="h-5 w-5"
                        style={{ color: course.color }}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-base">{course.name}</CardTitle>
                      {course.code && (
                        <p className="text-sm text-muted-foreground">
                          {course.code}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {course.instructor && <p>Instructor: {course.instructor}</p>}
                    {course.term && <p>Term: {course.term}</p>}
                    {course.canvas_course_id && (
                      <p className="text-xs">Synced from Canvas</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <GraduationCap className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">No courses yet</p>
          <Button
            variant="link"
            onClick={() => setDialogOpen(true)}
            className="mt-2"
          >
            Add your first course
          </Button>
        </div>
      )}
    </div>
  );
}
