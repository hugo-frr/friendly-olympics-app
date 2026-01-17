-- Fix recursive policy on olympiads insert by using a definer function
CREATE OR REPLACE FUNCTION public.can_create_olympiad(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  olympiad_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO olympiad_count
  FROM public.olympiads
  WHERE user_id = user_uuid;

  RETURN olympiad_count < 1 OR public.has_active_subscription(user_uuid);
END;
$$;

DROP POLICY IF EXISTS "Users can create olympiads with subscription" ON public.olympiads;

CREATE POLICY "Users can create olympiads with subscription"
ON public.olympiads FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND public.can_create_olympiad(auth.uid())
);
