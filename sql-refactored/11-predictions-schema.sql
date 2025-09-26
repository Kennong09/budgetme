-- =====================================================
-- CLEANUP: DROP EXISTING OBJECTS
-- =====================================================

-- Drop policies first
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own prediction requests" ON public.prediction_requests;
    DROP POLICY IF EXISTS "Users can manage their own prophet predictions" ON public.prophet_predictions;
    DROP POLICY IF EXISTS "Users can manage their own AI insights" ON public.ai_insights;
    DROP POLICY IF EXISTS "Users can manage their own usage limits" ON public.prediction_usage_limits;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop triggers
DO $$ 
BEGIN
    DROP TRIGGER IF EXISTS prediction_usage_limits_updated_at ON public.prediction_usage_limits;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop functions
DO $$ 
BEGIN
    DROP FUNCTION IF EXISTS public.can_make_prediction_request(UUID, TEXT);
    DROP FUNCTION IF EXISTS public.increment_prediction_usage(UUID, TEXT);
    DROP FUNCTION IF EXISTS public.log_prediction_request(UUID, TEXT, TEXT, JSONB, TEXT);
    DROP FUNCTION IF EXISTS public.update_request_status(UUID, TEXT, JSONB, JSONB, INTEGER);
    DROP FUNCTION IF EXISTS public.store_prophet_prediction(UUID, UUID, TEXT, JSONB, JSONB, JSONB, DECIMAL, JSONB);
    DROP FUNCTION IF EXISTS public.store_ai_insights(UUID, UUID, JSONB, TEXT, TEXT, INTEGER, TEXT);
    DROP FUNCTION IF EXISTS public.get_cached_prophet_prediction(UUID, TEXT);
    DROP FUNCTION IF EXISTS public.cleanup_expired_predictions();
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop views
DROP VIEW IF EXISTS public.prediction_usage_analytics CASCADE;
DROP VIEW IF EXISTS public.recent_prediction_activity CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS public.idx_prediction_requests_user_id;
DROP INDEX IF EXISTS public.idx_prediction_requests_status;
DROP INDEX IF EXISTS public.idx_prediction_requests_timeframe;
DROP INDEX IF EXISTS public.idx_prediction_requests_request_at;
DROP INDEX IF EXISTS public.idx_prediction_requests_external_id;
DROP INDEX IF EXISTS public.idx_prediction_requests_cache_hit;
DROP INDEX IF EXISTS public.idx_prophet_predictions_user_id;
DROP INDEX IF EXISTS public.idx_prophet_predictions_timeframe;
DROP INDEX IF EXISTS public.idx_prophet_predictions_expires_at;
DROP INDEX IF EXISTS public.idx_prophet_predictions_generated_at;
DROP INDEX IF EXISTS public.idx_prophet_predictions_request_id;
DROP INDEX IF EXISTS public.idx_ai_insights_user_id;
DROP INDEX IF EXISTS public.idx_ai_insights_prediction_id;
DROP INDEX IF EXISTS public.idx_ai_insights_cache_key;
DROP INDEX IF EXISTS public.idx_ai_insights_expires_at;
DROP INDEX IF EXISTS public.idx_ai_insights_daily_usage;
DROP INDEX IF EXISTS public.idx_ai_insights_rate_limited;
DROP INDEX IF EXISTS public.idx_prediction_usage_limits_user_id;
DROP INDEX IF EXISTS public.idx_prediction_usage_limits_reset_date;
DROP INDEX IF EXISTS public.idx_prediction_usage_limits_tier;
DROP INDEX IF EXISTS public.idx_prediction_usage_limits_suspended;

-- Drop tables
DROP TABLE IF EXISTS public.prediction_usage_limits CASCADE;
DROP TABLE IF EXISTS public.ai_insights CASCADE;
DROP TABLE IF EXISTS public.prophet_predictions CASCADE;
DROP TABLE IF EXISTS public.prediction_requests CASCADE;

-- =====================================================
-- 08-PREDICTIONS-SCHEMA.SQL
-- =====================================================
-- Module: AI Prediction Service Integration
-- Purpose: AI prediction usage tracking, result caching, and API integration
-- Dependencies: 02-auth-schema.sql, 11-transactions-schema.sql
-- Backend Service: predictionService.ts, aiInsightsService.ts
-- Frontend Components: src/components/predictions/
-- =====================================================
-- Version: 1.1.0 - CORRECTED FOR ACTUAL API USAGE
-- Created: 2025-09-20
-- Compatible with: FastAPI backend, Prophet model, OpenRouter AI
-- =====================================================

