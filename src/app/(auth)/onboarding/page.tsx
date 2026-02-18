"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen, ArrowRight, ArrowLeft, Check } from "lucide-react";

const STEPS = ["University", "Canvas LMS", "Finish"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    university: "",
    canvas_base_url: "",
    canvas_api_token: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const handleFinish = async () => {
    setLoading(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const updateData: Record<string, unknown> = {
      university: formData.university || null,
      timezone: formData.timezone,
      onboarding_completed: true,
    };

    if (formData.canvas_base_url) {
      updateData.canvas_base_url = formData.canvas_base_url.replace(/\/+$/, "");
    }
    if (formData.canvas_api_token) {
      updateData.canvas_api_token = formData.canvas_api_token;
    }

    await supabase.from("profiles").update(updateData).eq("id", user.id);

    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="h-6 w-6" />
          </div>
          <CardTitle>Set up OxLoad</CardTitle>
          <CardDescription>
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </CardDescription>
          <div className="mx-auto mt-4 flex gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-2 w-12 rounded-full ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="university">University Name</Label>
                <Input
                  id="university"
                  placeholder="e.g. University of Oxford"
                  value={formData.university}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      university: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={formData.timezone}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      timezone: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your Canvas LMS to automatically import assignments and
                grades. You can skip this and add it later in Settings.
              </p>
              <div className="space-y-2">
                <Label htmlFor="canvas_url">Canvas URL</Label>
                <Input
                  id="canvas_url"
                  placeholder="https://canvas.university.edu"
                  value={formData.canvas_base_url}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      canvas_base_url: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="canvas_token">
                  API Token{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="canvas_token"
                  type="password"
                  placeholder="Paste your Canvas API token"
                  value={formData.canvas_api_token}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      canvas_api_token: e.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Find this in Canvas: Account &gt; Settings &gt; New Access
                  Token
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm text-muted-foreground">
                You&apos;re all set! You can always update these settings later.
              </p>
              {formData.university && (
                <p className="text-sm">
                  University: <strong>{formData.university}</strong>
                </p>
              )}
              {formData.canvas_base_url && (
                <p className="text-sm">
                  Canvas: <strong>{formData.canvas_base_url}</strong>
                </p>
              )}
            </div>
          )}

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)}>
                {step === 1 && !formData.canvas_base_url ? "Skip" : "Next"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={loading}>
                {loading ? "Setting up..." : "Get Started"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
