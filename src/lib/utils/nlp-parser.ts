import {
  nextMonday,
  nextTuesday,
  nextWednesday,
  nextThursday,
  nextFriday,
  nextSaturday,
  nextSunday,
  addDays,
  addWeeks,
  endOfDay,
  parseISO,
  isValid,
} from "date-fns";
import { Priority } from "@/types/database";

export interface ParsedTask {
  title: string;
  priority: Priority;
  due_date?: string;
  course_id?: string;
  estimated_minutes?: number;
  // Human-readable summaries for preview
  preview: {
    priority: string;
    due_date?: string;
    course?: string;
    estimated?: string;
  };
}

interface Course {
  id: string;
  name: string;
  code: string | null;
}

// ------------------------------------------------------------------
// Priority extraction
// ------------------------------------------------------------------
const PRIORITY_PATTERNS: Array<{ regex: RegExp; value: Priority }> = [
  { regex: /\b(critical|urgent|asap|top priority)\b/i, value: "critical" },
  { regex: /\bhigh\s*priority\b/i, value: "high" },
  { regex: /\blow\s*priority\b/i, value: "low" },
  { regex: /\bmedium\s*priority\b/i, value: "medium" },
  { regex: /\b(high|important)\b/i, value: "high" },
  { regex: /\b(low|trivial|minor)\b/i, value: "low" },
];

function extractPriority(input: string): { priority: Priority; remaining: string } {
  for (const { regex, value } of PRIORITY_PATTERNS) {
    if (regex.test(input)) {
      return { priority: value, remaining: input.replace(regex, "").trim() };
    }
  }
  return { priority: "medium", remaining: input };
}

// ------------------------------------------------------------------
// Date extraction
// ------------------------------------------------------------------
function getNextWeekday(day: string): Date {
  const today = new Date();
  const map: Record<string, () => Date> = {
    monday: () => nextMonday(today),
    tuesday: () => nextTuesday(today),
    wednesday: () => nextWednesday(today),
    thursday: () => nextThursday(today),
    friday: () => nextFriday(today),
    saturday: () => nextSaturday(today),
    sunday: () => nextSunday(today),
    // Abbreviations
    mon: () => nextMonday(today),
    tue: () => nextTuesday(today),
    wed: () => nextWednesday(today),
    thu: () => nextThursday(today),
    fri: () => nextFriday(today),
    sat: () => nextSaturday(today),
    sun: () => nextSunday(today),
  };
  return map[day.toLowerCase()]?.() ?? addDays(today, 7);
}

const DATE_PATTERNS: Array<{
  regex: RegExp;
  resolve: (match: RegExpMatchArray) => Date;
  label: (match: RegExpMatchArray) => string;
}> = [
  {
    regex: /\bby\s+today\b/i,
    resolve: () => endOfDay(new Date()),
    label: () => "today",
  },
  {
    regex: /\bby\s+tomorrow\b/i,
    resolve: () => endOfDay(addDays(new Date(), 1)),
    label: () => "tomorrow",
  },
  {
    regex: /\bby\s+next\s+week\b/i,
    resolve: () => endOfDay(addWeeks(new Date(), 1)),
    label: () => "next week",
  },
  {
    regex: /\bin\s+(\d+)\s+days?\b/i,
    resolve: (m) => endOfDay(addDays(new Date(), parseInt(m[1]))),
    label: (m) => `in ${m[1]} days`,
  },
  {
    regex: /\bin\s+(\d+)\s+weeks?\b/i,
    resolve: (m) => endOfDay(addWeeks(new Date(), parseInt(m[1]))),
    label: (m) => `in ${m[1]} weeks`,
  },
  {
    regex: /\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i,
    resolve: (m) => endOfDay(getNextWeekday(m[1])),
    label: (m) => m[1],
  },
];

function extractDate(input: string): { due_date?: string; dateLabel?: string; remaining: string } {
  for (const { regex, resolve, label } of DATE_PATTERNS) {
    const match = input.match(regex);
    if (match) {
      const date = resolve(match);
      return {
        due_date: date.toISOString(),
        dateLabel: label(match),
        remaining: input.replace(regex, "").trim(),
      };
    }
  }
  return { remaining: input };
}

