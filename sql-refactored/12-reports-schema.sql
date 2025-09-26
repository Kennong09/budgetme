-- =====================================================
-- CLEANUP: DROP EXISTING OBJECTS
-- =====================================================

-- Drop functions first
DO $$ 
BEGIN
    DROP FUNCTION IF EXISTS public.refresh_financial_reports();
    DROP FUNCTION IF EXISTS public.get_user_financial_report(UUID, INTEGER);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop views and materialized views
DROP VIEW IF EXISTS public.spending_insights CASCADE;
DROP VIEW IF EXISTS public.family_financial_overview CASCADE;
DROP VIEW IF EXISTS public.goal_progress_tracking CASCADE;
DROP VIEW IF EXISTS public.budget_performance_analysis CASCADE;
DROP VIEW IF EXISTS public.monthly_transaction_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.user_financial_summary CASCADE;

-- Drop indexes for materialized views
DROP INDEX IF EXISTS public.idx_user_financial_summary_user_id;

-- =====================================================
-- 09-REPORTS-SCHEMA.SQL
-- =====================================================
-- Module: Reports and Analytics System
-- Purpose: Financial reporting, analytics, and data visualization support
-- Dependencies: All core modules (auth, transactions, budgets, goals, families)
-- Backend Service: Multiple services (reporting functions)
-- Frontend Components: src/components/reports/
-- =====================================================
-- Version: 1.0.0
-- Created: 2025-09-20
-- Compatible with: Reporting components, analytics dashboard
-- =====================================================

-- =====================================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- =====================================================

-- User financial summary materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS public.user_financial_summary AS
SELECT
    p.id as user_id,
    p.email,
    p.full_name,
    
    -- Account totals
    COALESCE(SUM(CASE WHEN a.account_type IN ('checking', 'savings') THEN a.balance END), 0) as total_liquid_assets,
    COALESCE(SUM(CASE WHEN a.account_type = 'investment' THEN a.balance END), 0) as total_investments,
    COALESCE(SUM(CASE WHEN a.account_type = 'credit' THEN ABS(a.balance) END), 0) as total_debt,
    COALESCE(SUM(a.balance), 0) as net_worth,
    
    -- Transaction summaries (last 30 days)
    COALESCE((
        SELECT SUM(t.amount) 
        FROM public.transactions t 
        WHERE t.user_id = p.id AND t.type = 'income' 
        AND t.date > CURRENT_DATE - INTERVAL '30 days'
    ), 0) as income_30d,
    
    COALESCE((
        SELECT SUM(t.amount) 
        FROM public.transactions t 
        WHERE t.user_id = p.id AND t.type = 'expense' 
        AND t.date > CURRENT_DATE - INTERVAL '30 days'
    ), 0) as expenses_30d,
    
    -- Budget performance
    COALESCE((
        SELECT COUNT(*) 
        FROM public.budgets b 
        WHERE b.user_id = p.id AND b.status = 'active'
    ), 0) as active_budgets,
    
    COALESCE((
        SELECT COUNT(*) 
        FROM public.budgets b 
        WHERE b.user_id = p.id AND b.spent >= b.amount
    ), 0) as exceeded_budgets,
    
    -- Goal progress
    COALESCE((
        SELECT COUNT(*) 
        FROM public.goals g 
        WHERE g.user_id = p.id AND g.status = 'in_progress'
    ), 0) as active_goals,
    
    COALESCE((
        SELECT COUNT(*) 
        FROM public.goals g 
        WHERE g.user_id = p.id AND g.status = 'completed'
    ), 0) as completed_goals,
    
    -- Last activity
    GREATEST(
        COALESCE((SELECT MAX(created_at) FROM public.transactions WHERE user_id = p.id), '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(updated_at) FROM public.budgets WHERE user_id = p.id), '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(updated_at) FROM public.goals WHERE user_id = p.id), '1970-01-01'::timestamptz)
    ) as last_activity,
    
    -- Summary timestamp
    now() as summary_generated_at

