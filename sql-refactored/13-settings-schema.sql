-- =====================================================
-- CLEANUP: DROP EXISTING OBJECTS
-- =====================================================

-- Drop policies first
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own settings" ON public.user_settings;
    DROP POLICY IF EXISTS "Users can view user-configurable settings" ON public.application_settings;
    DROP POLICY IF EXISTS "Admins can manage all application settings" ON public.application_settings;
    DROP POLICY IF EXISTS "Users can view enabled feature flags" ON public.feature_flags;
    DROP POLICY IF EXISTS "Admins can manage feature flags" ON public.feature_flags;
    DROP POLICY IF EXISTS "Users can manage their own preferences cache" ON public.user_preferences_cache;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop triggers
DO $$ 
BEGIN
    DROP TRIGGER IF EXISTS user_settings_updated_at ON public.user_settings;
    DROP TRIGGER IF EXISTS application_settings_updated_at ON public.application_settings;
    DROP TRIGGER IF EXISTS feature_flags_updated_at ON public.feature_flags;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop functions
DO $$ 
BEGIN
    DROP FUNCTION IF EXISTS public.initialize_user_settings(UUID);
    DROP FUNCTION IF EXISTS public.get_user_setting(UUID, TEXT, JSONB);
    DROP FUNCTION IF EXISTS public.update_user_setting(UUID, TEXT, JSONB);
    DROP FUNCTION IF EXISTS public.is_feature_enabled(TEXT, UUID);
    DROP FUNCTION IF EXISTS public.get_user_preferences(UUID);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop views
DROP VIEW IF EXISTS public.user_settings_summary CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS public.idx_user_settings_user_id;
DROP INDEX IF EXISTS public.idx_user_settings_currency;
DROP INDEX IF EXISTS public.idx_user_settings_updated_at;
DROP INDEX IF EXISTS public.idx_application_settings_category;
DROP INDEX IF EXISTS public.idx_application_settings_key;
DROP INDEX IF EXISTS public.idx_application_settings_user_config;
DROP INDEX IF EXISTS public.idx_feature_flags_enabled;
DROP INDEX IF EXISTS public.idx_feature_flags_environment;
DROP INDEX IF EXISTS public.idx_feature_flags_type;
DROP INDEX IF EXISTS public.idx_feature_flags_rollout;
DROP INDEX IF EXISTS public.idx_user_preferences_expires;
DROP INDEX IF EXISTS public.idx_user_preferences_computed;

-- Drop tables
DROP TABLE IF EXISTS public.user_preferences_cache CASCADE;
DROP TABLE IF EXISTS public.feature_flags CASCADE;
DROP TABLE IF EXISTS public.application_settings CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;

-- =====================================================
-- 10-SETTINGS-SCHEMA.SQL
-- =====================================================
-- Module: User Settings and Preferences
-- Purpose: User configuration, preferences, and application settings
-- Dependencies: 02-auth-schema.sql, 12-shared-schema.sql
-- Backend Service: userService.ts (settings functions)
-- Frontend Components: src/components/settings/
-- =====================================================
-- Version: 1.0.0
-- Created: 2025-09-20
-- Compatible with: Settings components, user preferences
-- =====================================================

