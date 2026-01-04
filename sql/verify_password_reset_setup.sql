-- Verify password reset rate limiting setup with IP-based tracking
SELECT 
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'password_reset_attempts'
    ) AS rate_limiting_table_exists,
    EXISTS (
        SELECT FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'check_password_reset_rate_limit'
    ) AS rate_limit_check_function_exists,
    EXISTS (
        SELECT FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'log_password_reset_attempt'
    ) AS log_attempt_function_exists,
    EXISTS (
        SELECT FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'password_reset_attempts'
    ) AS rls_policies_exist,
    EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'password_reset_attempts'
        AND column_name = 'ip_address'
    ) AS ip_address_column_exists;

-- Test IP-based functionality
SELECT 'IP-based rate limiting test' as test_description;
SELECT * FROM check_password_reset_rate_limit('test@example.com', '192.168.1.100');

-- Clean up any test data
DELETE FROM password_reset_attempts WHERE email = 'test@example.com';
