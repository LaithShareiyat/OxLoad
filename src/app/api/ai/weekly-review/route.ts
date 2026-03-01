import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { addDays, format, setHours, setMinutes } from "date-fns";

const isMock = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

export interface CalendarEventPayload {
  title: string;
  start_time: string;
  end_time: string;
  event_type: "study" | "other";
  description: string;
}

export interface AIRecommendation {
  id: string;
  category: "reschedule" | "add_study_session" | "priority_change" | "workload_balance" | "urgent";
  priority: "high" | "medium" | "low";
  title: string;
  reason: string;
  action: string;
  calendar_event?: CalendarEventPayload;
}

export interface WeeklyReviewResponse {
  summary: string;
  recommendations: AIRecommendation[];
  generatedAt: string;
}

function mockDate(daysFromNow: number, hour: number, minute = 0): string {
  const d = setMinutes(setHours(addDays(new Date(), daysFromNow), hour), minute);
  return format(d, "yyyy-MM-dd'T'HH:mm:ss");
}

function buildMockReview(): WeeklyReviewResponse {
  return {
    summary:
      "Your workload is manageable this week, but two high-priority items need immediate attention — the MATH201 problem set is due today and the CS301 project has had no study sessions logged.",
    generatedAt: new Date().toISOString(),
    recommendations: [
      {
        id: "rec-1",
        category: "urgent",
        priority: "high",
        title: "Submit MATH201 Problem Set today",
        reason:
          "This assignment is due today and only 30 minutes of study have been logged. Missing it will significantly impact your Linear Algebra grade.",
        action:
          "Block 2 hours this morning to complete the remaining questions, then submit before midnight.",
        calendar_event: {
          title: "MATH201 Problem Set — Final Push",
          start_time: mockDate(0, 10),
          end_time: mockDate(0, 12),
          event_type: "study",
          description: "Complete remaining Linear Algebra problem set questions and submit before midnight.",
        },
      },
      {
        id: "rec-2",
        category: "add_study_session",
        priority: "high",
        title: "Schedule CS301 DSA project session",
        reason:
          "The Data Structures & Algorithms project has 180 minutes of estimated work with zero sessions logged. The deadline is approaching.",
        action:
          "Book a 60-minute focused session on Monday using the Pomodoro timer. Link it to the CS301 project task.",
        calendar_event: {
          title: "CS301 DSA Project — Study Session",
          start_time: mockDate(1, 14),
          end_time: mockDate(1, 15),
          event_type: "study",
          description: "Focused work on Data Structures & Algorithms project. Use Pomodoro timer and link to CS301 task.",
        },
      },
      {
        id: "rec-3",
        category: "reschedule",
        priority: "medium",
        title: "Move ENG150 Essay revision to Tuesday",
        reason:
          "Thursday is already overloaded with CS101 lab prep and a MATH201 tutorial. Adding essay revision will exceed 6 hours of work.",
        action:
          "Update the ENG150 Essay start date to Tuesday to redistribute the load and keep Thursday manageable.",
        calendar_event: {
          title: "ENG150 Essay Revision",
          start_time: mockDate(2, 11),
          end_time: mockDate(2, 12, 30),
          event_type: "study",
          description: "Revise and proofread ENG150 Academic Writing essay draft. Focus on argument structure and citations.",
        },
      },
      {
        id: "rec-4",
        category: "workload_balance",
        priority: "medium",
        title: "Spread CS101 lab prep across Mon–Wed",
        reason:
          "All CS101 Introduction to Computer Science lab preparation is currently queued for Wednesday, creating a single overloaded day.",
        action:
          "Split the estimated 90 minutes into 3 × 30-minute sessions across Monday, Tuesday, and Wednesday.",
      },
      {
        id: "rec-5",
        category: "priority_change",
        priority: "low",
        title: "Upgrade CS301 weekly quiz to high priority",
        reason:
          "The CS301 quiz is due in 4 days and is currently marked as low priority, which means it keeps getting pushed back in the task list.",
        action:
          "Open the CS301 quiz task and change its priority to High so it surfaces in your daily view.",
      },
      {
        id: "rec-6",
        category: "add_study_session",
        priority: "low",
        title: "Log a 30-min MATH201 integration review",
        reason:
          "No study sessions have been recorded for MATH201 Linear Algebra this week. Consistent short review sessions improve long-term retention.",
        action:
          "Start a 30-minute free study session tonight focused on integration techniques from the last lecture.",
      },
    ],
  };
}

export async function POST(req: NextRequest) {
  try {
    if (isMock) {
      await new Promise((r) => setTimeout(r, 1200));
      return NextResponse.json(buildMockReview());
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { tasks, sessions, insights, today } = body as {
      tasks: Array<{
        title: string;
        due_date: string | null;
        status: string;
        priority: string;
        estimated_minutes: number | null;
        actual_minutes: number;
        course: string | null;
      }>;
      sessions: Array<{ course: string | null; duration_minutes: number }>;
      insights: string[];
      today: string;
    };

    const openai = new OpenAI({ apiKey });

    const systemPrompt = `You are an academic study planner for a university student at the University of Oxford.
Analyse the provided workload data and output ONLY a valid JSON object with this exact shape — no markdown, no explanation:
{
  "summary": "<one sentence overall assessment>",
  "recommendations": [
    {
      "id": "<unique string>",
      "category": "<one of: reschedule | add_study_session | priority_change | workload_balance | urgent>",
      "priority": "<one of: high | medium | low>",
      "title": "<short headline, max 10 words>",
      "reason": "<why this matters, 1-2 sentences>",
      "action": "<specific actionable step, 1-2 sentences>",
      "calendar_event": {
        "title": "<event title>",
        "start_time": "<ISO 8601 datetime e.g. 2026-03-03T14:00:00>",
        "end_time": "<ISO 8601 datetime>",
        "event_type": "study",
        "description": "<brief description of what to do>"
      }
    }
  ]
}
Generate between 3 and 6 recommendations. Be specific — reference actual task names, course codes, and dates.
Only include "calendar_event" for categories "add_study_session", "reschedule", and "urgent".
Do NOT include "calendar_event" for "priority_change" or "workload_balance".
Pick realistic weekday times between 9am and 8pm.`;

    const userPrompt = `Today is ${today}.

Active tasks:
${JSON.stringify(tasks, null, 2)}

Study sessions logged in the past 7 days (by course):
${JSON.stringify(sessions, null, 2)}

Workload insights from the system:
${insights.join("\n")}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Omit<WeeklyReviewResponse, "generatedAt">;

    const result: WeeklyReviewResponse = {
      summary: parsed.summary ?? "Review generated.",
      recommendations: (parsed.recommendations ?? []).slice(0, 6),
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
