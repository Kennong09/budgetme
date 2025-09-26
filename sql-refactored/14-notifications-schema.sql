-- =====================================================
-- 14-NOTIFICATIONS-SCHEMA.SQL
-- =====================================================
-- Module: User Notification System
-- Purpose: Comprehensive notification system for Budget, Goals, Family, and Transaction modules
-- Dependencies: 01-auth-schema.sql, 02-shared-schema.sql, 07-budget-schema.sql, 05-goals-schema.sql, 03-family-schema.sql, 04-transactions-schema.sql
-- Backend Service: notificationService.ts
-- Frontend Components: src/components/layout/shared/components/NotificationDropdown.tsx
-- =====================================================
-- Version: 1.0.0
-- Created: 2025-09-25
-- Compatible with: Real-time notification system, cross-module integration
-- =====================================================

-- =====================================================
-- CLEANUP: DROP EXISTING NOTIFICATION SYSTEM
-- =====================================================

-- Drop policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own notifications" ON public.user_notifications;
    DROP POLICY IF EXISTS "Users can update their own notifications" ON public.user_notifications;
    DROP POLICY IF EXISTS "Users can manage their own notification preferences" ON public.notification_preferences;
    DROP POLICY IF EXISTS "Users can view their notification delivery logs" ON public.notification_delivery_log;
    DROP POLICY IF EXISTS "Admins can manage notification templates" ON public.notification_templates;
    DROP POLICY IF EXISTS "Admins can manage aggregation rules" ON public.notification_aggregation_rules;
    DROP POLICY IF EXISTS "System can read active templates" ON public.notification_templates;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop triggers
DO $$ 
BEGIN
    DROP TRIGGER IF EXISTS tr_notification_preferences_updated_at ON public.notification_preferences;
    DROP TRIGGER IF EXISTS tr_create_default_notification_preferences ON auth.users;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop functions
DO $$ 
BEGIN
    DROP FUNCTION IF EXISTS public.create_notification(UUID, TEXT, TEXT, JSONB, UUID, UUID, UUID, UUID, INTEGER);
    DROP FUNCTION IF EXISTS public.mark_notification_read(UUID, UUID);
    DROP FUNCTION IF EXISTS public.cleanup_expired_notifications();
    DROP FUNCTION IF EXISTS public.get_user_notification_count(UUID, BOOLEAN);
    DROP FUNCTION IF EXISTS public.update_notification_preferences_updated_at();
    DROP FUNCTION IF EXISTS public.create_default_notification_preferences();
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop tables
DROP TABLE IF EXISTS public.notification_delivery_log CASCADE;
DROP TABLE IF EXISTS public.notification_aggregation_rules CASCADE;
DROP TABLE IF EXISTS public.notification_templates CASCADE;
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
DROP TABLE IF EXISTS public.user_notifications CASCADE;

-- =====================================================
-- USER NOTIFICATIONS TABLE
-- =====================================================

-- Comprehensive notification system that aggregates all notification types
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Notification categorization
    notification_type TEXT NOT NULL CHECK (notification_type IN ('budget', 'goal', 'family', 'transaction', 'system')),
    event_type TEXT NOT NULL CHECK (event_type IN (
        -- Budget events
        'budget_threshold_warning', 'budget_exceeded', 'budget_period_expiring', 'budget_monthly_summary',
        -- Goal events
        'goal_milestone_25', 'goal_milestone_50', 'goal_milestone_75', 'goal_completed', 'goal_deadline_warning', 'goal_contribution_added',
        -- Family events
        'family_invitation_received', 'family_invitation_accepted', 'family_invitation_declined', 'family_member_joined', 'family_member_left', 'family_role_changed', 'family_activity_update',
        -- Transaction events
        'large_transaction_alert', 'recurring_transaction_reminder', 'transaction_categorization_suggestion', 'monthly_spending_summary',
        -- System events
        'system_maintenance', 'feature_announcement', 'security_alert'
    )),
    
    -- Content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Priority and presentation
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'success')),
    
    -- User interaction tracking
    is_read BOOLEAN DEFAULT false,
    is_actionable BOOLEAN DEFAULT false,
    action_url TEXT,
    action_text TEXT,
    
    -- Related entity references
    related_budget_id UUID REFERENCES public.budgets(id) ON DELETE SET NULL,
    related_goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
    related_family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
    related_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    
    -- Event-specific metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Lifecycle management
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    read_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    -- Performance tracking
    delivered_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ
);

