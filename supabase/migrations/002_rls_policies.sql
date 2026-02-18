-- Row Level Security Policies
-- Every user can only access their own data

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Courses
CREATE POLICY "Users can manage own courses" ON courses FOR ALL USING (auth.uid() = user_id);

-- Tasks
CREATE POLICY "Users can manage own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);

-- Subtasks (via task ownership)
CREATE POLICY "Users can manage own subtasks" ON subtasks FOR ALL
    USING (task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid()));

-- Calendar events
CREATE POLICY "Users can manage own calendar events" ON calendar_events FOR ALL USING (auth.uid() = user_id);

-- Study sessions
CREATE POLICY "Users can manage own study sessions" ON study_sessions FOR ALL USING (auth.uid() = user_id);

-- Push subscriptions
CREATE POLICY "Users can manage own push subscriptions" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- Notification log
CREATE POLICY "Users can manage own notifications" ON notification_log FOR ALL USING (auth.uid() = user_id);
