-- Allow olympiad creation without subscription
DROP POLICY IF EXISTS "Users can create olympiads with subscription" ON public.olympiads;

CREATE POLICY "Users can create their own olympiads" 
ON public.olympiads FOR INSERT 
WITH CHECK (auth.uid() = user_id);
