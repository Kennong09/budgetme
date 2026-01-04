-- Database Updates for Account Setup Modal and Audit System
-- This file contains all necessary database modifications

-- 1. Update transactions table to support 'cash_in' transaction type
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (type = ANY (ARRAY['income'::text, 'expense'::text, 'transfer'::text, 'contribution'::text, 'cash_in'::text]));

-- 2. Update system_activity_log to support account-related activity types
ALTER TABLE public.system_activity_log 
DROP CONSTRAINT IF EXISTS system_activity_log_activity_type_check;

ALTER TABLE public.system_activity_log 
ADD CONSTRAINT system_activity_log_activity_type_check 
CHECK (activity_type = ANY (ARRAY[
    'login'::text, 'logout'::text, 'user_created'::text, 'user_updated'::text, 
    'admin_action'::text, 'system_event'::text, 'error'::text,
    'account_created'::text, 'account_updated'::text, 'account_cash_in'::text, 
    'account_deleted'::text, 'account_balance_change'::text
]));

-- 3. Create function for account balance updates with audit logging
CREATE OR REPLACE FUNCTION public.update_account_balance_with_audit(
    p_account_id UUID,
    p_amount_change NUMERIC,
    p_user_id UUID,
    p_reason TEXT DEFAULT 'Transaction update',
    p_transaction_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_old_balance NUMERIC;
    v_new_balance NUMERIC;
    v_account_name TEXT;
BEGIN
    -- Get current balance and account name
    SELECT balance, account_name INTO v_old_balance, v_account_name
    FROM public.accounts 
    WHERE id = p_account_id AND user_id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Account not found or access denied';
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_old_balance + p_amount_change;
    
    -- Update account balance
    UPDATE public.accounts
    SET balance = v_new_balance,
        updated_at = now()
    WHERE id = p_account_id AND user_id = p_user_id;
    
    -- Log the balance change
    INSERT INTO public.system_activity_log (
        user_id, activity_type, activity_description, metadata, severity
    ) VALUES (
        p_user_id, 
        'account_balance_change',
        format('Balance %s by %s for account "%s": %s', 
               CASE WHEN p_amount_change > 0 THEN 'increased' ELSE 'decreased' END,
               abs(p_amount_change),
               v_account_name,
               p_reason),
        jsonb_build_object(
            'account_id', p_account_id,
            'account_name', v_account_name,
            'old_balance', v_old_balance,
            'new_balance', v_new_balance,
            'change_amount', p_amount_change,
            'reason', p_reason,
            'transaction_id', p_transaction_id
        ),
        'info'
    );
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to update account balance: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function for logging account creation
CREATE OR REPLACE FUNCTION public.log_account_creation() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.system_activity_log (
        user_id, activity_type, activity_description, metadata, severity
    ) VALUES (
        NEW.user_id,
        'account_created',
        format('Account "%s" created successfully', NEW.account_name),
        jsonb_build_object(
            'account_id', NEW.id,
            'account_name', NEW.account_name,
            'account_type', NEW.account_type,
            'initial_balance', NEW.initial_balance,
            'currency', NEW.currency,
            'is_default', NEW.is_default,
            'created_via', 'account_setup'
        ),
        'info'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function for logging account updates
CREATE OR REPLACE FUNCTION public.log_account_update() RETURNS TRIGGER AS $$
DECLARE
    v_changes JSONB := '{}'::jsonb;
    v_change_description TEXT := '';
BEGIN
    -- Track what changed
    IF OLD.account_name != NEW.account_name THEN
        v_changes := v_changes || jsonb_build_object('account_name', jsonb_build_object('old', OLD.account_name, 'new', NEW.account_name));
        v_change_description := v_change_description || format('Name: "%s" → "%s"; ', OLD.account_name, NEW.account_name);
    END IF;
    
    IF OLD.account_type != NEW.account_type THEN
        v_changes := v_changes || jsonb_build_object('account_type', jsonb_build_object('old', OLD.account_type, 'new', NEW.account_type));
        v_change_description := v_change_description || format('Type: %s → %s; ', OLD.account_type, NEW.account_type);
    END IF;
    
    IF OLD.is_default != NEW.is_default THEN
        v_changes := v_changes || jsonb_build_object('is_default', jsonb_build_object('old', OLD.is_default, 'new', NEW.is_default));
        v_change_description := v_change_description || format('Default: %s → %s; ', OLD.is_default, NEW.is_default);
    END IF;
    
    IF OLD.status != NEW.status THEN
        v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
        v_change_description := v_change_description || format('Status: %s → %s; ', OLD.status, NEW.status);
    END IF;
    
    -- Only log if there were actual changes (excluding balance and updated_at)
    IF jsonb_object_keys(v_changes) IS NOT NULL THEN
        INSERT INTO public.system_activity_log (
            user_id, activity_type, activity_description, metadata, severity
        ) VALUES (
            NEW.user_id,
            'account_updated',
            format('Account "%s" updated: %s', NEW.account_name, trim(trailing '; ' from v_change_description)),
            jsonb_build_object(
                'account_id', NEW.id,
                'account_name', NEW.account_name,
                'changes', v_changes,
                'updated_via', 'account_settings'
            ),
            'info'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create triggers for automatic audit logging
DROP TRIGGER IF EXISTS trigger_log_account_creation ON public.accounts;
CREATE TRIGGER trigger_log_account_creation
    AFTER INSERT ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION public.log_account_creation();

DROP TRIGGER IF EXISTS trigger_log_account_update ON public.accounts;
CREATE TRIGGER trigger_log_account_update
    AFTER UPDATE ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION public.log_account_update();

-- 7. Create RPC function for account audit retrieval (for the frontend)
CREATE OR REPLACE FUNCTION public.get_account_audit_history(
    p_account_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    id UUID,
    activity_type TEXT,
    activity_description TEXT,
    metadata JSONB,
    severity TEXT,
    created_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sal.id,
        sal.activity_type,
        sal.activity_description,
        sal.metadata,
        sal.severity,
        sal.created_at,
        sal.ip_address,
        sal.user_agent
    FROM public.system_activity_log sal
    WHERE sal.user_id = auth.uid()
    AND sal.metadata->>'account_id' = p_account_id::text
    AND sal.activity_type IN ('account_created', 'account_updated', 'account_cash_in', 'account_deleted', 'account_balance_change')
    ORDER BY sal.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Update the transaction balance update trigger to handle cash_in transactions
CREATE OR REPLACE FUNCTION public.update_account_balance_from_transaction() RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT
    IF TG_OP = 'INSERT' THEN
        -- Update primary account
        IF NEW.account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET balance = balance + CASE
                WHEN NEW.type = 'income' THEN NEW.amount
                WHEN NEW.type = 'cash_in' THEN NEW.amount  -- Add cash_in support
                WHEN NEW.type = 'expense' THEN -NEW.amount
                WHEN NEW.type = 'transfer' THEN -NEW.amount
                WHEN NEW.type = 'contribution' THEN -NEW.amount
                ELSE 0
            END,
            updated_at = now()
            WHERE id = NEW.account_id;
        END IF;
        
        -- Update transfer account for transfers
        IF NEW.type = 'transfer' AND NEW.transfer_account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET balance = balance + NEW.amount,
                updated_at = now()
            WHERE id = NEW.transfer_account_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE
    IF TG_OP = 'UPDATE' THEN
        -- Reverse old transaction effects
        IF OLD.account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET balance = balance - CASE
                WHEN OLD.type = 'income' THEN OLD.amount
                WHEN OLD.type = 'cash_in' THEN OLD.amount  -- Add cash_in support
                WHEN OLD.type = 'expense' THEN -OLD.amount
                WHEN OLD.type = 'transfer' THEN -OLD.amount
                WHEN OLD.type = 'contribution' THEN -OLD.amount
                ELSE 0
            END,
            updated_at = now()
            WHERE id = OLD.account_id;
        END IF;
        
        IF OLD.type = 'transfer' AND OLD.transfer_account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET balance = balance - OLD.amount,
                updated_at = now()
            WHERE id = OLD.transfer_account_id;
        END IF;
        
        -- Apply new transaction effects
        IF NEW.account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET balance = balance + CASE
                WHEN NEW.type = 'income' THEN NEW.amount
                WHEN NEW.type = 'cash_in' THEN NEW.amount  -- Add cash_in support
                WHEN NEW.type = 'expense' THEN -NEW.amount
                WHEN NEW.type = 'transfer' THEN -NEW.amount
                WHEN NEW.type = 'contribution' THEN -NEW.amount
                ELSE 0
            END,
            updated_at = now()
            WHERE id = NEW.account_id;
        END IF;
        
        IF NEW.type = 'transfer' AND NEW.transfer_account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET balance = balance + NEW.amount,
                updated_at = now()
            WHERE id = NEW.transfer_account_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        -- Reverse transaction effects
        IF OLD.account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET balance = balance - CASE
                WHEN OLD.type = 'income' THEN OLD.amount
                WHEN OLD.type = 'cash_in' THEN OLD.amount  -- Add cash_in support
                WHEN OLD.type = 'expense' THEN -OLD.amount
                WHEN OLD.type = 'transfer' THEN -OLD.amount
                WHEN OLD.type = 'contribution' THEN -OLD.amount
                ELSE 0
            END,
            updated_at = now()
            WHERE id = OLD.account_id;
        END IF;
        
        IF OLD.type = 'transfer' AND OLD.transfer_account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET balance = balance - OLD.amount,
                updated_at = now()
            WHERE id = OLD.transfer_account_id;
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace the existing trigger
DROP TRIGGER IF EXISTS trigger_update_account_balance ON public.transactions;
CREATE TRIGGER trigger_update_account_balance
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_account_balance_from_transaction();

-- 9. Add indexes for better performance on audit queries
CREATE INDEX IF NOT EXISTS idx_system_activity_log_account_audit 
ON public.system_activity_log (user_id, activity_type, created_at DESC) 
WHERE activity_type IN ('account_created', 'account_updated', 'account_cash_in', 'account_deleted', 'account_balance_change');

CREATE INDEX IF NOT EXISTS idx_system_activity_log_metadata_account_id 
ON public.system_activity_log ((metadata->>'account_id')) 
WHERE metadata->>'account_id' IS NOT NULL;

-- 10. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.update_account_balance_with_audit(UUID, NUMERIC, UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_account_audit_history(UUID, INTEGER, INTEGER) TO authenticated;

-- Enable RLS policies for the system_activity_log if not already enabled
ALTER TABLE public.system_activity_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for users to access their own audit logs
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.system_activity_log;
CREATE POLICY "Users can view their own activity logs" ON public.system_activity_log
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (
        SELECT user_id FROM public.user_roles WHERE role_name = 'admin' AND is_active = true
    ));

-- Create RLS policy for system to insert activity logs
DROP POLICY IF EXISTS "System can insert activity logs" ON public.system_activity_log;
CREATE POLICY "System can insert activity logs" ON public.system_activity_log
    FOR INSERT WITH CHECK (true);
