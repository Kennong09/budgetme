-- =====================================================
-- CLEANUP: DROP EXISTING OBJECTS
-- =====================================================

-- Drop policies first
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can manage admin settings" ON public.admin_settings;
    DROP POLICY IF EXISTS "Public settings are viewable" ON public.admin_settings;
    DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.system_activity_log;
    DROP POLICY IF EXISTS "Users can view their own activity" ON public.system_activity_log;
    DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Admins can manage notifications" ON public.admin_notifications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop triggers
DO $$ 
BEGIN
    DROP TRIGGER IF EXISTS admin_settings_updated_at ON public.admin_settings;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop functions
DO $$ 
BEGIN
    DROP FUNCTION IF EXISTS public.is_admin_user();
    DROP FUNCTION IF EXISTS public.add_admin_user(UUID);
    DROP FUNCTION IF EXISTS public.remove_admin_user(UUID);
    DROP FUNCTION IF EXISTS public.log_admin_activity(UUID, TEXT, TEXT, JSONB, TEXT);
    DROP FUNCTION IF EXISTS public.get_admin_setting(TEXT);
    DROP FUNCTION IF EXISTS public.set_admin_setting(TEXT, JSONB, TEXT, TEXT, TEXT, UUID);
    DROP FUNCTION IF EXISTS public.manage_user_role(UUID, TEXT, TEXT, UUID, TIMESTAMPTZ);
    DROP FUNCTION IF EXISTS public.create_admin_notification(TEXT, TEXT, TEXT, TEXT, TEXT[], UUID);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop views
DROP VIEW IF EXISTS public.admin_dashboard_summary CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS public.idx_admin_settings_key;
DROP INDEX IF EXISTS public.idx_admin_settings_category;
DROP INDEX IF EXISTS public.idx_admin_settings_public;
DROP INDEX IF EXISTS public.idx_system_activity_user_id;
DROP INDEX IF EXISTS public.idx_system_activity_type;
DROP INDEX IF EXISTS public.idx_system_activity_created_at;
DROP INDEX IF EXISTS public.idx_system_activity_severity;
DROP INDEX IF EXISTS public.idx_system_activity_ip;
DROP INDEX IF EXISTS public.idx_user_roles_user_id;
DROP INDEX IF EXISTS public.idx_user_roles_role_name;
DROP INDEX IF EXISTS public.idx_user_roles_active;
DROP INDEX IF EXISTS public.idx_user_roles_expires;
DROP INDEX IF EXISTS public.idx_admin_notifications_type;
DROP INDEX IF EXISTS public.idx_admin_notifications_priority;
DROP INDEX IF EXISTS public.idx_admin_notifications_unread;
DROP INDEX IF EXISTS public.idx_admin_notifications_created_at;

-- Drop tables
DROP TABLE IF EXISTS public.admin_notifications CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.system_activity_log CASCADE;
DROP TABLE IF EXISTS public.admin_settings CASCADE;

-- =====================================================
-- 01-ADMIN-SCHEMA.SQL
-- =====================================================
-- Module: Administrative Functions and Management
-- Purpose: Admin user management, system monitoring, and administrative tools
-- Dependencies: 02-auth-schema.sql, 12-shared-schema.sql
-- Backend Service: userService.ts (admin functions)
-- Frontend Components: src/components/admin/
-- =====================================================
-- Version: 1.0.0
-- Created: 2025-09-20
-- Compatible with: Admin dashboard, user management
-- =====================================================

-- =====================================================
-- ADMIN SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.admin_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    setting_type TEXT NOT NULL CHECK (setting_type IN ('string', 'number', 'boolean', 'json', 'array')),
    description TEXT,
    category TEXT DEFAULT 'general' CHECK (category IN ('general', 'security', 'features', 'limits', 'notifications')),
    
    -- Access control
    is_public BOOLEAN DEFAULT false,
    requires_admin BOOLEAN DEFAULT true,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================================================
