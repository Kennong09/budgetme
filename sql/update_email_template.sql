-- Update Supabase Email Template for Password Reset
-- Apply this configuration in Supabase Dashboard > Authentication > Email Templates

-- ISSUE FOUND: Favicon URL mismatch
-- Current template uses: https://raw.githubusercontent.com/Kennong09/budgetme/refs/heads/main/public/favicon.ico  
-- Should use: {{ .SiteURL }}/favicon.ico (matches local server structure)

-- TEMPLATE UPDATE REQUIRED:
-- Change line 31 from:
-- <img src="https://raw.githubusercontent.com/Kennong09/budgetme/refs/heads/main/public/favicon.ico" alt="BudgetMe" style="width: 40px; height: 40px; display: block; margin: 0 auto;" />
-- 
-- To:
-- <img src="{{ .SiteURL }}/favicon.ico" alt="BudgetMe" style="width: 40px; height: 40px; display: block; margin: 0 auto;" />

-- This ensures the favicon URL matches the backend server codebase structure:
-- Development: https://budgetme.site/favicon.ico
-- Production: https://budgetme.site/favicon.ico

-- Updated template file created: email-template/reset-password-updated.html
-- Copy the content to Supabase Dashboard > Authentication > Email Templates > Reset Password
