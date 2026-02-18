"use client";

import { Badge } from "@/components/ui/badge";
import { Priority } from "@/types/database";

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  critical: {
    label: "Critical",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  high: {
    label: "High",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  },
  medium: {
    label: "Medium",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  low: {
    label: "Low",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const config = priorityConfig[priority];
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}