// ------------------------------------------------------------------
// Estimate extraction
// ------------------------------------------------------------------
const ESTIMATE_PATTERNS: Array<{ regex: RegExp; resolve: (m: RegExpMatchArray) => number }> = [
  { regex: /\bfor\s+(\d+(?:\.\d+)?)\s*h(?:ours?)?\b/i, resolve: (m) => Math.round(parseFloat(m[1]) * 60) },
  { regex: /\b(\d+(?:\.\d+)?)\s*h(?:ours?)?\b/i, resolve: (m) => Math.round(parseFloat(m[1]) * 60) },
  { regex: /\b(\d+)\s*min(?:utes?)?\b/i, resolve: (m) => parseInt(m[1]) },
  { regex: /\bestimate[d]?\s+(\d+(?:\.\d+)?)\s*h(?:ours?)?\b/i, resolve: (m) => Math.round(parseFloat(m[1]) * 60) },
];

function extractEstimate(input: string): { estimated_minutes?: number; estimateLabel?: string; remaining: string } {
  for (const { regex, resolve } of ESTIMATE_PATTERNS) {
    const match = input.match(regex);
    if (match) {
      const mins = resolve(match);
      const label = mins >= 60 ? `${(mins / 60).toFixed(1)}h` : `${mins}min`;
      return { estimated_minutes: mins, estimateLabel: label, remaining: input.replace(regex, "").trim() };
    }
  }
  return { remaining: input };
}

// ------------------------------------------------------------------
// Course extraction
// ------------------------------------------------------------------
function extractCourse(
  input: string,
  courses: Course[]
): { course_id?: string; courseLabel?: string; remaining: string } {
  // Match "for <code>" or "for <course name>"
  const forMatch = input.match(/\bfor\s+([a-zA-Z0-9\s]+?)(?=\s+by\s|\s+high\s|\s+low\s|\s+critical\s|\s+urgent\s|\s+estimate|\s+\d+h|\s+\d+min|$)/i);
  if (forMatch) {
    const candidate = forMatch[1].trim().toLowerCase();
    const matched = courses.find(
      (c) =>
        c.code?.toLowerCase() === candidate ||
        c.name.toLowerCase().includes(candidate) ||
        candidate.includes(c.code?.toLowerCase() ?? "____") ||
        candidate.includes(c.name.toLowerCase().split(" ")[0])
    );
    if (matched) {
      return {
        course_id: matched.id,
        courseLabel: matched.code ?? matched.name,
        remaining: input.replace(forMatch[0], "").trim(),
      };
    }
  }

  // Direct code match anywhere in the string
  for (const course of courses) {
    if (course.code) {
      const codeRegex = new RegExp(`\\b${course.code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (codeRegex.test(input)) {
        return {
          course_id: course.id,
          courseLabel: course.code,
          remaining: input.replace(codeRegex, "").trim(),
        };
      }
    }
  }

  return { remaining: input };
}

// ------------------------------------------------------------------
// Main parser
// ------------------------------------------------------------------
export function parseTaskInput(raw: string, courses: Course[]): ParsedTask {
  let text = raw.trim();
  const preview: ParsedTask["preview"] = { priority: "Medium" };

  // 1. Priority
  const { priority, remaining: t1 } = extractPriority(text);
  text = t1;
  if (priority !== "medium") {
    preview.priority = priority.charAt(0).toUpperCase() + priority.slice(1);
  }

  // 2. Date
  const { due_date, dateLabel, remaining: t2 } = extractDate(text);
  text = t2;
  if (due_date && dateLabel) preview.due_date = dateLabel;

  // 3. Estimate
  const { estimated_minutes, estimateLabel, remaining: t3 } = extractEstimate(text);
  text = t3;
  if (estimateLabel) preview.estimated = estimateLabel;

  // 4. Course
  const { course_id, courseLabel, remaining: t4 } = extractCourse(text, courses);
  text = t4;
  if (courseLabel) preview.course = courseLabel;

  // Clean up stray punctuation and whitespace
  const title = text.replace(/\s{2,}/g, " ").replace(/^[,\s]+|[,\s]+$/g, "").trim();

  return {
    title: title || raw.trim(),
    priority,
    due_date,
    course_id,
    estimated_minutes,
    preview,
  };
}
