-- =====================================================
-- ADMIN REPORTS SQL VIEWS AND FUNCTIONS
-- =====================================================
-- This file contains SQL views and functions to support
-- the admin reports functionality with real-time analytics

-- =====================================================
-- SYSTEM ACTIVITY ANALYTICS VIEW
-- =====================================================

CREATE OR REPLACE VIEW admin_system_activity_summary AS
SELECT 
    activity_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as count_today,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as count_week,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as count_month,
    COUNT(CASE WHEN severity IN ('error', 'critical') THEN 1 END) as error_count,
    MAX(created_at) as last_occurrence
FROM system_activity_log
GROUP BY activity_type
ORDER BY count_today DESC, total_count DESC;

-- =====================================================
-- USER ENGAGEMENT ANALYTICS VIEW
-- =====================================================

CREATE OR REPLACE VIEW admin_user_engagement AS
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as new_users_today,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_users_week,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_month,
    COUNT(CASE WHEN last_login >= NOW() - INTERVAL '24 hours' THEN 1 END) as active_users_today,
    COUNT(CASE WHEN last_login >= NOW() - INTERVAL '7 days' THEN 1 END) as active_users_week,
    COUNT(CASE WHEN last_login >= NOW() - INTERVAL '30 days' THEN 1 END) as active_users_month,
    COUNT(CASE WHEN email_verified = true THEN 1 END) as verified_users,
    COUNT(CASE WHEN account_setup_completed = true THEN 1 END) as setup_completed_users
FROM profiles;

-- =====================================================
-- FINANCIAL SYSTEM HEALTH VIEW  
-- =====================================================

CREATE OR REPLACE VIEW admin_financial_health AS
SELECT 
    -- Transaction statistics
    (SELECT COUNT(*) FROM transactions) as total_transactions,
    (SELECT COUNT(*) FROM transactions WHERE created_at >= NOW() - INTERVAL '24 hours') as transactions_today,
    (SELECT COUNT(*) FROM transactions WHERE created_at >= NOW() - INTERVAL '7 days') as transactions_week,
    (SELECT COUNT(*) FROM transactions WHERE created_at >= NOW() - INTERVAL '30 days') as transactions_month,
    
    -- Transaction amounts
    (SELECT COALESCE(AVG(amount), 0) FROM transactions) as avg_transaction_amount,
    (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'income') as total_income,
    (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'expense') as total_expenses,
    
    -- Budget statistics
    (SELECT COUNT(*) FROM budgets WHERE status = 'active') as active_budgets,
    (SELECT COUNT(*) FROM budgets) as total_budgets,
    (SELECT COALESCE(AVG(amount), 0) FROM budgets WHERE status = 'active') as avg_budget_amount,
    
    -- Goal statistics
    (SELECT COUNT(*) FROM goals WHERE status = 'in_progress') as active_goals,
    (SELECT COUNT(*) FROM goals WHERE status = 'completed') as completed_goals,
    (SELECT COUNT(*) FROM goals) as total_goals,
    (SELECT COALESCE(AVG(target_amount), 0) FROM goals WHERE status = 'in_progress') as avg_goal_amount,
    
    -- Family statistics
    (SELECT COUNT(*) FROM families WHERE status = 'active') as active_families,
    (SELECT COUNT(*) FROM family_members WHERE status = 'active') as total_family_members,
    
    -- Account statistics
    (SELECT COUNT(*) FROM accounts WHERE status = 'active') as active_accounts,
    (SELECT COALESCE(SUM(balance), 0) FROM accounts WHERE status = 'active') as total_balance;

-- =====================================================
-- AI/ML ANALYTICS VIEW
-- =====================================================

