-- Fix Password Reset Email Template to Prevent Auto-Authentication
-- This updates the email template to use token_hash instead of ConfirmationURL
-- to avoid Supabase's automatic redirect that strips tokens and auto-authenticates

-- Note: This SQL is for documentation purposes only.
-- The actual email template update must be done via Supabase Dashboard:
-- 1. Go to Authentication > Email Templates > Reset Password
-- 2. Replace the button/link HTML with the following:

/*
REPLACE THIS IN THE EMAIL TEMPLATE:
<a href="{{ .ConfirmationURL }}" ...>Reset My Password</a>

WITH THIS:
<a href="https://budgetme.site/reset-password?token_hash={{ .TokenHash }}&type=recovery" ...>Reset My Password</a>

AND REPLACE THIS:
{{ .ConfirmationURL }}

WITH THIS:
https://budgetme.site/reset-password?token_hash={{ .TokenHash }}&type=recovery

This prevents Supabase from automatically authenticating the user
and allows our ResetPassword.tsx component to handle the token verification properly.
*/

-- Check current auth configuration
SELECT 
    'Current Site URL' as setting,
    raw_base_config->'SITE_URL' as value
FROM auth.config
WHERE id = 1

UNION ALL

SELECT 
    'URI Allow List' as setting,
    raw_base_config->'URI_ALLOW_LIST' as value
FROM auth.config
WHERE id = 1;

-- Verify redirect URLs are properly configured
-- Expected: https://budgetme.site should be in the allow list
-- The reset-password specific redirect should NOT auto-authenticate
