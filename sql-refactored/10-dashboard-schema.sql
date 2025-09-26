-- =====================================================
-- CLEANUP: DROP EXISTING OBJECTS
-- =====================================================

-- Drop policies first
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own dashboard layouts" ON public.dashboard_layouts;
    DROP POLICY IF EXISTS "Users can view public dashboard templates" ON public.dashboard_layouts;
    DROP POLICY IF EXISTS "Users can view available dashboard widgets" ON public.dashboard_widgets;
    DROP POLICY IF EXISTS "Admins can manage dashboard widgets" ON public.dashboard_widgets;
    DROP POLICY IF EXISTS "Users can manage their own widget instances" ON public.user_widget_instances;
    DROP POLICY IF EXISTS "Users can manage their own widget cache" ON public.widget_data_cache;
    DROP POLICY IF EXISTS "Users can manage their own insights" ON public.dashboard_insights;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop triggers
DO $$ 
BEGIN
    DROP TRIGGER IF EXISTS dashboard_layouts_updated_at ON public.dashboard_layouts;
    DROP TRIGGER IF EXISTS dashboard_widgets_updated_at ON public.dashboard_widgets;
    DROP TRIGGER IF EXISTS user_widget_instances_updated_at ON public.user_widget_instances;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop functions
DO $$ 
BEGIN
    DROP FUNCTION IF EXISTS public.create_default_dashboard(UUID);
    DROP FUNCTION IF EXISTS public.get_widget_data(UUID, TEXT, JSONB);
    DROP FUNCTION IF EXISTS public.invalidate_widget_cache(UUID, TEXT[]);
    DROP FUNCTION IF EXISTS public.cleanup_widget_cache();
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop views
DROP VIEW IF EXISTS public.user_dashboard_overview CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS public.idx_dashboard_layouts_user_id;
DROP INDEX IF EXISTS public.idx_dashboard_layouts_active;
DROP INDEX IF EXISTS public.idx_dashboard_layouts_default;
DROP INDEX IF EXISTS public.idx_dashboard_layouts_public;
DROP INDEX IF EXISTS public.idx_dashboard_widgets_category;
DROP INDEX IF EXISTS public.idx_dashboard_widgets_available;
DROP INDEX IF EXISTS public.idx_dashboard_widgets_subscription;
DROP INDEX IF EXISTS public.idx_user_widget_instances_user_id;
DROP INDEX IF EXISTS public.idx_user_widget_instances_layout_id;
DROP INDEX IF EXISTS public.idx_user_widget_instances_widget_key;
DROP INDEX IF EXISTS public.idx_user_widget_instances_visible;
DROP INDEX IF EXISTS public.idx_widget_data_cache_user_widget;
DROP INDEX IF EXISTS public.idx_widget_data_cache_expires_at;
DROP INDEX IF EXISTS public.idx_widget_data_cache_valid;
DROP INDEX IF EXISTS public.idx_dashboard_insights_user_id;
DROP INDEX IF EXISTS public.idx_dashboard_insights_type;
DROP INDEX IF EXISTS public.idx_dashboard_insights_category;
DROP INDEX IF EXISTS public.idx_dashboard_insights_unread;
DROP INDEX IF EXISTS public.idx_dashboard_insights_priority;
DROP INDEX IF EXISTS public.idx_dashboard_insights_expires_at;

-- Drop tables
DROP TABLE IF EXISTS public.dashboard_insights CASCADE;
DROP TABLE IF EXISTS public.widget_data_cache CASCADE;
DROP TABLE IF EXISTS public.user_widget_instances CASCADE;
DROP TABLE IF EXISTS public.dashboard_widgets CASCADE;
DROP TABLE IF EXISTS public.dashboard_layouts CASCADE;

