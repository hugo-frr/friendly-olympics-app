-- Ensure invite notifications are created without RLS recursion
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth SET row_security = off;
