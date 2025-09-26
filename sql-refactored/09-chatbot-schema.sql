-- =====================================================
-- CLEANUP: DROP EXISTING OBJECTS
-- =====================================================

-- Drop policies first
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own chat sessions" ON public.chat_sessions;
    DROP POLICY IF EXISTS "Users can manage their own chat messages" ON public.chat_messages;
    DROP POLICY IF EXISTS "Users can view analytics for their messages" ON public.ai_response_analytics;
    DROP POLICY IF EXISTS "Admins can view all analytics" ON public.ai_response_analytics;
    DROP POLICY IF EXISTS "Users can manage their own chat preferences" ON public.user_chat_preferences;
    DROP POLICY IF EXISTS "All users can view active topics" ON public.conversation_topics;
    DROP POLICY IF EXISTS "Admins can manage conversation topics" ON public.conversation_topics;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop triggers
DO $$ 
BEGIN
    DROP TRIGGER IF EXISTS chat_sessions_updated_at ON public.chat_sessions;
    DROP TRIGGER IF EXISTS user_chat_preferences_updated_at ON public.user_chat_preferences;
    DROP TRIGGER IF EXISTS conversation_topics_updated_at ON public.conversation_topics;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop functions
DO $$ 
BEGIN
    DROP FUNCTION IF EXISTS public.start_chat_session(UUID, TEXT, TEXT);
    DROP FUNCTION IF EXISTS public.add_chat_message(UUID, UUID, TEXT, TEXT, TEXT);
    DROP FUNCTION IF EXISTS public.end_chat_session(UUID, UUID, TEXT, INTEGER);
    DROP FUNCTION IF EXISTS public.initialize_chat_preferences(UUID);
    DROP FUNCTION IF EXISTS public.get_chat_analytics(INTEGER);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop views
DROP VIEW IF EXISTS public.recent_chat_sessions CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS public.idx_chat_sessions_user_id;
DROP INDEX IF EXISTS public.idx_chat_sessions_active;
DROP INDEX IF EXISTS public.idx_chat_sessions_type;
DROP INDEX IF EXISTS public.idx_chat_sessions_created_at;
DROP INDEX IF EXISTS public.idx_chat_sessions_start_time;
DROP INDEX IF EXISTS public.idx_chat_messages_session_id;
DROP INDEX IF EXISTS public.idx_chat_messages_user_id;
DROP INDEX IF EXISTS public.idx_chat_messages_type;
DROP INDEX IF EXISTS public.idx_chat_messages_order;
DROP INDEX IF EXISTS public.idx_chat_messages_created_at;
DROP INDEX IF EXISTS public.idx_chat_messages_feedback;
DROP INDEX IF EXISTS public.idx_ai_response_analytics_message_id;
DROP INDEX IF EXISTS public.idx_ai_response_analytics_model;
DROP INDEX IF EXISTS public.idx_ai_response_analytics_created_at;
DROP INDEX IF EXISTS public.idx_conversation_topics_category;
DROP INDEX IF EXISTS public.idx_conversation_topics_active;
DROP INDEX IF EXISTS public.idx_conversation_topics_usage;

-- Drop tables
DROP TABLE IF EXISTS public.conversation_topics CASCADE;
DROP TABLE IF EXISTS public.user_chat_preferences CASCADE;
DROP TABLE IF EXISTS public.ai_response_analytics CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_sessions CASCADE;

-- =====================================================
-- 04-CHATBOT-SCHEMA.SQL
-- =====================================================
-- Module: AI Chatbot Integration System
-- Purpose: AI chatbot interaction tracking, conversation history, and analytics
-- Dependencies: 02-auth-schema.sql, 08-predictions-schema.sql, 12-shared-schema.sql
-- Backend Service: aiInsightsService.ts, chatbotService.js
-- Frontend Components: src/components/chatbot/
-- =====================================================
-- Version: 1.0.0
-- Created: 2025-09-20
-- Compatible with: AI chatbot components, conversation tracking
-- =====================================================

