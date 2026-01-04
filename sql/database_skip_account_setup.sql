ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skip_setup_until TIMESTAMP WITH TIME ZONE;

CREATE OR REPLACE FUNCTION skip_account_setup_for_later(user_uuid UUID, skip_minutes INTEGER DEFAULT 25)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    skip_until TIMESTAMP WITH TIME ZONE;
BEGIN
    skip_until := NOW() + (skip_minutes * INTERVAL '1 minute');
    
    UPDATE profiles 
    SET 
        skip_setup_until = skip_until,
        updated_at = NOW()
    WHERE id = user_uuid;
    
    RETURN skip_until;
END;
$$;

CREATE OR REPLACE FUNCTION clear_account_setup_skip(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE profiles 
    SET 
        skip_setup_until = NULL,
        updated_at = NOW()
    WHERE id = user_uuid;
    
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION check_account_setup_skip_active(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    skip_until TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT skip_setup_until INTO skip_until
    FROM profiles 
    WHERE id = user_uuid;
    
    -- Return true if skip is active (skip_until is set and in the future)
    RETURN (skip_until IS NOT NULL AND skip_until > NOW());
END;
$$;

GRANT EXECUTE ON FUNCTION skip_account_setup_for_later(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION clear_account_setup_skip(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_account_setup_skip_active(UUID) TO authenticated;
