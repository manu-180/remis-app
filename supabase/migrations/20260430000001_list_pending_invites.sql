-- list_pending_invites: devuelve invites de staff (admin/dispatcher) que aún
-- no confirmaron su email. Solo accesible por admins.
CREATE OR REPLACE FUNCTION public.list_pending_invites()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role user_role,
  invited_at timestamptz
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
  SELECT
    u.id,
    u.email::text,
    p.full_name,
    p.role,
    u.invited_at
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE u.email_confirmed_at IS NULL
    AND u.invited_at IS NOT NULL
    AND p.role IN ('admin', 'dispatcher')
    AND p.deleted_at IS NULL
  ORDER BY u.invited_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_pending_invites() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_pending_invites() TO authenticated;
