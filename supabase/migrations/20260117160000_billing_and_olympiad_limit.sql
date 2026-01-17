-- Billing and olympiad creation limits
CREATE TABLE public.user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their subscription"
ON public.user_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_record RECORD;
BEGIN
  SELECT status, current_period_end
    INTO sub_record
  FROM public.user_subscriptions
  WHERE user_id = user_uuid
  LIMIT 1;

  IF sub_record IS NULL THEN
    RETURN false;
  END IF;

  RETURN sub_record.status IN ('active', 'trialing')
    AND (sub_record.current_period_end IS NULL OR sub_record.current_period_end > now());
END;
$$;

DROP POLICY IF EXISTS "Users can create their own olympiads" ON public.olympiads;

CREATE POLICY "Users can create olympiads with subscription"
ON public.olympiads FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    (SELECT count(*) FROM public.olympiads o WHERE o.user_id = auth.uid()) < 1
    OR public.has_active_subscription(auth.uid())
  )
);
