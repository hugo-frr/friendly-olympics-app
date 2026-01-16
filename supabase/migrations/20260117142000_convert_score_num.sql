-- Convert legacy score_num events to classement
CREATE OR REPLACE FUNCTION public.convert_score_num_event(ev JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  ev_type TEXT := ev->>'type';
  rule JSONB := ev->'rule';
  higher BOOLEAN := COALESCE((rule->>'higherIsBetter')::BOOLEAN, TRUE);
  new_rule JSONB;
  matches JSONB;
  new_matches JSONB;
BEGIN
  IF ev_type <> 'score_num' THEN
    RETURN ev;
  END IF;

  new_rule := jsonb_build_object(
    'kind', 'placement_table',
    'table', COALESCE(rule->'table', '[]'::jsonb)
  );

  matches := ev->'matches';
  IF jsonb_typeof(matches) = 'array' THEN
    SELECT jsonb_agg(
      CASE
        WHEN (m->'result'->>'kind') <> 'score_num' THEN m
        ELSE jsonb_set(
          m,
          '{result}',
          jsonb_build_object(
            'kind', 'classement',
            'order', (
              SELECT jsonb_agg(entry->>'playerId' ORDER BY
                CASE
                  WHEN higher THEN -1 * (entry->>'value')::NUMERIC
                  ELSE (entry->>'value')::NUMERIC
                END
              )
              FROM jsonb_array_elements(m->'result'->'entries') AS entry
            )
          )
        )
      END
    )
    INTO new_matches
    FROM jsonb_array_elements(matches) AS m;
  ELSE
    new_matches := matches;
  END IF;

  RETURN jsonb_build_object(
    'id', ev->'id',
    'templateId', ev->'templateId',
    'name', ev->'name',
    'type', 'classement',
    'rule', new_rule,
    'teamSize', ev->'teamSize',
    'matches', COALESCE(new_matches, '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.convert_score_num_event_instances(instances JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  converted JSONB;
BEGIN
  SELECT jsonb_agg(public.convert_score_num_event(ev))
  INTO converted
  FROM jsonb_array_elements(instances) AS ev;

  RETURN COALESCE(converted, '[]'::jsonb);
END;
$$;

UPDATE public.olympiads
SET event_instances = public.convert_score_num_event_instances(event_instances)
WHERE jsonb_path_exists(event_instances, '$[*] ? (@.type == "score_num")');

UPDATE public.activities
SET
  default_type = 'classement',
  default_rule = jsonb_build_object(
    'kind', 'placement_table',
    'table', COALESCE(default_rule->'table', '[5,3,2,1,0]'::jsonb)
  )
WHERE default_type = 'score_num';