-- =====================================================
-- USER SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Financial preferences
    default_currency TEXT DEFAULT 'USD' CHECK (public.is_valid_currency_code(default_currency)),
    budget_start_day INTEGER DEFAULT 1 CHECK (budget_start_day BETWEEN 1 AND 31),
    financial_year_start_month INTEGER DEFAULT 1 CHECK (financial_year_start_month BETWEEN 1 AND 12),
    
    -- Display preferences
    date_format TEXT DEFAULT 'MM/DD/YYYY' CHECK (date_format IN ('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD')),
    time_format TEXT DEFAULT '12h' CHECK (time_format IN ('12h', '24h')),
    theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    language TEXT DEFAULT 'en' CHECK (language IN ('en', 'es', 'fr', 'de', 'pt', 'zh')),
    
    -- Notification preferences
    email_notifications JSONB DEFAULT '{
        "budget_alerts": true,
        "goal_milestones": true,
        "family_activity": true,
        "weekly_summary": true,
        "monthly_report": true
    }'::jsonb,
    
    push_notifications JSONB DEFAULT '{
        "budget_alerts": true,
        "goal_milestones": true,
        "family_activity": false,
        "transaction_reminders": true
    }'::jsonb,
    
    -- Privacy settings
    profile_visibility TEXT DEFAULT 'private' CHECK (profile_visibility IN ('public', 'family', 'private')),
    share_goals_publicly BOOLEAN DEFAULT false,
    allow_family_invitations BOOLEAN DEFAULT true,
    
    -- Security preferences
    session_timeout_hours INTEGER DEFAULT 24 CHECK (session_timeout_hours BETWEEN 1 AND 168),
    require_2fa BOOLEAN DEFAULT false,
    
    -- Dashboard customization
    dashboard_layout JSONB DEFAULT '{
        "widgets": ["balance", "recent_transactions", "budget_summary", "goals_progress"],
        "widget_order": [1, 2, 3, 4],
        "compact_view": false
    }'::jsonb,
    
    -- Export preferences
    export_format TEXT DEFAULT 'csv' CHECK (export_format IN ('csv', 'xlsx', 'pdf')),
    include_attachments BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Constraints
    UNIQUE(user_id)
);

-- =====================================================
-- APPLICATION SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.application_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Setting identification
    setting_category TEXT NOT NULL CHECK (setting_category IN ('general', 'security', 'features', 'limits', 'ui')),
    setting_key TEXT NOT NULL,
    setting_value JSONB NOT NULL,
    
    -- Metadata
    data_type TEXT NOT NULL CHECK (data_type IN ('string', 'number', 'boolean', 'json', 'array')),
    description TEXT,
    is_user_configurable BOOLEAN DEFAULT false,
    is_system_setting BOOLEAN DEFAULT true,
    
    -- Validation
    allowed_values JSONB,
    min_value DECIMAL,
    max_value DECIMAL,
    
    -- Access control
    requires_admin BOOLEAN DEFAULT true,
    affects_all_users BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Constraints
    UNIQUE(setting_category, setting_key)
);

-- =====================================================
-- FEATURE FLAGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Feature identification
    feature_name TEXT UNIQUE NOT NULL,
    feature_key TEXT UNIQUE NOT NULL,
    description TEXT,
    
    -- Status and rollout
    is_enabled BOOLEAN DEFAULT false,
    rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
    
    -- Targeting
    target_user_ids UUID[],
    target_user_roles TEXT[],
    target_conditions JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    feature_type TEXT DEFAULT 'toggle' CHECK (feature_type IN ('toggle', 'experiment', 'rollout', 'kill_switch')),
    environment TEXT DEFAULT 'production' CHECK (environment IN ('development', 'staging', 'production')),
    
    -- Lifecycle
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================================================
-- USER PREFERENCES CACHE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_preferences_cache (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    
    -- Cached computed preferences
    effective_settings JSONB NOT NULL,
    feature_flags JSONB DEFAULT '{}'::jsonb,
    
    -- Cache metadata
    last_computed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '1 hour') NOT NULL,
    cache_version TEXT DEFAULT '1.0',
    
    -- Dependencies tracking
    depends_on_settings BOOLEAN DEFAULT true,
    depends_on_features BOOLEAN DEFAULT true,
    depends_on_admin_settings BOOLEAN DEFAULT false
);

-- =====================================================
-- INDEXES
-- =====================================================

-- User settings indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_currency ON public.user_settings(default_currency);
CREATE INDEX IF NOT EXISTS idx_user_settings_updated_at ON public.user_settings(updated_at);

-- Application settings indexes
CREATE INDEX IF NOT EXISTS idx_application_settings_category ON public.application_settings(setting_category);
CREATE INDEX IF NOT EXISTS idx_application_settings_key ON public.application_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_application_settings_user_config ON public.application_settings(is_user_configurable) WHERE is_user_configurable = true;

