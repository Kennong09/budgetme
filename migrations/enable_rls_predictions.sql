-- Enable Row Level Security on prediction tables
-- Run this migration to enable RLS on prediction-related tables

-- Enable RLS on prophet_predictions table
ALTER TABLE public.prophet_predictions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on ai_insights table
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- Enable RLS on prediction_requests table
ALTER TABLE public.prediction_requests ENABLE ROW LEVEL SECURITY;

-- Update table comments
COMMENT ON TABLE public.prophet_predictions IS 'Prophet model prediction results with RLS enabled';
COMMENT ON TABLE public.ai_insights IS 'AI-generated insights with RLS enabled';
COMMENT ON TABLE public.prediction_requests IS 'Prediction API request logs with RLS enabled';

-- Verify RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = pt.tablename) as policy_count
FROM pg_tables pt
WHERE schemaname = 'public' 
    AND tablename IN ('prophet_predictions', 'ai_insights', 'prediction_requests')
ORDER BY tablename;