CREATE OR REPLACE VIEW admin_aiml_analytics AS
SELECT 
    -- Prediction statistics
    (SELECT COUNT(*) FROM prophet_predictions) as total_predictions,
    (SELECT COUNT(*) FROM prophet_predictions WHERE generated_at >= NOW() - INTERVAL '24 hours') as predictions_today,
    (SELECT COUNT(*) FROM prophet_predictions WHERE generated_at >= NOW() - INTERVAL '7 days') as predictions_week,
    (SELECT COUNT(*) FROM prophet_predictions WHERE generated_at >= NOW() - INTERVAL '30 days') as predictions_month,
    (SELECT COALESCE(AVG(confidence_score), 0) FROM prophet_predictions) as avg_prediction_confidence,
    
    -- AI Insights statistics
    (SELECT COUNT(*) FROM ai_insights) as total_insights,
    (SELECT COUNT(*) FROM ai_insights WHERE generated_at >= NOW() - INTERVAL '24 hours') as insights_today,
    (SELECT COUNT(*) FROM ai_insights WHERE generated_at >= NOW() - INTERVAL '7 days') as insights_week,
    (SELECT COUNT(*) FROM ai_insights WHERE generated_at >= NOW() - INTERVAL '30 days') as insights_month,
    (SELECT COALESCE(AVG(confidence_level), 0) FROM ai_insights) as avg_insights_confidence,
    
    -- Usage limits and rate limiting
    (SELECT COUNT(*) FROM prediction_usage_limits) as users_with_limits,
    (SELECT COALESCE(AVG(prophet_daily_count), 0) FROM prediction_usage_limits) as avg_daily_predictions,
    (SELECT COALESCE(AVG(ai_insights_daily_count), 0) FROM prediction_usage_limits) as avg_daily_insights;

-- =====================================================
-- CHATBOT ANALYTICS VIEW
-- =====================================================

CREATE OR REPLACE VIEW admin_chatbot_analytics AS
SELECT 
    -- Session statistics
    (SELECT COUNT(*) FROM chat_sessions) as total_sessions,
    (SELECT COUNT(*) FROM chat_sessions WHERE is_active = true) as active_sessions,
    (SELECT COUNT(*) FROM chat_sessions WHERE start_time >= NOW() - INTERVAL '24 hours') as sessions_today,
    (SELECT COUNT(*) FROM chat_sessions WHERE start_time >= NOW() - INTERVAL '7 days') as sessions_week,
    (SELECT COALESCE(AVG(user_satisfaction_rating), 0) FROM chat_sessions WHERE user_satisfaction_rating IS NOT NULL) as avg_satisfaction,
    
    -- Message statistics
    (SELECT COUNT(*) FROM chat_messages) as total_messages,
    (SELECT COUNT(*) FROM chat_messages WHERE created_at >= NOW() - INTERVAL '24 hours') as messages_today,
    (SELECT COUNT(*) FROM chat_messages WHERE created_at >= NOW() - INTERVAL '7 days') as messages_week,
    (SELECT COALESCE(AVG(response_time_ms), 0) FROM chat_messages WHERE response_time_ms IS NOT NULL) as avg_response_time,
    
    -- Content analysis
    (SELECT COUNT(*) FROM chat_messages WHERE contains_financial_data = true) as messages_with_financial_data,
    (SELECT COUNT(*) FROM chat_messages WHERE contains_sensitive_info = true) as messages_with_sensitive_info,
    (SELECT COUNT(*) FROM chat_messages WHERE user_feedback = 'helpful') as helpful_messages,
    (SELECT COUNT(*) FROM chat_messages WHERE user_feedback = 'not_helpful') as not_helpful_messages;

-- =====================================================
-- COMPREHENSIVE ADMIN DASHBOARD ENHANCED VIEW
-- =====================================================

CREATE OR REPLACE VIEW admin_dashboard_enhanced AS
SELECT 
    -- User metrics
    ue.total_users,
    ue.new_users_today,
    ue.new_users_week,
    ue.active_users_today,
    ue.active_users_week,
    ue.verified_users,
    
    -- Financial metrics
    fh.total_transactions,
    fh.transactions_today,
    fh.transactions_week,
    fh.avg_transaction_amount,
    fh.total_income,
    fh.total_expenses,
    fh.active_budgets,
    fh.active_goals,
    
    -- AI/ML metrics
    ai.total_predictions,
    ai.predictions_today,
    ai.total_insights,
    ai.insights_today,
    ai.avg_prediction_confidence,
    
    -- Chatbot metrics
    ca.total_sessions,
    ca.active_sessions,
    ca.total_messages,
    ca.avg_satisfaction,
    
    -- System health indicators
    (SELECT COUNT(*) FROM system_activity_log WHERE severity IN ('error', 'critical') AND created_at >= NOW() - INTERVAL '24 hours') as errors_today,
    (SELECT COUNT(*) FROM system_activity_log WHERE created_at >= NOW() - INTERVAL '24 hours') as activities_today,
    
    -- Calculated metrics
    CASE 
        WHEN fh.total_income > 0 THEN ((fh.total_income - fh.total_expenses) / fh.total_income * 100)
        ELSE 0 
    END as system_savings_rate
    
FROM admin_user_engagement ue
CROSS JOIN admin_financial_health fh
CROSS JOIN admin_aiml_analytics ai
CROSS JOIN admin_chatbot_analytics ca;

