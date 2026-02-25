"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bell, BellOff, Calendar, Copy, Download } from "lucide-react";
import { Profile } from "@/types/database";
import { useNotifications } from "@/hooks/use-notifications";

const isMock = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    university: "",
    canvas_base_url: "",
    canvas_api_token: "",
    timezone: "",
  });

  const { state: notifState, isSubscribed, isLoading: notifLoading, subscribe, unsubscribe } =
    useNotifications();

  useEffect(() => {
    if (isMock) {
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
        setFormData({
          full_name: data.full_name || "",
          university: data.university || "",
          canvas_base_url: data.canvas_base_url || "",
          canvas_api_token: data.canvas_api_token ? "••••••••" : "",
          timezone: data.timezone || "",
        });
      }
      setLoading(false);
    };

    loadProfile();
  }, []);

  const handleSave = async () => {
    if (isMock) {
      toast.success("Settings saved (mock mode)");
      return;
    }
    if (!profile) return;
    setSaving(true);

    const supabase = createClient();
    const updates: Record<string, unknown> = {
      full_name: formData.full_name || null,
      university: formData.university || null,
      canvas_base_url: formData.canvas_base_url || null,
      timezone: formData.timezone || "UTC",
    };

    if (formData.canvas_api_token && formData.canvas_api_token !== "••••••••") {
      updates.canvas_api_token = formData.canvas_api_token;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id);

    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Settings saved");
    }
    setSaving(false);
  };

  const icsUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/calendar/ics`
    : "/api/calendar/ics";

  const copyIcsUrl = () => {
    navigator.clipboard.writeText(icsUrl);
    toast.success("Calendar URL copied");
  };

  const notifStatusLabel = () => {
    if (notifState === "unsupported") return "Not supported in this browser";
    if (notifState === "denied") return "Blocked — allow in browser settings";
    if (isSubscribed) return "Enabled";
    return "Disabled";
  };

  const notifStatusVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (notifState === "unsupported" || notifState === "denied") return "destructive";
    if (isSubscribed) return "default";
    return "secondary";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and integrations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              value={formData.full_name}
              onChange={(e) => setFormData((p) => ({ ...p, full_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>University</Label>
            <Input
              value={formData.university}
              onChange={(e) => setFormData((p) => ({ ...p, university: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Input
              value={formData.timezone}
              onChange={(e) => setFormData((p) => ({ ...p, timezone: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Canvas LMS</CardTitle>
          <CardDescription>
            Connect to Canvas to auto-import assignments and grades
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Canvas URL</Label>
            <Input
              placeholder="https://canvas.university.edu"
              value={formData.canvas_base_url}
              onChange={(e) => setFormData((p) => ({ ...p, canvas_base_url: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>API Token</Label>
            <Input
              type="password"
              placeholder="Paste your Canvas API token"
              value={formData.canvas_api_token}
              onChange={(e) => setFormData((p) => ({ ...p, canvas_api_token: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Canvas: Account &gt; Settings &gt; New Access Token
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Export
          </CardTitle>
          <CardDescription>
            Export your deadlines to Apple Calendar, Google Calendar, or any calendar app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
            <span className="flex-1 truncate font-mono text-xs text-muted-foreground">
              {icsUrl}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copyIcsUrl}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/api/calendar/ics" download="oxload.ics">
                <Download className="mr-2 h-4 w-4" />
                Download .ics
              </a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            In Google Calendar: "Other calendars" → "+ Add by URL". In Apple Calendar: File → New Calendar Subscription.
          </p>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Get reminders 24 hours and 1 hour before assignments are due
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Status</p>
              <Badge variant={notifStatusVariant()}>{notifStatusLabel()}</Badge>
            </div>
            {notifState !== "unsupported" && notifState !== "denied" && (
              <Button
                variant={isSubscribed ? "outline" : "default"}
                size="sm"
                disabled={notifLoading}
                onClick={isSubscribed ? unsubscribe : subscribe}
              >
                {notifLoading ? (
                  "..."
                ) : isSubscribed ? (
                  <>
                    <BellOff className="mr-2 h-4 w-4" />
                    Disable
                  </>
                ) : (
                  <>
                    <Bell className="mr-2 h-4 w-4" />
                    Enable
                  </>
                )}
              </Button>
            )}
          </div>
          {notifState === "denied" && (
            <p className="text-xs text-destructive">
              Notifications are blocked. Open browser settings and allow notifications for this site, then refresh.
            </p>
          )}
          {isMock && (
            <p className="text-xs text-muted-foreground">
              Push notifications require a deployed server. They will work once Supabase is connected.
            </p>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
