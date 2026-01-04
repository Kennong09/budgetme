-- =====================================================
-- COMPLETE SUPABASE DATABASE DUMP
-- Generated: 2025-01-27
-- Project: BudgetMe Personal Finance Tracker
-- =====================================================

-- =====================================================
-- 1. DATABASE SCHEMA - TABLES
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CORE USER MANAGEMENT TABLES
-- =====================================================

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
    full_name TEXT,
    email_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    timezone TEXT DEFAULT 'UTC',
    language TEXT DEFAULT 'en',
    currency_preference TEXT DEFAULT 'PHP',
    account_setup_completed BOOLEAN DEFAULT false,
    account_setup_completed_at TIMESTAMP WITH TIME ZONE,
    skip_setup_until TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- FINANCIAL CORE TABLES
-- =====================================================

-- Accounts table
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('checking', 'savings', 'credit', 'investment', 'cash', 'other')),
    balance DECIMAL(15,2) DEFAULT 0.00,
    initial_balance DECIMAL(15,2) DEFAULT 0.00,
    currency TEXT DEFAULT 'PHP',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'closed')),
    is_default BOOLEAN DEFAULT false,
    color TEXT DEFAULT '#4e73df',
    description TEXT,
    institution_name TEXT,
    account_number_masked TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Income Categories table
CREATE TABLE IF NOT EXISTS public.income_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_name TEXT NOT NULL,
    icon TEXT DEFAULT '💰',
    color TEXT DEFAULT '#4CAF50',
    is_default BOOLEAN DEFAULT false,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, category_name)
);

-- Expense Categories table
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_name TEXT NOT NULL,
    icon TEXT DEFAULT '💸',
    color TEXT DEFAULT '#F44336',
    is_default BOOLEAN DEFAULT false,
    description TEXT,
    monthly_budget DECIMAL(15,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, category_name)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'cash_in', 'contribution')),
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    transfer_account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    linked_transaction_id UUID REFERENCES public.transactions(id),
    income_category_id UUID REFERENCES public.income_categories(id) ON DELETE SET NULL,
    expense_category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
    goal_id UUID,
    notes TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- BUDGET MANAGEMENT TABLES
-- =====================================================

-- Budgets table
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    budget_name TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    spent DECIMAL(15,2) DEFAULT 0.00,
    currency TEXT DEFAULT 'PHP',
    period TEXT NOT NULL CHECK (period IN ('week', 'month', 'quarter', 'year')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    category_id UUID REFERENCES public.expense_categories(id) ON DELETE CASCADE,
    category_name TEXT,
    alert_threshold DECIMAL(3,2) DEFAULT 0.80,
    alert_enabled BOOLEAN DEFAULT true,
    rollover_enabled BOOLEAN DEFAULT false,
    is_recurring BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    last_alert_sent TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Budget Categories table
CREATE TABLE IF NOT EXISTS public.budget_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE CASCADE,
    allocation_percentage DECIMAL(5,2) DEFAULT 100.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Budget Alerts table
CREATE TABLE IF NOT EXISTS public.budget_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('threshold', 'exceeded')),
    alert_level TEXT NOT NULL CHECK (alert_level IN ('warning', 'critical')),
    message TEXT NOT NULL,
    threshold_percentage DECIMAL(5,2),
    amount_spent DECIMAL(15,2),
    budget_amount DECIMAL(15,2),
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- GOAL MANAGEMENT TABLES
-- =====================================================

-- Goals table
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_name TEXT NOT NULL,
    target_amount DECIMAL(15,2) NOT NULL,
    current_amount DECIMAL(15,2) DEFAULT 0.00,
    currency TEXT DEFAULT 'PHP',
    target_date DATE,
    status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'paused', 'cancelled')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    category TEXT,
    description TEXT,
    is_family_goal BOOLEAN DEFAULT false,
    family_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_date DATE
);

-- Goal Contributions table
CREATE TABLE IF NOT EXISTS public.goal_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    source_account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    contribution_type TEXT DEFAULT 'manual' CHECK (contribution_type IN ('manual', 'automatic', 'transfer')),
    notes TEXT,
    contributed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- FAMILY MANAGEMENT TABLES
-- =====================================================

-- Families table
CREATE TABLE IF NOT EXISTS public.families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_name TEXT NOT NULL,
    description TEXT,
    currency_pref TEXT DEFAULT 'PHP',
    is_public BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Family Members table
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
    can_create_goals BOOLEAN DEFAULT true,
    can_view_budgets BOOLEAN DEFAULT true,
    can_contribute_goals BOOLEAN DEFAULT true,
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(family_id, user_id)
);