FROM public.profiles p
LEFT JOIN public.accounts a ON p.id = a.user_id AND a.status = 'active'
GROUP BY p.id, p.email, p.full_name;

-- Create unique index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_financial_summary_user_id 
ON public.user_financial_summary(user_id);

-- =====================================================
-- MONTHLY TRANSACTION SUMMARY VIEW
-- =====================================================

CREATE OR REPLACE VIEW public.monthly_transaction_summary AS
WITH monthly_data AS (
    SELECT
        user_id,
        DATE_TRUNC('month', date) as month,
        
        -- Transaction counts
        COUNT(*) as total_transactions,
        COUNT(*) FILTER (WHERE type = 'income') as income_transactions,
        COUNT(*) FILTER (WHERE type = 'expense') as expense_transactions,
        COUNT(*) FILTER (WHERE type = 'transfer') as transfer_transactions,
        
        -- Transaction amounts
        COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) as total_income,
        COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) as total_expenses,
        COALESCE(SUM(amount) FILTER (WHERE type = 'transfer'), 0) as total_transfers
        
    FROM public.transactions
    WHERE date >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY user_id, DATE_TRUNC('month', date)
),
monthly_categories AS (
    SELECT
        md.user_id,
        md.month,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'category', ec.category_name,
                    'amount', category_sum.amount,
                    'percentage', ROUND((category_sum.amount / NULLIF(md.total_expenses, 0)) * 100, 2)
                ) ORDER BY category_sum.amount DESC
            )
            FROM (
                SELECT t2.expense_category_id, SUM(t2.amount) as amount
                FROM public.transactions t2
                WHERE t2.user_id = md.user_id
                AND DATE_TRUNC('month', t2.date) = md.month
                AND t2.type = 'expense'
                AND t2.expense_category_id IS NOT NULL
                GROUP BY t2.expense_category_id
                ORDER BY SUM(t2.amount) DESC
                LIMIT 5
            ) category_sum
            JOIN public.expense_categories ec ON category_sum.expense_category_id = ec.id
        ) as top_expense_categories
    FROM monthly_data md
)
SELECT
    md.user_id,
    md.month,
    md.total_transactions,
    md.income_transactions,
    md.expense_transactions,
    md.transfer_transactions,
    md.total_income,
    md.total_expenses,
    md.total_transfers,
    
    -- Net flow
    md.total_income - md.total_expenses as net_flow,
    
    -- Category breakdown
    mc.top_expense_categories
    
FROM monthly_data md
LEFT JOIN monthly_categories mc ON md.user_id = mc.user_id AND md.month = mc.month
ORDER BY md.user_id, md.month DESC;

-- =====================================================
-- BUDGET PERFORMANCE ANALYSIS VIEW
-- =====================================================

CREATE OR REPLACE VIEW public.budget_performance_analysis AS
SELECT
    b.user_id,
    b.id as budget_id,
    b.budget_name,
    b.period,
    b.start_date,
    b.end_date,
    b.amount as budgeted_amount,
    b.spent as actual_spent,
    
    -- Performance metrics
    CASE 
        WHEN b.amount > 0 THEN ROUND((b.spent / b.amount) * 100, 2)
        ELSE 0 
    END as usage_percentage,
    
    b.amount - b.spent as remaining_amount,
    
    -- Status assessment
    CASE
        WHEN b.spent > b.amount THEN 'over_budget'
        WHEN b.spent >= (b.amount * 0.9) THEN 'near_limit'
        WHEN b.spent >= (b.amount * 0.5) THEN 'on_track'
        ELSE 'under_used'
    END as performance_status,
    
    -- Time analysis
    CASE
        WHEN b.end_date < CURRENT_DATE THEN 'expired'
        WHEN b.start_date > CURRENT_DATE THEN 'future'
        ELSE 'active'
    END as time_status,
    
    -- Days into period
    CASE
        WHEN CURRENT_DATE BETWEEN b.start_date AND b.end_date THEN
            CURRENT_DATE - b.start_date
        ELSE NULL
    END as days_elapsed,
    
    -- Total period days
    b.end_date - b.start_date + 1 as total_period_days,
    
    -- Expected vs actual spending rate
    CASE
        WHEN CURRENT_DATE BETWEEN b.start_date AND b.end_date AND (b.end_date - b.start_date + 1) > 0 THEN
            ROUND(
                (b.amount * (CURRENT_DATE - b.start_date + 1)::numeric / (b.end_date - b.start_date + 1)::numeric) - b.spent,
                2
            )
        ELSE NULL
    END as spending_variance,
    
    -- Category information
    ec.category_name,
    ec.icon as category_icon,
    
    -- Recent transaction count
    (
        SELECT COUNT(*)
        FROM public.transactions t
        WHERE t.user_id = b.user_id
        AND t.expense_category_id = b.category_id
        AND t.date BETWEEN b.start_date AND LEAST(b.end_date, CURRENT_DATE)
        AND t.type = 'expense'
    ) as transaction_count