-- =====================================================
-- 05-DASHBOARD-SCHEMA.SQL
-- =====================================================
-- Module: Dashboard Widgets and Customization System
-- Purpose: User dashboard configuration, widgets, and layout management
-- Dependencies: All core modules (auth, transactions, budgets, goals, reports)
-- Backend Services: Multiple services (dashboard aggregation)
-- Frontend Components: src/components/dashboard/
-- =====================================================
-- Version: 1.0.0
-- Created: 2025-09-20
-- Compatible with: Dashboard components, widget system
-- =====================================================

-- =====================================================
-- DASHBOARD LAYOUTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.dashboard_layouts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Layout identification
    layout_name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Layout configuration
    grid_columns INTEGER DEFAULT 12 CHECK (grid_columns BETWEEN 1 AND 24),
    layout_type TEXT DEFAULT 'responsive' CHECK (layout_type IN ('fixed', 'responsive', 'fluid')),
    
    -- Widget arrangement
    widget_config JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Display settings
    theme_variant TEXT DEFAULT 'default',
    show_borders BOOLEAN DEFAULT true,
    compact_mode BOOLEAN DEFAULT false,
    
    -- Sharing and templates
    is_template BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    template_category TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    last_used_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Constraints
    UNIQUE(user_id, layout_name)
);

-- =====================================================
-- DASHBOARD WIDGETS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.dashboard_widgets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Widget identification
    widget_key TEXT UNIQUE NOT NULL,
    widget_name TEXT NOT NULL,
    widget_category TEXT NOT NULL CHECK (widget_category IN ('financial', 'goals', 'analytics', 'quick_actions', 'insights')),
    
    -- Widget metadata
    description TEXT,
    icon TEXT,
    version TEXT DEFAULT '1.0',
    
    -- Configuration and requirements
    default_config JSONB DEFAULT '{}'::jsonb,
    required_permissions TEXT[] DEFAULT '{}',
    required_features TEXT[] DEFAULT '{}',
    
    -- Display properties
    min_width INTEGER DEFAULT 1 CHECK (min_width > 0),
    min_height INTEGER DEFAULT 1 CHECK (min_height > 0),
    max_width INTEGER,
    max_height INTEGER,
    is_resizable BOOLEAN DEFAULT true,
    
    -- Widget behavior
    refresh_interval_seconds INTEGER DEFAULT 300,
    supports_real_time BOOLEAN DEFAULT false,
    cache_duration_seconds INTEGER DEFAULT 60,
    
    -- Availability
    is_available BOOLEAN DEFAULT true,
    requires_subscription BOOLEAN DEFAULT false,
    availability_conditions JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================================================
-- USER WIDGET INSTANCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_widget_instances (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    layout_id UUID REFERENCES public.dashboard_layouts(id) ON DELETE CASCADE NOT NULL,
    widget_key TEXT REFERENCES public.dashboard_widgets(widget_key) NOT NULL,
    
    -- Position and size
    grid_x INTEGER NOT NULL CHECK (grid_x >= 0),
    grid_y INTEGER NOT NULL CHECK (grid_y >= 0),
    grid_width INTEGER NOT NULL CHECK (grid_width > 0),
    grid_height INTEGER NOT NULL CHECK (grid_height > 0),
    
    -- Widget configuration
    widget_config JSONB DEFAULT '{}'::jsonb,
    display_title TEXT,
    
    -- Behavior settings
    is_visible BOOLEAN DEFAULT true,
    is_locked BOOLEAN DEFAULT false,
    refresh_enabled BOOLEAN DEFAULT true,
    
    -- Analytics and usage
    view_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,
    interaction_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Constraints
    UNIQUE(layout_id, grid_x, grid_y)
);

-- =====================================================
-- WIDGET DATA CACHE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.widget_data_cache (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    widget_key TEXT NOT NULL,
    
    -- Cache identification
    cache_key TEXT NOT NULL,
    
    -- Cached data
    cached_data JSONB NOT NULL,
    data_hash TEXT,
    
    -- Cache metadata
    generated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    hit_count INTEGER DEFAULT 0,
    
    -- Data source tracking
    source_tables TEXT[],
    dependency_hash TEXT,
    
    -- Cache status
    is_valid BOOLEAN DEFAULT true,
    invalidation_reason TEXT,
    
    -- Constraints
    UNIQUE(user_id, widget_key, cache_key)
);