-- SYSTEM ACTIVITY LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS public.system_activity_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Activity details
    activity_type TEXT NOT NULL CHECK (activity_type IN ('login', 'logout', 'user_created', 'user_updated', 'admin_action', 'system_event', 'error')),
    activity_description TEXT NOT NULL,
    
    -- Context and metadata
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    
    -- Additional data
    metadata JSONB DEFAULT '{}'::jsonb,
    severity TEXT DEFAULT 'info' CHECK (severity IN ('low', 'info', 'warning', 'error', 'critical')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Performance and debugging
    execution_time_ms INTEGER,
    stack_trace TEXT
);

-- =====================================================
-- USER ROLE MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role_name TEXT NOT NULL CHECK (role_name IN ('user', 'moderator', 'admin', 'super_admin')),
    
    -- Role metadata
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    
    -- Permissions
    permissions JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    UNIQUE(user_id, role_name)
);

-- =====================================================
-- ADMIN NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Notification details
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('info', 'warning', 'error', 'maintenance', 'feature')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Targeting
    target_users TEXT[] DEFAULT NULL, -- NULL means all admins
    target_roles TEXT[] DEFAULT ARRAY['admin'],
    
    -- Status and delivery
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    auto_dismiss_at TIMESTAMPTZ,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    read_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Admin settings indexes
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON public.admin_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_admin_settings_category ON public.admin_settings(category);
CREATE INDEX IF NOT EXISTS idx_admin_settings_public ON public.admin_settings(is_public) WHERE is_public = true;

