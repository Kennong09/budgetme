-- BudgetMe AI Prediction Service Database Tables
-- Migration: Add prediction usage tracking and result caching

-- =====================================================
-- Prediction Usage Tracking Table
-- =====================================================
CREATE TABLE IF NOT EXISTS prediction_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    usage_count INTEGER DEFAULT 0 NOT NULL,
    max_usage INTEGER DEFAULT 5 NOT NULL,
    reset_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month') NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT usage_count_non_negative CHECK (usage_count >= 0),
    CONSTRAINT max_usage_positive CHECK (max_usage > 0),
    CONSTRAINT unique_user_usage UNIQUE (user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_prediction_usage_user_id ON prediction_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_usage_reset_date ON prediction_usage(reset_date);

-- =====================================================
-- Prediction Results Cache Table
-- =====================================================
CREATE TABLE IF NOT EXISTS prediction_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prediction_data JSONB NOT NULL,
    ai_insights JSONB,
    timeframe VARCHAR(20) NOT NULL,
    confidence_score DECIMAL(3,2),
    model_accuracy JSONB,
    generated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours') NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_timeframe CHECK (timeframe IN ('months_3', 'months_6', 'year_1')),
    CONSTRAINT valid_confidence CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_prediction_results_user_id ON prediction_results(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_results_timeframe ON prediction_results(timeframe);
CREATE INDEX IF NOT EXISTS idx_prediction_results_expires_at ON prediction_results(expires_at);
CREATE INDEX IF NOT EXISTS idx_prediction_results_generated_at ON prediction_results(generated_at);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on both tables
ALTER TABLE prediction_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_results ENABLE ROW LEVEL SECURITY;

-- Prediction Usage RLS Policies
CREATE POLICY "Users can manage their own prediction usage" 
ON prediction_usage
FOR ALL 
USING (auth.uid() = user_id);

-- Prediction Results RLS Policies
CREATE POLICY "Users can view their own prediction results" 
ON prediction_results
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prediction results" 
ON prediction_results
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prediction results" 
ON prediction_results
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prediction results" 
ON prediction_results
FOR DELETE 
USING (auth.uid() = user_id);

-- =====================================================
-- Utility Functions
-- =====================================================

-- Function to clean up expired prediction results
CREATE OR REPLACE FUNCTION cleanup_expired_predictions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM prediction_results WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to reset usage count for users whose reset_date has passed
CREATE OR REPLACE FUNCTION reset_expired_usage_limits()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE prediction_usage 
    SET 
        usage_count = 0,
        reset_date = NOW() + INTERVAL '1 month',
        updated_at = NOW()
    WHERE reset_date < NOW();
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to initialize prediction usage for a new user
CREATE OR REPLACE FUNCTION initialize_prediction_usage(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO prediction_usage (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Triggers
-- =====================================================

-- Trigger to update updated_at timestamp on prediction_usage
CREATE OR REPLACE FUNCTION update_prediction_usage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_prediction_usage_updated_at
    BEFORE UPDATE ON prediction_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_prediction_usage_timestamp();

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON TABLE prediction_usage IS 'Tracks AI prediction usage limits per user with monthly reset';
COMMENT ON COLUMN prediction_usage.usage_count IS 'Current number of predictions used in the period';
COMMENT ON COLUMN prediction_usage.max_usage IS 'Maximum predictions allowed per period (default: 5)';
COMMENT ON COLUMN prediction_usage.reset_date IS 'When the usage count will reset to 0';

COMMENT ON TABLE prediction_results IS 'Caches Prophet prediction results with 24-hour TTL';
COMMENT ON COLUMN prediction_results.prediction_data IS 'JSON object containing Prophet forecast data';
COMMENT ON COLUMN prediction_results.ai_insights IS 'JSON object containing AI-generated insights';
COMMENT ON COLUMN prediction_results.timeframe IS 'Prediction timeframe: months_3, months_6, or year_1';
COMMENT ON COLUMN prediction_results.confidence_score IS 'Overall model confidence (0.0 to 1.0)';
COMMENT ON COLUMN prediction_results.model_accuracy IS 'JSON object containing model accuracy metrics';

-- =====================================================
-- Sample Data (Optional - for development/testing)
-- =====================================================

-- Uncomment the following lines to insert sample data for testing
/*
-- Insert sample usage record (replace with actual user ID)
INSERT INTO prediction_usage (user_id, usage_count, max_usage) 
VALUES ('00000000-0000-0000-0000-000000000000', 2, 5)
ON CONFLICT (user_id) DO NOTHING;
*/