-- =====================================================
-- DASHBOARD INSIGHTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.dashboard_insights (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Insight details
    insight_type TEXT NOT NULL CHECK (insight_type IN ('alert', 'tip', 'milestone', 'trend', 'recommendation')),
    insight_category TEXT NOT NULL CHECK (insight_category IN ('spending', 'saving', 'budgeting', 'goals', 'general')),
    
    -- Content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_text TEXT,
    action_url TEXT,
    
    -- Priority and display
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'success')),
    
    -- Targeting and conditions
    display_conditions JSONB DEFAULT '{}'::jsonb,
    target_widgets TEXT[],
    
    -- User interaction
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    is_acted_upon BOOLEAN DEFAULT false,
    
    -- Scheduling
    display_after TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    auto_dismiss_after INTERVAL,
    
    -- Analytics
    impression_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    read_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    acted_at TIMESTAMPTZ
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Dashboard layouts indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user_id ON public.dashboard_layouts(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_active ON public.dashboard_layouts(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_default ON public.dashboard_layouts(user_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_public ON public.dashboard_layouts(is_public) WHERE is_public = true;

-- Dashboard widgets indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_category ON public.dashboard_widgets(widget_category);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_available ON public.dashboard_widgets(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_subscription ON public.dashboard_widgets(requires_subscription);

-- User widget instances indexes
CREATE INDEX IF NOT EXISTS idx_user_widget_instances_user_id ON public.user_widget_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_user_widget_instances_layout_id ON public.user_widget_instances(layout_id);
CREATE INDEX IF NOT EXISTS idx_user_widget_instances_widget_key ON public.user_widget_instances(widget_key);
CREATE INDEX IF NOT EXISTS idx_user_widget_instances_visible ON public.user_widget_instances(layout_id, is_visible) WHERE is_visible = true;

-- Widget data cache indexes
CREATE INDEX IF NOT EXISTS idx_widget_data_cache_user_widget ON public.widget_data_cache(user_id, widget_key);
CREATE INDEX IF NOT EXISTS idx_widget_data_cache_expires_at ON public.widget_data_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_widget_data_cache_valid ON public.widget_data_cache(is_valid) WHERE is_valid = true;

-- Dashboard insights indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_insights_user_id ON public.dashboard_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_insights_type ON public.dashboard_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_insights_category ON public.dashboard_insights(insight_category);
CREATE INDEX IF NOT EXISTS idx_dashboard_insights_unread ON public.dashboard_insights(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_dashboard_insights_priority ON public.dashboard_insights(priority);
CREATE INDEX IF NOT EXISTS idx_dashboard_insights_expires_at ON public.dashboard_insights(expires_at);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_widget_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_data_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_insights ENABLE ROW LEVEL SECURITY;

-- Dashboard layouts policies
CREATE POLICY "Users can manage their own dashboard layouts"
    ON public.dashboard_layouts FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view public dashboard templates"
    ON public.dashboard_layouts FOR SELECT
    USING (is_public = true AND is_template = true);

-- Dashboard widgets policies (read-only for users)
CREATE POLICY "Users can view available dashboard widgets"
    ON public.dashboard_widgets FOR SELECT
    USING (is_available = true);

CREATE POLICY "Admins can manage dashboard widgets"
    ON public.dashboard_widgets FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- User widget instances policies
CREATE POLICY "Users can manage their own widget instances"
    ON public.user_widget_instances FOR ALL
    USING (auth.uid() = user_id);

-- Widget data cache policies
CREATE POLICY "Users can manage their own widget cache"
    ON public.widget_data_cache FOR ALL
    USING (auth.uid() = user_id);

-- Dashboard insights policies
CREATE POLICY "Users can manage their own insights"
    ON public.dashboard_insights FOR ALL
    USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER dashboard_layouts_updated_at
    BEFORE UPDATE ON public.dashboard_layouts
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER dashboard_widgets_updated_at
    BEFORE UPDATE ON public.dashboard_widgets
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER user_widget_instances_updated_at
    BEFORE UPDATE ON public.user_widget_instances
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- =====================================================
-- DASHBOARD MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to create default dashboard layout for new users
CREATE OR REPLACE FUNCTION public.create_default_dashboard(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_layout_id UUID;
    v_default_widgets JSONB := '[
        {"widget_key": "account_balance", "x": 0, "y": 0, "w": 6, "h": 2},
        {"widget_key": "recent_transactions", "x": 6, "y": 0, "w": 6, "h": 4},
        {"widget_key": "budget_summary", "x": 0, "y": 2, "w": 6, "h": 3},
        {"widget_key": "goal_progress", "x": 0, "y": 5, "w": 12, "h": 3},
        {"widget_key": "spending_insights", "x": 0, "y": 8, "w": 8, "h": 3},
        {"widget_key": "quick_actions", "x": 8, "y": 8, "w": 4, "h": 3}
    ]'::jsonb;
    v_widget JSONB;
BEGIN
    -- Create default layout
    INSERT INTO public.dashboard_layouts (
        user_id, layout_name, is_default, widget_config
    ) VALUES (
        p_user_id, 'Default Dashboard', true, v_default_widgets
    ) RETURNING id INTO v_layout_id;
    
    -- Create widget instances
    FOR v_widget IN SELECT * FROM jsonb_array_elements(v_default_widgets)
    LOOP
        INSERT INTO public.user_widget_instances (
            user_id, layout_id, widget_key, grid_x, grid_y, grid_width, grid_height
        ) VALUES (
            p_user_id, v_layout_id, v_widget->>'widget_key',
            (v_widget->>'x')::integer, (v_widget->>'y')::integer,
            (v_widget->>'w')::integer, (v_widget->>'h')::integer
        );
    END LOOP;
    
    RETURN v_layout_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get widget data with caching
CREATE OR REPLACE FUNCTION public.get_widget_data(
    p_user_id UUID,
    p_widget_key TEXT,
    p_widget_config JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    v_cache_key TEXT;
    v_cached_data RECORD;
    v_widget_data JSONB;
    v_cache_duration INTEGER;
BEGIN
    -- Generate cache key
    v_cache_key := encode(digest(p_widget_config::text, 'sha256'), 'hex');
    
    -- Check cache
    SELECT * INTO v_cached_data
    FROM public.widget_data_cache
    WHERE user_id = p_user_id
    AND widget_key = p_widget_key
    AND cache_key = v_cache_key
    AND expires_at > now()
    AND is_valid = true;
    
    IF FOUND THEN
        -- Update hit count
        UPDATE public.widget_data_cache
        SET hit_count = hit_count + 1
        WHERE id = v_cached_data.id;
        
        RETURN v_cached_data.cached_data;
    END IF;
    
    -- Generate widget data based on widget type
    CASE p_widget_key
        WHEN 'account_balance' THEN
            SELECT jsonb_build_object(
                'total_balance', COALESCE(SUM(balance), 0),
                'liquid_assets', COALESCE(SUM(CASE WHEN account_type IN ('checking', 'savings') THEN balance END), 0),
                'accounts', jsonb_agg(
                    jsonb_build_object(
                        'name', account_name,
                        'type', account_type,
                        'balance', balance,
                        'formatted_balance', public.format_currency(balance, 'USD')
                    )
                )
            ) INTO v_widget_data
            FROM public.accounts
            WHERE user_id = p_user_id AND status = 'active';
            
        WHEN 'recent_transactions' THEN
            SELECT jsonb_build_object(
                'transactions', jsonb_agg(
                    jsonb_build_object(
                        'id', id,
                        'date', date,
                        'amount', amount,
                        'description', description,
                        'type', type,
                        'formatted_amount', public.format_currency(amount, 'USD')
                    ) ORDER BY date DESC
                )
            ) INTO v_widget_data
            FROM public.transactions
            WHERE user_id = p_user_id
            ORDER BY date DESC
            LIMIT 10;
            
        WHEN 'budget_summary' THEN
            SELECT jsonb_build_object(
                'budgets', jsonb_agg(
                    jsonb_build_object(
                        'name', budget_name,
                        'budgeted', budgeted_amount,
                        'spent', actual_spent,
                        'remaining', remaining_amount,
                        'percentage', usage_percentage,
                        'status', performance_status
                    )
                ),
                'total_budgeted', SUM(budgeted_amount),
                'total_spent', SUM(actual_spent)
            ) INTO v_widget_data
            FROM public.budget_performance_analysis
            WHERE user_id = p_user_id AND time_status = 'active';
            
        WHEN 'goal_progress' THEN
            SELECT jsonb_build_object(
                'goals', jsonb_agg(
                    jsonb_build_object(
                        'name', goal_name,
                        'target', target_amount,
                        'current', current_amount,
                        'percentage', completion_percentage,
                        'status', time_status
                    )
                ),
                'total_target', SUM(target_amount),
                'total_progress', SUM(current_amount)
            ) INTO v_widget_data
            FROM public.goal_progress_tracking
            WHERE user_id = p_user_id AND status = 'in_progress';
            
        ELSE
            v_widget_data := '{"error": "Unknown widget type"}'::jsonb;
    END CASE;
    
    -- Get cache duration from widget configuration
    SELECT cache_duration_seconds INTO v_cache_duration
    FROM public.dashboard_widgets
    WHERE widget_key = p_widget_key;
    
    -- Cache the data
    INSERT INTO public.widget_data_cache (
        user_id, widget_key, cache_key, cached_data, expires_at
    ) VALUES (
        p_user_id, p_widget_key, v_cache_key, v_widget_data,
        now() + (COALESCE(v_cache_duration, 300) || ' seconds')::INTERVAL
    ) ON CONFLICT (user_id, widget_key, cache_key) DO UPDATE SET
        cached_data = EXCLUDED.cached_data,
        generated_at = now(),
        expires_at = EXCLUDED.expires_at,
        hit_count = 0,
        is_valid = true;
    
    RETURN v_widget_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to invalidate widget cache
CREATE OR REPLACE FUNCTION public.invalidate_widget_cache(
    p_user_id UUID,
    p_widget_keys TEXT[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_invalidated_count INTEGER;
BEGIN
    IF p_widget_keys IS NULL THEN
        -- Invalidate all cache for user
        UPDATE public.widget_data_cache
        SET is_valid = false, invalidation_reason = 'manual_invalidation'
        WHERE user_id = p_user_id AND is_valid = true;
    ELSE
        -- Invalidate specific widgets
        UPDATE public.widget_data_cache
        SET is_valid = false, invalidation_reason = 'manual_invalidation'
        WHERE user_id = p_user_id 
        AND widget_key = ANY(p_widget_keys)
        AND is_valid = true;
    END IF;
    
    GET DIAGNOSTICS v_invalidated_count = ROW_COUNT;
    RETURN v_invalidated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired cache
CREATE OR REPLACE FUNCTION public.cleanup_widget_cache()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM public.widget_data_cache
    WHERE expires_at < now() - INTERVAL '1 day';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INITIALIZATION DATA
-- =====================================================

-- Create default dashboard widgets
DO $$
BEGIN
    INSERT INTO public.dashboard_widgets (widget_key, widget_name, widget_category, description, default_config, min_width, min_height) VALUES
    ('account_balance', 'Account Balance', 'financial', 'Display total account balances and breakdown', '{"show_breakdown": true}', 3, 2),
    ('recent_transactions', 'Recent Transactions', 'financial', 'Show latest transactions', '{"limit": 10}', 4, 3),
    ('budget_summary', 'Budget Summary', 'financial', 'Current budget status and performance', '{"show_charts": true}', 3, 3),
    ('goal_progress', 'Goal Progress', 'goals', 'Track progress toward financial goals', '{"show_timeline": true}', 6, 3),
    ('spending_insights', 'Spending Insights', 'analytics', 'Monthly spending patterns and trends', '{"period": "month"}', 4, 3),
    ('quick_actions', 'Quick Actions', 'quick_actions', 'Frequently used actions and shortcuts', '{"actions": ["add_transaction", "create_budget"]}', 2, 2),
    ('financial_health', 'Financial Health Score', 'analytics', 'Overall financial health indicator', '{"show_recommendations": true}', 3, 2),
    ('upcoming_bills', 'Upcoming Bills', 'financial', 'Bills and recurring expenses due soon', '{"days_ahead": 7}', 3, 3),
    ('savings_rate', 'Savings Rate', 'analytics', 'Monthly and yearly savings rate tracking', '{"show_target": true}', 3, 2),
    ('net_worth_chart', 'Net Worth Trend', 'analytics', 'Net worth changes over time', '{"period": "year"}', 6, 4)
    ON CONFLICT (widget_key) DO NOTHING;
END $$;

-- =====================================================
-- VIEWS
-- =====================================================

-- User dashboard overview
CREATE OR REPLACE VIEW public.user_dashboard_overview AS
SELECT
    dl.user_id,
    dl.id as layout_id,
    dl.layout_name,
    dl.is_default,
    dl.is_active,
    dl.last_used_at,
    
    -- Widget counts
    COUNT(uwi.id) as widget_count,
    COUNT(uwi.id) FILTER (WHERE uwi.is_visible = true) as visible_widgets,
    
    -- Layout info
    dl.grid_columns,
    dl.compact_mode,
    
    -- User info
    p.full_name as user_name,
    p.email as user_email
    
FROM public.dashboard_layouts dl
JOIN public.profiles p ON dl.user_id = p.id
LEFT JOIN public.user_widget_instances uwi ON dl.id = uwi.layout_id
GROUP BY dl.user_id, dl.id, dl.layout_name, dl.is_default, dl.is_active, 
         dl.last_used_at, dl.grid_columns, dl.compact_mode, p.full_name, p.email;

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_layouts TO authenticated;
GRANT SELECT ON public.dashboard_widgets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_widget_instances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.widget_data_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_insights TO authenticated;

GRANT SELECT ON public.user_dashboard_overview TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_default_dashboard(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_widget_data(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invalidate_widget_cache(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_widget_cache() TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.dashboard_layouts IS 'User-defined dashboard layouts with widget arrangements';
COMMENT ON TABLE public.dashboard_widgets IS 'Available dashboard widgets and their configurations';
COMMENT ON TABLE public.user_widget_instances IS 'User-specific widget instances with positioning and settings';
COMMENT ON TABLE public.widget_data_cache IS 'Cached widget data for performance optimization';
COMMENT ON TABLE public.dashboard_insights IS 'Smart insights and notifications for dashboard display';

COMMENT ON FUNCTION public.create_default_dashboard(UUID) IS 'Create default dashboard layout for new users';
COMMENT ON FUNCTION public.get_widget_data(UUID, TEXT, JSONB) IS 'Get widget data with automatic caching';
COMMENT ON FUNCTION public.invalidate_widget_cache(UUID, TEXT[]) IS 'Invalidate cached widget data';

-- =====================================================
-- END OF DASHBOARD SCHEMA MODULE
-- =====================================================