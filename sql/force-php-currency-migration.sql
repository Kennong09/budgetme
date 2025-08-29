-- Migration Script: Force Currency to Philippine Pesos (PHP)
-- This script converts all currencies in the BudgetMe application to PHP
-- Author: AI Assistant
-- Date: 2025-08-29

-- Start transaction for atomicity
BEGIN;

-- ================================
-- 1. UPDATE FAMILIES TABLE
-- ================================

-- Convert all family currency preferences to PHP
UPDATE families 
SET currency_pref = 'PHP'
WHERE currency_pref != 'PHP' OR currency_pref IS NULL;

-- Add constraint to prevent future non-PHP currencies
ALTER TABLE families 
ADD CONSTRAINT IF NOT EXISTS currency_php_only 
CHECK (currency_pref = 'PHP');

-- ================================
-- 2. UPDATE SYSTEM SETTINGS (if table exists)
-- ================================

-- Update system default currency to PHP
-- Note: This assumes a system_settings table exists
-- If not, this will be handled in the application layer
UPDATE system_settings 
SET default_currency = 'PHP'
WHERE id = 1 OR default_currency != 'PHP';

-- If system_settings table doesn't exist, create it with PHP default
INSERT INTO system_settings (id, default_currency, created_at, updated_at)
SELECT 1, 'PHP', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE id = 1);

-- ================================
-- 3. UPDATE USER ACCOUNTS TABLE (if exists)
-- ================================

-- Update any user accounts that might have currency references
UPDATE accounts 
SET currency = 'PHP'
WHERE currency != 'PHP' OR currency IS NULL;

-- ================================
-- 4. CURRENCY CONVERSION LOGIC
-- ================================

-- Static conversion rates (approximate values as of 2025)
-- 1 USD = 56.50 PHP, 1 EUR = 61.75 PHP, etc.

-- Note: For this implementation, we'll leave existing amounts as-is
-- and only change the currency format to PHP. If actual conversion is needed,
-- uncomment and modify the sections below:

/*
-- Convert budget amounts (if conversion is desired)
UPDATE budgets 
SET amount = CASE 
    WHEN currency = 'USD' THEN amount * 56.50
    WHEN currency = 'EUR' THEN amount * 61.75
    WHEN currency = 'GBP' THEN amount * 71.25
    WHEN currency = 'JPY' THEN amount * 0.38
    WHEN currency = 'CAD' THEN amount * 41.75
    WHEN currency = 'AUD' THEN amount * 37.50
    ELSE amount
END,
currency = 'PHP'
WHERE currency != 'PHP';

-- Convert transaction amounts (if conversion is desired)
UPDATE transactions 
SET amount = CASE 
    WHEN currency = 'USD' THEN amount * 56.50
    WHEN currency = 'EUR' THEN amount * 61.75
    WHEN currency = 'GBP' THEN amount * 71.25
    WHEN currency = 'JPY' THEN amount * 0.38
    WHEN currency = 'CAD' THEN amount * 41.75
    WHEN currency = 'AUD' THEN amount * 37.50
    ELSE amount
END,
currency = 'PHP'
WHERE currency != 'PHP';

-- Convert goal amounts (if conversion is desired)
UPDATE goals 
SET target_amount = CASE 
    WHEN currency = 'USD' THEN target_amount * 56.50
    WHEN currency = 'EUR' THEN target_amount * 61.75
    WHEN currency = 'GBP' THEN target_amount * 71.25
    WHEN currency = 'JPY' THEN target_amount * 0.38
    WHEN currency = 'CAD' THEN target_amount * 41.75
    WHEN currency = 'AUD' THEN target_amount * 37.50
    ELSE target_amount
END,
current_amount = CASE 
    WHEN currency = 'USD' THEN current_amount * 56.50
    WHEN currency = 'EUR' THEN current_amount * 61.75
    WHEN currency = 'GBP' THEN current_amount * 71.25
    WHEN currency = 'JPY' THEN current_amount * 0.38
    WHEN currency = 'CAD' THEN current_amount * 41.75
    WHEN currency = 'AUD' THEN current_amount * 37.50
    ELSE current_amount
END,
currency = 'PHP'
WHERE currency != 'PHP';
*/

-- ================================
-- 5. CLEAN UP AND VALIDATION
-- ================================

-- Verify all families now use PHP
SELECT family_name, currency_pref 
FROM families 
WHERE currency_pref != 'PHP';

-- Verify system settings
SELECT default_currency 
FROM system_settings 
WHERE id = 1;

-- Show affected record counts
SELECT 
    'families' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN currency_pref = 'PHP' THEN 1 END) as php_records
FROM families

UNION ALL

SELECT 
    'accounts' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN currency = 'PHP' THEN 1 END) as php_records
FROM accounts
WHERE currency IS NOT NULL;

-- Commit transaction
COMMIT;

-- ================================
-- 6. POST-MIGRATION NOTES
-- ================================

-- IMPORTANT: After running this script, you should:
-- 1. Clear localStorage 'preferredCurrency' in the frontend
-- 2. Update the CurrencyContext to force PHP
-- 3. Remove currency selection dropdowns from UI
-- 4. Test all financial displays show ₱ symbol
-- 5. Verify all forms no longer show currency options

-- To rollback (if needed), run:
-- ALTER TABLE families DROP CONSTRAINT IF EXISTS currency_php_only;
-- (Then restore from backup)

COMMIT;