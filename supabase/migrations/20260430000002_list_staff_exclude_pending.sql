-- list_staff: solo devuelve staff que ya confirmó su invitación.
-- Los invites pendientes viven en list_pending_invites.
CREATE OR REPLACE FUNCTION public.list_staff()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  role user_role,
  avatar_url text,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, p.email, p.role, p.avatar_url, u.last_sign_in_at
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.role IN ('dispatcher', 'admin')
    AND p.deleted_at IS NULL
    AND u.email_confirmed_at IS NOT NULL
  ORDER BY p.full_name;
END $$;
