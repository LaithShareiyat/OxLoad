import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

function toIcsDate(dateStr: string): string {
  const d = new Date(dateStr);
  return format(d, "yyyyMMdd'T'HHmmss'Z'");
}

function escapeIcs(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  chunks.push(line.slice(0, 75));
  let i = 75;
  while (i < line.length) {
    chunks.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return chunks.join("\r\n");
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("id, title, description, due_date, status, task_type")
      .eq("user_id", user.id)
      .not("due_date", "is", null)
      .order("due_date", { ascending: true });

    if (error) throw error;

    const now = toIcsDate(new Date().toISOString());

    const events = (tasks || []).map((task) => {
      const dtStart = toIcsDate(task.due_date!);
      const summary = escapeIcs(task.title);
      const description = task.description
        ? escapeIcs(task.description.slice(0, 500))
        : "";

      const lines = [
        "BEGIN:VEVENT",
        foldLine(`UID:${task.id}@oxload`),
        foldLine(`DTSTAMP:${now}`),
        foldLine(`DTSTART:${dtStart}`),
        foldLine(`DTEND:${dtStart}`),
        foldLine(`SUMMARY:${summary}`),
      ];

      if (description) {
        lines.push(foldLine(`DESCRIPTION:${description}`));
      }

      if (task.status === "completed") {
        lines.push("STATUS:COMPLETED");
      }

      lines.push("END:VEVENT");
      return lines.join("\r\n");
    });

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//OxLoad//University Workload Manager//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:OxLoad Tasks",
      "X-WR-TIMEZONE:UTC",
      ...events,
      "END:VCALENDAR",
    ].join("\r\n");

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="oxload.ics"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("ICS export error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