-- =====================================================
-- NOTIFICATION PREFERENCES TABLE
-- =====================================================

-- User-specific notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    
    -- Budget notification preferences
    budget_threshold_warnings BOOLEAN DEFAULT true,
    budget_exceeded_alerts BOOLEAN DEFAULT true,
    budget_period_expiring BOOLEAN DEFAULT true,
    budget_monthly_summaries BOOLEAN DEFAULT true,
    
    -- Goal notification preferences
    goal_milestone_alerts BOOLEAN DEFAULT true,
    goal_completion_celebrations BOOLEAN DEFAULT true,
    goal_deadline_reminders BOOLEAN DEFAULT true,
    goal_contribution_confirmations BOOLEAN DEFAULT true,
    
    -- Family notification preferences
    family_invitations BOOLEAN DEFAULT true,
    family_member_activity BOOLEAN DEFAULT false,
    family_role_changes BOOLEAN DEFAULT true,
    family_shared_goal_updates BOOLEAN DEFAULT true,
    
    -- Transaction notification preferences
    large_transaction_alerts BOOLEAN DEFAULT true,
    recurring_transaction_reminders BOOLEAN DEFAULT false,
    categorization_suggestions BOOLEAN DEFAULT true,
    monthly_spending_summaries BOOLEAN DEFAULT true,
    
    -- Delivery preferences
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    in_app_notifications BOOLEAN DEFAULT true,
    
    -- Threshold configurations
    large_transaction_threshold DECIMAL(15, 4) DEFAULT 5000.00,
    budget_warning_threshold DECIMAL(3, 2) DEFAULT 0.80,
    
    -- Quiet hours (JSON format: {"start": "22:00", "end": "08:00", "timezone": "Asia/Manila"})
    quiet_hours JSONB DEFAULT '{"enabled": false}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================================================
-- NOTIFICATION DELIVERY LOG TABLE
-- =====================================================

-- Track notification delivery attempts and success rates
CREATE TABLE IF NOT EXISTS public.notification_delivery_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    notification_id UUID REFERENCES public.user_notifications(id) ON DELETE CASCADE NOT NULL,
    
    -- Delivery details
    delivery_method TEXT NOT NULL CHECK (delivery_method IN ('in_app', 'email', 'push')),
    delivery_status TEXT NOT NULL CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    
    -- Timing
    attempted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    delivered_at TIMESTAMPTZ,
    
    -- Error tracking
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- External service tracking
    external_id TEXT, -- For email service, push service IDs
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- NOTIFICATION TEMPLATES TABLE
-- =====================================================

-- Predefined templates for consistent notification formatting
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Template identification
    template_key TEXT UNIQUE NOT NULL,
    notification_type TEXT NOT NULL,
    event_type TEXT NOT NULL,
    
    -- Template content with placeholders
    title_template TEXT NOT NULL,
    message_template TEXT NOT NULL,
    
    -- Default settings
    default_priority TEXT DEFAULT 'medium',
    default_severity TEXT DEFAULT 'info',
    is_actionable BOOLEAN DEFAULT false,
    action_url_template TEXT,
    action_text_template TEXT,
    
    -- Template configuration
    is_active BOOLEAN DEFAULT true,
    requires_approval BOOLEAN DEFAULT false,
    
    -- Lifecycle
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT unique_template_event UNIQUE(notification_type, event_type)
);

-- =====================================================
-- NOTIFICATION AGGREGATION RULES TABLE
-- =====================================================

