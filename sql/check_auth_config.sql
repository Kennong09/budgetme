-- Check current auth configuration settings
-- This will help us understand the current site URL configuration

-- Check if there are any custom configurations or redirect URLs stored
SELECT 
    'auth.users' as table_name,
    COUNT(*) as record_count 
FROM auth.users
UNION ALL
SELECT 
    'auth.sessions' as table_name,
    COUNT(*) as record_count 
FROM auth.sessions;

-- Check for any OAuth providers that might have redirect URLs configured
SELECT 
    id,
    created_at,
    updated_at
FROM auth.oauth_clients 
WHERE id IS NOT NULL;