FROM public.budgets b
LEFT JOIN public.expense_categories ec ON b.category_id = ec.id
WHERE b.status = 'active';

-- =====================================================
-- GOAL PROGRESS TRACKING VIEW
-- =====================================================

CREATE OR REPLACE VIEW public.goal_progress_tracking AS
SELECT
    g.user_id,
    g.id as goal_id,
    g.goal_name,
    g.target_amount,
    g.current_amount,
    g.target_date,
    g.priority,
    g.status,
    
    -- Progress metrics
    ROUND((g.current_amount / NULLIF(g.target_amount, 0)) * 100, 2) as completion_percentage,
    g.target_amount - g.current_amount as remaining_amount,
    
    -- Time analysis
    CASE
        WHEN g.target_date IS NULL THEN NULL
        WHEN g.target_date < CURRENT_DATE AND g.status != 'completed' THEN 'overdue'
        WHEN g.target_date - CURRENT_DATE <= 30 THEN 'due_soon'
        WHEN g.target_date - CURRENT_DATE <= 90 THEN 'approaching'
        ELSE 'on_schedule'
    END as time_status,
    
    CASE
        WHEN g.target_date IS NOT NULL THEN g.target_date - CURRENT_DATE
        ELSE NULL
    END as days_remaining,
    
    -- Contribution analysis
    (
        SELECT COUNT(*)
        FROM public.goal_contributions gc
        WHERE gc.goal_id = g.id
    ) as total_contributions,
    
    (
        SELECT COUNT(DISTINCT gc.user_id)
        FROM public.goal_contributions gc
        WHERE gc.goal_id = g.id
    ) as unique_contributors,
    
    (
        SELECT MAX(gc.contribution_date)
        FROM public.goal_contributions gc
        WHERE gc.goal_id = g.id
    ) as last_contribution_date,
    
    -- Monthly contribution rate (last 3 months)
    (
        SELECT COALESCE(AVG(monthly_contrib.amount), 0)
        FROM (
            SELECT 
                DATE_TRUNC('month', gc.contribution_date) as month,
                SUM(gc.amount) as amount
            FROM public.goal_contributions gc
            WHERE gc.goal_id = g.id
            AND gc.contribution_date >= CURRENT_DATE - INTERVAL '3 months'
            GROUP BY DATE_TRUNC('month', gc.contribution_date)
        ) monthly_contrib
    ) as avg_monthly_contribution,
    
    -- Projected completion
    CASE
        WHEN g.status = 'completed' THEN 'completed'
        WHEN g.target_date IS NULL THEN 'no_target_date'
        ELSE
            CASE
                WHEN (
                    SELECT COALESCE(AVG(monthly_contrib.amount), 0)
                    FROM (
                        SELECT SUM(gc.amount) as amount
                        FROM public.goal_contributions gc
                        WHERE gc.goal_id = g.id
                        AND gc.contribution_date >= CURRENT_DATE - INTERVAL '3 months'
                        GROUP BY DATE_TRUNC('month', gc.contribution_date)
                    ) monthly_contrib
                ) > 0 THEN
                    CASE
                        WHEN CEIL((g.target_amount - g.current_amount) / NULLIF((
                            SELECT COALESCE(AVG(monthly_contrib.amount), 0)
                            FROM (
                                SELECT SUM(gc.amount) as amount
                                FROM public.goal_contributions gc
                                WHERE gc.goal_id = g.id
                                AND gc.contribution_date >= CURRENT_DATE - INTERVAL '3 months'
                                GROUP BY DATE_TRUNC('month', gc.contribution_date)
                            ) monthly_contrib
                        ), 0)) <= (g.target_date - CURRENT_DATE) / 30.0 THEN 'on_track'
                        ELSE 'behind_schedule'
                    END
                ELSE 'insufficient_data'
            END
    END as projection_status,
    
    -- Family goal indicator
    g.is_family_goal,
    f.family_name

