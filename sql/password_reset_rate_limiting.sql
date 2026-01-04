-- Create table for tracking password reset attempts
CREATE TABLE IF NOT EXISTS public.password_reset_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    ip_address INET,
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT CHECK (status IN ('requested', 'success', 'failed', 'rate_limited')) DEFAULT 'requested',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_email_time 
ON public.password_reset_attempts(email, attempted_at);

CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_ip_time 
ON public.password_reset_attempts(ip_address, attempted_at);

-- Enable RLS
ALTER TABLE public.password_reset_attempts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Service role can manage password reset attempts" ON public.password_reset_attempts;
CREATE POLICY "Service role can manage password reset attempts" 
ON public.password_reset_attempts 
FOR ALL 
USING (auth.role() = 'service_role');

-- Function to check if password reset is allowed
CREATE OR REPLACE FUNCTION public.check_password_reset_rate_limit(
    p_email TEXT,
    p_ip_address INET DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_email_attempts INTEGER := 0;
    v_ip_attempts INTEGER := 0;
    v_recent_success TIMESTAMPTZ;
    v_result JSONB;
    v_rate_limit_window INTERVAL := INTERVAL '1 hour';
    v_max_email_attempts INTEGER := 3;  -- Max 3 attempts per email per hour
    v_max_ip_attempts INTEGER := 10;    -- Max 10 attempts per IP per hour
    v_success_cooldown INTERVAL := INTERVAL '5 minutes'; -- Wait 5 minutes after successful reset
BEGIN
    -- Validate email format
    IF p_email IS NULL OR NOT public.is_valid_email(p_email) THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'invalid_email',
            'message', 'Please provide a valid email address',
            'retry_after', null
        );
    END IF;

    -- Check recent successful reset for this email (prevent spam)
    SELECT attempted_at INTO v_recent_success
    FROM public.password_reset_attempts
    WHERE LOWER(email) = LOWER(p_email)
    AND status = 'success'
    AND attempted_at > NOW() - v_success_cooldown
    ORDER BY attempted_at DESC
    LIMIT 1;

    IF v_recent_success IS NOT NULL THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'recent_success',
            'message', 'A password reset was recently sent to this email. Please check your inbox or wait before requesting another.',
            'retry_after', v_recent_success + v_success_cooldown
        );
    END IF;

    -- Count email attempts in the last hour
    SELECT COUNT(*) INTO v_email_attempts
    FROM public.password_reset_attempts
    WHERE LOWER(email) = LOWER(p_email)
    AND attempted_at > NOW() - v_rate_limit_window;

    -- Count IP attempts in the last hour (if IP provided)
    IF p_ip_address IS NOT NULL THEN
        SELECT COUNT(*) INTO v_ip_attempts
        FROM public.password_reset_attempts
        WHERE ip_address = p_ip_address
        AND attempted_at > NOW() - v_rate_limit_window;
    END IF;

    -- Check if rate limit exceeded
    IF v_email_attempts >= v_max_email_attempts THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'email_rate_limit',
            'message', format('Too many password reset attempts for this email address. Please wait %s before trying again.', 
                            TO_CHAR(v_rate_limit_window, 'HH24 hours MI minutes')),
            'retry_after', (
                SELECT attempted_at + v_rate_limit_window
                FROM public.password_reset_attempts
                WHERE LOWER(email) = LOWER(p_email)
                AND attempted_at > NOW() - v_rate_limit_window
                ORDER BY attempted_at ASC
                LIMIT 1
            ),
            'attempts_remaining', 0
        );
    END IF;

    IF p_ip_address IS NOT NULL AND v_ip_attempts >= v_max_ip_attempts THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'ip_rate_limit',
            'message', format('Too many password reset attempts from your location. Please wait %s before trying again.', 
                            TO_CHAR(v_rate_limit_window, 'HH24 hours MI minutes')),
            'retry_after', (
                SELECT attempted_at + v_rate_limit_window
                FROM public.password_reset_attempts
                WHERE ip_address = p_ip_address
                AND attempted_at > NOW() - v_rate_limit_window
                ORDER BY attempted_at ASC
                LIMIT 1
            ),
            'attempts_remaining', 0
        );
    END IF;

    -- Allow the request
    RETURN jsonb_build_object(
        'allowed', true,
        'reason', 'allowed',
        'message', 'Password reset request is allowed',
        'attempts_remaining', v_max_email_attempts - v_email_attempts - 1
    );
END;
$$;

-- Function to log password reset attempt
CREATE OR REPLACE FUNCTION public.log_password_reset_attempt(
    p_email TEXT,
    p_ip_address INET DEFAULT NULL,
    p_status TEXT DEFAULT 'requested'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_attempt_id UUID;
BEGIN
    INSERT INTO public.password_reset_attempts (email, ip_address, status)
    VALUES (LOWER(p_email), p_ip_address, p_status)
    RETURNING id INTO v_attempt_id;

    RETURN v_attempt_id;
END;
$$;

-- Function to update password reset attempt status
CREATE OR REPLACE FUNCTION public.update_password_reset_status(
    p_attempt_id UUID,
    p_status TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.password_reset_attempts
    SET status = p_status
    WHERE id = p_attempt_id;

    RETURN FOUND;
END;
$$;

-- Cleanup function for old attempts (run this periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_password_reset_attempts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM public.password_reset_attempts
    WHERE attempted_at < NOW() - INTERVAL '7 days';

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$;