-- =====================================================
-- CHAT SESSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Session identification
    session_title TEXT,
    session_type TEXT DEFAULT 'general' CHECK (session_type IN ('general', 'financial_advice', 'budget_help', 'goal_planning', 'transaction_query')),
    
    -- Session metadata
    start_time TIMESTAMPTZ DEFAULT now() NOT NULL,
    end_time TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    
    -- Context and state
    context_data JSONB DEFAULT '{}'::jsonb,
    session_summary TEXT,
    
    -- Analytics
    message_count INTEGER DEFAULT 0,
    user_satisfaction_rating INTEGER CHECK (user_satisfaction_rating BETWEEN 1 AND 5),
    
    -- AI model information
    ai_model_version TEXT DEFAULT '1.0',
    language TEXT DEFAULT 'en',
    
    -- Session settings
    auto_save_enabled BOOLEAN DEFAULT true,
    privacy_mode BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================================================
-- CHAT MESSAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Message content
    message_text TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('user', 'assistant', 'system', 'error')),
    
    -- Message metadata
    message_order INTEGER NOT NULL,
    parent_message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
    
    -- AI response details
    response_time_ms INTEGER,
    confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0.0 AND 1.0),
    intent_classification TEXT,
    
    -- Content analysis
    contains_financial_data BOOLEAN DEFAULT false,
    contains_sensitive_info BOOLEAN DEFAULT false,
    message_sentiment TEXT CHECK (message_sentiment IN ('positive', 'negative', 'neutral')),
    
    -- Interaction tracking
    user_feedback TEXT CHECK (user_feedback IN ('helpful', 'not_helpful', 'irrelevant')),
    user_feedback_comment TEXT,
    
    -- Processing metadata
    processed_by_ai BOOLEAN DEFAULT false,
    requires_human_review BOOLEAN DEFAULT false,
    
    -- Attachments and context
    attachments JSONB DEFAULT '[]'::jsonb,
    context_references JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Constraints
    UNIQUE(session_id, message_order)
);

-- =====================================================
-- AI RESPONSE ANALYTICS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ai_response_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE NOT NULL,
    
    -- Response generation metrics
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    processing_time_ms INTEGER,
    
    -- Quality metrics
    response_relevance_score DECIMAL(3,2),
    factual_accuracy_score DECIMAL(3,2),
    helpfulness_score DECIMAL(3,2),
    
    -- Model performance
    model_name TEXT,
    model_version TEXT,
    temperature DECIMAL(3,2),
    max_tokens INTEGER,
    
    -- Content analysis
    financial_concepts_mentioned TEXT[],
    action_items_generated TEXT[],
    follow_up_suggestions TEXT[],
    
    -- Error tracking
    generation_errors TEXT[],
    fallback_used BOOLEAN DEFAULT false,
    
    -- Cost tracking
    api_cost_cents INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================================================