-- =====================================================
-- PREDICTION API REQUESTS LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS public.prediction_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Request metadata
    external_request_id TEXT, -- FastAPI correlation ID
    api_endpoint TEXT NOT NULL, -- e.g., '/predict', '/ai-insights'
    request_method TEXT DEFAULT 'POST',
    
    -- Prediction parameters (matches PredictionRequest interface)
    timeframe TEXT NOT NULL CHECK (timeframe IN ('months_3', 'months_6', 'year_1')),
    prediction_type TEXT DEFAULT 'expense' CHECK (prediction_type IN ('expense', 'income', 'financial_forecast', 'category', 'prophet')),
    seasonality_mode TEXT DEFAULT 'additive' CHECK (seasonality_mode IN ('additive', 'multiplicative')),
    include_categories BOOLEAN DEFAULT true,
    include_insights BOOLEAN DEFAULT true,
    days_ahead INTEGER, -- For simple predictions
    
    -- Input data (stores the transaction data sent to API)
    input_data JSONB NOT NULL,
    transaction_count INTEGER GENERATED ALWAYS AS ((input_data->>'transaction_count')::INTEGER) STORED,
    
    -- Response tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'timeout', 'rate_limited')),
    response_data JSONB, -- Full API response
    error_details JSONB, -- Error information
    
    -- API performance metrics
    request_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ,
    api_response_time_ms INTEGER,
    total_processing_time_ms INTEGER,
    api_response_code INTEGER,
    
    -- Client information
    client_ip INET,
    user_agent TEXT,
    
    -- Caching info
    cache_hit BOOLEAN DEFAULT false,
    cached_result_id UUID
);

-- =====================================================
-- PROPHET PREDICTION RESULTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.prophet_predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    request_id UUID REFERENCES public.prediction_requests(id) ON DELETE CASCADE,
    
    -- Prophet-specific metadata
    timeframe TEXT NOT NULL,
    model_version TEXT DEFAULT '1.0',
    seasonality_mode TEXT DEFAULT 'additive',
    
    -- Prediction data (matches ProphetPrediction interface)
    predictions JSONB NOT NULL, -- Array of date-prediction pairs
    category_forecasts JSONB DEFAULT '{}'::jsonb, -- Category-specific forecasts
    
    -- Model performance (matches PredictionResponse.model_accuracy)
    model_accuracy JSONB DEFAULT jsonb_build_object(
        'mae', 0.0,
        'mape', 0.0, 
        'rmse', 0.0,
        'data_points', 0
    ),
    confidence_score DECIMAL(3,2) DEFAULT 0.75 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    
    -- User profile snapshot
    user_profile JSONB, -- UserFinancialProfile at time of prediction
    
    -- Cache and expiration
    generated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours') NOT NULL,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ
);

-- =====================================================
-- AI INSIGHTS CACHE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ai_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prediction_id UUID REFERENCES public.prophet_predictions(id) ON DELETE CASCADE,
    
    -- AI service metadata
    ai_service TEXT DEFAULT 'openrouter' CHECK (ai_service IN ('openrouter', 'chatbot', 'prophet', 'fallback')),
    model_used TEXT DEFAULT 'openai/gpt-oss-120b:free',
    
    -- Insights data (matches AIInsightResponse interface)
    insights JSONB NOT NULL,
    risk_assessment JSONB, -- RiskAssessment object
    recommendations JSONB, -- Array of recommendations
    opportunity_areas JSONB, -- Array of opportunities
    
    -- Generation metadata
    prompt_template TEXT,
    generation_time_ms INTEGER,
    token_usage JSONB, -- Token consumption tracking
    confidence_level DECIMAL(3,2) DEFAULT 0.8,
    
    -- Rate limiting and usage
    daily_usage_count INTEGER DEFAULT 1,
    rate_limited BOOLEAN DEFAULT false,
    retry_after INTEGER, -- Seconds to wait if rate limited
    
    -- Cache management
    generated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes') NOT NULL,
    cache_key TEXT, -- For deduplication
    
    -- Access tracking
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ
);

