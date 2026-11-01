-- Expand-only: Buddy's quests. Nothing existing changes; installed app versions never read
-- or write these tables.
-- buddy_quests: the quest list, edited in the Dashboard (points, titles, on/off, dates).
--   Everyone can read it; nobody writes it through the API. `metric` must be one the app
--   knows how to check, or the app skips the quest.
-- buddy_quest_completions: one row per quest and period a user completed, with the points
--   frozen at that moment, so editing a quest later never changes points already earned.
--   Rows are only written through the two functions below, which take the points from
--   buddy_quests instead of trusting the app.
-- Apply before shipping the app version that shows quests.

CREATE TABLE IF NOT EXISTS public.buddy_quests (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('daily', 'weekly', 'special', 'event')),
  metric text NOT NULL,
  -- Weekly quests: days of the week that must meet the metric (7 when NULL).
  required_days integer CHECK (required_days BETWEEN 1 AND 7),
  -- NULL: every goal. Otherwise only users losing, gaining or keeping their weight.
  goal_modes text[] CHECK (goal_modes <@ ARRAY['lose', 'gain', 'maintain']),
  points integer NOT NULL CHECK (points BETWEEN 0 AND 500),
  -- {"vi": "...", "en": "..."}
  title jsonb NOT NULL,
  -- Ionicons name.
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.buddy_quest_completions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- A buddy_quests id, or 'legacy' for the points earned before quests existed.
  quest_id text NOT NULL,
  -- YYYY-MM-DD (daily), YYYY-Www ISO week (weekly), 'once', 'level-N', a goal id, 'legacy'.
  period_key text NOT NULL,
  points integer NOT NULL CHECK (points >= 0),
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, quest_id, period_key)
);

ALTER TABLE public.buddy_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_quest_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buddy_quests_select_public" ON public.buddy_quests;
CREATE POLICY "buddy_quests_select_public"
  ON public.buddy_quests
  FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE ALL ON TABLE public.buddy_quests FROM anon, authenticated;
GRANT SELECT ON TABLE public.buddy_quests TO anon, authenticated;

DROP POLICY IF EXISTS "buddy_quest_completions_select_own" ON public.buddy_quest_completions;
DROP POLICY IF EXISTS "buddy_quest_completions_delete_own" ON public.buddy_quest_completions;

CREATE POLICY "buddy_quest_completions_select_own"
  ON public.buddy_quest_completions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Deleting is allowed so "delete all my data" can clear the rows.
CREATE POLICY "buddy_quest_completions_delete_own"
  ON public.buddy_quest_completions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.buddy_quest_completions FROM anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.buddy_quest_completions TO authenticated;

-- Records a completed quest for the caller and returns its points. The points come from
-- buddy_quests; the period must be recent for daily and weekly quests, and special quests are
-- checked where the database can: an account that is no longer anonymous, a weight goal the
-- user actually completed. Completing the same quest and period twice keeps the first row.
-- Errors: 22023 the quest or period is not valid (the app drops the row); P0002 the weight goal
-- has not reached the cloud yet (the app retries later).
CREATE OR REPLACE FUNCTION public.complete_buddy_quest(p_quest_id text, p_period_key text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_quest public.buddy_quests%ROWTYPE;
  v_points integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_quest FROM public.buddy_quests WHERE id = p_quest_id AND is_active;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown or inactive quest %', p_quest_id USING ERRCODE = '22023';
  END IF;

  IF v_quest.kind = 'daily' THEN
    -- Checked apart: OR does not stop early, and a malformed key would fail the cast.
    IF p_period_key !~ '^\d{4}-\d{2}-\d{2}$' THEN
      RAISE EXCEPTION 'Invalid day %', p_period_key USING ERRCODE = '22023';
    END IF;

    -- Two weeks of slack for a phone that was offline; a day either side for time zones.
    BEGIN
      IF p_period_key::date NOT BETWEEN CURRENT_DATE - 14 AND CURRENT_DATE + 1 THEN
        RAISE EXCEPTION 'Invalid day %', p_period_key USING ERRCODE = '22023';
      END IF;
    EXCEPTION
      WHEN invalid_datetime_format OR datetime_field_overflow THEN
        RAISE EXCEPTION 'Invalid day %', p_period_key USING ERRCODE = '22023';
    END;
  ELSIF v_quest.kind = 'weekly' THEN
    IF p_period_key NOT IN (
      SELECT to_char(CURRENT_DATE - offset_days, 'IYYY-"W"IW')
      FROM generate_series(-1, 21) AS offset_days
    ) THEN
      RAISE EXCEPTION 'Invalid week %', p_period_key USING ERRCODE = '22023';
    END IF;
  ELSIF v_quest.metric = 'create_account' THEN
    IF p_period_key <> 'once'
      OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
      RAISE EXCEPTION 'Account quest needs a full account' USING ERRCODE = '22023';
    END IF;
  ELSIF v_quest.metric = 'pet_level_up' THEN
    IF p_period_key !~ '^level-([2-9]|10)$' THEN
      RAISE EXCEPTION 'Invalid level %', p_period_key USING ERRCODE = '22023';
    END IF;
  ELSIF v_quest.metric = 'weight_goal_reached' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.weight_goals
      WHERE user_id = v_user_id AND id = p_period_key AND status = 'completed'
    ) THEN
      RAISE EXCEPTION 'Goal % is not completed in the cloud', p_period_key USING ERRCODE = 'P0002';
    END IF;
  ELSE
    RAISE EXCEPTION 'Quest % cannot be completed yet', p_quest_id USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.buddy_quest_completions (user_id, quest_id, period_key, points)
  VALUES (v_user_id, p_quest_id, p_period_key, v_quest.points)
  ON CONFLICT (user_id, quest_id, period_key) DO NOTHING;

  SELECT points INTO v_points
  FROM public.buddy_quest_completions
  WHERE user_id = v_user_id AND quest_id = p_quest_id AND period_key = p_period_key;

  RETURN v_points;