-- Rules for combining similar notifications to prevent spam
CREATE TABLE IF NOT EXISTS public.notification_aggregation_rules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Rule identification
    rule_name TEXT UNIQUE NOT NULL,
    notification_type TEXT NOT NULL,
    event_type TEXT NOT NULL,
    
    -- Aggregation settings
    time_window_minutes INTEGER DEFAULT 60,
    max_notifications_per_window INTEGER DEFAULT 3,
    aggregation_strategy TEXT DEFAULT 'combine' CHECK (aggregation_strategy IN ('combine', 'suppress', 'delay')),
    
    -- Combined notification template
    combined_title_template TEXT,
    combined_message_template TEXT,
    
    -- Rule configuration
    is_active BOOLEAN DEFAULT true,
    priority_override TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User notifications indexes
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON public.user_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_event_type ON public.user_notifications(event_type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON public.user_notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON public.user_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_user_notifications_priority ON public.user_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_user_notifications_expires_at ON public.user_notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread_created ON public.user_notifications(user_id, is_read, created_at) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_type_created ON public.user_notifications(user_id, notification_type, created_at);

-- Notification preferences indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- Delivery log indexes
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_notification_id ON public.notification_delivery_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_status ON public.notification_delivery_log(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_method ON public.notification_delivery_log(delivery_method);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_attempted_at ON public.notification_delivery_log(attempted_at);

-- Template and aggregation indexes
CREATE INDEX IF NOT EXISTS idx_notification_templates_type_event ON public.notification_templates(notification_type, event_type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON public.notification_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_notification_aggregation_rules_type_event ON public.notification_aggregation_rules(notification_type, event_type);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to create a notification with template support
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_notification_type TEXT,
    p_event_type TEXT,
    p_template_data JSONB DEFAULT '{}'::jsonb,
    p_related_budget_id UUID DEFAULT NULL,
    p_related_goal_id UUID DEFAULT NULL,
    p_related_family_id UUID DEFAULT NULL,
    p_related_transaction_id UUID DEFAULT NULL,
    p_expires_in_hours INTEGER DEFAULT 168 -- 7 days default
) RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
    v_template RECORD;
    v_title TEXT;
    v_message TEXT;
    v_action_url TEXT;
    v_action_text TEXT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Get template for this notification type and event
    SELECT * INTO v_template
    FROM public.notification_templates
    WHERE notification_type = p_notification_type
    AND event_type = p_event_type
    AND is_active = true
    LIMIT 1;
    
    -- If no template found, create basic notification
    IF v_template IS NULL THEN
        v_title := COALESCE(p_template_data->>'title', 'Notification');
        v_message := COALESCE(p_template_data->>'message', 'You have a new notification');
        v_action_url := p_template_data->>'action_url';
        v_action_text := p_template_data->>'action_text';
    ELSE
        -- Use template with data substitution (simple placeholder replacement)
        v_title := v_template.title_template;
        v_message := v_template.message_template;
        v_action_url := v_template.action_url_template;
        v_action_text := v_template.action_text_template;
        
        -- Dynamic placeholder replacement for all template_data fields
        DECLARE
            v_key TEXT;
            v_value TEXT;
        BEGIN
            -- Iterate through all keys in template_data and replace placeholders
            FOR v_key IN SELECT jsonb_object_keys(p_template_data)
            LOOP
                v_value := p_template_data->>v_key;
                IF v_value IS NOT NULL THEN
                    v_title := REPLACE(v_title, '{' || v_key || '}', v_value);
                    v_message := REPLACE(v_message, '{' || v_key || '}', v_value);
                    v_action_url := REPLACE(v_action_url, '{' || v_key || '}', v_value);
                    v_action_text := REPLACE(v_action_text, '{' || v_key || '}', v_value);
                END IF;
            END LOOP;
        END;
    END IF;
    
    -- Calculate expiration
    IF p_expires_in_hours > 0 THEN
        v_expires_at := now() + (p_expires_in_hours || ' hours')::INTERVAL;
    END IF;
    
    -- Insert notification
    INSERT INTO public.user_notifications (
        user_id,
        notification_type,
        event_type,
        title,
        message,
        priority,
        severity,
        is_actionable,
        action_url,
        action_text,
        related_budget_id,
        related_goal_id,
        related_family_id,
        related_transaction_id,
        metadata,
        expires_at
    ) VALUES (
        p_user_id,
        p_notification_type,
        p_event_type,
        v_title,
        v_message,
        COALESCE(v_template.default_priority, 'medium'),
        COALESCE(v_template.default_severity, 'info'),
        COALESCE(v_template.is_actionable, false),
        v_action_url,
        v_action_text,
        p_related_budget_id,
        p_related_goal_id,
        p_related_family_id,
        p_related_transaction_id,
        p_template_data,
        v_expires_at
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(
    p_notification_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_updated INTEGER;
BEGIN
    UPDATE public.user_notifications
    SET is_read = true, read_at = now()
    WHERE id = p_notification_id 
    AND user_id = p_user_id 
    AND is_read = false;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired notifications
CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications() RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM public.user_notifications
    WHERE expires_at IS NOT NULL 
    AND expires_at < now()
    AND is_read = true; -- Only delete read expired notifications
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user notification count
CREATE OR REPLACE FUNCTION public.get_user_notification_count(
    p_user_id UUID,
    p_unread_only BOOLEAN DEFAULT true
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF p_unread_only THEN
        SELECT COUNT(*) INTO v_count
        FROM public.user_notifications
        WHERE user_id = p_user_id 
        AND is_read = false
        AND (expires_at IS NULL OR expires_at > now());
    ELSE
        SELECT COUNT(*) INTO v_count
        FROM public.user_notifications
        WHERE user_id = p_user_id
        AND (expires_at IS NULL OR expires_at > now());
    END IF;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update notification preferences timestamp
CREATE OR REPLACE FUNCTION public.update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_notification_preferences_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_notification_preferences_updated_at();

-- Trigger to create default notification preferences for new users
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to auth.users table (will only work if RLS allows)
-- This trigger may need to be created manually in Supabase dashboard
-- CREATE TRIGGER tr_create_default_notification_preferences
--     AFTER INSERT ON auth.users
--     FOR EACH ROW
--     EXECUTE FUNCTION public.create_default_notification_preferences();

-- =====================================================
-- DEFAULT NOTIFICATION TEMPLATES
-- =====================================================

-- Insert default notification templates
DO $$
BEGIN
    -- Budget notification templates
    INSERT INTO public.notification_templates (
        template_key, notification_type, event_type, title_template, message_template, 
        default_priority, default_severity, is_actionable, action_text_template
    ) VALUES
    ('budget_threshold_warning', 'budget', 'budget_threshold_warning', 
     'Budget Alert: {budget_name}', 
     'Your {budget_name} budget has reached {percentage}% ({amount} of {budget_amount})', 
     'high', 'warning', true, 'Review Budget'),
    ('budget_exceeded', 'budget', 'budget_exceeded', 
     'Budget Exceeded: {budget_name}', 
     'You have exceeded your {budget_name} budget by {amount_over}', 
     'urgent', 'error', true, 'Adjust Budget'),
    ('budget_period_expiring', 'budget', 'budget_period_expiring', 
     'Budget Expiring: {budget_name}', 
     'Your {budget_name} budget expires in {days_left} days. Current spending: {spent_amount} of {budget_amount}', 
     'medium', 'warning', true, 'Review Budget'),
    ('budget_monthly_summary', 'budget', 'budget_monthly_summary', 
     'Monthly Budget Summary', 
     'Your budget summary for {month}: {total_budgets} budgets, {total_spent} spent of {total_budget} budgeted ({spending_percentage}%)', 
     'low', 'info', false, NULL),
     
    -- Goal notification templates
    ('goal_milestone_25', 'goal', 'goal_milestone_25', 
     'Goal Milestone: 25% Complete!', 
     'Congratulations! Your {goal_name} goal is now 25% complete ({current_amount} of {target_amount})', 
     'medium', 'success', false, NULL),
    ('goal_milestone_50', 'goal', 'goal_milestone_50', 
     'Goal Milestone: Halfway There!', 
     'Amazing progress! Your {goal_name} goal is now 50% complete ({current_amount} of {target_amount})', 
     'medium', 'success', false, NULL),
    ('goal_milestone_75', 'goal', 'goal_milestone_75', 
     'Goal Milestone: 75% Complete!', 
     'You are so close! Your {goal_name} goal is now 75% complete ({current_amount} of {target_amount})', 
     'medium', 'success', false, NULL),
    ('goal_completed', 'goal', 'goal_completed', 
     'Goal Achieved: {goal_name}!', 
     'Congratulations! You have successfully completed your {goal_name} goal of {target_amount}!', 
     'high', 'success', true, 'View Goal'),
    ('goal_deadline_warning', 'goal', 'goal_deadline_warning', 
     'Goal Deadline Approaching: {goal_name}', 
     'Your {goal_name} goal deadline is in {days_left} days. You need {amount_needed} more to reach your target of {target_amount}', 
     'medium', 'warning', true, 'Update Goal'),
    ('goal_contribution_added', 'goal', 'goal_contribution_added', 
     'Contribution Added to {goal_name}', 
     'Great job! You added {amount} to your {goal_name} goal. Progress: {current_amount} of {target_amount} ({percentage}%)', 
     'low', 'success', false, NULL),
     
    -- Family notification templates
    ('family_invitation_received', 'family', 'family_invitation_received', 
     'Family Budget Invitation', 
     'You have been invited by {inviter_name} to join {family_name} budget group as {role}', 
     'medium', 'info', true, 'View Invitation'),
    ('family_invitation_accepted', 'family', 'family_invitation_accepted', 
     'Invitation Accepted', 
     '{respondent_name} has accepted your invitation to join {family_name}', 
     'medium', 'success', false, NULL),
    ('family_invitation_declined', 'family', 'family_invitation_declined', 
     'Invitation Declined', 
     '{respondent_name} has declined your invitation to join {family_name}', 
     'low', 'info', false, NULL),
    ('family_member_joined', 'family', 'family_member_joined', 
     'New Family Member', 
     '{member_name} has joined your {family_name} budget group as {role}', 
     'low', 'info', false, NULL),
    ('family_member_left', 'family', 'family_member_left', 
     'Family Member Left', 
     '{member_name} has left your {family_name} budget group', 
     'low', 'info', false, NULL),
    ('family_role_changed', 'family', 'family_role_changed', 
     'Role Updated', 
     'Your role in {family_name} has been changed from {old_role} to {new_role} by {changed_by_name}', 
     'medium', 'info', false, NULL),
    ('family_activity_update', 'family', 'family_activity_update', 
     'Family Activity: {family_name}', 
     '{actor_name} {action} in {family_name}: {description}', 
     'low', 'info', false, NULL),
     
    -- Transaction notification templates
    ('large_transaction_alert', 'transaction', 'large_transaction_alert', 
     'Large Transaction Detected', 
     'A large transaction of {amount} was recorded in {account_name} and may need categorization: {description}', 
     'medium', 'warning', true, 'Categorize Transaction'),
    ('transaction_categorization_suggestion', 'transaction', 'transaction_categorization_suggestion', 
     'Categorization Suggestion', 
     'We suggest categorizing "{description}" ({amount}) as {suggested_category} ({confidence_percentage}% confidence)', 
     'low', 'info', true, 'Categorize'),
    ('monthly_spending_summary', 'transaction', 'monthly_spending_summary', 
     'Monthly Spending Summary', 
     'Your spending summary for {month}: Income {total_income}, Expenses {total_expenses}, Net {net_amount} (Savings rate: {savings_rate}%)', 
     'low', 'info', false, NULL)
    ON CONFLICT (notification_type, event_type) DO NOTHING;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all notification tables
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- User notifications policies
CREATE POLICY "Users can view their own notifications"
    ON public.user_notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON public.user_notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Notification preferences policies
CREATE POLICY "Users can manage their own notification preferences"
    ON public.notification_preferences FOR ALL
    USING (auth.uid() = user_id);

-- Delivery log policies (read-only for users)
CREATE POLICY "Users can view their notification delivery logs"
    ON public.notification_delivery_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_notifications
            WHERE id = notification_id AND user_id = auth.uid()
        )
    );

-- Admin policies for templates and rules
CREATE POLICY "Admins can manage notification templates"
    ON public.notification_templates FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can manage aggregation rules"
    ON public.notification_aggregation_rules FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- Public read access for templates (for system use)
CREATE POLICY "System can read active templates"
    ON public.notification_templates FOR SELECT
    USING (is_active = true);

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON public.user_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT SELECT ON public.notification_delivery_log TO authenticated;
GRANT SELECT ON public.notification_templates TO authenticated;
GRANT SELECT ON public.notification_aggregation_rules TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_notification_count TO authenticated;

-- =====================================================
-- MODULE COMMENTS
-- =====================================================

COMMENT ON TABLE public.user_notifications IS 'Comprehensive user notification system supporting all modules';
COMMENT ON TABLE public.notification_preferences IS 'User-specific notification preferences and settings';
COMMENT ON TABLE public.notification_delivery_log IS 'Tracks notification delivery attempts and success rates';
COMMENT ON TABLE public.notification_templates IS 'Predefined templates for consistent notification formatting';
COMMENT ON TABLE public.notification_aggregation_rules IS 'Rules for combining similar notifications to prevent spam';

COMMENT ON FUNCTION public.create_notification IS 'Creates a notification using templates with data substitution';
COMMENT ON FUNCTION public.mark_notification_read IS 'Marks a notification as read for a specific user';
COMMENT ON FUNCTION public.cleanup_expired_notifications IS 'Removes expired notifications to maintain performance';
COMMENT ON FUNCTION public.get_user_notification_count IS 'Gets notification count for a user, optionally unread only';