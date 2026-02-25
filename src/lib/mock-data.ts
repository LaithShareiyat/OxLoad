import { Task, Course, StudySession, TaskType, Priority, TaskStatus } from "@/types/database";
import { addDays, subDays, addHours, format } from "date-fns";

const now = new Date();

export const MOCK_USER = {
  id: "mock-user-id",
  email: "laith.shareiyat@ox.ac.uk",
  full_name: "Laith Shareiyat",
};

export const MOCK_COURSES: Course[] = [
  {
    id: "course-1",
    user_id: MOCK_USER.id,
    canvas_course_id: 101,
    name: "Introduction to Computer Science",
    code: "CS101",
    color: "#3B82F6",
    term: "Michaelmas 2025",
    instructor: "Dr. Smith",
    credits: 4,
    is_active: true,
    canvas_last_synced_at: now.toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
  {
    id: "course-2",
    user_id: MOCK_USER.id,
    canvas_course_id: 201,
    name: "Linear Algebra",
    code: "MATH201",
    color: "#EF4444",
    term: "Hilary 2026",
    instructor: "Prof. Williams",
    credits: 3,
    is_active: true,
    canvas_last_synced_at: now.toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
  {
    id: "course-3",
    user_id: MOCK_USER.id,
    canvas_course_id: 150,
    name: "Academic Writing",
    code: "ENG150",
    color: "#10B981",
    term: "Hilary 2026",
    instructor: "Dr. Chen",
    credits: 3,
    is_active: true,
    canvas_last_synced_at: now.toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
  {
    id: "course-4",
    user_id: MOCK_USER.id,
    canvas_course_id: 301,
    name: "Data Structures & Algorithms",
    code: "CS301",
    color: "#8B5CF6",
    term: "Trinity 2026",
    instructor: "Prof. Garcia",
    credits: 4,
    is_active: true,
    canvas_last_synced_at: now.toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
];

type TaskWithCourse = Task & { courses: { name: string; code: string | null; color: string } | null };

function mockTask(
  overrides: Partial<Task> & { id: string; title: string }
): TaskWithCourse {
  const courseId = overrides.course_id ?? null;
  const course = courseId
    ? MOCK_COURSES.find((c) => c.id === courseId) || null
    : null;

  const base: Task = {
    id: overrides.id,
    user_id: MOCK_USER.id,
    course_id: courseId,
    canvas_assignment_id: null,
    canvas_submission_id: null,
    title: overrides.title,
    description: null,
    task_type: "assignment" as TaskType,
    due_date: null,
    start_date: null,
    estimated_minutes: 60,
    actual_minutes: 0,
    priority: "medium" as Priority,
    status: "pending" as TaskStatus,
    completed_at: null,
    points_possible: null,
    points_earned: null,
    grade_letter: null,
    weight: null,
    url: null,
    tags: [],
    recurrence_rule: null,
    notification_sent: false,
    canvas_last_synced_at: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  // Apply overrides explicitly to avoid undefined spreading
  const keys = Object.keys(overrides) as (keyof Task)[];
  for (const key of keys) {
    const val = overrides[key];
    if (val !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (base as any)[key] = val;
    }
  }

  return {
    ...base,
    courses: course
      ? { name: course.name, code: course.code, color: course.color }
      : null,
  };
}

export const MOCK_TASKS = [
  // Active tasks with due dates
  mockTask({
    id: "task-1",
    title: "Problem Set 5: Recursion",
    course_id: "course-1",
    task_type: "assignment",
    priority: "high",
    status: "in_progress",
    due_date: addDays(now, 2).toISOString(),
    start_date: subDays(now, 1).toISOString(),
    estimated_minutes: 120,
    actual_minutes: 45,
    points_possible: 50,
    description: "Implement recursive solutions for tree traversal, merge sort, and dynamic programming problems.",
  }),
  mockTask({
    id: "task-2",
    title: "Read Chapter 8: Eigenvalues",
    course_id: "course-2",
    task_type: "reading",
    priority: "medium",
    status: "pending",
    due_date: addDays(now, 1).toISOString(),
    estimated_minutes: 45,
  }),
  mockTask({
    id: "task-3",
    title: "Research Essay Draft",
    course_id: "course-3",
    task_type: "project",
    priority: "critical",
    status: "pending",
    due_date: addDays(now, 5).toISOString(),
    start_date: subDays(now, 3).toISOString(),
    estimated_minutes: 300,
    actual_minutes: 60,
    points_possible: 100,
    description: "2000-word research essay on the impact of AI on academic writing. Must include 8+ peer-reviewed sources.",
  }),
  mockTask({
    id: "task-4",
    title: "Midterm Exam Prep",
    course_id: "course-2",
    task_type: "exam",
    priority: "critical",
    status: "pending",
    due_date: addDays(now, 7).toISOString(),
    start_date: addDays(now, 1).toISOString(),
    estimated_minutes: 360,
    points_possible: 200,
  }),
  mockTask({
    id: "task-5",
    title: "Binary Search Tree Implementation",
    course_id: "course-4",
    task_type: "assignment",
    priority: "high",
    status: "pending",
    due_date: addDays(now, 3).toISOString(),
    estimated_minutes: 180,
    points_possible: 75,
    description: "Implement BST with insert, delete, search, and traversal methods. Include unit tests.",
  }),
  mockTask({
    id: "task-6",
    title: "Lab 4: Linked Lists",
    course_id: "course-4",
    task_type: "assignment",
    priority: "medium",
    status: "pending",
    due_date: addDays(now, 4).toISOString(),
    estimated_minutes: 90,
    points_possible: 30,
  }),
  mockTask({
    id: "task-7",
    title: "Peer Review: Partner Essay",
    course_id: "course-3",
    task_type: "todo",
    priority: "low",
    status: "pending",
    due_date: addDays(now, 6).toISOString(),
    estimated_minutes: 30,
    points_possible: 10,
  }),
  // Overdue task
  mockTask({
    id: "task-8",
    title: "Discussion Post Week 6",
    course_id: "course-3",
    task_type: "todo",
    priority: "medium",
    status: "overdue",
    due_date: subDays(now, 1).toISOString(),
    estimated_minutes: 20,
    points_possible: 5,
  }),
  // Due today
  mockTask({
    id: "task-9",
    title: "MATH201 Homework 7",
    course_id: "course-2",
    task_type: "assignment",
    priority: "high",
    status: "in_progress",
    due_date: addHours(now, 6).toISOString(),
    estimated_minutes: 90,
    actual_minutes: 30,
    points_possible: 40,
  }),
  // Completed tasks with grades
  mockTask({
    id: "task-10",
    title: "Problem Set 4: Sorting Algorithms",
    course_id: "course-1",
    task_type: "assignment",
    priority: "high",
    status: "completed",
    completed_at: subDays(now, 5).toISOString(),
    due_date: subDays(now, 5).toISOString(),
    estimated_minutes: 120,
    actual_minutes: 95,
    points_possible: 50,
    points_earned: 46,
    grade_letter: "A",
  }),
  mockTask({
    id: "task-11",
    title: "MATH201 Homework 6",
    course_id: "course-2",
    task_type: "assignment",
    priority: "medium",
    status: "completed",
    completed_at: subDays(now, 3).toISOString(),
    due_date: subDays(now, 3).toISOString(),
    estimated_minutes: 90,
    actual_minutes: 110,
    points_possible: 40,
    points_earned: 35,
    grade_letter: "B+",
  }),
  mockTask({
    id: "task-12",
    title: "Essay Outline",
    course_id: "course-3",
    task_type: "assignment",
    priority: "medium",
    status: "completed",
    completed_at: subDays(now, 7).toISOString(),
    due_date: subDays(now, 7).toISOString(),
    estimated_minutes: 60,
    actual_minutes: 50,
    points_possible: 20,
    points_earned: 19,
    grade_letter: "A",
  }),
  mockTask({
    id: "task-13",
    title: "Graph Theory Quiz",
    course_id: "course-4",
    task_type: "exam",
    priority: "high",
    status: "completed",
    completed_at: subDays(now, 2).toISOString(),
    due_date: subDays(now, 2).toISOString(),
    estimated_minutes: 45,
    actual_minutes: 40,
    points_possible: 25,
    points_earned: 22,
    grade_letter: "A-",
  }),
  mockTask({
    id: "task-14",
    title: "CS101 Lab 3",
    course_id: "course-1",
    task_type: "assignment",
    priority: "medium",
    status: "completed",
    completed_at: subDays(now, 10).toISOString(),
    due_date: subDays(now, 10).toISOString(),
    estimated_minutes: 60,
    actual_minutes: 55,
    points_possible: 30,
    points_earned: 28,
    grade_letter: "A",
  }),
];

function mockSession(
  id: string,
  overrides: Partial<StudySession> & { task_id?: string | null; course_id?: string | null }
): StudySession {
  return {
    id,
    user_id: MOCK_USER.id,
    task_id: overrides.task_id ?? null,
    course_id: overrides.course_id ?? null,
    session_type: "pomodoro",
    started_at: overrides.started_at ?? now.toISOString(),
    ended_at: overrides.ended_at ?? addHours(new Date(overrides.started_at ?? now), 0.5).toISOString(),
    duration_minutes: overrides.duration_minutes ?? 25,
    pomodoro_count: overrides.pomodoro_count ?? 1,
    notes: null,
    focus_rating: overrides.focus_rating ?? null,
    created_at: overrides.started_at ?? now.toISOString(),
  };
}

export const MOCK_STUDY_SESSIONS: StudySession[] = [
  // Today
  mockSession("session-1", {
    task_id: "task-1",
    course_id: "course-1",
    started_at: addHours(now, -2).toISOString(),
    ended_at: addHours(now, -1.5).toISOString(),
    duration_minutes: 25,
    pomodoro_count: 1,
    focus_rating: 4,
  }),
  mockSession("session-2", {
    task_id: "task-9",
    course_id: "course-2",
    started_at: addHours(now, -1).toISOString(),
    ended_at: addHours(now, -0.1).toISOString(),
    duration_minutes: 50,
    pomodoro_count: 2,
    focus_rating: 5,
  }),
  // Yesterday
  mockSession("session-3", {
    task_id: "task-3",
    course_id: "course-3",
    started_at: addHours(subDays(now, 1), -3).toISOString(),
    ended_at: addHours(subDays(now, 1), -1).toISOString(),
    duration_minutes: 50,
    pomodoro_count: 2,
    focus_rating: 3,
  }),
  mockSession("session-4", {
    task_id: "task-5",
    course_id: "course-4",
    started_at: addHours(subDays(now, 1), -5).toISOString(),
    ended_at: addHours(subDays(now, 1), -4.5).toISOString(),
    duration_minutes: 25,
    pomodoro_count: 1,
    focus_rating: 4,
  }),
  // 2 days ago
  mockSession("session-5", {
    task_id: "task-13",
    course_id: "course-4",
    started_at: addHours(subDays(now, 2), -2).toISOString(),
    ended_at: addHours(subDays(now, 2), -0.75).toISOString(),
    duration_minutes: 75,
    pomodoro_count: 3,
    focus_rating: 5,
  }),
  // 3 days ago
  mockSession("session-6", {
    task_id: "task-1",
    course_id: "course-1",
    started_at: addHours(subDays(now, 3), -3).toISOString(),
    ended_at: addHours(subDays(now, 3), -2.5).toISOString(),
    duration_minutes: 25,
    pomodoro_count: 1,
    focus_rating: 3,
  }),
  mockSession("session-7", {
    task_id: "task-3",
    course_id: "course-3",
    started_at: addHours(subDays(now, 3), -1).toISOString(),
    ended_at: addHours(subDays(now, 3), 0).toISOString(),
    duration_minutes: 50,
    pomodoro_count: 2,
    focus_rating: 4,
  }),
  // 5 days ago
  mockSession("session-8", {
    task_id: "task-4",
    course_id: "course-2",
    session_type: "free",
    started_at: addHours(subDays(now, 5), -4).toISOString(),
    ended_at: addHours(subDays(now, 5), -2).toISOString(),
    duration_minutes: 120,
    pomodoro_count: 0,
    focus_rating: 4,
  }),
];
