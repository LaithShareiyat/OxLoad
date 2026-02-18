-- OxLoad Database Schema
-- University Student Workload Manager

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    university TEXT,
    canvas_base_url TEXT,
    canvas_api_token TEXT,
    google_calendar_refresh_token TEXT,
    google_calendar_id TEXT,
    timezone TEXT DEFAULT 'UTC',
    notification_preferences JSONB DEFAULT '{
        "task_reminders": true,
        "reminder_hours_before": [24, 1],
        "daily_digest": true,
        "digest_time": "08:00"
    }'::jsonb,
    gpa_scale TEXT DEFAULT '4.0',
    onboarding_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Courses
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    canvas_course_id BIGINT,
    name TEXT NOT NULL,
    code TEXT,
    color TEXT DEFAULT '#3B82F6',
    term TEXT,
    instructor TEXT,
    credits NUMERIC,
    is_active BOOLEAN DEFAULT true,
    canvas_last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, canvas_course_id)
);

-- Tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    canvas_assignment_id BIGINT,
    canvas_submission_id BIGINT,
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL DEFAULT 'todo'
        CHECK (task_type IN ('todo', 'assignment', 'exam', 'reading', 'project', 'study')),
    due_date TIMESTAMPTZ,
    start_date TIMESTAMPTZ,
    estimated_minutes INTEGER,
    actual_minutes INTEGER DEFAULT 0,
    priority TEXT NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'overdue')),
    completed_at TIMESTAMPTZ,
    points_possible NUMERIC,
    points_earned NUMERIC,
    grade_letter TEXT,
    weight NUMERIC,
    url TEXT,
    tags TEXT[] DEFAULT '{}',
    recurrence_rule TEXT,
    notification_sent BOOLEAN DEFAULT false,
    canvas_last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, canvas_assignment_id)
);

-- Subtasks
CREATE TABLE subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar events
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    google_event_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    event_type TEXT DEFAULT 'class'
        CHECK (event_type IN ('class', 'lecture', 'tutorial', 'lab', 'office_hours', 'study', 'exam', 'other')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_all_day BOOLEAN DEFAULT false,
    recurrence_rule TEXT,
    color TEXT,
    google_last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, google_event_id)
);

-- Study sessions
CREATE TABLE study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    session_type TEXT DEFAULT 'pomodoro'
        CHECK (session_type IN ('pomodoro', 'free', 'timed')),
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    pomodoro_count INTEGER DEFAULT 0,
    notes TEXT,
    focus_rating INTEGER CHECK (focus_rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Push subscriptions
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- Notification log
CREATE TABLE notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_user_due ON tasks(user_id, due_date);
CREATE INDEX idx_tasks_user_course ON tasks(user_id, course_id);
CREATE INDEX idx_calendar_events_user_time ON calendar_events(user_id, start_time);
CREATE INDEX idx_study_sessions_user_date ON study_sessions(user_id, started_at);
CREATE INDEX idx_tasks_canvas_assignment ON tasks(user_id, canvas_assignment_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_courses_updated BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_tasks_updated BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_calendar_events_updated BEFORE UPDATE ON calendar_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
