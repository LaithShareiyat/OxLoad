"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WorkloadInsight } from "@/lib/workload/engine";
import { AlertTriangle, Info, Lightbulb, Zap } from "lucide-react";

interface InsightsCardProps {
  insights: WorkloadInsight[];
}

const severityIcons = {
  critical: <AlertTriangle className="h-4 w-4 text-red-500" />,
  warning: <Zap className="h-4 w-4 text-orange-500" />,
  info: <Info className="h-4 w-4 text-blue-500" />,
};

const severityColors = {
  critical: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900",
  warning: "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900",
  info: "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900",
};

export function InsightsCard({ insights }: InsightsCardProps) {
  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5" />
            Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your workload looks balanced! No issues detected.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5" />
          Insights
          {insights.some((i) => i.severity === "critical") && (
            <Badge variant="destructive" className="ml-2">
              Action needed
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.slice(0, 5).map((insight, i) => (
          <div
            key={i}
            className={`rounded-lg border p-3 ${severityColors[insight.severity]}`}
          >
            <div className="flex items-start gap-2">
              {severityIcons[insight.severity]}
              <div className="flex-1">
                <p className="text-sm font-medium">{insight.message}</p>
                {insight.suggestedAction && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {insight.suggestedAction}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