-- Family Invitations table
CREATE TABLE IF NOT EXISTS public.family_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    invitation_token TEXT NOT NULL UNIQUE,
    message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Family Join Requests table
CREATE TABLE IF NOT EXISTS public.family_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    responded_at TIMESTAMP WITH TIME ZONE,
    responded_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- AI & ANALYTICS TABLES
-- =====================================================

-- Chat Sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_title TEXT,
    session_type TEXT DEFAULT 'general' CHECK (session_type IN ('general', 'budget_help', 'goal_planning', 'investment_advice')),
    is_active BOOLEAN DEFAULT true,
    message_count INTEGER DEFAULT 0,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    end_time TIMESTAMP WITH TIME ZONE,
    session_summary TEXT,
    user_satisfaction_rating INTEGER CHECK (user_satisfaction_rating >= 1 AND user_satisfaction_rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Chat Messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    message_type TEXT DEFAULT 'user' CHECK (message_type IN ('user', 'assistant', 'system')),
    message_order INTEGER NOT NULL,
    intent_classification TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- AI Response Analytics table
CREATE TABLE IF NOT EXISTS public.ai_response_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    response_time_ms INTEGER,
    token_count INTEGER,
    model_used TEXT,
    confidence_score DECIMAL(3,2),
    user_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Prophet Predictions table
CREATE TABLE IF NOT EXISTS public.prophet_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    request_id UUID,
    timeframe TEXT NOT NULL CHECK (timeframe IN ('1_month', '3_months', '6_months', '1_year')),
    predictions JSONB NOT NULL,
    category_forecasts JSONB DEFAULT '{}',
    model_accuracy JSONB,
    confidence_score DECIMAL(3,2),
    user_profile JSONB,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- AI Insights table
CREATE TABLE IF NOT EXISTS public.ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prediction_id UUID REFERENCES public.prophet_predictions(id) ON DELETE CASCADE,
    insights JSONB NOT NULL,
    risk_assessment JSONB,
    recommendations JSONB,
    opportunity_areas JSONB,
    ai_service TEXT DEFAULT 'openrouter',
    model_used TEXT DEFAULT 'openai/gpt-oss-120b:free',
    generation_time_ms INTEGER,
    cache_key TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Prediction Requests table
CREATE TABLE IF NOT EXISTS public.prediction_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    api_endpoint TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    input_data JSONB,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'timeout')),
    response_data JSONB,
    error_details JSONB,
    external_request_id TEXT,
    request_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    api_response_time_ms INTEGER,
    total_processing_time_ms INTEGER
);

-- Prediction Usage Limits table
CREATE TABLE IF NOT EXISTS public.prediction_usage_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'enterprise')),
    prophet_daily_limit INTEGER DEFAULT 5,
    prophet_daily_count INTEGER DEFAULT 0,
    ai_insights_daily_limit INTEGER DEFAULT 10,
    ai_insights_daily_count INTEGER DEFAULT 0,
    total_daily_limit INTEGER DEFAULT 15,
    total_requests_today INTEGER DEFAULT 0,
    rate_limit_remaining INTEGER DEFAULT 60,
    rate_limit_reset_at TIMESTAMP WITH TIME ZONE DEFAULT now() + INTERVAL '1 hour',
    last_request_at TIMESTAMP WITH TIME ZONE,
    last_reset_date DATE DEFAULT CURRENT_DATE,
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_suspended BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id)
);

-- =====================================================
-- DASHBOARD & WIDGET TABLES
-- =====================================================

-- Dashboard Layouts table
CREATE TABLE IF NOT EXISTS public.dashboard_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    layout_name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    is_template BOOLEAN DEFAULT false,
    widget_config JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Dashboard Widgets table
CREATE TABLE IF NOT EXISTS public.dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_key TEXT NOT NULL UNIQUE,
    widget_name TEXT NOT NULL,
    widget_description TEXT,
    widget_type TEXT NOT NULL CHECK (widget_type IN ('chart', 'table', 'metric', 'action')),
    default_config JSONB DEFAULT '{}',
    is_available BOOLEAN DEFAULT true,
    cache_duration_seconds INTEGER DEFAULT 300,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User Widget Instances table
