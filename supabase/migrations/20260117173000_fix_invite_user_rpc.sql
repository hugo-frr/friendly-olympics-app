-- Fix ambiguous column references in invite_user_to_olympiad
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

  SELECT o.title INTO olymp_title
  FROM public.olympiads o
  WHERE o.id = olymp_id
    AND o.user_id = auth.uid();

  IF olymp_title IS NULL THEN
    RAISE EXCEPTION 'Not authorized to invite';
  END IF;

  SELECT u.email INTO invited_email_value
  FROM auth.users u
  WHERE u.id = invited_user;

  IF invited_email_value IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  SELECT i.* INTO existing_invite
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