FROM public.goals g
LEFT JOIN public.families f ON g.family_id = f.id;

-- =====================================================
-- FAMILY FINANCIAL OVERVIEW VIEW
-- =====================================================

CREATE OR REPLACE VIEW public.family_financial_overview AS
SELECT
    f.id as family_id,
    f.family_name,
    f.currency_pref,
    
    -- Member information
    COUNT(DISTINCT fm.user_id) FILTER (WHERE fm.status = 'active') as active_members,
    
    -- Aggregate financial data
    COALESCE(SUM(
        CASE WHEN a.account_type IN ('checking', 'savings') 
        THEN a.balance ELSE 0 END
    ), 0) as total_family_liquid_assets,
    
    COALESCE(SUM(
        CASE WHEN a.account_type = 'investment' 
        THEN a.balance ELSE 0 END
    ), 0) as total_family_investments,
    
    -- Family goals
    COUNT(DISTINCT g.id) FILTER (WHERE g.is_family_goal = true AND g.status = 'in_progress') as active_family_goals,
    COALESCE(SUM(g.target_amount) FILTER (WHERE g.is_family_goal = true AND g.status = 'in_progress'), 0) as total_family_goal_targets,
    COALESCE(SUM(g.current_amount) FILTER (WHERE g.is_family_goal = true AND g.status = 'in_progress'), 0) as total_family_goal_progress,
    
    -- Recent activity
    (
        SELECT COUNT(*)
        FROM public.transactions t
        JOIN public.family_members fm2 ON t.user_id = fm2.user_id
        WHERE fm2.family_id = f.id
        AND fm2.status = 'active'
        AND t.created_at > CURRENT_DATE - INTERVAL '7 days'
    ) as transactions_last_week,
    
    -- Top contributors to family goals
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'user_name', p.full_name,
                'contribution_amount', contrib_summary.amount
            ) ORDER BY contrib_summary.amount DESC
        )
        FROM (
            SELECT 
                gc.user_id,
                SUM(gc.amount) as amount
            FROM public.goal_contributions gc
            JOIN public.goals g_inner ON gc.goal_id = g_inner.id
            WHERE g_inner.family_id = f.id
            AND g_inner.is_family_goal = true
            AND gc.contribution_date > CURRENT_DATE - INTERVAL '30 days'
            GROUP BY gc.user_id
            ORDER BY SUM(gc.amount) DESC
            LIMIT 5
        ) contrib_summary
        JOIN public.profiles p ON contrib_summary.user_id = p.id
    ) as top_contributors_30d

FROM public.families f
JOIN public.family_members fm ON f.id = fm.family_id AND fm.status = 'active'
LEFT JOIN public.accounts a ON fm.user_id = a.user_id AND a.status = 'active'
LEFT JOIN public.goals g ON f.id = g.family_id
GROUP BY f.id, f.family_name, f.currency_pref;

-- =====================================================
-- SPENDING INSIGHTS VIEW
-- =====================================================

