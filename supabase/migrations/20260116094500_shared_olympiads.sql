-- Shared olympiads: memberships and invites
CREATE TABLE public.olympiad_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  olympiad_id TEXT NOT NULL REFERENCES public.olympiads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (olympiad_id, user_id)
);

ALTER TABLE public.olympiad_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view olympiad memberships"
ON public.olympiad_memberships FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.olympiad_memberships m
    WHERE m.olympiad_id = olympiad_memberships.olympiad_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can manage olympiad memberships"
ON public.olympiad_memberships FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.olympiads o
    WHERE o.id = olympiad_memberships.olympiad_id
      AND o.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.olympiads o
    WHERE o.id = olympiad_memberships.olympiad_id
      AND o.user_id = auth.uid()
  )
);

CREATE TABLE public.olympiad_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  olympiad_id TEXT NOT NULL REFERENCES public.olympiads(id) ON DELETE CASCADE,
  olympiad_title TEXT NOT NULL,
  invited_email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.olympiad_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view relevant olympiad invites"
ON public.olympiad_invites FOR SELECT
USING (
  invited_by = auth.uid()
  OR lower(invited_email) = lower(auth.jwt() ->> 'email')
  OR EXISTS (
    SELECT 1
    FROM public.olympiads o
    WHERE o.id = olympiad_invites.olympiad_id
      AND o.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can create olympiad invites"
ON public.olympiad_invites FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.olympiads o
    WHERE o.id = olympiad_invites.olympiad_id
      AND o.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can manage olympiad invites"
ON public.olympiad_invites FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.olympiads o
    WHERE o.id = olympiad_invites.olympiad_id
      AND o.user_id = auth.uid()
  )
);

CREATE POLICY "Users can join olympiads via invite"
ON public.olympiad_memberships FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.olympiad_invites i
    WHERE i.olympiad_id = olympiad_memberships.olympiad_id
      AND lower(i.invited_email) = lower(auth.jwt() ->> 'email')
      AND i.status = 'pending'
  )
);

-- Allow members to read shared olympiads
CREATE POLICY "Members can view shared olympiads"
ON public.olympiads FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.olympiad_memberships m
    WHERE m.olympiad_id = olympiads.id
      AND m.user_id = auth.uid()
  )
);

-- Allow editors to update shared olympiads (scores, events)
CREATE POLICY "Editors can update shared olympiads"
ON public.olympiads FOR UPDATE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.olympiad_memberships m
    WHERE m.olympiad_id = olympiads.id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'editor')
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.olympiad_memberships m
    WHERE m.olympiad_id = olympiads.id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'editor')
  )
);

-- Allow members to read player names included in shared olympiads
CREATE POLICY "Members can view shared olympiad players"
ON public.players FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.olympiads o
    WHERE o.id IN (
      SELECT m.olympiad_id
      FROM public.olympiad_memberships m
      WHERE m.user_id = auth.uid()
    )
    AND players.id = ANY (o.player_ids)
  )
);

-- Allow members to read profiles of shared olympiad members
CREATE POLICY "Members can view shared profiles"
ON public.profiles FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.olympiad_memberships m1
    JOIN public.olympiad_memberships m2
      ON m1.olympiad_id = m2.olympiad_id
    WHERE m1.user_id = auth.uid()
      AND m2.user_id = profiles.user_id
  )
);

-- Ensure owner membership on insert
CREATE OR REPLACE FUNCTION public.add_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.olympiad_memberships (olympiad_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'owner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER add_owner_membership_on_olympiad
  AFTER INSERT ON public.olympiads
  FOR EACH ROW EXECUTE FUNCTION public.add_owner_membership();

-- Backfill memberships for existing olympiads
INSERT INTO public.olympiad_memberships (olympiad_id, user_id, role)
SELECT id, user_id, 'owner' FROM public.olympiads
ON CONFLICT DO NOTHING;

-- Accept invite RPC
CREATE OR REPLACE FUNCTION public.accept_olympiad_invite(invite_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.olympiad_invites%ROWTYPE;
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

  INSERT INTO public.olympiad_memberships (olympiad_id, user_id, role)
  VALUES (inv.olympiad_id, auth.uid(), 'editor')
  ON CONFLICT DO NOTHING;

  UPDATE public.olympiad_invites
  SET status = 'accepted',
      accepted_at = now()
  WHERE id = invite_id;
END;
$$;
