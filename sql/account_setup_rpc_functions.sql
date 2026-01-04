-- RPC Functions for Account Setup Modal
-- Functions that can be called directly from the frontend

-- 1. Create account with automatic audit logging
CREATE OR REPLACE FUNCTION public.create_account_with_audit(
    p_account_name TEXT,
    p_account_type TEXT,
    p_initial_balance NUMERIC DEFAULT 0,
    p_currency TEXT DEFAULT 'PHP',
    p_is_default BOOLEAN DEFAULT FALSE,
    p_color TEXT DEFAULT '#4e73df',
    p_description TEXT DEFAULT NULL,
    p_institution_name TEXT DEFAULT NULL,
    p_account_number_masked TEXT DEFAULT NULL
) RETURNS TABLE (
    account_id UUID,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_account_id UUID;
    v_user_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, 'Authentication required';
        RETURN;
    END IF;
    
    -- Insert new account
    INSERT INTO public.accounts (
        user_id, account_name, account_type, balance, initial_balance,
        currency, status, is_default, color, description,
        institution_name, account_number_masked
    ) VALUES (
        v_user_id, p_account_name, p_account_type, p_initial_balance, p_initial_balance,
        p_currency, 'active', p_is_default, p_color, p_description,
        p_institution_name, p_account_number_masked
    ) RETURNING id INTO v_account_id;
    
    RETURN QUERY SELECT v_account_id, TRUE, 'Account created successfully';
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create cash-in transaction with audit logging
CREATE OR REPLACE FUNCTION public.create_cash_in_transaction(
    p_account_id UUID,
    p_amount NUMERIC,
    p_description TEXT,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    transaction_id UUID,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_transaction_id UUID;
    v_user_id UUID;
    v_account_name TEXT;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, 'Authentication required';
        RETURN;
    END IF;
    
    -- Verify account belongs to user and get account name
    SELECT account_name INTO v_account_name
    FROM public.accounts 
    WHERE id = p_account_id AND user_id = v_user_id AND status = 'active';
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, 'Account not found or access denied';
        RETURN;
    END IF;
    
    -- Create cash-in transaction
    INSERT INTO public.transactions (
        user_id, account_id, type, amount, description, date, status
    ) VALUES (
        v_user_id, p_account_id, 'cash_in', p_amount, p_description, p_date, 'completed'
    ) RETURNING id INTO v_transaction_id;
    
    -- Log the cash-in activity
    INSERT INTO public.system_activity_log (
        user_id, activity_type, activity_description, metadata, severity
    ) VALUES (
        v_user_id,
        'account_cash_in',
        format('Cash-in of ₱%s to account "%s"', p_amount, v_account_name),
        jsonb_build_object(
            'cash_in_via', 'account_setup_modal',
            'account_id', p_account_id,
            'account_name', v_account_name,
            'amount', p_amount,
            'description', p_description,
            'date', p_date,
            'transaction_id', v_transaction_id
        ),
        'info'
    );
    
    RETURN QUERY SELECT v_transaction_id, TRUE, 'Cash-in transaction created successfully';
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Get user accounts for account setup modal
CREATE OR REPLACE FUNCTION public.get_user_accounts_for_setup()
RETURNS TABLE (
    id UUID,
    account_name TEXT,
    account_type TEXT,
    balance NUMERIC,
    currency TEXT,
    is_default BOOLEAN,
    color TEXT,
    status TEXT,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        a.id,
        a.account_name,
        a.account_type,
        a.balance,
        a.currency,
        a.is_default,
        a.color,
        a.status,
        a.created_at
    FROM public.accounts a
    WHERE a.user_id = v_user_id
    AND a.status = 'active'
    ORDER BY a.is_default DESC, a.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Validate account setup data
CREATE OR REPLACE FUNCTION public.validate_account_setup_data(
    p_account_name TEXT,
    p_account_type TEXT,
    p_initial_balance NUMERIC DEFAULT 0
) RETURNS TABLE (
    is_valid BOOLEAN,
    errors JSONB
) AS $$
DECLARE
    v_errors JSONB := '{}'::jsonb;
    v_user_id UUID;
    v_existing_count INTEGER;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        v_errors := v_errors || jsonb_build_object('auth', 'Authentication required');
        RETURN QUERY SELECT FALSE, v_errors;
        RETURN;
    END IF;
    
    -- Validate account name
    IF p_account_name IS NULL OR trim(p_account_name) = '' THEN
        v_errors := v_errors || jsonb_build_object('account_name', 'Account name is required');
    ELSIF length(trim(p_account_name)) < 3 THEN
        v_errors := v_errors || jsonb_build_object('account_name', 'Account name must be at least 3 characters');
    ELSIF length(trim(p_account_name)) > 50 THEN
        v_errors := v_errors || jsonb_build_object('account_name', 'Account name cannot exceed 50 characters');
    END IF;
    
    -- Check for duplicate account name for this user
    SELECT COUNT(*) INTO v_existing_count
    FROM public.accounts
    WHERE user_id = v_user_id
    AND lower(trim(account_name)) = lower(trim(p_account_name))
    AND status = 'active';
    
    IF v_existing_count > 0 THEN
        v_errors := v_errors || jsonb_build_object('account_name', 'An account with this name already exists');
    END IF;
    
    -- Validate account type
    IF p_account_type NOT IN ('checking', 'savings', 'credit', 'investment', 'cash', 'other') THEN
        v_errors := v_errors || jsonb_build_object('account_type', 'Invalid account type');
    END IF;
    
    -- Validate balance
    IF p_initial_balance IS NULL THEN
        v_errors := v_errors || jsonb_build_object('initial_balance', 'Initial balance is required');
    ELSIF p_initial_balance < 0 AND p_account_type != 'credit' THEN
        v_errors := v_errors || jsonb_build_object('initial_balance', 'Initial balance cannot be negative for this account type');
    ELSIF p_account_type = 'credit' AND p_initial_balance > 0 THEN
        v_errors := v_errors || jsonb_build_object('initial_balance', 'Credit account balance must be zero or negative');
    END IF;
    
    -- Return validation result
    IF jsonb_object_keys(v_errors) IS NULL THEN
        RETURN QUERY SELECT TRUE, '{}'::jsonb;
    ELSE
        RETURN QUERY SELECT FALSE, v_errors;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Get account transaction history (for AccountHistory component)
CREATE OR REPLACE FUNCTION public.get_account_transaction_history(
    p_account_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    id UUID,
    date DATE,
    type TEXT,
    amount NUMERIC,
    description TEXT,
    notes TEXT,
    status TEXT,
    category_name TEXT,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Verify account belongs to user
    IF NOT EXISTS (
        SELECT 1 FROM public.accounts 
        WHERE id = p_account_id AND user_id = v_user_id
    ) THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        t.id,
        t.date,
        t.type,
        t.amount,
        COALESCE(t.description, '') as description,
        COALESCE(t.notes, '') as notes,
        COALESCE(t.status, 'completed') as status,
        CASE 
            WHEN t.type = 'income' THEN COALESCE(ic.category_name, '')
            WHEN t.type = 'expense' THEN COALESCE(ec.category_name, '')
            ELSE ''
        END as category_name,
        t.created_at
    FROM public.transactions t
    LEFT JOIN public.income_categories ic ON t.income_category_id = ic.id
    LEFT JOIN public.expense_categories ec ON t.expense_category_id = ec.id
    WHERE (t.account_id = p_account_id OR t.transfer_account_id = p_account_id)
    AND t.user_id = v_user_id
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.create_account_with_audit(TEXT, TEXT, NUMERIC, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_cash_in_transaction(UUID, NUMERIC, TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_accounts_for_setup() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_account_setup_data(TEXT, TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_account_transaction_history(UUID, INTEGER, INTEGER) TO authenticated;
