-- Rollback for 20261018000002_lock_ai_usage_counter.sql

CREATE POLICY "ai_usage_daily_insert_own"
  ON public.ai_usage_daily
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_usage_daily_update_own"
  ON public.ai_usage_daily
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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
SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_usage_date date := CURRENT_DATE;
  v_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
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

GRANT EXECUTE ON FUNCTION public.consume_daily_ai_usage(text, integer) TO PUBLIC, anon, authenticated;
