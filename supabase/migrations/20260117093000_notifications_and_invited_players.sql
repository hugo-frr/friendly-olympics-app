-- Notifications and invited player linking
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS linked_user_id UUID;

CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.notify_olympiad_invite()
RETURNS TRIGGER AS $$
DECLARE
  invited_user_id UUID;
BEGIN
  SELECT id INTO invited_user_id
  FROM auth.users
  WHERE lower(email) = lower(NEW.invited_email)
  LIMIT 1;

  IF invited_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, type, data)
    VALUES (
      invited_user_id,
      'Invitation olympiade',
      'Tu as ete invite a rejoindre "' || NEW.olympiad_title || '"',
      'olympiad_invite',
      jsonb_build_object('invite_id', NEW.id, 'olympiad_id', NEW.olympiad_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS notify_olympiad_invite ON public.olympiad_invites;
CREATE TRIGGER notify_olympiad_invite
  AFTER INSERT ON public.olympiad_invites
  FOR EACH ROW EXECUTE FUNCTION public.notify_olympiad_invite();

-- Extend accept invite to create linked player in owner's roster
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
