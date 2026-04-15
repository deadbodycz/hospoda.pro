-- Vypni Row Level Security na všech tabulkách.
-- Aplikace nemá vlastní auth (anon přístup), RLS blokoval DELETE operace tiše.

ALTER TABLE pubs          DISABLE ROW LEVEL SECURITY;
ALTER TABLE drinks        DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions      DISABLE ROW LEVEL SECURITY;
ALTER TABLE session_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE drink_logs    DISABLE ROW LEVEL SECURITY;
