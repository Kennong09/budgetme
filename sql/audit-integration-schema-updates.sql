-- =====================================================
-- AUDIT INTEGRATION SCHEMA UPDATES
-- =====================================================
-- Add support for transaction and goal contribution audit logging
-- to the existing system_activity_log table

-- Update system_activity_log to support transaction and goal contribution activity types
ALTER TABLE public.system_activity_log 
DROP CONSTRAINT IF EXISTS system_activity_log_activity_type_check;

ALTER TABLE public.system_activity_log 
ADD CONSTRAINT system_activity_log_activity_type_check 
CHECK (activity_type = ANY (ARRAY[
    -- Existing activity types
    'login'::text, 
    'logout'::text, 
    'user_created'::text, 
    'user_updated'::text, 
    'admin_action'::text, 
    'system_event'::text, 
    'error'::text,
    -- Account activity types  
    'account_created'::text, 
    'account_updated'::text, 
    'account_cash_in'::text, 
    'account_deleted'::text, 
    'account_balance_change'::text,
    -- New transaction activity types
    'transaction_created'::text,
    'transaction_updated'::text, 
    'transaction_deleted'::text,
    -- New goal contribution activity types
    'goal_contribution_created'::text,
    'goal_contribution_updated'::text,
    'goal_contribution_deleted'::text
]));

-- Create index on activity_type and user_id for better query performance
CREATE INDEX IF NOT EXISTS idx_system_activity_log_activity_type_user 
ON public.system_activity_log (activity_type, user_id);

-- Create index on metadata for account-specific queries  
CREATE INDEX IF NOT EXISTS idx_system_activity_log_metadata_account 
ON public.system_activity_log USING gin ((metadata->>'account_id'));

-- Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_system_activity_log_created_at 
ON public.system_activity_log (created_at DESC);

-- Comment explaining the audit integration
COMMENT ON CONSTRAINT system_activity_log_activity_type_check 
ON public.system_activity_log IS 'Updated to support transaction and goal contribution audit logging for comprehensive account history tracking';
