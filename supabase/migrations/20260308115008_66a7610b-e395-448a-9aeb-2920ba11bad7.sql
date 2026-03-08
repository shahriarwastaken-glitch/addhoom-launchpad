-- Create upsert function for api_usage_stats
CREATE OR REPLACE FUNCTION public.upsert_api_usage_stats(
  p_service_name text,
  p_stat_date date,
  p_calls_made integer DEFAULT 1,
  p_calls_failed integer DEFAULT 0,
  p_response_ms integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO api_usage_stats (service_name, stat_date, calls_made, calls_failed, avg_response_ms)
  VALUES (p_service_name, p_stat_date, p_calls_made, p_calls_failed, p_response_ms)
  ON CONFLICT (service_name, stat_date) DO UPDATE SET
    calls_made = api_usage_stats.calls_made + EXCLUDED.calls_made,
    calls_failed = api_usage_stats.calls_failed + EXCLUDED.calls_failed,
    avg_response_ms = CASE 
      WHEN api_usage_stats.avg_response_ms IS NULL THEN EXCLUDED.avg_response_ms
      ELSE (api_usage_stats.avg_response_ms + EXCLUDED.avg_response_ms) / 2
    END;
END;
$$;