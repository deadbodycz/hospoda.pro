-- Enable RLS on all tables + add permissive anon policies
-- App has no auth yet — policies allow full access for anon/authenticated
-- This silences Supabase security warnings without changing app behavior

ALTER TABLE pubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE drinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drink_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public access pubs"         ON pubs         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public access drinks"       ON drinks       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public access sessions"     ON sessions     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public access session_users" ON session_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public access drink_logs"   ON drink_logs   FOR ALL USING (true) WITH CHECK (true);