CREATE OR REPLACE VIEW public.spending_insights AS
SELECT
    grouped_data.user_id,
    grouped_data.month,
    grouped_data.category_name,
    grouped_data.category_icon,
    
    -- Category spending
    grouped_data.total_spent,
    grouped_data.transaction_count,
    grouped_data.avg_transaction_amount,
    
    -- Month-over-month comparison
    LAG(grouped_data.total_spent) OVER (
        PARTITION BY grouped_data.user_id, grouped_data.category_name 
        ORDER BY grouped_data.month
    ) as previous_month_spent,
    
    -- Calculate percentage change
    CASE 
        WHEN LAG(grouped_data.total_spent) OVER (
            PARTITION BY grouped_data.user_id, grouped_data.category_name 
            ORDER BY grouped_data.month
        ) > 0 THEN
            ROUND(
                ((grouped_data.total_spent - LAG(grouped_data.total_spent) OVER (
                    PARTITION BY grouped_data.user_id, grouped_data.category_name 
                    ORDER BY grouped_data.month
                )) / LAG(grouped_data.total_spent) OVER (
                    PARTITION BY grouped_data.user_id, grouped_data.category_name 
                    ORDER BY grouped_data.month
                )) * 100,
                2
            )
        ELSE NULL
    END as month_over_month_change_pct,
    
    -- Budget comparison
    (
        SELECT b.amount
        FROM public.budgets b
        WHERE b.user_id = grouped_data.user_id
        AND b.category_id = grouped_data.expense_category_id
        AND grouped_data.month BETWEEN DATE_TRUNC('month', b.start_date) AND DATE_TRUNC('month', b.end_date)
        AND b.status = 'active'
        LIMIT 1
    ) as budgeted_amount,
    
    -- Percentage of total monthly spending
    ROUND(
        (grouped_data.total_spent / NULLIF((
            SELECT SUM(t2.amount)
            FROM public.transactions t2
            WHERE t2.user_id = grouped_data.user_id
            AND t2.type = 'expense'
            AND DATE_TRUNC('month', t2.date) = grouped_data.month
        ), 0)) * 100,
        2
    ) as percentage_of_monthly_spending

FROM (
    SELECT
        t.user_id,
        DATE_TRUNC('month', t.date) as month,
        ec.category_name,
        ec.icon as category_icon,
        t.expense_category_id,
        
        -- Category spending
        SUM(t.amount) as total_spent,
        COUNT(t.id) as transaction_count,
        AVG(t.amount) as avg_transaction_amount
        
    FROM public.transactions t
    JOIN public.expense_categories ec ON t.expense_category_id = ec.id
    WHERE t.type = 'expense'
    AND t.date >= CURRENT_DATE - INTERVAL '6 months'
    GROUP BY t.user_id, DATE_TRUNC('month', t.date), ec.category_name, ec.icon, t.expense_category_id
) grouped_data
ORDER BY grouped_data.user_id, grouped_data.month DESC, grouped_data.total_spent DESC;

-- =====================================================
-- REFRESH FUNCTIONS
-- =====================================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION public.refresh_financial_reports()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_financial_summary;
EXCEPTION
    WHEN OTHERS THEN
        -- Fallback to non-concurrent refresh
        REFRESH MATERIALIZED VIEW public.user_financial_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's financial report
CREATE OR REPLACE FUNCTION public.get_user_financial_report(
    p_user_id UUID,
    p_months_back INTEGER DEFAULT 6
)
RETURNS JSONB AS $$
DECLARE
    v_report JSONB;
    v_summary RECORD;
    v_monthly_data JSONB;
    v_budget_data JSONB;
    v_goals_data JSONB;
