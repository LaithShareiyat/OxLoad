"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SyncResult } from "@/lib/canvas/types";

export function useCanvasSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<SyncResult> => {
      const response = await fetch("/api/canvas/sync", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Sync failed");
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate all data that may have been affected by the sync
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}
