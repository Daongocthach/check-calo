-- Expand-only: per-network and app-wide daily AI counters plus one RPC that checks every
-- limit at once. Anyone can create anonymous users, so the per-user quota alone can be
-- dodged by signing in again; these counters cap guests per network and per day.
-- consume_daily_ai_usage() stays so a rollback of the Edge Function keeps working, and
-- both functions count against the same ai_usage_daily rows.

CREATE TABLE IF NOT EXISTS public.ai_usage_ip_daily (
  ip_hash text NOT NULL,
  usage_date date NOT NULL,
  usage_count integer NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ip_hash, usage_date)
);

CREATE TABLE IF NOT EXISTS public.ai_usage_global_daily (
  usage_date date NOT NULL,
  bucket text NOT NULL CHECK (bucket IN ('all', 'guest')),
  usage_count integer NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usage_date, bucket)
);

-- Only the Edge Function (service role) touches these counters.
ALTER TABLE public.ai_usage_ip_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_global_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_usage_ip_daily FROM anon, authenticated;
REVOKE ALL ON TABLE public.ai_usage_global_daily FROM anon, authenticated;

-- Counts one AI call only when every limit still has room, so a call rejected by one
-- limit does not use up another. A NULL p_ip_hash skips the network limit.
CREATE OR REPLACE FUNCTION public.consume_ai_quota(
  p_user_id uuid,
  p_purpose text,
  p_is_guest boolean,
  p_user_limit integer,
  p_ip_hash text,
  p_ip_limit integer,
  p_guest_total_limit integer,
  p_total_limit integer
)
RETURNS TABLE (
  allowed boolean,
  blocked_by text,
  usage_count integer,
  remaining integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_usage_date date := CURRENT_DATE;
  v_check_ip boolean := p_is_guest AND p_ip_hash IS NOT NULL;
  v_total integer;
  v_guest_total integer;
  v_ip integer;
  v_user integer;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_purpose IS NULL OR p_purpose NOT IN ('food_photo', 'home_review') THEN
    RAISE EXCEPTION 'Invalid AI usage purpose' USING ERRCODE = '22023';
  END IF;

  IF p_is_guest IS NULL
    OR p_user_limit IS NULL OR p_user_limit < 1
    OR p_ip_limit IS NULL OR p_ip_limit < 1
    OR p_guest_total_limit IS NULL OR p_guest_total_limit < 1
    OR p_total_limit IS NULL OR p_total_limit < 1 THEN
    RAISE EXCEPTION 'Invalid AI usage limit' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.ai_usage_global_daily (usage_date, bucket)
  VALUES (v_usage_date, 'all'), (v_usage_date, 'guest')
  ON CONFLICT DO NOTHING;

  IF v_check_ip THEN
    INSERT INTO public.ai_usage_ip_daily (ip_hash, usage_date)
    VALUES (p_ip_hash, v_usage_date)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.ai_usage_daily (user_id, usage_date, purpose, usage_count)
  VALUES (p_user_id, v_usage_date, p_purpose, 0)
  ON CONFLICT (user_id, usage_date, purpose) DO NOTHING;

  -- Lock rows in one fixed order (app-wide, guests, network, user) so concurrent calls
  -- cannot deadlock.
  SELECT g.usage_count INTO v_total
  FROM public.ai_usage_global_daily AS g
  WHERE g.usage_date = v_usage_date AND g.bucket = 'all'
  FOR UPDATE;

  IF p_is_guest THEN
    SELECT g.usage_count INTO v_guest_total
    FROM public.ai_usage_global_daily AS g
    WHERE g.usage_date = v_usage_date AND g.bucket = 'guest'
    FOR UPDATE;
  END IF;

  IF v_check_ip THEN
    SELECT i.usage_count INTO v_ip
    FROM public.ai_usage_ip_daily AS i
    WHERE i.ip_hash = p_ip_hash AND i.usage_date = v_usage_date
    FOR UPDATE;
  END IF;

  SELECT u.usage_count INTO v_user
  FROM public.ai_usage_daily AS u
  WHERE u.user_id = p_user_id AND u.usage_date = v_usage_date AND u.purpose = p_purpose
  FOR UPDATE;

  -- Report the most specific limit first so the app can tell the user what ran out.
  blocked_by := CASE
    WHEN v_user >= p_user_limit THEN 'user'
    WHEN v_check_ip AND v_ip >= p_ip_limit THEN 'ip'
    WHEN p_is_guest AND v_guest_total >= p_guest_total_limit THEN 'guest_total'
    WHEN v_total >= p_total_limit THEN 'total'
  END;

  IF blocked_by IS NOT NULL THEN
    allowed := false;
    usage_count := v_user;
    remaining := GREATEST(p_user_limit - v_user, 0);
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.ai_usage_global_daily AS g
  SET usage_count = g.usage_count + 1, updated_at = now()
  WHERE g.usage_date = v_usage_date
    AND (g.bucket = 'all' OR (p_is_guest AND g.bucket = 'guest'));

  IF v_check_ip THEN
    UPDATE public.ai_usage_ip_daily AS i
    SET usage_count = i.usage_count + 1, updated_at = now()
    WHERE i.ip_hash = p_ip_hash AND i.usage_date = v_usage_date;
  END IF;

  UPDATE public.ai_usage_daily AS u
  SET usage_count = u.usage_count + 1, updated_at = now()
  WHERE u.user_id = p_user_id AND u.usage_date = v_usage_date AND u.purpose = p_purpose;

  allowed := true;
  usage_count := v_user + 1;
  remaining := GREATEST(p_user_limit - v_user - 1, 0);
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_quota(uuid, text, boolean, integer, text, integer, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(uuid, text, boolean, integer, text, integer, integer, integer)
  TO service_role;