-- =====================================================
-- USAGE TRACKING (Simplified for FastAPI integration)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.prediction_usage_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Usage tracking per service
    prophet_daily_count INTEGER DEFAULT 0,
    ai_insights_daily_count INTEGER DEFAULT 0,
    total_requests_today INTEGER DEFAULT 0,
    
    -- Limits per tier
    tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'premium', 'enterprise')),
    prophet_daily_limit INTEGER DEFAULT 10,
    ai_insights_daily_limit INTEGER DEFAULT 5,
    total_daily_limit INTEGER DEFAULT 20,
    
    -- Reset tracking
    last_reset_date DATE DEFAULT CURRENT_DATE,
    current_period_start TIMESTAMPTZ DEFAULT NOW(),
    
    -- Rate limiting
    last_request_at TIMESTAMPTZ,
    rate_limit_remaining INTEGER DEFAULT 60, -- Requests per hour
    rate_limit_reset_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),
    
    -- Status
    is_suspended BOOLEAN DEFAULT false,
    suspension_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT unique_user_limits UNIQUE (user_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Prediction requests indexes
CREATE INDEX IF NOT EXISTS idx_prediction_requests_user_id ON public.prediction_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_requests_status ON public.prediction_requests(status);
CREATE INDEX IF NOT EXISTS idx_prediction_requests_timeframe ON public.prediction_requests(timeframe);
CREATE INDEX IF NOT EXISTS idx_prediction_requests_request_at ON public.prediction_requests(request_at);
CREATE INDEX IF NOT EXISTS idx_prediction_requests_external_id ON public.prediction_requests(external_request_id);
CREATE INDEX IF NOT EXISTS idx_prediction_requests_cache_hit ON public.prediction_requests(cache_hit) WHERE cache_hit = true;

-- Prophet predictions indexes
CREATE INDEX IF NOT EXISTS idx_prophet_predictions_user_id ON public.prophet_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_prophet_predictions_timeframe ON public.prophet_predictions(timeframe);
CREATE INDEX IF NOT EXISTS idx_prophet_predictions_expires_at ON public.prophet_predictions(expires_at);
CREATE INDEX IF NOT EXISTS idx_prophet_predictions_generated_at ON public.prophet_predictions(generated_at);
CREATE INDEX IF NOT EXISTS idx_prophet_predictions_request_id ON public.prophet_predictions(request_id);

-- AI insights indexes
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON public.ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_prediction_id ON public.ai_insights(prediction_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_key ON public.ai_insights(cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_insights_expires_at ON public.ai_insights(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_insights_daily_usage ON public.ai_insights(user_id, generated_at);
CREATE INDEX IF NOT EXISTS idx_ai_insights_rate_limited ON public.ai_insights(rate_limited) WHERE rate_limited = true;

-- Usage limits indexes
CREATE INDEX IF NOT EXISTS idx_prediction_usage_limits_user_id ON public.prediction_usage_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_usage_limits_reset_date ON public.prediction_usage_limits(last_reset_date);
CREATE INDEX IF NOT EXISTS idx_prediction_usage_limits_tier ON public.prediction_usage_limits(tier);
CREATE INDEX IF NOT EXISTS idx_prediction_usage_limits_suspended ON public.prediction_usage_limits(is_suspended) WHERE is_suspended = true;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.prediction_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prophet_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_usage_limits ENABLE ROW LEVEL SECURITY;

-- Prediction requests policies
CREATE POLICY "Users can manage their own prediction requests" 
    ON public.prediction_requests FOR ALL 
    USING (auth.uid() = user_id);

-- Prophet predictions policies
CREATE POLICY "Users can manage their own prophet predictions" 
    ON public.prophet_predictions FOR ALL 
    USING (auth.uid() = user_id);

-- AI insights policies
CREATE POLICY "Users can manage their own AI insights" 
    ON public.ai_insights FOR ALL 
    USING (auth.uid() = user_id);

-- Usage limits policies
CREATE POLICY "Users can manage their own usage limits" 
    ON public.prediction_usage_limits FOR ALL 
    USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER prediction_usage_limits_updated_at
    BEFORE UPDATE ON public.prediction_usage_limits
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- =====================================================
-- PREDICTION API FUNCTIONS
-- =====================================================

-- Function to check if user can make prediction request
CREATE OR REPLACE FUNCTION public.can_make_prediction_request(
    p_user_id UUID,
    p_service_type TEXT DEFAULT 'prophet'
)
RETURNS JSONB AS $$
DECLARE
    v_limits RECORD;
    v_current_usage INTEGER;
    v_limit INTEGER;
    v_can_request BOOLEAN := false;
    v_rate_limited BOOLEAN := false;
BEGIN
    -- Get or create usage limits
    SELECT * INTO v_limits
    FROM public.prediction_usage_limits
    WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        INSERT INTO public.prediction_usage_limits (user_id)
        VALUES (p_user_id)
        RETURNING * INTO v_limits;
    END IF;
    
    -- Reset daily counters if needed
    IF v_limits.last_reset_date < CURRENT_DATE THEN
        UPDATE public.prediction_usage_limits
        SET 
            prophet_daily_count = 0,
            ai_insights_daily_count = 0,
            total_requests_today = 0,
            last_reset_date = CURRENT_DATE,
            current_period_start = NOW(),
            rate_limit_remaining = 60,
            rate_limit_reset_at = NOW() + INTERVAL '1 hour'
        WHERE user_id = p_user_id
        RETURNING * INTO v_limits;
    END IF;
    
    -- Check rate limiting
    IF v_limits.rate_limit_reset_at < NOW() THEN
        UPDATE public.prediction_usage_limits
        SET 
            rate_limit_remaining = 60,
            rate_limit_reset_at = NOW() + INTERVAL '1 hour'
        WHERE user_id = p_user_id
        RETURNING * INTO v_limits;
    END IF;
    
    v_rate_limited := v_limits.rate_limit_remaining <= 0;
    
    -- Check service-specific limits
    IF p_service_type = 'prophet' THEN
        v_current_usage := v_limits.prophet_daily_count;
        v_limit := v_limits.prophet_daily_limit;
    ELSIF p_service_type = 'ai_insights' THEN
        v_current_usage := v_limits.ai_insights_daily_count;
        v_limit := v_limits.ai_insights_daily_limit;
    ELSE
        v_current_usage := v_limits.total_requests_today;
        v_limit := v_limits.total_daily_limit;
    END IF;
    
    v_can_request := NOT v_limits.is_suspended 
                     AND v_current_usage < v_limit 
                     AND NOT v_rate_limited;
    
    RETURN jsonb_build_object(
        'can_request', v_can_request,
        'current_usage', v_current_usage,
        'limit', v_limit,
        'remaining', v_limit - v_current_usage,
        'tier', v_limits.tier,
        'rate_limited', v_rate_limited,
        'rate_limit_remaining', v_limits.rate_limit_remaining,
        'rate_limit_reset_at', v_limits.rate_limit_reset_at,
        'suspended', v_limits.is_suspended,
        'reset_date', v_limits.last_reset_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage after successful request
CREATE OR REPLACE FUNCTION public.increment_prediction_usage(
    p_user_id UUID,
    p_service_type TEXT DEFAULT 'prophet'
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Increment counters
    IF p_service_type = 'prophet' THEN
        UPDATE public.prediction_usage_limits
        SET 
            prophet_daily_count = prophet_daily_count + 1,
            total_requests_today = total_requests_today + 1,
            rate_limit_remaining = GREATEST(0, rate_limit_remaining - 1),
            last_request_at = NOW(),
            updated_at = NOW()
        WHERE user_id = p_user_id;
    ELSIF p_service_type = 'ai_insights' THEN
        UPDATE public.prediction_usage_limits
        SET 
            ai_insights_daily_count = ai_insights_daily_count + 1,
            total_requests_today = total_requests_today + 1,
            rate_limit_remaining = GREATEST(0, rate_limit_remaining - 1),
            last_request_at = NOW(),
            updated_at = NOW()
        WHERE user_id = p_user_id;
    ELSE
        UPDATE public.prediction_usage_limits
        SET 
            total_requests_today = total_requests_today + 1,
            rate_limit_remaining = GREATEST(0, rate_limit_remaining - 1),
            last_request_at = NOW(),
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log prediction request
CREATE OR REPLACE FUNCTION public.log_prediction_request(
    p_user_id UUID,
    p_api_endpoint TEXT,
    p_timeframe TEXT,
    p_input_data JSONB,
    p_external_request_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_request_id UUID;
BEGIN
    INSERT INTO public.prediction_requests (
        user_id,
        api_endpoint,
        timeframe,
        input_data,
        external_request_id
    ) VALUES (
        p_user_id,
        p_api_endpoint,
        p_timeframe,
        p_input_data,
        p_external_request_id
    ) RETURNING id INTO v_request_id;
    
    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update request status
CREATE OR REPLACE FUNCTION public.update_request_status(
    p_request_id UUID,
    p_status TEXT,
    p_response_data JSONB DEFAULT NULL,
    p_error_details JSONB DEFAULT NULL,
    p_api_response_time_ms INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.prediction_requests
    SET 
        status = p_status,
        response_data = COALESCE(p_response_data, response_data),
        error_details = COALESCE(p_error_details, error_details),
        api_response_time_ms = COALESCE(p_api_response_time_ms, api_response_time_ms),
        completed_at = CASE WHEN p_status IN ('completed', 'failed', 'timeout') THEN NOW() ELSE completed_at END,
        total_processing_time_ms = CASE 
            WHEN p_status IN ('completed', 'failed', 'timeout') 
            THEN EXTRACT(EPOCH FROM (NOW() - request_at)) * 1000
            ELSE total_processing_time_ms 
        END
    WHERE id = p_request_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to store Prophet prediction result
CREATE OR REPLACE FUNCTION public.store_prophet_prediction(
    p_user_id UUID,
    p_request_id UUID,
    p_timeframe TEXT,
    p_predictions JSONB,
    p_category_forecasts JSONB DEFAULT '{}'::jsonb,
    p_model_accuracy JSONB DEFAULT NULL,
    p_confidence_score DECIMAL DEFAULT NULL,
    p_user_profile JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_prediction_id UUID;
BEGIN
    INSERT INTO public.prophet_predictions (
        user_id,
        request_id,
        timeframe,
        predictions,
        category_forecasts,
        model_accuracy,
        confidence_score,
        user_profile
    ) VALUES (
        p_user_id,
        p_request_id,
        p_timeframe,
        p_predictions,
        p_category_forecasts,
        p_model_accuracy,
        p_confidence_score,
        p_user_profile
    ) RETURNING id INTO v_prediction_id;
    
    RETURN v_prediction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to store AI insights
CREATE OR REPLACE FUNCTION public.store_ai_insights(
    p_user_id UUID,
    p_prediction_id UUID,
    p_insights JSONB,
    p_ai_service TEXT DEFAULT 'openrouter',
    p_model_used TEXT DEFAULT 'openai/gpt-oss-120b:free',
    p_generation_time_ms INTEGER DEFAULT NULL,
    p_cache_key TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_insight_id UUID;
BEGIN
    INSERT INTO public.ai_insights (
        user_id,
        prediction_id,
        insights,
        ai_service,
        model_used,
        generation_time_ms,
        cache_key
    ) VALUES (
        p_user_id,
        p_prediction_id,
        p_insights,
        p_ai_service,
        p_model_used,
        p_generation_time_ms,
        p_cache_key
    ) RETURNING id INTO v_insight_id;
    
    RETURN v_insight_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get cached Prophet prediction
CREATE OR REPLACE FUNCTION public.get_cached_prophet_prediction(
    p_user_id UUID,
    p_timeframe TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_prediction RECORD;
BEGIN
    SELECT * INTO v_prediction
    FROM public.prophet_predictions
    WHERE user_id = p_user_id
    AND timeframe = p_timeframe
    AND expires_at > NOW()
    ORDER BY generated_at DESC
    LIMIT 1;
    
    IF FOUND THEN
        -- Update access tracking
        UPDATE public.prophet_predictions
        SET 
            access_count = access_count + 1,
            last_accessed_at = NOW()
        WHERE id = v_prediction.id;
        
        RETURN jsonb_build_object(
            'found', true,
            'id', v_prediction.id,
            'predictions', v_prediction.predictions,
            'category_forecasts', v_prediction.category_forecasts,
            'model_accuracy', v_prediction.model_accuracy,
            'confidence_score', v_prediction.confidence_score,
            'user_profile', v_prediction.user_profile,
            'generated_at', v_prediction.generated_at
        );
    ELSE
        RETURN jsonb_build_object('found', false);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired data
CREATE OR REPLACE FUNCTION public.cleanup_expired_predictions()
RETURNS INTEGER AS $$
DECLARE
    deleted_predictions INTEGER;
    deleted_insights INTEGER;
    deleted_requests INTEGER;
BEGIN
    -- Cleanup expired Prophet predictions
    DELETE FROM public.prophet_predictions 
    WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_predictions = ROW_COUNT;
    
    -- Cleanup expired AI insights
    DELETE FROM public.ai_insights 
    WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_insights = ROW_COUNT;
    
    -- Cleanup old request logs (keep last 30 days)
    DELETE FROM public.prediction_requests 
    WHERE request_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS deleted_requests = ROW_COUNT;
    
    RETURN deleted_predictions + deleted_insights + deleted_requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS FOR DASHBOARD AND ANALYTICS
-- =====================================================

-- Prediction usage analytics view
CREATE OR REPLACE VIEW public.prediction_usage_analytics AS
SELECT
    pul.user_id,
    pul.tier,
    pul.prophet_daily_count,
    pul.ai_insights_daily_count,
    pul.total_requests_today,
    pul.prophet_daily_limit,
    pul.ai_insights_daily_limit,
    pul.total_daily_limit,
    
    -- Usage percentages
    ROUND((pul.prophet_daily_count::DECIMAL / pul.prophet_daily_limit) * 100, 1) as prophet_usage_pct,
    ROUND((pul.ai_insights_daily_count::DECIMAL / pul.ai_insights_daily_limit) * 100, 1) as ai_insights_usage_pct,
    ROUND((pul.total_requests_today::DECIMAL / pul.total_daily_limit) * 100, 1) as total_usage_pct,
    
    -- Remaining limits
    (pul.prophet_daily_limit - pul.prophet_daily_count) as prophet_remaining,
    (pul.ai_insights_daily_limit - pul.ai_insights_daily_count) as ai_insights_remaining,
    (pul.total_daily_limit - pul.total_requests_today) as total_remaining,
    
    -- Status indicators
    CASE 
        WHEN pul.is_suspended THEN 'suspended'
        WHEN pul.rate_limit_remaining <= 0 THEN 'rate_limited'
        WHEN pul.total_requests_today >= pul.total_daily_limit THEN 'limit_reached'
        WHEN pul.total_requests_today >= (pul.total_daily_limit * 0.8) THEN 'near_limit'
        ELSE 'available'
    END as usage_status,
    
    -- Rate limiting info
    pul.rate_limit_remaining,
    pul.rate_limit_reset_at,
    
    -- Timestamps
    pul.last_request_at,
    pul.last_reset_date,
    pul.current_period_start
    
FROM public.prediction_usage_limits pul;

-- Recent prediction activity view
CREATE OR REPLACE VIEW public.recent_prediction_activity AS
SELECT
    pr.user_id,
    pr.api_endpoint,
    pr.timeframe,
    pr.prediction_type,
    pr.status,
    pr.request_at,
    pr.completed_at,
    pr.api_response_time_ms,
    pr.total_processing_time_ms,
    pr.cache_hit,
    
    -- Associated prediction data
    pp.id as prediction_id,
    pp.confidence_score,
    
    -- Associated AI insights
    ai.id as insights_id,
    ai.ai_service,
    ai.model_used,
    ai.confidence_level as insights_confidence
    
FROM public.prediction_requests pr
LEFT JOIN public.prophet_predictions pp ON pp.request_id = pr.id
LEFT JOIN public.ai_insights ai ON ai.prediction_id = pp.id
WHERE pr.request_at > NOW() - INTERVAL '7 days'
ORDER BY pr.request_at DESC;

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prediction_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prophet_predictions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_insights TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prediction_usage_limits TO authenticated;

GRANT SELECT ON public.prediction_usage_analytics TO authenticated;
GRANT SELECT ON public.recent_prediction_activity TO authenticated;

GRANT EXECUTE ON FUNCTION public.can_make_prediction_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_prediction_usage(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_prediction_request(UUID, TEXT, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_request_status(UUID, TEXT, JSONB, JSONB, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.store_prophet_prediction(UUID, UUID, TEXT, JSONB, JSONB, JSONB, DECIMAL, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.store_ai_insights(UUID, UUID, JSONB, TEXT, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cached_prophet_prediction(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_predictions() TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.prediction_requests IS 'Logs all prediction API requests with FastAPI integration';
COMMENT ON TABLE public.prophet_predictions IS 'Stores Prophet model prediction results and metadata';
COMMENT ON TABLE public.ai_insights IS 'Caches AI-generated insights from OpenRouter and other services';
COMMENT ON TABLE public.prediction_usage_limits IS 'Tracks daily usage limits and rate limiting for prediction services';

COMMENT ON FUNCTION public.can_make_prediction_request(UUID, TEXT) IS 'Checks if user can make prediction request based on limits and rate limiting';
COMMENT ON FUNCTION public.increment_prediction_usage(UUID, TEXT) IS 'Increments usage counters after successful prediction request';
COMMENT ON FUNCTION public.get_cached_prophet_prediction(UUID, TEXT) IS 'Retrieves cached Prophet prediction if available and not expired';

-- =====================================================
-- END OF PREDICTIONS SCHEMA MODULE
-- =====================================================