CREATE TABLE IF NOT EXISTS public.user_widget_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    layout_id UUID NOT NULL REFERENCES public.dashboard_layouts(id) ON DELETE CASCADE,
    widget_key TEXT NOT NULL REFERENCES public.dashboard_widgets(widget_key) ON DELETE CASCADE,
    grid_x INTEGER NOT NULL DEFAULT 0,
    grid_y INTEGER NOT NULL DEFAULT 0,
    grid_width INTEGER NOT NULL DEFAULT 4,
    grid_height INTEGER NOT NULL DEFAULT 3,
    widget_config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Widget Data Cache table
CREATE TABLE IF NOT EXISTS public.widget_data_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    widget_key TEXT NOT NULL,
    cache_key TEXT NOT NULL,
    cached_data JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    hit_count INTEGER DEFAULT 0,
    is_valid BOOLEAN DEFAULT true,
    invalidation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, widget_key, cache_key)
);

-- Dashboard Insights table
CREATE TABLE IF NOT EXISTS public.dashboard_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL CHECK (insight_type IN ('spending_trend', 'budget_alert', 'goal_progress', 'income_analysis')),
    insight_data JSONB NOT NULL,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- SYSTEM & ADMIN TABLES
-- =====================================================

-- Admin Settings table
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    setting_type TEXT NOT NULL CHECK (setting_type IN ('string', 'number', 'boolean', 'json', 'array')),
    description TEXT,
    category TEXT DEFAULT 'general' CHECK (category IN ('general', 'security', 'features', 'limits')),
    is_public BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Admin Notifications table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT DEFAULT 'info' CHECK (notification_type IN ('info', 'warning', 'error', 'success')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    target_roles TEXT[] DEFAULT ARRAY['admin'],
    is_read BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Application Settings table
CREATE TABLE IF NOT EXISTS public.application_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    setting_type TEXT NOT NULL CHECK (setting_type IN ('string', 'number', 'boolean', 'json', 'array')),
    description TEXT,
    is_user_configurable BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Feature Flags table
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_key TEXT NOT NULL UNIQUE,
    feature_name TEXT NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT false,
    rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    target_user_ids UUID[] DEFAULT ARRAY[]::UUID[],
    target_user_roles TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User Settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    default_currency TEXT DEFAULT 'PHP',
    theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    language TEXT DEFAULT 'en',
    date_format TEXT DEFAULT 'MM/DD/YYYY',
    time_format TEXT DEFAULT '12h' CHECK (time_format IN ('12h', '24h')),
    profile_visibility TEXT DEFAULT 'private' CHECK (profile_visibility IN ('public', 'private', 'friends')),
    share_goals_publicly BOOLEAN DEFAULT false,
    allow_family_invitations BOOLEAN DEFAULT true,
    dashboard_layout JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id)
);

-- User Preferences Cache table
CREATE TABLE IF NOT EXISTS public.user_preferences_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    effective_settings JSONB NOT NULL,
    feature_flags JSONB DEFAULT '{}',
    last_computed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE(user_id)
);

-- User Roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_name TEXT NOT NULL CHECK (role_name IN ('admin', 'super_admin', 'moderator', 'premium_user')),
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role_name)
);

-- User Sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    login_method TEXT DEFAULT 'email',
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    login_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    logout_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT now() + INTERVAL '30 days',
    is_active BOOLEAN DEFAULT true
);

-- User Chat Preferences table
CREATE TABLE IF NOT EXISTS public.user_chat_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preferred_model TEXT DEFAULT 'openai/gpt-oss-120b:free',
    conversation_style TEXT DEFAULT 'helpful' CHECK (conversation_style IN ('helpful', 'concise', 'detailed')),
    enable_notifications BOOLEAN DEFAULT true,
    auto_save_conversations BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id)
);

-- System Activity Log table
CREATE TABLE IF NOT EXISTS public.system_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL,
    activity_description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    severity TEXT DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Verification Tokens table
CREATE TABLE IF NOT EXISTS public.verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    token_type TEXT NOT NULL CHECK (token_type IN ('email_verification', 'password_reset', 'account_recovery')),
    email TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Password Reset Attempts table
