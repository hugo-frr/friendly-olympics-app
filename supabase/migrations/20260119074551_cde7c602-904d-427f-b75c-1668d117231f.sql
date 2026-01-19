-- Add UPDATE policy for subscriptions table (for service role via edge functions)
CREATE POLICY "Service role can update subscriptions" 
ON public.subscriptions 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Allow service role to insert subscriptions
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;
CREATE POLICY "Allow subscription management" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (true);