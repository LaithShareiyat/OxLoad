export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          university: string | null;
          canvas_base_url: string | null;
          canvas_api_token: string | null;
          google_calendar_refresh_token: string | null;
          google_calendar_id: string | null;
          timezone: string;
          notification_preferences: Json;
          gpa_scale: string;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          university?: string | null;
          canvas_base_url?: string | null;
          canvas_api_token?: string | null;
          google_calendar_refresh_token?: string | null;
          google_calendar_id?: string | null;
          timezone?: string;
          notification_preferences?: Json;
          gpa_scale?: string;
          onboarding_completed?: boolean;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          university?: string | null;
          canvas_base_url?: string | null;
          canvas_api_token?: string | null;
          google_calendar_refresh_token?: string | null;
          google_calendar_id?: string | null;
          timezone?: string;
          notification_preferences?: Json;
          gpa_scale?: string;
          onboarding_completed?: boolean;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          user_id: string;
          canvas_course_id: number | null;
          name: string;
          code: string | null;
          color: string;
          term: string | null;
          instructor: string | null;
          credits: number | null;
          is_active: boolean;
          canvas_last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          canvas_course_id?: number | null;
          name: string;
          code?: string | null;
          color?: string;
          term?: string | null;
          instructor?: string | null;
          credits?: number | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          canvas_course_id?: number | null;
          name?: string;
          code?: string | null;
          color?: string;
          term?: string | null;
          instructor?: string | null;
          credits?: number | null;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "courses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          course_id: string | null;
          canvas_assignment_id: number | null;
          canvas_submission_id: number | null;
          title: string;
          description: string | null;
          task_type: TaskType;
          due_date: string | null;
          start_date: string | null;
          estimated_minutes: number | null;
          actual_minutes: number;
          priority: Priority;
          status: TaskStatus;
          completed_at: string | null;
          points_possible: number | null;
          points_earned: number | null;
          grade_letter: string | null;
          weight: number | null;
          url: string | null;
          tags: string[];
          recurrence_rule: string | null;
          notification_sent: boolean;
          canvas_last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id?: string | null;
          canvas_assignment_id?: number | null;
          canvas_submission_id?: number | null;
          title: string;
          description?: string | null;
          task_type?: TaskType;
          due_date?: string | null;
          start_date?: string | null;
          estimated_minutes?: number | null;
          actual_minutes?: number;
          priority?: Priority;
          status?: TaskStatus;
          points_possible?: number | null;
          points_earned?: number | null;
          grade_letter?: string | null;
          weight?: number | null;
          url?: string | null;
          tags?: string[];
          recurrence_rule?: string | null;
          notification_sent?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string | null;
          canvas_assignment_id?: number | null;
          canvas_submission_id?: number | null;
          title?: string;
          description?: string | null;
          task_type?: TaskType;
          due_date?: string | null;
          start_date?: string | null;
          estimated_minutes?: number | null;
          actual_minutes?: number;
          priority?: Priority;
          status?: TaskStatus;
          completed_at?: string | null;
          points_possible?: number | null;
          points_earned?: number | null;
          grade_letter?: string | null;
          weight?: number | null;
          url?: string | null;
          tags?: string[];
          recurrence_rule?: string | null;
          notification_sent?: boolean;
          canvas_last_synced_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          }
        ];
      };
      subtasks: {
        Row: {
          id: string;
          task_id: string;
          title: string;
          is_completed: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          title: string;
          is_completed?: boolean;
          sort_order?: number;
        };
        Update: {
          id?: string;
          task_id?: string;
          title?: string;
          is_completed?: boolean;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "subtasks_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          }
        ];
      };
      calendar_events: {
        Row: {
          id: string;
          user_id: string;
          course_id: string | null;
          google_event_id: string | null;
          title: string;
          description: string | null;
          location: string | null;
          event_type: EventType;
          start_time: string;
          end_time: string;
          is_all_day: boolean;
          recurrence_rule: string | null;
          color: string | null;
          google_last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id?: string | null;
          google_event_id?: string | null;
          title: string;
          description?: string | null;
          location?: string | null;
          event_type?: EventType;
          start_time: string;
          end_time: string;
          is_all_day?: boolean;
          recurrence_rule?: string | null;
          color?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string | null;
          google_event_id?: string | null;
          title?: string;
          description?: string | null;
          location?: string | null;
          event_type?: EventType;
          start_time?: string;
          end_time?: string;
          is_all_day?: boolean;
          recurrence_rule?: string | null;
          color?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calendar_events_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          }
        ];
      };
      study_sessions: {
        Row: {
          id: string;
          user_id: string;
          task_id: string | null;
          course_id: string | null;
          session_type: SessionType;
          started_at: string;
          ended_at: string | null;
          duration_minutes: number | null;
          pomodoro_count: number;
          notes: string | null;
          focus_rating: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_id?: string | null;
          course_id?: string | null;
          session_type?: SessionType;
          started_at: string;
          ended_at?: string | null;
          duration_minutes?: number | null;
          pomodoro_count?: number;
          notes?: string | null;
          focus_rating?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_id?: string | null;
          course_id?: string | null;
          session_type?: SessionType;
          started_at?: string;
          ended_at?: string | null;
          duration_minutes?: number | null;
          pomodoro_count?: number;
          notes?: string | null;
          focus_rating?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "study_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "study_sessions_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "study_sessions_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          }
        ];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      notification_log: {
        Row: {
          id: string;
          user_id: string;
          task_id: string | null;
          notification_type: string;
          title: string;
          body: string | null;
          sent_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_id?: string | null;
          notification_type: string;
          title: string;
          body?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_id?: string | null;
          notification_type?: string;
          title?: string;
          body?: string | null;
          sent_at?: string;
          read_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notification_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_log_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {};
    Functions: {};
  };
}

export type TaskType = "todo" | "assignment" | "exam" | "reading" | "project" | "study";
export type Priority = "critical" | "high" | "medium" | "low";
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled" | "overdue";
export type EventType = "class" | "lecture" | "tutorial" | "lab" | "office_hours" | "study" | "exam" | "other";
export type SessionType = "pomodoro" | "free" | "timed";

// Convenience aliases
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Course = Database["public"]["Tables"]["courses"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Subtask = Database["public"]["Tables"]["subtasks"]["Row"];
export type CalendarEvent = Database["public"]["Tables"]["calendar_events"]["Row"];
export type StudySession = Database["public"]["Tables"]["study_sessions"]["Row"];

export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
export type CourseInsert = Database["public"]["Tables"]["courses"]["Insert"];
export type CourseUpdate = Database["public"]["Tables"]["courses"]["Update"];