-- Feature flags indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON public.feature_flags(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_feature_flags_environment ON public.feature_flags(environment);
CREATE INDEX IF NOT EXISTS idx_feature_flags_type ON public.feature_flags(feature_type);
CREATE INDEX IF NOT EXISTS idx_feature_flags_rollout ON public.feature_flags(rollout_percentage) WHERE rollout_percentage > 0;

-- Preferences cache indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_expires ON public.user_preferences_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_preferences_computed ON public.user_preferences_cache(last_computed_at);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences_cache ENABLE ROW LEVEL SECURITY;

-- User settings policies
CREATE POLICY "Users can manage their own settings"
    ON public.user_settings FOR ALL
    USING (auth.uid() = user_id);

-- Application settings policies
CREATE POLICY "Users can view user-configurable settings"
    ON public.application_settings FOR SELECT
    USING (is_user_configurable = true);

CREATE POLICY "Admins can manage all application settings"
    ON public.application_settings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- Feature flags policies
CREATE POLICY "Users can view enabled feature flags"
    ON public.feature_flags FOR SELECT
    USING (is_enabled = true);

CREATE POLICY "Admins can manage feature flags"
    ON public.feature_flags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- Preferences cache policies
CREATE POLICY "Users can manage their own preferences cache"
    ON public.user_preferences_cache FOR ALL
    USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER application_settings_updated_at
    BEFORE UPDATE ON public.application_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER feature_flags_updated_at
    BEFORE UPDATE ON public.feature_flags
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- =====================================================
-- SETTINGS MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to initialize default user settings
CREATE OR REPLACE FUNCTION public.initialize_user_settings(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.user_settings (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Invalidate cache
    DELETE FROM public.user_preferences_cache WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user setting with fallback to default
CREATE OR REPLACE FUNCTION public.get_user_setting(
    p_user_id UUID,
    p_setting_name TEXT,
    p_default_value JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_setting_value JSONB;
    v_user_settings RECORD;
BEGIN
    -- Get user settings
    SELECT * INTO v_user_settings FROM public.user_settings WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN p_default_value;
    END IF;
    
    -- Extract specific setting value based on setting name
    CASE p_setting_name
        WHEN 'currency' THEN v_setting_value := to_jsonb(v_user_settings.default_currency);
        WHEN 'theme' THEN v_setting_value := to_jsonb(v_user_settings.theme);
        WHEN 'language' THEN v_setting_value := to_jsonb(v_user_settings.language);
        WHEN 'email_notifications' THEN v_setting_value := v_user_settings.email_notifications;
        WHEN 'push_notifications' THEN v_setting_value := v_user_settings.push_notifications;
        WHEN 'dashboard_layout' THEN v_setting_value := v_user_settings.dashboard_layout;
        ELSE v_setting_value := p_default_value;
    END CASE;
    
    RETURN COALESCE(v_setting_value, p_default_value);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user setting
CREATE OR REPLACE FUNCTION public.update_user_setting(
    p_user_id UUID,
    p_setting_name TEXT,
    p_setting_value JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Ensure user settings exist
    PERFORM public.initialize_user_settings(p_user_id);
    
    -- Update specific setting
    CASE p_setting_name
        WHEN 'currency' THEN
            UPDATE public.user_settings 
            SET default_currency = (p_setting_value #>> '{}')
            WHERE user_id = p_user_id;
        WHEN 'theme' THEN
            UPDATE public.user_settings 
            SET theme = (p_setting_value #>> '{}')
            WHERE user_id = p_user_id;
        WHEN 'language' THEN
            UPDATE public.user_settings 
            SET language = (p_setting_value #>> '{}')
            WHERE user_id = p_user_id;
        WHEN 'email_notifications' THEN
            UPDATE public.user_settings 
            SET email_notifications = p_setting_value
            WHERE user_id = p_user_id;
        WHEN 'push_notifications' THEN
            UPDATE public.user_settings 
            SET push_notifications = p_setting_value
            WHERE user_id = p_user_id;
        WHEN 'dashboard_layout' THEN
            UPDATE public.user_settings 
            SET dashboard_layout = p_setting_value
            WHERE user_id = p_user_id;
        ELSE
            RETURN false;
    END CASE;
    
    -- Invalidate preferences cache
    DELETE FROM public.user_preferences_cache WHERE user_id = p_user_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if feature is enabled for user
CREATE OR REPLACE FUNCTION public.is_feature_enabled(
    p_feature_key TEXT,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
DECLARE
    v_feature RECORD;
    v_user_profile RECORD;
    v_random_value INTEGER;
BEGIN
    -- Get feature flag
    SELECT * INTO v_feature 
    FROM public.feature_flags 
    WHERE feature_key = p_feature_key AND is_enabled = true;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Check if feature is fully enabled
    IF v_feature.rollout_percentage = 100 THEN
        RETURN true;
    END IF;
    
    -- Check specific user targeting
    IF p_user_id = ANY(v_feature.target_user_ids) THEN
        RETURN true;
    END IF;
    
    -- Check role-based targeting
    IF v_feature.target_user_roles IS NOT NULL THEN
        SELECT * INTO v_user_profile FROM public.profiles WHERE id = p_user_id;
        IF FOUND AND v_user_profile.role = ANY(v_feature.target_user_roles) THEN
            RETURN true;
        END IF;
    END IF;
    
    -- Check rollout percentage
    IF v_feature.rollout_percentage > 0 THEN
        -- Generate deterministic random value based on user ID and feature
        v_random_value := (hashtext(p_user_id::TEXT || v_feature.feature_key) % 100);
        RETURN v_random_value < v_feature.rollout_percentage;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get compiled user preferences
CREATE OR REPLACE FUNCTION public.get_user_preferences(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_cached_prefs RECORD;
    v_settings RECORD;
    v_compiled_prefs JSONB;
    v_features JSONB := '{}'::jsonb;
    v_feature RECORD;
BEGIN
    -- Check cache first
    SELECT * INTO v_cached_prefs 
    FROM public.user_preferences_cache 
    WHERE user_id = p_user_id AND expires_at > now();
    
    IF FOUND THEN
        RETURN v_cached_prefs.effective_settings;
    END IF;
    
    -- Get user settings
    SELECT * INTO v_settings FROM public.user_settings WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        PERFORM public.initialize_user_settings(p_user_id);
        SELECT * INTO v_settings FROM public.user_settings WHERE user_id = p_user_id;
    END IF;
    
    -- Get enabled features for user
    FOR v_feature IN 
        SELECT feature_key 
        FROM public.feature_flags 
        WHERE is_enabled = true
    LOOP
        v_features := v_features || jsonb_build_object(
            v_feature.feature_key, 
            public.is_feature_enabled(v_feature.feature_key, p_user_id)
        );
    END LOOP;
    
    -- Compile preferences
    v_compiled_prefs := jsonb_build_object(
        'currency', v_settings.default_currency,
        'theme', v_settings.theme,
        'language', v_settings.language,
        'date_format', v_settings.date_format,
        'time_format', v_settings.time_format,
        'notifications', jsonb_build_object(
            'email', v_settings.email_notifications,
            'push', v_settings.push_notifications
        ),
        'privacy', jsonb_build_object(
            'profile_visibility', v_settings.profile_visibility,
            'share_goals_publicly', v_settings.share_goals_publicly,
            'allow_family_invitations', v_settings.allow_family_invitations
        ),
        'dashboard', v_settings.dashboard_layout,
        'features', v_features
    );
    
    -- Cache the compiled preferences
    INSERT INTO public.user_preferences_cache (
        user_id, effective_settings, feature_flags
    ) VALUES (
        p_user_id, v_compiled_prefs, v_features
    ) ON CONFLICT (user_id) DO UPDATE SET
        effective_settings = EXCLUDED.effective_settings,
        feature_flags = EXCLUDED.feature_flags,
        last_computed_at = now(),
        expires_at = now() + INTERVAL '1 hour';
    
    RETURN v_compiled_prefs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INITIALIZATION DATA
-- =====================================================

-- Create default application settings
DO $$
BEGIN
    INSERT INTO public.application_settings (setting_category, setting_key, setting_value, data_type, description, is_user_configurable) VALUES
    ('general', 'app_name', '"BudgetMe"', 'string', 'Application name', false),
    ('general', 'app_version', '"1.0.0"', 'string', 'Current application version', false),
    ('limits', 'max_transactions_per_month', '1000', 'number', 'Maximum transactions per user per month', false),
    ('limits', 'max_goals_per_user', '50', 'number', 'Maximum goals per user', true),
    ('limits', 'max_budgets_per_user', '100', 'number', 'Maximum budgets per user', true),
    ('features', 'enable_family_sharing', 'true', 'boolean', 'Enable family collaboration features', true),
    ('features', 'enable_ai_predictions', 'true', 'boolean', 'Enable AI prediction features', true),
    ('features', 'enable_export', 'true', 'boolean', 'Enable data export features', true),
    ('ui', 'default_theme', '"light"', 'string', 'Default application theme', true),
    ('ui', 'available_currencies', '["USD", "EUR", "GBP", "CAD", "AUD"]', 'array', 'Supported currencies', false)
    ON CONFLICT (setting_category, setting_key) DO NOTHING;
    
    -- Create default feature flags
    INSERT INTO public.feature_flags (feature_name, feature_key, description, is_enabled, rollout_percentage) VALUES
    ('Advanced Budgeting', 'advanced_budgeting', 'Enhanced budget features with rollover and multi-category support', true, 100),
    ('Family Goals', 'family_goals', 'Collaborative family goal setting and tracking', true, 100),
    ('AI Insights', 'ai_insights', 'AI-powered financial insights and recommendations', true, 50),
    ('Export Data', 'export_data', 'Data export functionality in multiple formats', true, 100),
    ('Dark Mode', 'dark_mode', 'Dark theme support', true, 100),
    ('Mobile App', 'mobile_app', 'Mobile application features', false, 0)
    ON CONFLICT (feature_key) DO NOTHING;
END $$;

-- =====================================================
-- VIEWS
-- =====================================================

-- User settings summary view
CREATE OR REPLACE VIEW public.user_settings_summary AS
SELECT
    us.user_id,
    us.default_currency,
    us.theme,
    us.language,
    us.profile_visibility,
    us.email_notifications->>'budget_alerts' as email_budget_alerts,
    us.push_notifications->>'budget_alerts' as push_budget_alerts,
    us.dashboard_layout->>'compact_view' as compact_dashboard,
    us.created_at,
    us.updated_at,
    
    -- User profile info
    p.email,
    p.full_name,
    p.role
    
FROM public.user_settings us
JOIN public.profiles p ON us.user_id = p.id;

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT SELECT ON public.application_settings TO authenticated;
GRANT SELECT ON public.feature_flags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences_cache TO authenticated;

GRANT SELECT ON public.user_settings_summary TO authenticated;

GRANT EXECUTE ON FUNCTION public.initialize_user_settings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_setting(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_setting(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_feature_enabled(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_preferences(UUID) TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.user_settings IS 'User-specific preferences and configuration settings';
COMMENT ON TABLE public.application_settings IS 'System-wide application configuration settings';
COMMENT ON TABLE public.feature_flags IS 'Feature toggle management with rollout control';
COMMENT ON TABLE public.user_preferences_cache IS 'Cached compiled user preferences for performance';

COMMENT ON FUNCTION public.get_user_setting(UUID, TEXT, JSONB) IS 'Retrieve specific user setting with fallback to default';
COMMENT ON FUNCTION public.is_feature_enabled(TEXT, UUID) IS 'Check if feature flag is enabled for specific user';
COMMENT ON FUNCTION public.get_user_preferences(UUID) IS 'Get compiled user preferences with caching';

-- =====================================================
-- END OF SETTINGS SCHEMA MODULE
-- =====================================================