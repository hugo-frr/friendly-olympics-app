-- Fix infinite recursion in olympiad policies
DROP POLICY IF EXISTS "Owners can manage olympiad memberships" ON public.olympiad_memberships;

CREATE POLICY "Owners can insert olympiad memberships"
ON public.olympiad_memberships FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.olympiads o
    WHERE o.id = olympiad_memberships.olympiad_id
      AND o.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can update olympiad memberships"
ON public.olympiad_memberships FOR UPDATE
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

CREATE POLICY "Owners can delete olympiad memberships"
ON public.olympiad_memberships FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.olympiads o
    WHERE o.id = olympiad_memberships.olympiad_id
      AND o.user_id = auth.uid()
  )
);
