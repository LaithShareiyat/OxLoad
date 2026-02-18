import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookOpen, Calendar, CheckSquare, BarChart3 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          <span className="text-xl font-bold">OxLoad</span>
        </div>
        <Link href="/login">
          <Button>Sign In</Button>
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-6xl">
          Your university workload, <span className="text-primary">under control</span>
        </h1>
        <p className="mt-6 max-w-lg text-lg text-muted-foreground">
          Sync assignments from Canvas, track your study time, visualize your
          workload, and never miss a deadline again.
        </p>

        <div className="mt-10 flex gap-4">
          <Link href="/login">
            <Button size="lg">Get Started</Button>
          </Link>
        </div>

        <div className="mt-20 grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <Feature
            icon={<CheckSquare className="h-8 w-8" />}
            title="Smart Tasks"
            description="Auto-import assignments from Canvas LMS with priorities and due dates"
          />
          <Feature
            icon={<Calendar className="h-8 w-8" />}
            title="Calendar Sync"
            description="Push deadlines to Google Calendar or export as .ics for any app"
          />
          <Feature
            icon={<BarChart3 className="h-8 w-8" />}
            title="Workload Heatmap"
            description="See when you're overloaded and plan your study sessions"
          />
          <Feature
            icon={<BookOpen className="h-8 w-8" />}
            title="Study Tracker"
            description="Pomodoro timer and session logging to track time per course"
          />
        </div>
      </main>

      <footer className="border-t px-6 py-6 text-center text-sm text-muted-foreground">
        Built for students, by students.
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border p-6">
      {icon}
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
