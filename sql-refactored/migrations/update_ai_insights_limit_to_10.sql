-- =====================================================
-- MIGRATION: Update AI Insights Daily Limit from 5 to 10
-- =====================================================
-- Purpose: Increase AI insights usage limit to match prophet predictions limit
-- Date: 2025-01-18
-- =====================================================

-- Update existing users' AI insights limit to 10
UPDATE public.prediction_usage_limits
SET ai_insights_daily_limit = 10
WHERE ai_insights_daily_limit = 5;

-- Verify the update
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE ai_insights_daily_limit = 10) as users_with_limit_10,
    COUNT(*) FILTER (WHERE ai_insights_daily_limit = 5) as users_with_limit_5
FROM public.prediction_usage_limits;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