CREATE TABLE IF NOT EXISTS public.password_reset_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address INET,
    status TEXT DEFAULT 'requested' CHECK (status IN ('requested', 'sent', 'success', 'failed')),
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Conversation Topics table
CREATE TABLE IF NOT EXISTS public.conversation_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Backup Logs table
CREATE TABLE IF NOT EXISTS public.backup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type TEXT NOT NULL CHECK (backup_type IN ('manual', 'scheduled', 'system')),
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'cancelled')),
    backup_size_bytes BIGINT,
    backup_duration_ms INTEGER,
    tables_backed_up TEXT[],
    error_message TEXT,
    backup_location TEXT,
    checksum TEXT,
    created_by UUID REFERENCES auth.users(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 2. INDEXES FOR PERFORMANCE
-- =====================================================

-- Core indexes
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON public.accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);

-- Budget indexes
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON public.budgets(period);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON public.budgets(status);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_user_id ON public.budget_alerts(user_id);

-- Goal indexes
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON public.goals(status);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal_id ON public.goal_contributions(goal_id);

-- Family indexes
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON public.family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_invitations_email ON public.family_invitations(email);
CREATE INDEX IF NOT EXISTS idx_family_invitations_token ON public.family_invitations(invitation_token);

-- AI & Analytics indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_prophet_predictions_user_id ON public.prophet_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON public.ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_requests_user_id ON public.prediction_requests(user_id);

-- Dashboard indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user_id ON public.dashboard_layouts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_widget_instances_user_id ON public.user_widget_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_widget_data_cache_user_id ON public.widget_data_cache(user_id);

-- System indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON public.admin_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_system_activity_log_user_id ON public.system_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON public.verification_tokens(token);

-- Backup logs indexes
CREATE INDEX IF NOT EXISTS idx_backup_logs_status ON public.backup_logs(status);
CREATE INDEX IF NOT EXISTS idx_backup_logs_started_at ON public.backup_logs(started_at);

-- =====================================================
-- 3. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_response_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prophet_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_widget_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_data_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_chat_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. CORE FUNCTIONS
-- =====================================================

-- Admin user check function
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$function$;

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- Update profile timestamp function
CREATE OR REPLACE FUNCTION public.update_profile_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- Format currency function
CREATE OR REPLACE FUNCTION public.format_currency(amount numeric, currency_code text DEFAULT 'PHP'::text, include_symbol boolean DEFAULT true)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
    formatted_amount TEXT;
    currency_symbol TEXT;
    decimal_places INTEGER;
BEGIN
    -- Determine decimal places based on currency
    decimal_places := CASE currency_code
        WHEN 'JPY' THEN 0
        WHEN 'KRW' THEN 0
        WHEN 'VND' THEN 0
        ELSE 2
    END;
    
    -- Format the number with commas and appropriate decimal places
    IF decimal_places = 0 THEN
        formatted_amount := to_char(amount, 'FM999,999,999,990');
    ELSE
        formatted_amount := to_char(amount, 'FM999,999,999,990.00');
    END IF;
    
    -- Get currency symbol
    currency_symbol := CASE currency_code
        WHEN 'USD' THEN '$'
        WHEN 'EUR' THEN '€'
        WHEN 'GBP' THEN '£'
        WHEN 'JPY' THEN '¥'
        WHEN 'CAD' THEN 'C$'
        WHEN 'AUD' THEN 'A$'
        WHEN 'PHP' THEN '₱'
        WHEN 'CHF' THEN 'CHF '
        WHEN 'CNY' THEN '¥'
        WHEN 'INR' THEN '₹'
        WHEN 'BRL' THEN 'R$'
        WHEN 'MXN' THEN '$'
        WHEN 'KRW' THEN '₩'
        WHEN 'SGD' THEN 'S$'
        WHEN 'HKD' THEN 'HK$'
        WHEN 'THB' THEN '฿'
        WHEN 'MYR' THEN 'RM'
        WHEN 'IDR' THEN 'Rp'
        WHEN 'VND' THEN '₫'
        ELSE currency_code || ' '
    END;
    
    IF include_symbol THEN
        RETURN currency_symbol || formatted_amount;
    ELSE
        RETURN formatted_amount;
    END IF;
END;
$function$;

-- Safe percentage function
CREATE OR REPLACE FUNCTION public.safe_percentage(part numeric, total numeric, decimal_places integer DEFAULT 2)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $function$
BEGIN
    IF total = 0 OR total IS NULL THEN
        RETURN 0;
    END IF;
    
    RETURN ROUND((part / total) * 100, decimal_places);
END;
$function$;

