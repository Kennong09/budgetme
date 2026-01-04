ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_setup_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_setup_completed_at TIMESTAMP WITH TIME ZONE;

CREATE OR REPLACE FUNCTION mark_account_setup_completed(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE profiles 
    SET 
        account_setup_completed = TRUE,
        account_setup_completed_at = NOW(),
        updated_at = NOW()
    WHERE id = user_uuid;
    
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION check_account_setup_completed(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_completed BOOLEAN DEFAULT FALSE;
BEGIN
    SELECT account_setup_completed INTO is_completed
    FROM profiles 
    WHERE id = user_uuid;
    
    RETURN COALESCE(is_completed, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION reset_account_setup_completion(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE profiles 
    SET 
        account_setup_completed = FALSE,
        account_setup_completed_at = NULL,
        updated_at = NOW()
    WHERE id = user_uuid;
    
    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_account_setup_completed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_account_setup_completed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_account_setup_completion(UUID) TO authenticated;
