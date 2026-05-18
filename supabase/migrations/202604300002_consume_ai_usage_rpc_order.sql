CREATE OR REPLACE FUNCTION public.consume_ai_usage(
  p_limit integer,
  p_purpose text
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
