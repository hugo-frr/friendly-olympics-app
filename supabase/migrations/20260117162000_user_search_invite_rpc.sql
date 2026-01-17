-- Search users by display name and invite by user id
CREATE OR REPLACE FUNCTION public.search_users(query_text TEXT, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (user_id UUID, display_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF query_text IS NULL OR length(trim(query_text)) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.user_id, p.display_name
  FROM public.profiles p
  WHERE p.display_name IS NOT NULL
    AND p.user_id <> auth.uid()
    AND p.display_name ILIKE '%' || query_text || '%'
  ORDER BY p.display_name
  LIMIT limit_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.invite_user_to_olympiad(olymp_id TEXT, invited_user UUID)
RETURNS TABLE (
  id UUID,
  olympiad_id TEXT,
  olympiad_title TEXT,
  invited_email TEXT,
  invited_by UUID,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  olymp_title TEXT;
  invited_email_value TEXT;
  existing_invite public.olympiad_invites%ROWTYPE;
BEGIN
  IF invited_user = auth.uid() THEN
    RAISE EXCEPTION 'Cannot invite yourself';
  END IF;

  SELECT title INTO olymp_title
  FROM public.olympiads
  WHERE id = olymp_id
    AND user_id = auth.uid();

  IF olymp_title IS NULL THEN
    RAISE EXCEPTION 'Not authorized to invite';
  END IF;

  SELECT email INTO invited_email_value
  FROM auth.users
  WHERE id = invited_user;

  IF invited_email_value IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  SELECT * INTO existing_invite
  FROM public.olympiad_invites i
  WHERE i.olympiad_id = olymp_id
    AND lower(i.invited_email) = lower(invited_email_value)
    AND i.status = 'pending'
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY
    SELECT existing_invite.id,
      existing_invite.olympiad_id,
      existing_invite.olympiad_title,
      existing_invite.invited_email,
      existing_invite.invited_by,
      existing_invite.status,
      existing_invite.created_at;
    RETURN;
  END IF;

  INSERT INTO public.olympiad_invites (olympiad_id, olympiad_title, invited_email, invited_by, status)
  VALUES (olymp_id, olymp_title, invited_email_value, auth.uid(), 'pending')
  RETURNING * INTO existing_invite;

  RETURN QUERY
  SELECT existing_invite.id,
    existing_invite.olympiad_id,
    existing_invite.olympiad_title,
    existing_invite.invited_email,
    existing_invite.invited_by,
    existing_invite.status,
    existing_invite.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_users(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_user_to_olympiad(TEXT, UUID) TO authenticated;