-- USER CHAT PREFERENCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_chat_preferences (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    
    -- AI behavior preferences
    response_style TEXT DEFAULT 'balanced' CHECK (response_style IN ('concise', 'detailed', 'balanced')),
    formality_level TEXT DEFAULT 'casual' CHECK (formality_level IN ('formal', 'casual', 'friendly')),
    financial_advice_level TEXT DEFAULT 'basic' CHECK (financial_advice_level IN ('basic', 'intermediate', 'advanced')),
    
    -- Interaction preferences
    enable_auto_suggestions BOOLEAN DEFAULT true,
    enable_context_memory BOOLEAN DEFAULT true,
    enable_proactive_tips BOOLEAN DEFAULT false,
    
    -- Privacy settings
    save_conversation_history BOOLEAN DEFAULT true,
    share_anonymized_data BOOLEAN DEFAULT false,
    
    -- Notification preferences
    notify_on_new_features BOOLEAN DEFAULT true,
    weekly_ai_insights BOOLEAN DEFAULT false,
    
    -- Language and accessibility
    preferred_language TEXT DEFAULT 'en',
    enable_voice_responses BOOLEAN DEFAULT false,
    text_size_preference TEXT DEFAULT 'medium' CHECK (text_size_preference IN ('small', 'medium', 'large')),
    
    -- Custom settings
    custom_prompts JSONB DEFAULT '[]'::jsonb,
    blocked_topics TEXT[] DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================================================
-- CONVERSATION TOPICS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.conversation_topics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Topic identification
    topic_name TEXT UNIQUE NOT NULL,
    topic_category TEXT NOT NULL CHECK (topic_category IN ('budgeting', 'saving', 'investing', 'debt', 'goals', 'general')),
    description TEXT,
    
    -- Topic configuration
    is_active BOOLEAN DEFAULT true,
    requires_authentication BOOLEAN DEFAULT true,
    complexity_level TEXT DEFAULT 'basic' CHECK (complexity_level IN ('basic', 'intermediate', 'advanced')),
    
    -- Content guidelines
    suggested_prompts TEXT[],
    related_topics TEXT[],
    content_guidelines TEXT,
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    average_satisfaction DECIMAL(3,2),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Chat sessions indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_active ON public.chat_sessions(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_chat_sessions_type ON public.chat_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON public.chat_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_start_time ON public.chat_sessions(start_time);

-- Chat messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_type ON public.chat_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_chat_messages_order ON public.chat_messages(session_id, message_order);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_feedback ON public.chat_messages(user_feedback) WHERE user_feedback IS NOT NULL;

-- AI analytics indexes
CREATE INDEX IF NOT EXISTS idx_ai_response_analytics_message_id ON public.ai_response_analytics(message_id);
CREATE INDEX IF NOT EXISTS idx_ai_response_analytics_model ON public.ai_response_analytics(model_name);
CREATE INDEX IF NOT EXISTS idx_ai_response_analytics_created_at ON public.ai_response_analytics(created_at);

-- Conversation topics indexes
CREATE INDEX IF NOT EXISTS idx_conversation_topics_category ON public.conversation_topics(topic_category);
CREATE INDEX IF NOT EXISTS idx_conversation_topics_active ON public.conversation_topics(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_conversation_topics_usage ON public.conversation_topics(usage_count);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_response_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_chat_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_topics ENABLE ROW LEVEL SECURITY;

-- Chat sessions policies
CREATE POLICY "Users can manage their own chat sessions"
    ON public.chat_sessions FOR ALL
    USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Users can manage their own chat messages"
    ON public.chat_messages FOR ALL
    USING (auth.uid() = user_id);

-- AI analytics policies (admin and user access)
CREATE POLICY "Users can view analytics for their messages"
    ON public.ai_response_analytics FOR SELECT
    USING (
        message_id IN (
            SELECT id FROM public.chat_messages
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all analytics"
    ON public.ai_response_analytics FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- User chat preferences policies
CREATE POLICY "Users can manage their own chat preferences"
    ON public.user_chat_preferences FOR ALL
    USING (auth.uid() = user_id);

-- Conversation topics policies
CREATE POLICY "All users can view active topics"
    ON public.conversation_topics FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage conversation topics"
    ON public.conversation_topics FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER chat_sessions_updated_at
    BEFORE UPDATE ON public.chat_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER user_chat_preferences_updated_at
    BEFORE UPDATE ON public.user_chat_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER conversation_topics_updated_at
    BEFORE UPDATE ON public.conversation_topics
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- =====================================================
-- CHATBOT MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to start new chat session
CREATE OR REPLACE FUNCTION public.start_chat_session(
    p_user_id UUID,
    p_session_type TEXT DEFAULT 'general',
    p_session_title TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
    v_title TEXT;
BEGIN
    -- Generate session title if not provided
    v_title := COALESCE(
        p_session_title,
        'Chat Session - ' || to_char(now(), 'YYYY-MM-DD HH24:MI')
    );
    
    -- End any active sessions for the user
    UPDATE public.chat_sessions
    SET 
        is_active = false,
        end_time = now(),
        updated_at = now()
    WHERE user_id = p_user_id AND is_active = true;
    
    -- Create new session
    INSERT INTO public.chat_sessions (
        user_id, session_title, session_type
    ) VALUES (
        p_user_id, v_title, p_session_type
    ) RETURNING id INTO v_session_id;
    
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add message to chat session
CREATE OR REPLACE FUNCTION public.add_chat_message(
    p_session_id UUID,
    p_user_id UUID,
    p_message_text TEXT,
    p_message_type TEXT DEFAULT 'user',
    p_intent_classification TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_message_id UUID;
    v_message_order INTEGER;
BEGIN
    -- Get next message order
    SELECT COALESCE(MAX(message_order), 0) + 1
    INTO v_message_order
    FROM public.chat_messages
    WHERE session_id = p_session_id;
    
    -- Insert message
    INSERT INTO public.chat_messages (
        session_id, user_id, message_text, message_type, 
        message_order, intent_classification
    ) VALUES (
        p_session_id, p_user_id, p_message_text, p_message_type,
        v_message_order, p_intent_classification
    ) RETURNING id INTO v_message_id;
    
    -- Update session message count and last activity
    UPDATE public.chat_sessions
    SET 
        message_count = message_count + 1,
        updated_at = now()
    WHERE id = p_session_id;
    
    RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to end chat session
CREATE OR REPLACE FUNCTION public.end_chat_session(
    p_session_id UUID,
    p_user_id UUID,
    p_session_summary TEXT DEFAULT NULL,
    p_satisfaction_rating INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Verify session belongs to user
    IF NOT EXISTS (
        SELECT 1 FROM public.chat_sessions
        WHERE id = p_session_id AND user_id = p_user_id
    ) THEN
        RETURN false;
    END IF;
    
    -- Update session
    UPDATE public.chat_sessions
    SET 
        is_active = false,
        end_time = now(),
        session_summary = COALESCE(p_session_summary, session_summary),
        user_satisfaction_rating = COALESCE(p_satisfaction_rating, user_satisfaction_rating),
        updated_at = now()
    WHERE id = p_session_id AND user_id = p_user_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize user chat preferences
CREATE OR REPLACE FUNCTION public.initialize_chat_preferences(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.user_chat_preferences (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get chat analytics for admin
CREATE OR REPLACE FUNCTION public.get_chat_analytics(
    p_days_back INTEGER DEFAULT 7
)
RETURNS JSONB AS $$
DECLARE
    v_analytics JSONB;
BEGIN
    -- Verify admin access
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;
    
    SELECT jsonb_build_object(
        'total_sessions', COUNT(DISTINCT cs.id),
        'total_messages', COUNT(cm.id),
        'active_users', COUNT(DISTINCT cs.user_id),
        'avg_session_length', AVG(EXTRACT(EPOCH FROM (cs.end_time - cs.start_time))/60),
        'avg_messages_per_session', AVG(cs.message_count),
        'satisfaction_rating', AVG(cs.user_satisfaction_rating),
        'top_session_types', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'type', session_type,
                    'count', type_count
                )
            )
            FROM (
                SELECT session_type, COUNT(*) as type_count
                FROM public.chat_sessions
                WHERE created_at >= CURRENT_DATE - (p_days_back || ' days')::INTERVAL
                GROUP BY session_type
                ORDER BY type_count DESC
                LIMIT 5
            ) types
        ),
        'daily_usage', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'date', usage_date,
                    'sessions', session_count,
                    'messages', message_count
                ) ORDER BY usage_date
            )
            FROM (
                SELECT 
                    DATE(cs.created_at) as usage_date,
                    COUNT(DISTINCT cs.id) as session_count,
                    COUNT(cm.id) as message_count
                FROM public.chat_sessions cs
                LEFT JOIN public.chat_messages cm ON cs.id = cm.session_id
                WHERE cs.created_at >= CURRENT_DATE - (p_days_back || ' days')::INTERVAL
                GROUP BY DATE(cs.created_at)
                ORDER BY usage_date
            ) daily
        )
    ) INTO v_analytics
    FROM public.chat_sessions cs
    LEFT JOIN public.chat_messages cm ON cs.id = cm.session_id
    WHERE cs.created_at >= CURRENT_DATE - (p_days_back || ' days')::INTERVAL;
    
    RETURN v_analytics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS
-- =====================================================

-- Recent chat sessions view
CREATE OR REPLACE VIEW public.recent_chat_sessions AS
SELECT
    cs.id,
    cs.user_id,
    cs.session_title,
    cs.session_type,
    cs.start_time,
    cs.end_time,
    cs.is_active,
    cs.message_count,
    cs.user_satisfaction_rating,
    
    -- Last message preview
    (
        SELECT cm.message_text
        FROM public.chat_messages cm
        WHERE cm.session_id = cs.id
        ORDER BY cm.message_order DESC
        LIMIT 1
    ) as last_message,
    
    -- User info
    p.full_name as user_name,
    p.email as user_email
    
FROM public.chat_sessions cs
JOIN public.profiles p ON cs.user_id = p.id
WHERE cs.created_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY cs.start_time DESC;

-- =====================================================
-- INITIALIZATION DATA
-- =====================================================

-- Create default conversation topics
DO $$
BEGIN
    INSERT INTO public.conversation_topics (topic_name, topic_category, description, suggested_prompts) VALUES
    ('Budget Planning', 'budgeting', 'Help with creating and managing budgets', ARRAY['How do I create a budget?', 'What percentage should I allocate to different categories?']),
    ('Saving Strategies', 'saving', 'Tips and strategies for saving money', ARRAY['How can I save more money?', 'What are some effective saving strategies?']),
    ('Goal Setting', 'goals', 'Financial goal planning and tracking', ARRAY['How do I set realistic financial goals?', 'Help me plan for my vacation savings']),
    ('Debt Management', 'debt', 'Strategies for managing and reducing debt', ARRAY['How should I prioritize my debts?', 'What is the debt snowball method?']),
    ('Investment Basics', 'investing', 'Basic investment concepts and strategies', ARRAY['Where should I start investing?', 'What is diversification?']),
    ('General Finance', 'general', 'General financial questions and advice', ARRAY['How do I improve my financial health?', 'What financial habits should I develop?'])
    ON CONFLICT (topic_name) DO NOTHING;
END $$;

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT SELECT ON public.ai_response_analytics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_chat_preferences TO authenticated;
GRANT SELECT ON public.conversation_topics TO authenticated;

GRANT SELECT ON public.recent_chat_sessions TO authenticated;

GRANT EXECUTE ON FUNCTION public.start_chat_session(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_chat_message(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_chat_session(UUID, UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_chat_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chat_analytics(INTEGER) TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.chat_sessions IS 'AI chatbot conversation sessions with context and analytics';
COMMENT ON TABLE public.chat_messages IS 'Individual messages within chat sessions with AI response tracking';
COMMENT ON TABLE public.ai_response_analytics IS 'Detailed analytics for AI response generation and performance';
COMMENT ON TABLE public.user_chat_preferences IS 'User-specific preferences for AI chatbot behavior';
COMMENT ON TABLE public.conversation_topics IS 'Predefined conversation topics and suggested prompts';

COMMENT ON FUNCTION public.start_chat_session(UUID, TEXT, TEXT) IS 'Start new chat session and end any active sessions';
COMMENT ON FUNCTION public.add_chat_message(UUID, UUID, TEXT, TEXT, TEXT) IS 'Add message to chat session with automatic ordering';
COMMENT ON FUNCTION public.end_chat_session(UUID, UUID, TEXT, INTEGER) IS 'End chat session with optional summary and rating';

-- =====================================================
-- END OF CHATBOT SCHEMA MODULE
-- =====================================================