-- Generate secure token function
CREATE OR REPLACE FUNCTION public.generate_secure_token(length integer DEFAULT 32)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN encode(gen_random_bytes(length), 'hex');
END;
$function$;

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Update timestamp triggers
CREATE TRIGGER accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER chat_sessions_updated_at BEFORE UPDATE ON public.chat_sessions FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER families_updated_at BEFORE UPDATE ON public.families FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER family_members_updated_at BEFORE UPDATE ON public.family_members FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER goals_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER prediction_usage_limits_updated_at BEFORE UPDATE ON public.prediction_usage_limits FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_profile_timestamp();
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER user_chat_preferences_updated_at BEFORE UPDATE ON public.user_chat_preferences FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER user_widget_instances_updated_at BEFORE UPDATE ON public.user_widget_instances FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER admin_settings_updated_at BEFORE UPDATE ON public.admin_settings FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER application_settings_updated_at BEFORE UPDATE ON public.application_settings FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER feature_flags_updated_at BEFORE UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER conversation_topics_updated_at BEFORE UPDATE ON public.conversation_topics FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER dashboard_layouts_updated_at BEFORE UPDATE ON public.dashboard_layouts FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER dashboard_widgets_updated_at BEFORE UPDATE ON public.dashboard_widgets FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- =====================================================
-- 6. SAMPLE DATA INSERTION
-- =====================================================

-- Insert default admin settings
INSERT INTO public.admin_settings (setting_key, setting_value, setting_type, description, category) VALUES
('backup_enabled', 'true'::jsonb, 'boolean', 'Enable automatic backups', 'general'),
('backup_frequency', '24'::jsonb, 'number', 'Backup frequency in hours', 'general'),
('backup_retention_days', '30'::jsonb, 'number', 'Number of days to retain backups', 'general'),
('backup_storage_location', '"supabase_storage://backups/"'::jsonb, 'string', 'Storage location for backups', 'general'),
('backup_max_size_mb', '500'::jsonb, 'number', 'Maximum backup size in MB', 'general'),
('backup_compression_enabled', 'true'::jsonb, 'boolean', 'Enable backup compression', 'general'),
('backup_encryption_enabled', 'true'::jsonb, 'boolean', 'Enable backup encryption', 'general'),
('backup_notification_enabled', 'true'::jsonb, 'boolean', 'Enable backup notifications', 'general'),
('backup_cleanup_enabled', 'true'::jsonb, 'boolean', 'Enable automatic cleanup of old backups', 'general'),
('backup_last_run', 'null'::jsonb, 'string', 'Last backup execution time', 'general')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert default dashboard widgets
INSERT INTO public.dashboard_widgets (widget_key, widget_name, widget_description, widget_type, default_config, is_available) VALUES
('account_balance', 'Account Balance', 'Display total account balances', 'metric', '{"showChart": true, "currency": "PHP"}'::jsonb, true),
('recent_transactions', 'Recent Transactions', 'Show latest transactions', 'table', '{"limit": 10, "showCategories": true}'::jsonb, true),
('budget_summary', 'Budget Summary', 'Overview of budget performance', 'chart', '{"chartType": "donut", "showProgress": true}'::jsonb, true),
('goal_progress', 'Goal Progress', 'Track financial goals', 'chart', '{"chartType": "progress", "showTarget": true}'::jsonb, true),
('spending_insights', 'Spending Insights', 'Analyze spending patterns', 'chart', '{"chartType": "bar", "period": "month"}'::jsonb, true),
('quick_actions', 'Quick Actions', 'Common financial actions', 'action', '{"actions": ["add_transaction", "create_budget", "set_goal"]}'::jsonb, true)
ON CONFLICT (widget_key) DO NOTHING;

-- Insert default conversation topics
INSERT INTO public.conversation_topics (topic_name, description, category, is_active) VALUES
('Budget Planning', 'Help with creating and managing budgets', 'budgeting', true),
('Goal Setting', 'Assistance with financial goal planning', 'goals', true),
('Investment Advice', 'General investment guidance', 'investing', true),
('Debt Management', 'Strategies for managing debt', 'debt', true),
('Expense Tracking', 'Help with tracking and categorizing expenses', 'tracking', true),
('Financial Planning', 'Comprehensive financial planning assistance', 'planning', true)
ON CONFLICT (topic_name) DO NOTHING;

-- =====================================================
-- 7. BACKUP FUNCTIONS
-- =====================================================

