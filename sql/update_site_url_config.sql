-- Site URL Configuration for Supabase Auth
-- This configuration should be set in the Supabase Dashboard > Authentication > URL Configuration

-- For Development Environment:
-- Site URL: https://budgetme.site
-- Redirect URLs: 
--   - https://budgetme.site/auth/callback
--   - https://budgetme.site/reset-password

-- For Production Environment:
-- Site URL: https://budgetme.site
-- Redirect URLs:
--   - https://budgetme.site/auth/callback  
--   - https://budgetme.site/reset-password

-- The email template reset-password.html uses {{ .ConfirmationURL }} 
-- which will be automatically populated based on the Site URL configuration

-- Current email template structure is correct and will work with either:
-- Development: https://budgetme.site/reset-password?token=...
-- Production: https://budgetme.site/reset-password?token=...

-- No SQL changes needed - configuration must be done through Supabase Dashboard
