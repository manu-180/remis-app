-- ═══════════════════════════════════════════════
-- RLS Audit Script — run in Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- 1. Tables with RLS disabled (potential data exposure)
SELECT
  schemaname,
  tablename,
  'RLS_DISABLED' AS issue
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT relname FROM pg_class WHERE relrowsecurity = true
  )
ORDER BY tablename;

-- 2. Tables with RLS enabled but no policies (all access blocked)
SELECT
  c.relname AS tablename,
  'RLS_ENABLED_NO_POLICIES' AS issue
FROM pg_class c
WHERE c.relkind = 'r'
  AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND c.relrowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid
  )
ORDER BY c.relname;

-- 3. All policies grouped by table
SELECT
  c.relname AS table_name,
  p.polname AS policy_name,
  CASE p.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    ELSE 'ALL'
  END AS command,
  ARRAY(
    SELECT rolname FROM pg_roles WHERE oid = ANY(p.polroles)
  ) AS roles
FROM pg_class c
JOIN pg_policy p ON p.polrelid = c.oid
WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY c.relname, p.polname;

-- 4. Summary count
SELECT
  COUNT(*) FILTER (WHERE relrowsecurity = true) AS tables_with_rls,
  COUNT(*) FILTER (WHERE relrowsecurity = false) AS tables_without_rls,
  COUNT(*) AS total_tables
FROM pg_class
WHERE relkind = 'r'
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
