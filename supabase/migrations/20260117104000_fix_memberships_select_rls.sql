-- Fix recursion in olympiad_memberships SELECT policy
DROP POLICY IF EXISTS "Members can view olympiad memberships" ON public.olympiad_memberships;

CREATE OR REPLACE FUNCTION public.is_olympiad_member(olymp_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.olympiad_memberships m
    WHERE m.olympiad_id = olymp_id
      AND m.user_id = auth.uid()
  );
$$;

CREATE POLICY "Members can view olympiad memberships"
ON public.olympiad_memberships FOR SELECT
USING (
  public.is_olympiad_member(olympiad_memberships.olympiad_id)
);
