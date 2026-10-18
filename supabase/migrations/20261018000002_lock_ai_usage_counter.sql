-- Users could reset their own quota with a direct PATCH on ai_usage_daily because
-- consume_daily_ai_usage ran as the caller and needed INSERT/UPDATE policies.
-- The function now runs as its owner, so users only keep read access to the table.

CREATE OR REPLACE FUNCTION public.consume_daily_ai_usage(
  p_purpose text,
  p_limit integer
)
RETURNS TABLE (
  allowed boolean,
  usage_count integer,
  remaining integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_usage_date date := CURRENT_DATE;
  v_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_purpose IS NULL OR p_purpose NOT IN ('food_photo', 'home_review') THEN
    RAISE EXCEPTION 'Invalid AI usage purpose' USING ERRCODE = '22023';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 THEN
    RAISE EXCEPTION 'Invalid AI usage limit' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.ai_usage_daily (user_id, usage_date, purpose, usage_count)
  VALUES (v_user_id, v_usage_date, p_purpose, 1)
  ON CONFLICT (user_id, usage_date, purpose)
  DO UPDATE
    SET usage_count = public.ai_usage_daily.usage_count + 1,
        updated_at = now()
  RETURNING public.ai_usage_daily.usage_count INTO v_count;

  allowed := v_count <= p_limit;
  usage_count := v_count;
  remaining := GREATEST(p_limit - v_count, 0);
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_daily_ai_usage(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_daily_ai_usage(text, integer) TO authenticated;

DROP POLICY IF EXISTS "ai_usage_daily_insert_own" ON public.ai_usage_daily;
DROP POLICY IF EXISTS "ai_usage_daily_update_own" ON public.ai_usage_daily;
