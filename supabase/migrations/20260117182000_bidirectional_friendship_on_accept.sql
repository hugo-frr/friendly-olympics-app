-- Create reciprocal player link when an invite is accepted
CREATE OR REPLACE FUNCTION public.accept_olympiad_invite(invite_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  inv public.olympiad_invites%ROWTYPE;
  owner_id UUID;
  participant_id TEXT;
  participant_name TEXT;
  owner_name TEXT;
  reciprocal_id TEXT;
BEGIN
  SELECT * INTO inv
  FROM public.olympiad_invites
  WHERE id = invite_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found or already handled';
  END IF;

  IF lower(inv.invited_email) <> lower(auth.jwt() ->> 'email') THEN
    RAISE EXCEPTION 'Invite email mismatch';
  END IF;

  SELECT user_id INTO owner_id
  FROM public.olympiads
  WHERE id = inv.olympiad_id;

  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'Olympiad not found';
  END IF;

  SELECT display_name INTO participant_name
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF participant_name IS NULL THEN
    SELECT email INTO participant_name
    FROM auth.users
    WHERE id = auth.uid();
  END IF;

  SELECT display_name INTO owner_name
  FROM public.profiles
  WHERE user_id = owner_id;

  IF owner_name IS NULL THEN
    SELECT email INTO owner_name
    FROM auth.users
    WHERE id = owner_id;
  END IF;

  SELECT id INTO participant_id
  FROM public.players
  WHERE user_id = owner_id
    AND linked_user_id = auth.uid()
  LIMIT 1;

  IF participant_id IS NULL THEN
    participant_id := gen_random_uuid()::text;
    INSERT INTO public.players (id, user_id, name, linked_user_id)
    VALUES (participant_id, owner_id, participant_name, auth.uid());
  END IF;

  SELECT id INTO reciprocal_id
  FROM public.players
  WHERE user_id = auth.uid()
    AND linked_user_id = owner_id
  LIMIT 1;

  IF reciprocal_id IS NULL THEN
    reciprocal_id := gen_random_uuid()::text;
    INSERT INTO public.players (id, user_id, name, linked_user_id)
    VALUES (reciprocal_id, auth.uid(), owner_name, owner_id);
  END IF;

  UPDATE public.olympiads
  SET player_ids = CASE
    WHEN NOT participant_id = ANY (player_ids) THEN array_append(player_ids, participant_id)
    ELSE player_ids
  END
  WHERE id = inv.olympiad_id;

  INSERT INTO public.olympiad_memberships (olympiad_id, user_id, role)
  VALUES (inv.olympiad_id, auth.uid(), 'editor')
  ON CONFLICT DO NOTHING;

  UPDATE public.olympiad_invites
  SET status = 'accepted',
      accepted_at = now()
  WHERE id = invite_id;
END;
$$;