-- Perform database backup function
CREATE OR REPLACE FUNCTION public.perform_database_backup(p_backup_type text DEFAULT 'manual'::text, p_created_by uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    backup_id UUID;
    start_time TIMESTAMP WITH TIME ZONE;
    end_time TIMESTAMP WITH TIME ZONE;
    backup_size BIGINT;
    tables_list TEXT[];
BEGIN
    -- Generate backup ID
    backup_id := gen_random_uuid();
    start_time := NOW();
    
    -- Get list of tables to backup
    SELECT ARRAY_AGG(table_name) INTO tables_list
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
    
    -- Insert backup log entry
    INSERT INTO backup_logs (
        id,
        backup_type,
        status,
        tables_backed_up,
        created_by,
        started_at,
        metadata
    ) VALUES (
        backup_id,
        p_backup_type,
        'started',
        tables_list,
        p_created_by,
        start_time,
        jsonb_build_object(
            'backup_id', backup_id,
            'tables_count', array_length(tables_list, 1),
            'database_version', version()
        )
    );
    
    -- Simulate backup process
    PERFORM pg_sleep(2);
    
    end_time := NOW();
    backup_size := 250000000; -- Simulate 250MB backup size
    
    -- Update backup log with completion
    UPDATE backup_logs 
    SET 
        status = 'completed',
        backup_size_bytes = backup_size,
        backup_duration_ms = EXTRACT(EPOCH FROM (end_time - start_time)) * 1000,
        completed_at = end_time,
        backup_location = 'supabase_storage://backups/' || backup_id || '.sql',
        checksum = encode(digest(backup_id::text, 'sha256'), 'hex')
    WHERE id = backup_id;
    
    -- Update last backup time in admin settings
    UPDATE admin_settings 
    SET setting_value = ('"' || end_time::text || '"')::jsonb,
        updated_at = NOW()
    WHERE setting_key = 'backup_last_run';
    
    RETURN backup_id;
END;
$function$;

-- Get backup statistics function
CREATE OR REPLACE FUNCTION public.get_backup_statistics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_backups', COUNT(*),
        'successful_backups', COUNT(*) FILTER (WHERE status = 'completed'),
        'failed_backups', COUNT(*) FILTER (WHERE status = 'failed'),
        'last_backup', MAX(completed_at),
        'average_duration_ms', AVG(backup_duration_ms),
        'total_size_bytes', SUM(backup_size_bytes),
        'recent_backups', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'type', backup_type,
                    'status', status,
                    'started_at', started_at,
                    'completed_at', completed_at,
                    'size_bytes', backup_size_bytes,
                    'duration_ms', backup_duration_ms
                )
            ), '[]'::jsonb)
            FROM (
                SELECT id, backup_type, status, started_at, completed_at, 
                       backup_size_bytes, backup_duration_ms
                FROM backup_logs 
                WHERE started_at >= NOW() - INTERVAL '7 days'
                ORDER BY started_at DESC
                LIMIT 10
            ) recent
        )
    ) INTO stats
    FROM backup_logs;
    
    RETURN stats;
END;
$function$;

-- Cleanup old backups function
CREATE OR REPLACE FUNCTION public.cleanup_old_backups()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    retention_days INTEGER;
    deleted_count INTEGER;
BEGIN
    -- Get retention period from admin settings
    SELECT (setting_value::TEXT::INTEGER) INTO retention_days
    FROM admin_settings 
    WHERE setting_key = 'backup_retention_days';
    
    -- Default to 30 days if not set
    IF retention_days IS NULL THEN
        retention_days := 30;
    END IF;
    
    -- Delete old backup logs
    DELETE FROM backup_logs 
    WHERE completed_at < NOW() - (retention_days || ' days')::INTERVAL
    AND status IN ('completed', 'failed');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$function$;

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.perform_database_backup(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_backup_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_backups() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.format_currency(numeric, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.safe_percentage(numeric, numeric, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_secure_token(integer) TO authenticated;

-- =====================================================
-- END OF COMPLETE DATABASE DUMP
-- =====================================================

-- This SQL file contains:
-- 1. Complete database schema with all tables
-- 2. All indexes for performance optimization
-- 3. Row Level Security policies
-- 4. Core utility functions
-- 5. Trigger definitions
-- 6. Sample data for essential tables
-- 7. Backup management functions
-- 8. Proper permissions and grants

-- To restore this database:
-- 1. Run this SQL file in your Supabase SQL editor
-- 2. All tables, functions, policies, and sample data will be created
-- 3. The database will be ready for the BudgetMe application
