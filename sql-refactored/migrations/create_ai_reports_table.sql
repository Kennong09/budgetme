-- Create ai_reports table for storing AI-generated financial report insights
-- This table is separate from ai_insights to maintain clear separation between
-- prediction insights and report insights

CREATE TABLE IF NOT EXISTS public.ai_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL CHECK (report_type IN ('spending', 'income-expense', 'savings', 'trends', 'goals', 'predictions')),
    timeframe TEXT NOT NULL CHECK (timeframe IN ('week', 'month', 'quarter', 'year', 'custom')),
    insights JSONB NOT NULL,
    recommendations JSONB,
    summary TEXT,
    ai_service TEXT DEFAULT 'openrouter' CHECK (ai_service IN ('openrouter', 'chatbot', 'fallback')),
    ai_model TEXT DEFAULT 'anthropic/claude-3.5-sonnet',
    generation_time_ms INTEGER,
    token_usage JSONB,
    confidence_level NUMERIC DEFAULT 0.8 CHECK (confidence_level >= 0.0 AND confidence_level <= 1.0),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_reports_user_id ON public.ai_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_reports_report_type ON public.ai_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_ai_reports_generated_at ON public.ai_reports(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_reports_expires_at ON public.ai_reports(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_reports_user_report_type ON public.ai_reports(user_id, report_type, generated_at DESC);

-- Add comment to table
COMMENT ON TABLE public.ai_reports IS 'Stores AI-generated insights for financial reports with caching and access tracking';

-- Add comments to columns
COMMENT ON COLUMN public.ai_reports.report_type IS 'Type of financial report (spending, income-expense, savings, trends, goals, predictions)';
COMMENT ON COLUMN public.ai_reports.timeframe IS 'Time period covered by the report (week, month, quarter, year, custom)';
COMMENT ON COLUMN public.ai_reports.insights IS 'Full AI-generated insights in structured format';
COMMENT ON COLUMN public.ai_reports.recommendations IS 'Actionable recommendations extracted from insights';
COMMENT ON COLUMN public.ai_reports.summary IS 'Brief summary of the report insights';
COMMENT ON COLUMN public.ai_reports.expires_at IS 'When the cached insights expire (default 7 days)';
COMMENT ON COLUMN public.ai_reports.access_count IS 'Number of times these insights have been accessed';

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_ai_reports_updated_at ON public.ai_reports;
CREATE TRIGGER trigger_update_ai_reports_updated_at
    BEFORE UPDATE ON public.ai_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_reports_updated_at();

-- Create function to clean up expired reports
CREATE OR REPLACE FUNCTION cleanup_expired_ai_reports()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.ai_reports
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_ai_reports() IS 'Deletes expired AI report insights to maintain database hygiene';

-- Grant permissions (adjust based on your RLS policies)
-- ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (uncomment and adjust as needed)
-- CREATE POLICY "Users can view their own AI reports"
--     ON public.ai_reports FOR SELECT
--     USING (auth.uid() = user_id);

-- CREATE POLICY "Users can insert their own AI reports"
--     ON public.ai_reports FOR INSERT
--     WITH CHECK (auth.uid() = user_id);

-- CREATE POLICY "Users can update their own AI reports"
--     ON public.ai_reports FOR UPDATE
--     USING (auth.uid() = user_id);

-- CREATE POLICY "Users can delete their own AI reports"
--     ON public.ai_reports FOR DELETE
--     USING (auth.uid() = user_id);
