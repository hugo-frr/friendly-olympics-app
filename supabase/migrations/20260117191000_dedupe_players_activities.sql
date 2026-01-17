-- Deduplicate players (linked accounts) and activities, then add unique constraints

-- Remove duplicate linked players (keep earliest)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, linked_user_id
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.players
  WHERE linked_user_id IS NOT NULL
)
DELETE FROM public.players p
USING ranked r
WHERE p.id = r.id
  AND r.rn > 1;

-- Remove duplicate activities per user (keep earliest by name)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, name
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.activities
)
DELETE FROM public.activities a
USING ranked r
WHERE a.id = r.id
  AND r.rn > 1;

-- Enforce uniqueness to avoid future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS players_user_linked_unique
  ON public.players (user_id, linked_user_id)
  WHERE linked_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS activities_user_name_unique
  ON public.activities (user_id, name);