BEGIN
    -- Get user summary
    SELECT * INTO v_summary 
    FROM public.user_financial_summary 
    WHERE user_id = p_user_id;
    
    -- Get monthly transaction data
    SELECT jsonb_agg(
        jsonb_build_object(
            'month', month,
            'total_income', total_income,
            'total_expenses', total_expenses,
            'net_flow', net_flow,
            'top_categories', top_expense_categories
        ) ORDER BY month DESC
    ) INTO v_monthly_data
    FROM public.monthly_transaction_summary
    WHERE user_id = p_user_id
    AND month >= DATE_TRUNC('month', CURRENT_DATE - (p_months_back || ' months')::INTERVAL);
    
    -- Get budget performance
    SELECT jsonb_agg(
        jsonb_build_object(
            'budget_name', budget_name,
            'budgeted_amount', budgeted_amount,
            'actual_spent', actual_spent,
            'usage_percentage', usage_percentage,
            'performance_status', performance_status
        )
    ) INTO v_budget_data
    FROM public.budget_performance_analysis
    WHERE user_id = p_user_id
    AND time_status = 'active';
    
    -- Get goals progress
    SELECT jsonb_agg(
        jsonb_build_object(
            'goal_name', goal_name,
            'target_amount', target_amount,
            'current_amount', current_amount,
            'completion_percentage', completion_percentage,
            'time_status', time_status
        )
    ) INTO v_goals_data
    FROM public.goal_progress_tracking
    WHERE user_id = p_user_id
    AND status IN ('in_progress', 'not_started');
    
    -- Compile comprehensive report
    v_report := jsonb_build_object(
        'user_id', p_user_id,
        'generated_at', now(),
        'summary', jsonb_build_object(
            'net_worth', COALESCE(v_summary.net_worth, 0),
            'liquid_assets', COALESCE(v_summary.total_liquid_assets, 0),
            'total_debt', COALESCE(v_summary.total_debt, 0),
            'monthly_income', COALESCE(v_summary.income_30d, 0),
            'monthly_expenses', COALESCE(v_summary.expenses_30d, 0),
            'active_budgets', COALESCE(v_summary.active_budgets, 0),
            'active_goals', COALESCE(v_summary.active_goals, 0)
        ),
        'monthly_trends', COALESCE(v_monthly_data, '[]'::jsonb),
        'budget_performance', COALESCE(v_budget_data, '[]'::jsonb),
        'goal_progress', COALESCE(v_goals_data, '[]'::jsonb)
    );
    
    RETURN v_report;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT ON public.user_financial_summary TO authenticated;
GRANT SELECT ON public.monthly_transaction_summary TO authenticated;
GRANT SELECT ON public.budget_performance_analysis TO authenticated;
GRANT SELECT ON public.goal_progress_tracking TO authenticated;
GRANT SELECT ON public.family_financial_overview TO authenticated;
GRANT SELECT ON public.spending_insights TO authenticated;

GRANT EXECUTE ON FUNCTION public.refresh_financial_reports() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_financial_report(UUID, INTEGER) TO authenticated;

-- =====================================================
-- SCHEDULED REFRESH (CRON JOB PLACEHOLDER)
-- =====================================================

/*
-- Set up scheduled refresh of materialized views
-- This would typically be done with pg_cron or external scheduler

-- Daily refresh at 2 AM
SELECT cron.schedule('refresh-financial-reports', '0 2 * * *', 'SELECT public.refresh_financial_reports();');

-- Alternative: Use application-level scheduling
*/

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON MATERIALIZED VIEW public.user_financial_summary IS 'Aggregated financial summary for all users with periodic refresh';
COMMENT ON VIEW public.monthly_transaction_summary IS 'Monthly transaction summaries with category breakdowns';
COMMENT ON VIEW public.budget_performance_analysis IS 'Budget performance metrics and variance analysis';
COMMENT ON VIEW public.goal_progress_tracking IS 'Goal progress tracking with time and contribution analysis';
COMMENT ON VIEW public.family_financial_overview IS 'Family-level financial aggregations and activity';
COMMENT ON VIEW public.spending_insights IS 'Spending pattern analysis with month-over-month comparisons';

COMMENT ON FUNCTION public.get_user_financial_report(UUID, INTEGER) IS 'Generate comprehensive financial report for user';

-- =====================================================
-- END OF REPORTS SCHEMA MODULE
-- =====================================================