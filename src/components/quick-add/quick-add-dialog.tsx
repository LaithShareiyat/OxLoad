"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useCourses } from "@/hooks/use-courses";
import { useCreateTask } from "@/hooks/use-tasks";
import { parseTaskInput } from "@/lib/utils/nlp-parser";
import { toast } from "sonner";
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  GraduationCap,
  BarChart3,
  Timer,
  Plus,
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";

const isMock = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

const PRIORITY_COLORS = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "#3B82F6",
  low: "#6B7280",
};

const NAV_ITEMS = [
  { label: "Go to Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Go to Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Go to Calendar", href: "/calendar", icon: Calendar },
  { label: "Go to Courses", href: "/courses", icon: GraduationCap },
  { label: "Go to Grades", href: "/grades", icon: BarChart3 },
  { label: "Go to Study", href: "/study", icon: Timer },
  { label: "Go to Settings", href: "/settings", icon: Settings },
];

export function QuickAddDialog() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const router = useRouter();
  const { data: courses } = useCourses();
  const createTask = useCreateTask();

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) setInput("");
  };

  const parsed = input.trim()
    ? parseTaskInput(input, courses ?? [])
    : null;

  const handleCreateTask = useCallback(() => {
    if (!parsed || !parsed.title) return;

    createTask.mutate(
      {
        title: parsed.title,
        priority: parsed.priority,
        due_date: parsed.due_date,
        course_id: parsed.course_id ?? null,
        estimated_minutes: parsed.estimated_minutes,
        task_type: "assignment",
        status: "pending",
      },
      {
        onSuccess: () => {
          toast.success(`Task created: "${parsed.title}"`);
          setOpen(false);
          setInput("");
        },
        onError: (error) => {
          toast.error("Failed to create task: " + error.message);
        },
      }
    );
  }, [parsed, createTask]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && parsed?.title) {
      e.preventDefault();
      handleCreateTask();
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandInput
        placeholder="Add task or search... e.g. 'Read ch5 for CS101 by Friday'"
        value={input}
        onValueChange={setInput}
        onKeyDown={handleKeyDown}
      />
      <CommandList>
        {/* Live parsed preview */}
        {parsed && parsed.title && (
          <>
            <CommandGroup heading="Create Task">
              <CommandItem
                onSelect={handleCreateTask}
                className="flex flex-col items-start gap-1 py-3"
              >
                <div className="flex w-full items-center gap-2">
                  <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium">{parsed.title}</span>
                </div>
                <div className="ml-6 flex flex-wrap gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{
                      borderColor: PRIORITY_COLORS[parsed.priority],
                      color: PRIORITY_COLORS[parsed.priority],
                    }}
                  >
                    {parsed.preview.priority}
                  </Badge>
                  {parsed.preview.due_date && (
                    <Badge variant="secondary" className="text-xs">
                      Due {parsed.preview.due_date}
                    </Badge>
                  )}
                  {parsed.preview.course && (
                    <Badge variant="secondary" className="text-xs">
                      {parsed.preview.course}
                    </Badge>
                  )}
                  {parsed.preview.estimated && (
                    <Badge variant="secondary" className="text-xs">
                      {parsed.preview.estimated}
                    </Badge>
                  )}
                </div>
                <p className="ml-6 text-xs text-muted-foreground">
                  Press Enter to create
                </p>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Navigation */}
        <CommandGroup heading="Navigate">
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.href}
              onSelect={() => {
                router.push(item.href);
                setOpen(false);
                setInput("");
              }}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandEmpty>
          {input.trim()
            ? "No results — press Enter to create a task"
            : "Type to create a task or navigate..."}
        </CommandEmpty>
      </CommandList>
    </CommandDialog>
  );
}