-- =====================================================
-- SYSTEM ACTIVITY TRENDS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_system_activity_trends(
    p_days INTEGER DEFAULT 7,
    p_activity_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    activity_date DATE,
    activity_type TEXT,
    activity_count BIGINT,
    error_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(sal.created_at) as activity_date,
        sal.activity_type,
        COUNT(*) as activity_count,
        COUNT(CASE WHEN sal.severity IN ('error', 'critical') THEN 1 END) as error_count
    FROM system_activity_log sal
    WHERE sal.created_at >= NOW() - INTERVAL '1 day' * p_days
        AND (p_activity_type IS NULL OR sal.activity_type = p_activity_type)
    GROUP BY DATE(sal.created_at), sal.activity_type
    ORDER BY activity_date DESC, activity_count DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- USER GROWTH TRENDS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_growth_trends(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    signup_date DATE,
    new_users BIGINT,
    cumulative_users BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH daily_signups AS (
        SELECT 
            DATE(created_at) as signup_date,
            COUNT(*) as new_users
        FROM profiles
        WHERE created_at >= NOW() - INTERVAL '1 day' * p_days
        GROUP BY DATE(created_at)
    ),
    cumulative AS (
        SELECT 
            signup_date,
            new_users,
            SUM(new_users) OVER (ORDER BY signup_date) as cumulative_users
        FROM daily_signups
    )
    SELECT * FROM cumulative
    ORDER BY signup_date DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FINANCIAL TRENDS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_financial_trends(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    transaction_date DATE,
    total_transactions BIGINT,
    total_amount NUMERIC,
    income_amount NUMERIC,
    expense_amount NUMERIC,
    net_amount NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(t.date) as transaction_date,
        COUNT(*) as total_transactions,
        SUM(t.amount) as total_amount,
        SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as income_amount,
        SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as expense_amount,
        SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END) as net_amount
    FROM transactions t
    WHERE t.date >= NOW() - INTERVAL '1 day' * p_days
    GROUP BY DATE(t.date)
    ORDER BY transaction_date DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- AI SERVICE PERFORMANCE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_ai_service_performance(p_days INTEGER DEFAULT 7)
RETURNS TABLE (
    service_name TEXT,
    total_requests BIGINT,
    avg_confidence NUMERIC,
    success_rate NUMERIC,
    avg_generation_time_ms NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ai.ai_service as service_name,
        COUNT(*) as total_requests,
        COALESCE(AVG(ai.confidence_level), 0) as avg_confidence,
        COALESCE(
            COUNT(CASE WHEN ai.processing_status = 'completed' THEN 1 END)::NUMERIC / 
            NULLIF(COUNT(*), 0) * 100, 0
        ) as success_rate,
        COALESCE(AVG(ai.generation_time_ms), 0) as avg_generation_time_ms
    FROM ai_insights ai
    WHERE ai.generated_at >= NOW() - INTERVAL '1 day' * p_days
    GROUP BY ai.ai_service
    ORDER BY total_requests DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TOP USERS BY ACTIVITY FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_top_active_users(p_limit INTEGER DEFAULT 10, p_days INTEGER DEFAULT 7)
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    email TEXT,
    transaction_count BIGINT,
    total_amount NUMERIC,
    last_activity TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.full_name,
        p.email,
        COUNT(t.id) as transaction_count,
        COALESCE(SUM(t.amount), 0) as total_amount,
        MAX(t.created_at) as last_activity
    FROM profiles p
    LEFT JOIN transactions t ON p.id = t.user_id 
        AND t.created_at >= NOW() - INTERVAL '1 day' * p_days
    GROUP BY p.id, p.full_name, p.email
    HAVING COUNT(t.id) > 0
    ORDER BY transaction_count DESC, total_amount DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SYSTEM HEALTH CHECK FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_system_health_status()
RETURNS TABLE (
    metric_name TEXT,
    metric_value NUMERIC,
    status TEXT,
    threshold_value NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH health_metrics AS (
        SELECT 'error_rate_24h' as metric_name,
               (SELECT COUNT(*)::NUMERIC FROM system_activity_log 
                WHERE severity IN ('error', 'critical') 
                AND created_at >= NOW() - INTERVAL '24 hours') as metric_value,
               100.0 as threshold_value
        UNION ALL
        SELECT 'active_user_ratio' as metric_name,
               CASE WHEN (SELECT COUNT(*) FROM profiles) > 0 
                    THEN (SELECT COUNT(*)::NUMERIC FROM profiles WHERE last_login >= NOW() - INTERVAL '7 days') / 
                         (SELECT COUNT(*)::NUMERIC FROM profiles) * 100
                    ELSE 0 
               END as metric_value,
               20.0 as threshold_value
        UNION ALL
        SELECT 'avg_prediction_confidence' as metric_name,
               (SELECT COALESCE(AVG(confidence_score), 0)::NUMERIC FROM prophet_predictions) * 100 as metric_value,
               60.0 as threshold_value
        UNION ALL
        SELECT 'chat_satisfaction' as metric_name,
               (SELECT COALESCE(AVG(user_satisfaction_rating), 0)::NUMERIC FROM chat_sessions 
                WHERE user_satisfaction_rating IS NOT NULL) * 20 as metric_value,
               60.0 as threshold_value
    )
    SELECT 
        hm.metric_name,
        hm.metric_value,
        CASE 
            WHEN hm.metric_name = 'error_rate_24h' AND hm.metric_value < hm.threshold_value THEN 'healthy'
            WHEN hm.metric_name = 'error_rate_24h' AND hm.metric_value >= hm.threshold_value THEN 'critical'
            WHEN hm.metric_value >= hm.threshold_value THEN 'healthy'
            WHEN hm.metric_value >= hm.threshold_value * 0.7 THEN 'warning'
            ELSE 'critical'
        END as status,
        hm.threshold_value
    FROM health_metrics hm;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANT PERMISSIONS FOR ADMIN USERS
-- =====================================================

-- Grant select permissions on views to authenticated users (admin role will be checked in RLS)
GRANT SELECT ON admin_system_activity_summary TO authenticated;
GRANT SELECT ON admin_user_engagement TO authenticated;
GRANT SELECT ON admin_financial_health TO authenticated;
GRANT SELECT ON admin_aiml_analytics TO authenticated;
GRANT SELECT ON admin_chatbot_analytics TO authenticated;
GRANT SELECT ON admin_dashboard_enhanced TO authenticated;

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION get_system_activity_trends(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_growth_trends(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_financial_trends(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ai_service_performance(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_active_users(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_health_status() TO authenticated;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES FOR ADMIN VIEWS
-- =====================================================

-- Enable RLS on admin-specific views (admin role verification will be handled in application layer)
-- These views contain aggregated data and should only be accessible to admin users

-- Comment: RLS policies for views are handled through the underlying table policies
-- Admin access should be verified in the application layer before calling these views

-- =====================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================

-- Indexes to improve admin analytics query performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_activity_log_created_at_type 
ON system_activity_log(created_at, activity_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_activity_log_severity 
ON system_activity_log(severity, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_created_at 
ON profiles(created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_last_login 
ON profiles(last_login);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_created_at_type 
ON transactions(created_at, type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prophet_predictions_generated_at 
ON prophet_predictions(generated_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_insights_generated_at_service 
ON ai_insights(generated_at, ai_service);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_sessions_start_time_active 
ON chat_sessions(start_time, is_active);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_messages_created_at 
ON chat_messages(created_at);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON VIEW admin_system_activity_summary IS 'Provides summary statistics for system activities grouped by type';
COMMENT ON VIEW admin_user_engagement IS 'Provides comprehensive user engagement and growth metrics';
COMMENT ON VIEW admin_financial_health IS 'Provides financial system health and transaction statistics';
COMMENT ON VIEW admin_aiml_analytics IS 'Provides AI/ML service usage and performance metrics';
COMMENT ON VIEW admin_chatbot_analytics IS 'Provides chatbot usage and satisfaction metrics';
COMMENT ON VIEW admin_dashboard_enhanced IS 'Comprehensive admin dashboard with all key metrics';

COMMENT ON FUNCTION get_system_activity_trends(INTEGER, TEXT) IS 'Returns system activity trends over specified days, optionally filtered by activity type';
COMMENT ON FUNCTION get_user_growth_trends(INTEGER) IS 'Returns user growth trends showing daily signups and cumulative users';
COMMENT ON FUNCTION get_financial_trends(INTEGER) IS 'Returns financial transaction trends over specified days';
COMMENT ON FUNCTION get_ai_service_performance(INTEGER) IS 'Returns AI service performance metrics including success rates and response times';
COMMENT ON FUNCTION get_top_active_users(INTEGER, INTEGER) IS 'Returns top users by activity level over specified days';
COMMENT ON FUNCTION get_system_health_status() IS 'Returns system health metrics with status indicators';
