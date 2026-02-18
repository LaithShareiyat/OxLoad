"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Profile } from "@/types/database";

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

  useEffect(() => {
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
    if (!profile) return;
    setSaving(true);

    const supabase = createClient();
    const updates: Record<string, unknown> = {
      full_name: formData.full_name || null,
      university: formData.university || null,
      canvas_base_url: formData.canvas_base_url || null,
      timezone: formData.timezone || "UTC",
    };

    // Only update token if user changed it (not the masked value)
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

      <Separator />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
