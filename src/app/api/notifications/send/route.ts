import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// This route is called by a cron job (e.g. Vercel cron)
// It sends push notifications for tasks due in ~24h or ~1h
export async function POST(request: Request) {
  // Optional: verify cron secret
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createClient();

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in24hPlus10 = new Date(in24h.getTime() + 10 * 60 * 1000);
    const in1h = new Date(now.getTime() + 60 * 60 * 1000);
    const in1hPlus10 = new Date(in1h.getTime() + 10 * 60 * 1000);

    // Find tasks due in ~24h or ~1h that haven't been notified
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, user_id, due_date")
      .eq("notification_sent", false)
      .not("status", "in", '("completed","cancelled")')
      .or(
        `due_date.gte.${in24h.toISOString()},due_date.lte.${in24hPlus10.toISOString()},due_date.gte.${in1h.toISOString()},due_date.lte.${in1hPlus10.toISOString()}`
      );

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    let sent = 0;

    for (const task of tasks) {
      const dueDate = new Date(task.due_date!);
      const msUntilDue = dueDate.getTime() - now.getTime();
      const hoursUntilDue = msUntilDue / (1000 * 60 * 60);
      const isUrgent = hoursUntilDue <= 1.2;

      // Get push subscriptions for this user
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", task.user_id);

      if (!subscriptions || subscriptions.length === 0) continue;

      const payload = JSON.stringify({
        title: isUrgent ? "Due in 1 hour!" : "Due tomorrow",
        body: task.title,
        tag: `task-${task.id}`,
        url: `/tasks/${task.id}`,
        requireInteraction: isUrgent,
      });

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh!, auth: sub.auth! },
            },
            payload
          );
          sent++;
        } catch (err: unknown) {
          // Remove expired subscriptions (410 Gone)
          if (
            err &&
            typeof err === "object" &&
            "statusCode" in err &&
            (err as { statusCode: number }).statusCode === 410
          ) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
          }
        }
      }

      // Mark as notified
      await supabase
        .from("tasks")
        .update({ notification_sent: true })
        .eq("id", task.id);
    }

    return NextResponse.json({ sent });
  } catch (error) {
    console.error("Send notifications error:", error);
    return NextResponse.json({ error: "Failed to send notifications" }, { status: 500 });
  }
}
