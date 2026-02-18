"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Timer } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function StudyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Study</h1>
        <p className="text-muted-foreground">
          Track your study sessions and focus time
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Pomodoro timer, study session tracking, and focus analytics will be
            available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
