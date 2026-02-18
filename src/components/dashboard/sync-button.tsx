"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useCanvasSync } from "@/hooks/use-canvas-sync";
import { toast } from "sonner";

export function SyncButton() {
  const sync = useCanvasSync();

  const handleSync = () => {
    sync.mutate(undefined, {
      onSuccess: (result) => {
        const parts: string[] = [];
        if (result.courses.created > 0)
          parts.push(`${result.courses.created} new course${result.courses.created > 1 ? "s" : ""}`);
        if (result.tasks.created > 0)
          parts.push(`${result.tasks.created} new task${result.tasks.created > 1 ? "s" : ""}`);
        if (result.tasks.updated > 0)
          parts.push(`${result.tasks.updated} updated`);
        if (result.grades.updated > 0)
          parts.push(`${result.grades.updated} grade${result.grades.updated > 1 ? "s" : ""}`);

        if (parts.length > 0) {
          toast.success(`Canvas sync: ${parts.join(", ")}`);
        } else {
          toast.success("Canvas sync complete - already up to date");
        }

        if (result.errors.length > 0) {
          toast.warning(`${result.errors.length} error${result.errors.length > 1 ? "s" : ""} during sync`, {
            description: result.errors[0],
          });
        }
      },
      onError: (error) => {
        toast.error("Canvas sync failed", {
          description: error.message,
        });
      },
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={sync.isPending}
    >
      <RefreshCw
        className={`mr-2 h-4 w-4 ${sync.isPending ? "animate-spin" : ""}`}
      />
      {sync.isPending ? "Syncing..." : "Sync Canvas"}
    </Button>
  );
}
