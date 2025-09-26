-- =====================================================
-- CREATE ADMIN USER SCRIPT
-- =====================================================
-- This script creates the admin user properly by:
-- 1. First creating the user in auth.users (via Supabase Auth)
-- 2. Then creating the profile using our function
-- =====================================================

-- Step 1: Create the admin user in Supabase Auth first
-- You need to do this via Supabase dashboard or auth API:
-- 
-- Email: admin@gmail.com
-- Password: [set a secure password]
-- User ID: 952a101d-d64d-42a8-89ce-cb4061aaaf5e (optional, can be auto-generated)
--
-- Or use Supabase client:
-- const { data, error } = await supabase.auth.signUp({
--   email: 'admin@gmail.com',
--   password: 'your-secure-password'
-- })

-- Step 2: After the auth user exists, run this to create the admin profile
SELECT public.create_admin_profile(
    '952a101d-d64d-42a8-89ce-cb4061aaaf5e'::uuid,
    'admin@gmail.com',
    'System Administrator'
);

-- Alternative: If you want to use a different user ID (after creating auth user)
-- SELECT public.create_admin_profile(
--     'your-actual-user-id-here'::uuid,
--     'admin@gmail.com', 
--     'System Administrator'
-- );

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check if admin profile was created successfully
SELECT 
    id,
    email,
    role,
    full_name,
    is_active,
    email_verified,
    created_at
FROM public.profiles 
WHERE role = 'admin';

-- =====================================================
-- NOTES
-- =====================================================
-- 
-- The auth.users table is managed by Supabase Auth and cannot be
-- directly inserted into from SQL. You must:
--
-- 1. Create users through Supabase Auth (dashboard, API, or client)
-- 2. Then use create_admin_profile() to set up the admin profile
--
-- This approach prevents foreign key constraint violations.
-- =====================================================