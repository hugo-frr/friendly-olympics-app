-- Add linked_user_id column to players table
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS linked_user_id UUID REFERENCES auth.users(id);

-- Create olympiad_memberships table
CREATE TABLE IF NOT EXISTS public.olympiad_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  olympiad_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(olympiad_id, user_id)
);

-- Create olympiad_invites table
CREATE TABLE IF NOT EXISTS public.olympiad_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  olympiad_id UUID NOT NULL,
  olympiad_title TEXT NOT NULL,
  invited_email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  data JSONB,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.olympiad_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.olympiad_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for olympiad_memberships
CREATE POLICY "Users can view their own memberships"
  ON public.olympiad_memberships FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memberships"
  ON public.olympiad_memberships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memberships"
  ON public.olympiad_memberships FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for olympiad_invites
CREATE POLICY "Users can view invites for their email"
  ON public.olympiad_invites FOR SELECT
  USING (true);

CREATE POLICY "Users can insert invites"
  ON public.olympiad_invites FOR INSERT
  WITH CHECK (auth.uid() = invited_by);

CREATE POLICY "Users can update invites for their email"
  ON public.olympiad_invites FOR UPDATE
  USING (true);

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);