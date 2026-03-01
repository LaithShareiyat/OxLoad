"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Sparkles,
  RefreshCw,
  CalendarClock,
  BookOpen,
  ArrowUpCircle,
  Scale,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIRecommendation, WeeklyReviewResponse } from "@/app/api/ai/weekly-review/route";
import type { WorkloadInsight } from "@/lib/workload/engine";
import type { StudySession } from "@/types/database";

const STORAGE_KEY = "oxload_weekly_review";

const CATEGORY_ICONS: Record<AIRecommendation["category"], React.ReactNode> = {
  urgent: <AlertTriangle className="h-4 w-4" />,
  add_study_session: <BookOpen className="h-4 w-4" />,
  reschedule: <CalendarClock className="h-4 w-4" />,
  priority_change: <ArrowUpCircle className="h-4 w-4" />,
  workload_balance: <Scale className="h-4 w-4" />,
};

const CATEGORY_LABELS: Record<AIRecommendation["category"], string> = {
  urgent: "Urgent",
  add_study_session: "Study Session",
  reschedule: "Reschedule",
  priority_change: "Priority",
  workload_balance: "Balance",
};

const PRIORITY_CONFIG: Record<
  AIRecommendation["priority"],
  { badge: string; dot: string }
> = {
  high: {
    badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    dot: "bg-red-500",
  },
  medium: {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  low: {
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    dot: "bg-blue-500",
  },
};

interface WeeklyReviewCardProps {
  tasks: Array<{
    title: string;
    due_date: string | null;
    status: string;
    priority: string;
    estimated_minutes: number | null;
    actual_minutes: number;
    courses: { name: string; code: string | null; color: string } | null;
  }>;
  sessions: StudySession[];
  insights: WorkloadInsight[];
}

function RecommendationCard({ rec }: { rec: AIRecommendation }) {
  const [expanded, setExpanded] = useState(false);
  const config = PRIORITY_CONFIG[rec.priority];

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 text-muted-foreground">
            {CATEGORY_ICONS[rec.category]}
          </span>
          <p className="text-sm font-semibold leading-snug">{rec.title}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              config.badge
            )}
          >
            {rec.priority}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground"
            )}
          >
            {CATEGORY_LABELS[rec.category]}
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{rec.reason}</p>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-xs text-primary hover:underline focus:outline-none"
      >
        {expanded ? (
          <>
            <ChevronUp className="h-3 w-3" />
            Hide action
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3" />
            Show action
          </>
        )}
      </button>

      {expanded && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 italic leading-relaxed border-l-2 border-emerald-400 pl-2">
          {rec.action}
        </p>
      )}
    </div>
  );
}

export function WeeklyReviewCard({
  tasks,
  sessions,
  insights,
}: WeeklyReviewCardProps) {
  const [result, setResult] = useState<WeeklyReviewResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as WeeklyReviewResponse;
        const age =
          Date.now() - new Date(parsed.generatedAt).getTime();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (age < sevenDays) {
          setResult(parsed);
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      // Format sessions by course for the prompt
      const sessionSummary = sessions.map((s) => ({
        course: s.course_id,
        duration_minutes: s.duration_minutes,
      }));

      // Slim down tasks for the prompt (avoid sending massive payload)
      const taskPayload = tasks.map((t) => ({
        title: t.title,
        due_date: t.due_date,
        status: t.status,
        priority: t.priority,
        estimated_minutes: t.estimated_minutes,
        actual_minutes: t.actual_minutes,
        course: t.courses?.code ?? t.courses?.name ?? null,
      }));

      const insightMessages = insights.map((i) => i.message);

      const res = await fetch("/api/ai/weekly-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: taskPayload,
          sessions: sessionSummary,
          insights: insightMessages,
          today: format(new Date(), "EEEE, d MMMM yyyy"),
        }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as WeeklyReviewResponse;
      setResult(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      toast.success("Weekly review generated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate review";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [tasks, sessions, insights]);

  const generatedLabel = result
    ? `Generated ${format(new Date(result.generatedAt), "EEE, d MMM 'at' h:mm a")}`
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Weekly Review
          </CardTitle>
          <div className="flex items-center gap-3">
            {generatedLabel && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                {generatedLabel}
              </span>
            )}
            <Button
              size="sm"
              variant={result ? "outline" : "default"}
              onClick={generate}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", loading && "animate-spin")}
              />
              {loading ? "Analysing..." : result ? "Refresh" : "Generate"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : result ? (
          <>
            {/* Summary */}
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Summary: </span>
                {result.summary}
              </p>
            </div>

            {/* Recommendation cards */}
            <div className="grid gap-3 sm:grid-cols-2">
              {result.recommendations.map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
            <div className="rounded-full bg-primary/10 p-4">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Get your weekly study plan</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                Analyse your tasks, study sessions, and workload to receive AI-powered
                schedule recommendations for the week ahead.
              </p>
            </div>
            <Button onClick={generate} disabled={loading} className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              Generate Weekly Review
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
