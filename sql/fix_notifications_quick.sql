-- Quick fix to add the stub notification function to the existing database
-- This will prevent the "function public.send_notification does not exist" error

-- Create the stub function that does nothing
CREATE OR REPLACE FUNCTION public.send_notification(
    notification_type TEXT,
    payload TEXT
)
RETURNS VOID AS $$
BEGIN
    -- This is a stub function that does nothing
    -- It prevents errors from existing code that might call this function
    RAISE NOTICE 'Notification (disabled): % - %', notification_type, payload;
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.send_notification(TEXT, TEXT) TO authenticated;