END;
$$;

-- Saves, once per user, the points earned under the old rules (counted from the diary on the
-- device that first runs the quest version) and returns the points stored. Capped so a
-- tampered app cannot jump to the top level.
CREATE OR REPLACE FUNCTION public.claim_buddy_legacy_points(p_points integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_points integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_points IS NULL OR p_points NOT BETWEEN 0 AND 20000 THEN
    RAISE EXCEPTION 'Invalid legacy points %', p_points USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.buddy_quest_completions (user_id, quest_id, period_key, points)
  VALUES (v_user_id, 'legacy', 'legacy', p_points)
  ON CONFLICT (user_id, quest_id, period_key) DO NOTHING;

  SELECT points INTO v_points
  FROM public.buddy_quest_completions
  WHERE user_id = v_user_id AND quest_id = 'legacy' AND period_key = 'legacy';

  RETURN v_points;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_buddy_quest(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_buddy_legacy_points(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_buddy_quest(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_buddy_legacy_points(integer) TO authenticated;

-- The starting quest list; edit points, titles and dates in the Dashboard afterwards.
INSERT INTO public.buddy_quests
  (id, kind, metric, required_days, points, title, icon, sort_order)
VALUES
  ('day_first_log', 'daily', 'first_log', NULL, 5,
    '{"vi": "Ghi món đầu tiên trong ngày", "en": "Log your first food today"}', 'create', 10),
  ('day_calorie_goal', 'daily', 'calorie_goal', NULL, 20,
    '{"vi": "Đạt mục tiêu calo", "en": "Hit your calorie goal"}', 'locate', 20),
  ('day_diverse', 'daily', 'diverse_menu', NULL, 10,
    '{"vi": "Thực đơn đủ đạm, tinh bột, béo", "en": "Protein, carbs and fat on the menu"}', 'nutrition', 30),
  ('day_limits', 'daily', 'within_limits', NULL, 15,
    '{"vi": "Không vượt mức đường, muối, chất béo xấu", "en": "Stay under sugar, salt and bad fat limits"}', 'shield-checkmark', 40),
  ('day_fiber', 'daily', 'fiber_enough', NULL, 15,
    '{"vi": "Ăn đủ chất xơ", "en": "Eat enough fiber"}', 'leaf', 50),
  ('week_log', 'weekly', 'first_log', 7, 50,
    '{"vi": "Ghi món đủ 7 ngày", "en": "Log food all 7 days"}', 'calendar', 10),
  ('week_calorie_goal', 'weekly', 'calorie_goal', 5, 150,
    '{"vi": "Đạt mục tiêu calo 5/7 ngày", "en": "Hit your calorie goal 5 of 7 days"}', 'locate', 20),
  ('week_limits', 'weekly', 'within_limits', 7, 100,
    '{"vi": "Cả tuần không vượt mức khuyến cáo", "en": "Stay under the limits all week"}', 'shield-checkmark', 30),
  ('week_fiber', 'weekly', 'fiber_enough', 7, 100,
    '{"vi": "Ngày nào cũng đủ chất xơ", "en": "Enough fiber every day"}', 'leaf', 40),
  ('week_diverse', 'weekly', 'diverse_menu', 7, 50,
    '{"vi": "Ngày nào cũng đủ đạm, tinh bột, béo", "en": "Protein, carbs and fat every day"}', 'nutrition', 50),
  ('special_level_up', 'special', 'pet_level_up', NULL, 0,
    '{"vi": "Thăng cấp thú cưng", "en": "Level up your pet"}', 'trending-up', 10),
  ('special_weight_goal', 'special', 'weight_goal_reached', NULL, 300,
    '{"vi": "Đạt mục tiêu cân nặng", "en": "Reach your weight goal"}', 'trophy', 20),
  ('special_account', 'special', 'create_account', NULL, 100,
    '{"vi": "Tạo tài khoản để giữ dữ liệu", "en": "Create an account to keep your data"}', 'person-add', 30)
ON CONFLICT (id) DO NOTHING;
