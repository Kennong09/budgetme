-- Supabase Authentication URL Configuration
-- Execute these configurations in Supabase Dashboard > Authentication > URL Configuration

-- STEP 1: Set Site URL based on environment
-- For Development (XAMPP/localhost):
UPDATE auth.config SET site_url = 'https://budgetme.site' WHERE TRUE;

-- For Production:
-- UPDATE auth.config SET site_url = 'https://budgetme.site' WHERE TRUE;

-- STEP 2: Configure Redirect URLs (add these in Dashboard)
-- Development Redirect URLs:
-- - https://budgetme.site/auth/callback
-- - https://budgetme.site/reset-password
-- - https://budgetme.site/**

-- Production Redirect URLs:
-- - https://budgetme.site/auth/callback  
-- - https://budgetme.site/reset-password
-- - https://budgetme.site/**

-- STEP 3: Verify email template compatibility
-- The reset-password.html template uses {{ .ConfirmationURL }}
-- This will generate URLs like:
-- Development: https://budgetme.site/auth/callback?token_hash=...&type=recovery&next=/reset-password
-- Production: https://budgetme.site/auth/callback?token_hash=...&type=recovery&next=/reset-password

-- Current application routing supports:
-- - /reset-password (main password reset page)
-- - /auth/callback (authentication callback handler)