-- Activity log indexes
CREATE INDEX IF NOT EXISTS idx_system_activity_user_id ON public.system_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_system_activity_type ON public.system_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_system_activity_created_at ON public.system_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_system_activity_severity ON public.system_activity_log(severity);
CREATE INDEX IF NOT EXISTS idx_system_activity_ip ON public.system_activity_log(ip_address);

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_name ON public.user_roles(role_name);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON public.user_roles(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_roles_expires ON public.user_roles(expires_at) WHERE expires_at IS NOT NULL;

-- Admin notifications indexes
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON public.admin_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_priority ON public.admin_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread ON public.admin_notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications(created_at);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Admin settings policies
CREATE POLICY "Admins can manage admin settings"
    ON public.admin_settings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Public settings are viewable"
    ON public.admin_settings FOR SELECT
    USING (is_public = true);

-- Activity log policies
CREATE POLICY "Admins can view all activity logs"
    ON public.system_activity_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Users can view their own activity"
    ON public.system_activity_log FOR SELECT
    USING (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Admins can manage user roles"
    ON public.user_roles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- Admin notifications policies
CREATE POLICY "Admins can manage notifications"
    ON public.admin_notifications FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER admin_settings_updated_at
    BEFORE UPDATE ON public.admin_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- =====================================================
-- ADMIN FUNCTIONS
-- =====================================================

-- Function to check if user is admin (used by adminHelpers.ts)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add admin role to user (used by adminHelpers.ts)
CREATE OR REPLACE FUNCTION public.add_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if current user is admin
    IF NOT public.is_admin_user() THEN
        RETURN false;
    END IF;
    
    UPDATE public.profiles
    SET role = 'admin', updated_at = now()
    WHERE id = user_id;
    
    -- Log the action
    PERFORM public.log_admin_activity(
        auth.uid(),
        'admin_action',
        format('Granted admin role to user %s', user_id),
        jsonb_build_object('target_user_id', user_id),
        'info'
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove admin role from user (used by adminHelpers.ts)
CREATE OR REPLACE FUNCTION public.remove_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if current user is admin
    IF NOT public.is_admin_user() THEN
        RETURN false;
    END IF;
    
    UPDATE public.profiles
    SET role = 'user', updated_at = now()
    WHERE id = user_id;
    
    -- Log the action
    PERFORM public.log_admin_activity(
        auth.uid(),
        'admin_action',
        format('Removed admin role from user %s', user_id),
        jsonb_build_object('target_user_id', user_id),
        'info'
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log system activity
CREATE OR REPLACE FUNCTION public.log_admin_activity(
    p_user_id UUID,
    p_activity_type TEXT,
    p_description TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_severity TEXT DEFAULT 'info'
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.system_activity_log (
        user_id, activity_type, activity_description, metadata, severity
    ) VALUES (
        p_user_id, p_activity_type, p_description, p_metadata, p_severity
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get or set admin setting
CREATE OR REPLACE FUNCTION public.get_admin_setting(p_setting_key TEXT)
RETURNS JSONB AS $$
DECLARE
    v_setting_value JSONB;
BEGIN
    SELECT setting_value INTO v_setting_value
    FROM public.admin_settings
    WHERE setting_key = p_setting_key;
    
    RETURN v_setting_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.set_admin_setting(
    p_setting_key TEXT,
    p_setting_value JSONB,
    p_setting_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_category TEXT DEFAULT 'general',
    p_admin_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Verify admin permissions
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_admin_user_id AND role IN ('admin', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'Only admins can modify settings';
    END IF;
    
    INSERT INTO public.admin_settings (
        setting_key, setting_value, setting_type, description, category, created_by
    ) VALUES (
        p_setting_key, p_setting_value, p_setting_type, p_description, p_category, p_admin_user_id
    )
    ON CONFLICT (setting_key) DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        setting_type = EXCLUDED.setting_type,
        description = COALESCE(EXCLUDED.description, admin_settings.description),
        category = EXCLUDED.category,
        updated_at = now();
    
    -- Log the setting change
    PERFORM public.log_admin_activity(
        p_admin_user_id,
        'admin_action',
        format('Updated admin setting: %s', p_setting_key),
        jsonb_build_object('setting_key', p_setting_key, 'new_value', p_setting_value),
        'info'
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to grant/revoke user roles
CREATE OR REPLACE FUNCTION public.manage_user_role(
    p_user_id UUID,
    p_role_name TEXT,
    p_action TEXT, -- 'grant' or 'revoke'
    p_admin_user_id UUID DEFAULT auth.uid(),
    p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Verify admin permissions
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_admin_user_id AND role IN ('admin', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'Only admins can manage user roles';
    END IF;
    
    IF p_action = 'grant' THEN
        INSERT INTO public.user_roles (user_id, role_name, granted_by, expires_at)
        VALUES (p_user_id, p_role_name, p_admin_user_id, p_expires_at)
        ON CONFLICT (user_id, role_name) DO UPDATE SET
            is_active = true,
            granted_by = p_admin_user_id,
            granted_at = now(),
            expires_at = p_expires_at;
        
        -- Update profile role if it's a higher role
        IF p_role_name IN ('admin', 'super_admin') THEN
            UPDATE public.profiles
            SET role = p_role_name
            WHERE id = p_user_id;
        END IF;
        
    ELSIF p_action = 'revoke' THEN
        UPDATE public.user_roles
        SET is_active = false
        WHERE user_id = p_user_id AND role_name = p_role_name;
        
        -- Downgrade profile role if necessary
        IF p_role_name IN ('admin', 'super_admin') THEN
            UPDATE public.profiles
            SET role = 'user'
            WHERE id = p_user_id;
        END IF;
    END IF;
    
    -- Log the role change
    PERFORM public.log_admin_activity(
        p_admin_user_id,
        'admin_action',
        format('%s role %s for user %s', INITCAP(p_action), p_role_name, p_user_id),
        jsonb_build_object('target_user_id', p_user_id, 'role', p_role_name, 'action', p_action),
        'info'
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create admin notification
CREATE OR REPLACE FUNCTION public.create_admin_notification(
    p_title TEXT,
    p_message TEXT,
    p_notification_type TEXT DEFAULT 'info',
    p_priority TEXT DEFAULT 'medium',
    p_target_roles TEXT[] DEFAULT ARRAY['admin'],
    p_admin_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.admin_notifications (
        title, message, notification_type, priority, target_roles, created_by
    ) VALUES (
        p_title, p_message, p_notification_type, p_priority, p_target_roles, p_admin_user_id
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS
-- =====================================================

-- Admin dashboard summary view
CREATE OR REPLACE VIEW public.admin_dashboard_summary AS
SELECT
    -- User statistics
    (SELECT COUNT(*) FROM public.profiles) as total_users,
    (SELECT COUNT(*) FROM public.profiles WHERE created_at > NOW() - INTERVAL '24 hours') as new_users_today,
    (SELECT COUNT(*) FROM public.profiles WHERE last_login > NOW() - INTERVAL '7 days') as active_users_week,
    
    -- System activity
    (SELECT COUNT(*) FROM public.system_activity_log WHERE created_at > NOW() - INTERVAL '24 hours') as activities_today,
    (SELECT COUNT(*) FROM public.system_activity_log WHERE severity IN ('error', 'critical') AND created_at > NOW() - INTERVAL '24 hours') as errors_today,
    
    -- Financial data
    (SELECT COUNT(*) FROM public.transactions WHERE created_at > NOW() - INTERVAL '24 hours') as transactions_today,
    (SELECT COUNT(*) FROM public.budgets WHERE status = 'active') as active_budgets,
    (SELECT COUNT(*) FROM public.goals WHERE status = 'in_progress') as active_goals,
    
    -- Families and collaboration
    (SELECT COUNT(*) FROM public.families) as total_families,
    (SELECT COUNT(*) FROM public.family_members WHERE status = 'active') as total_family_members,
    
    -- Predictions (placeholder - will be updated after predictions schema deployment)
    0 as predictions_today,
    
    -- Admin notifications
    (SELECT COUNT(*) FROM public.admin_notifications WHERE is_read = false) as unread_notifications;
-- Note: Predictions data will be added after 11-predictions-schema.sql deployment

-- =====================================================
-- INITIALIZATION
-- =====================================================

-- Create default admin settings
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- System settings
    INSERT INTO public.admin_settings (setting_key, setting_value, setting_type, description, category, is_public) VALUES
    ('max_users_per_family', '10', 'number', 'Maximum number of users allowed per family', 'limits', true),
    ('prediction_free_tier_limit', '5', 'number', 'Monthly prediction limit for free tier users', 'limits', true),
    ('session_timeout_hours', '24', 'number', 'User session timeout in hours', 'security', false),
    ('enable_family_features', 'true', 'boolean', 'Enable family collaboration features', 'features', true),
    ('enable_predictions', 'true', 'boolean', 'Enable AI prediction features', 'features', true),
    ('maintenance_mode', 'false', 'boolean', 'System maintenance mode', 'general', true)
    ON CONFLICT (setting_key) DO NOTHING;
    
    -- Check if we have any existing users to make admin
    SELECT id INTO admin_user_id FROM auth.users 
    WHERE email = 'admin@gmail.com' OR email ILIKE '%admin%' 
    LIMIT 1;
    
    -- Only create admin profile if a corresponding auth user exists
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, email, role, full_name, is_active, email_verified)
        VALUES (
            admin_user_id,
            (SELECT email FROM auth.users WHERE id = admin_user_id),
            'admin',
            'System Administrator',
            true,
            true
        )
        ON CONFLICT (id) DO UPDATE SET
            role = 'admin',
            is_active = true,
            email_verified = true,
            updated_at = now();
        
        RAISE NOTICE 'SUCCESS: Admin profile created/updated for user %', admin_user_id;
    ELSE
        RAISE NOTICE 'SKIP: No suitable auth.users found for admin profile creation';
        RAISE NOTICE 'INFO: Create a user through Supabase Auth first, then run this script to assign admin role';
    END IF;
END $$;

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT ON public.admin_settings TO authenticated;
GRANT SELECT, INSERT ON public.system_activity_log TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.admin_notifications TO authenticated;
GRANT SELECT ON public.admin_dashboard_summary TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_admin_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_admin_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_admin_activity(UUID, TEXT, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_setting(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_admin_setting(TEXT, JSONB, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manage_user_role(UUID, TEXT, TEXT, UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_admin_notification(TEXT, TEXT, TEXT, TEXT, TEXT[], UUID) TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.admin_settings IS 'System-wide configuration settings managed by administrators';
COMMENT ON TABLE public.system_activity_log IS 'Comprehensive log of all system activities and events';
COMMENT ON TABLE public.user_roles IS 'User role assignments with expiration and permissions';
COMMENT ON TABLE public.admin_notifications IS 'Administrative notifications and announcements';

-- =====================================================
-- END OF ADMIN SCHEMA MODULE
-- =====================================================