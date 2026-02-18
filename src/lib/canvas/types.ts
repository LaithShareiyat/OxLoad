// Canvas LMS API response types

export interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
  enrollment_term_id: number;
  term?: {
    id: number;
    name: string;
    start_at: string | null;
    end_at: string | null;
  };
  teachers?: Array<{
    id: number;
    display_name: string;
  }>;
  enrollments?: Array<{
    type: string;
    computed_current_score: number | null;
    computed_final_score: number | null;
    computed_current_grade: string | null;
    computed_final_grade: string | null;
  }>;
  workflow_state: string;
  start_at: string | null;
  end_at: string | null;
}

export interface CanvasAssignment {
  id: number;
  name: string;
  description: string | null;
  due_at: string | null;
  unlock_at: string | null;
  lock_at: string | null;
  points_possible: number;
  grading_type: string;
  assignment_group_id: number;
  course_id: number;
  html_url: string;
  submission_types: string[];
  has_submitted_submissions: boolean;
  published: boolean;
  position: number;
  group_category_id: number | null;
  submission?: CanvasSubmission;
}

export interface CanvasSubmission {
  id: number;
  assignment_id: number;
  user_id: number;
  score: number | null;
  grade: string | null;
  submitted_at: string | null;
  graded_at: string | null;
  workflow_state: string;
  late: boolean;
  missing: boolean;
  excused: boolean;
  points_deducted: number | null;
}

export interface CanvasTodoItem {
  type: string;
  assignment: CanvasAssignment;
  context_type: string;
  course_id: number;
  html_url: string;
}

export interface CanvasAuthError extends Error {
  status: 401 | 403;
}

export interface SyncResult {
  courses: {
    created: number;
    updated: number;
  };
  tasks: {
    created: number;
    updated: number;
  };
  grades: {
    updated: number;
  };
  errors: string[];
  synced_at: string;
}
