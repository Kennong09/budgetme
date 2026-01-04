

-- =====================================================
-- DEPLOYMENT LOGGING AND ERROR HANDLING
-- =====================================================

-- Log schema deployment start
DO $$
BEGIN
    RAISE NOTICE 'DEPLOYING: 02-shared-schema.sql - Shared Utilities and Helper Functions';
    RAISE NOTICE 'Timestamp: %', now();
    RAISE NOTICE 'Dependencies: 01-auth-schema.sql';
END $$;

-- =====================================================
-- 12-SHARED-SCHEMA.SQL
-- =====================================================
-- Module: Shared Utilities and Helper Functions
-- Purpose: Common functions, triggers, and utilities used across modules
-- Dependencies: 02-auth-schema.sql
-- Backend Services: All services
-- Frontend Components: All components (indirect usage)
-- =====================================================
-- Version: 1.0.0
-- Created: 2025-09-20
-- Compatible with: All BudgetMe modules
-- =====================================================

-- =====================================================
-- ENVIRONMENT DETECTION AND DEPLOYMENT UTILITIES
-- =====================================================

-- Function to detect deployment environment and validate capabilities
DROP FUNCTION IF EXISTS public.detect_deployment_environment() CASCADE;
CREATE OR REPLACE FUNCTION public.detect_deployment_environment()
RETURNS JSONB AS $$
DECLARE
    env_info JSONB := '{}'::jsonb;
    user_count INTEGER := 0;
    admin_count INTEGER := 0;
    auth_session_exists BOOLEAN := false;
    current_user_id UUID := NULL;
    deployment_capabilities JSONB;
BEGIN
    -- Check if authenticated users exist
    BEGIN
        SELECT COUNT(*) INTO user_count FROM auth.users;
    EXCEPTION
        WHEN OTHERS THEN
            user_count := 0;
    END;
    
    -- Check for admin users
    BEGIN
        SELECT COUNT(*) INTO admin_count 
        FROM public.profiles 
        WHERE role = 'admin' AND is_active = true;
    EXCEPTION
        WHEN OTHERS THEN
            admin_count := 0;
    END;
    
    -- Check if current session has authentication context
    BEGIN
        current_user_id := auth.uid();
        auth_session_exists := (current_user_id IS NOT NULL);
    EXCEPTION
        WHEN OTHERS THEN
            auth_session_exists := false;
            current_user_id := NULL;
    END;
    
    -- Determine deployment capabilities
    deployment_capabilities := jsonb_build_object(
        'can_test_constraints', (user_count > 0 AND auth_session_exists),
        'can_create_test_data', (user_count > 0),
        'has_admin_access', (admin_count > 0 AND auth_session_exists),
        'is_fresh_install', (user_count = 0),
        'requires_seeding', (user_count = 0 AND admin_count = 0)
    );
    
    -- Build comprehensive environment information
    env_info := jsonb_build_object(
        'user_count', user_count,
        'admin_count', admin_count,
        'has_authenticated_session', auth_session_exists,
        'current_user_id', current_user_id,
        'environment_type', CASE 
            WHEN user_count = 0 THEN 'fresh_deployment'
            WHEN user_count < 5 THEN 'development'
            WHEN user_count < 50 THEN 'staging'
            WHEN auth_session_exists AND admin_count > 0 THEN 'production_admin'
            ELSE 'production'
        END,
        'deployment_capabilities', deployment_capabilities,
        'deployment_timestamp', now(),
        'schema_version', '2.0.0',
        'deployment_notes', CASE 
            WHEN user_count = 0 THEN 'Fresh installation - user-dependent validations will be skipped'
            WHEN NOT auth_session_exists THEN 'No authenticated session - constraint testing limited'
            ELSE 'Full validation capabilities available'
        END
    );
    
    RETURN env_info;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate environment readiness for specific operations
DROP FUNCTION IF EXISTS public.validate_environment_for_operation(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.validate_environment_for_operation(
    operation_type TEXT
)
RETURNS JSONB AS $$
DECLARE
    env_info JSONB;
    validation_result JSONB;
    can_proceed BOOLEAN := false;
    warnings TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Get current environment information
    SELECT public.detect_deployment_environment() INTO env_info;
    
    -- Validate based on operation type
    CASE operation_type
        WHEN 'constraint_testing' THEN
            can_proceed := (env_info->'deployment_capabilities'->>'can_test_constraints')::boolean;
            IF NOT can_proceed THEN
                warnings := array_append(warnings, 'Constraint testing requires authenticated users');
            END IF;
            
        WHEN 'user_creation' THEN
            can_proceed := true; -- Always allow user creation
            
        WHEN 'admin_operations' THEN
            can_proceed := (env_info->'deployment_capabilities'->>'has_admin_access')::boolean;
            IF NOT can_proceed THEN
                warnings := array_append(warnings, 'Admin operations require authenticated admin user');
            END IF;
            
        WHEN 'data_seeding' THEN
            can_proceed := (env_info->'deployment_capabilities'->>'can_create_test_data')::boolean;
            IF env_info->>'environment_type' = 'production' THEN
                warnings := array_append(warnings, 'Data seeding in production environment requires caution');
            END IF;
            
        ELSE
            can_proceed := true;
            warnings := array_append(warnings, format('Unknown operation type: %', operation_type));
    END CASE;
    
    -- Build validation result
    validation_result := jsonb_build_object(
        'operation_type', operation_type,
        'can_proceed', can_proceed,
        'environment_info', env_info,
        'warnings', to_jsonb(warnings),
        'validation_timestamp', now()
    );
    
    RETURN validation_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log deployment events with environment context
DROP FUNCTION IF EXISTS public.log_deployment_event(TEXT, JSONB, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.log_deployment_event(
    event_type TEXT,
    event_details JSONB DEFAULT '{}',
    severity TEXT DEFAULT 'INFO'
)
RETURNS BOOLEAN AS $$
DECLARE
    env_info JSONB;
    log_entry JSONB;
BEGIN
    -- Get environment context
    SELECT public.detect_deployment_environment() INTO env_info;
    
    -- Build comprehensive log entry
    log_entry := jsonb_build_object(
        'timestamp', now(),
        'event_type', event_type,
        'severity', severity,
        'environment_type', env_info->>'environment_type',
        'schema_version', env_info->>'schema_version',
        'event_details', event_details,
        'environment_context', env_info
    );
    
    -- Log via NOTICE (for deployment visibility)
    RAISE NOTICE 'DEPLOYMENT_LOG [%]: % - %', 
        severity, event_type, 
        COALESCE(event_details->>'message', 'Event logged');
    
    -- In a production system, you would also store this in a dedicated log table
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to log deployment event: %', SQLERRM;
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Generic timestamp update function
DROP FUNCTION IF EXISTS public.update_timestamp() CASCADE;
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate secure random tokens
DROP FUNCTION IF EXISTS public.generate_secure_token(INTEGER) CASCADE;
CREATE OR REPLACE FUNCTION public.generate_secure_token(length INTEGER DEFAULT 32)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(length), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate UUID format
DROP FUNCTION IF EXISTS public.is_valid_uuid(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.is_valid_uuid(input_uuid TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    PERFORM input_uuid::UUID;
    RETURN true;
EXCEPTION
    WHEN invalid_text_representation THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely refresh materialized views
DROP FUNCTION IF EXISTS public.safe_refresh_materialized_view(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.safe_refresh_materialized_view(view_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    BEGIN
        EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', view_name);
        RETURN true;
    EXCEPTION
        WHEN OTHERS THEN
            -- Fallback to non-concurrent refresh
            BEGIN
                EXECUTE format('REFRESH MATERIALIZED VIEW %I', view_name);
                RETURN true;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE WARNING 'Failed to refresh materialized view %: %', view_name, SQLERRM;
                    RETURN false;
            END;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FAMILY MANAGEMENT HELPERS
-- =====================================================

-- Function to safely refresh family memberships view
DROP FUNCTION IF EXISTS public.safe_refresh_family_memberships() CASCADE;
CREATE OR REPLACE FUNCTION public.safe_refresh_family_memberships()
RETURNS VOID AS $$
BEGIN
    PERFORM public.safe_refresh_materialized_view('user_family_memberships');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's family membership without materialized view dependency
DROP FUNCTION IF EXISTS public.get_family_membership(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.get_family_membership(p_user_id UUID)
RETURNS TABLE (
    family_id UUID,
    family_name TEXT,
    description TEXT,
    currency_pref TEXT,
    is_member BOOLEAN,
    role TEXT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id AS family_id,
        f.family_name,
        f.description,
        f.currency_pref,
        TRUE AS is_member,
        fm.role::TEXT,
        fm.status::TEXT
    FROM
        public.families f
        JOIN public.family_members fm ON f.id = fm.family_id
    WHERE
        fm.user_id = p_user_id
        AND fm.status = 'active'
    ORDER BY fm.created_at DESC
    LIMIT 1;
    
    -- Return empty result if no active family membership found
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            NULL::UUID AS family_id,
            NULL::TEXT AS family_name,
            NULL::TEXT AS description,
            NULL::TEXT AS currency_pref,
            FALSE AS is_member,
            NULL::TEXT AS role,
            NULL::TEXT AS status;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create family with member in transaction-safe way
DROP FUNCTION IF EXISTS public.create_family_with_member(TEXT, TEXT, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_family_with_member(TEXT, TEXT, TEXT, BOOLEAN, UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.create_family_with_member(
    p_family_name TEXT,
    p_description TEXT,
    p_currency_pref TEXT,
    p_is_public BOOLEAN DEFAULT false,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS JSON AS $function$
DECLARE
    v_family_id UUID;
    v_existing_family_id UUID;
    v_result JSON;
BEGIN
    -- Validate inputs
    IF p_family_name IS NULL OR LENGTH(TRIM(p_family_name)) = 0 THEN
        RAISE EXCEPTION 'Family name cannot be empty';
    END IF;
    
    IF LENGTH(p_family_name) > 255 THEN
        RAISE EXCEPTION 'Family name too long (max 255 characters)';
    END IF;
    
    IF p_description IS NOT NULL AND LENGTH(p_description) > 500 THEN
        RAISE EXCEPTION 'Description too long (max 500 characters)';
    END IF;
    
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required';
    END IF;
    
    -- Check if user is already in an active family
    SELECT family_id INTO v_existing_family_id
    FROM public.family_members
    WHERE user_id = p_user_id AND status = 'active'
    LIMIT 1;
    
    IF v_existing_family_id IS NOT NULL THEN
        RAISE EXCEPTION 'User is already a member of family %', v_existing_family_id;
    END IF;
    
    -- Create family
    INSERT INTO public.families (
        family_name, 
        description, 
        currency_pref,
        is_public,
        created_by
    ) VALUES (
        TRIM(p_family_name),
        TRIM(p_description),
        COALESCE(p_currency_pref, 'PHP'),
        COALESCE(p_is_public, false),
        p_user_id
    ) RETURNING id INTO v_family_id;
    
    -- Add user as admin member with full permissions
    INSERT INTO public.family_members (
        family_id,
        user_id,
        role,
        status,
        can_create_goals,
        can_view_budgets,
        can_contribute_goals,
        joined_at
    ) VALUES (
        v_family_id,
        p_user_id,
        'admin',
        'active',
        true,
        true,
        true,
        now()
    );
    
    -- Build complete result with family and member information
    SELECT json_build_object(
        'id', v_family_id,
        'family_name', TRIM(p_family_name),
        'description', TRIM(p_description),
        'currency_pref', COALESCE(p_currency_pref, 'PHP'),
        'is_public', COALESCE(p_is_public, false),
        'created_by', p_user_id,
        'created_at', now(),
        'updated_at', now()
    ) INTO v_result;
    
    -- Refresh family views asynchronously
    PERFORM pg_notify('refresh_family_views', v_family_id::TEXT);
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating family: %', SQLERRM;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FINANCIAL CALCULATION HELPERS
-- =====================================================

-- Function to calculate percentage safely (avoiding division by zero)
DROP FUNCTION IF EXISTS public.safe_percentage(DECIMAL, DECIMAL, INTEGER) CASCADE;
CREATE OR REPLACE FUNCTION public.safe_percentage(
    part DECIMAL,
    total DECIMAL,
    decimal_places INTEGER DEFAULT 2
)
RETURNS DECIMAL AS $$
BEGIN
    IF total = 0 OR total IS NULL THEN
        RETURN 0;
    END IF;
    
    RETURN ROUND((part / total) * 100, decimal_places);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to format currency with symbol - Enhanced for Centavo Support
DROP FUNCTION IF EXISTS public.format_currency(DECIMAL, TEXT, BOOLEAN) CASCADE;
CREATE OR REPLACE FUNCTION public.format_currency(
    amount DECIMAL,
    currency_code TEXT DEFAULT 'PHP',
    include_symbol BOOLEAN DEFAULT true
)
RETURNS TEXT AS $$
DECLARE
    formatted_amount TEXT;
    currency_symbol TEXT;
    decimal_places INTEGER;
BEGIN
    -- Determine decimal places based on currency
    decimal_places := CASE currency_code
        WHEN 'JPY' THEN 0  -- Japanese Yen has no decimal places
        WHEN 'KRW' THEN 0  -- Korean Won has no decimal places
        WHEN 'VND' THEN 0  -- Vietnamese Dong has no decimal places
        ELSE 2             -- Most currencies including PHP use 2 decimal places for centavos
    END;
    
    -- Format the number with commas and appropriate decimal places for centavos
    IF decimal_places = 0 THEN
        formatted_amount := to_char(amount, 'FM999,999,999,990');
    ELSE
        -- Support centavos with proper formatting (25, 50, 75, 00)
        formatted_amount := to_char(amount, 'FM999,999,999,990.00');
    END IF;
    
    -- Get currency symbol with PHP support
    currency_symbol := CASE currency_code
        WHEN 'USD' THEN '$'
        WHEN 'EUR' THEN '€'
        WHEN 'GBP' THEN '£'
        WHEN 'JPY' THEN '¥'
        WHEN 'CAD' THEN 'C$'
        WHEN 'AUD' THEN 'A$'
        WHEN 'PHP' THEN '₱'  -- Philippine Peso with centavo support
        WHEN 'CHF' THEN 'CHF '
        WHEN 'CNY' THEN '¥'
        WHEN 'INR' THEN '₹'
        WHEN 'BRL' THEN 'R$'
        WHEN 'MXN' THEN '$'
        WHEN 'KRW' THEN '₩'
        WHEN 'SGD' THEN 'S$'
        WHEN 'HKD' THEN 'HK$'
        WHEN 'THB' THEN '฿'
        WHEN 'MYR' THEN 'RM'
        WHEN 'IDR' THEN 'Rp'
        WHEN 'VND' THEN '₫'
        ELSE currency_code || ' '
    END;
    
    IF include_symbol THEN
        RETURN currency_symbol || formatted_amount;
    ELSE
        RETURN formatted_amount;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to safely validate budget names
CREATE OR REPLACE FUNCTION public.validate_budget_name(budget_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check for format string injection characters
    IF budget_name ~ '[%\*]' THEN
        RETURN FALSE;
    END IF;
    
    -- Check length
    IF LENGTH(budget_name) = 0 OR LENGTH(budget_name) > 100 THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to sanitize budget names for safe storage
CREATE OR REPLACE FUNCTION public.sanitize_budget_name(budget_name TEXT)
RETURNS TEXT AS $$
BEGIN
    IF budget_name IS NULL THEN
        RETURN '';
    END IF;
    
    -- Replace problematic characters
    RETURN TRIM(
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                REGEXP_REPLACE(budget_name, '[%]', 'percent', 'g'),
                '[*]', '', 'g'
            ),
            '\.', ' ', 'g'
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to convert between currencies (placeholder for future implementation)
DROP FUNCTION IF EXISTS public.convert_currency(DECIMAL, TEXT, TEXT, DECIMAL) CASCADE;
CREATE OR REPLACE FUNCTION public.convert_currency(
    amount DECIMAL,
    from_currency TEXT,
    to_currency TEXT,
    rate DECIMAL DEFAULT 1.0
)
RETURNS DECIMAL AS $$
BEGIN
    -- Simple conversion using provided rate
    -- In production, this would integrate with a currency API
    IF from_currency = to_currency THEN
        RETURN amount;
    END IF;
    
    RETURN amount * rate;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- DATE AND TIME HELPERS
-- =====================================================

-- Function to get financial period dates
DROP FUNCTION IF EXISTS public.get_period_dates(TEXT, DATE) CASCADE;
CREATE OR REPLACE FUNCTION public.get_period_dates(
    period_type TEXT,
    reference_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    start_date DATE,
    end_date DATE
) AS $$
BEGIN
    CASE period_type
        WHEN 'day' THEN
            RETURN QUERY SELECT 
                reference_date::DATE,
                reference_date::DATE;
        
        WHEN 'week' THEN
            RETURN QUERY SELECT 
                DATE_TRUNC('week', reference_date)::DATE,
                (DATE_TRUNC('week', reference_date) + INTERVAL '6 days')::DATE;
        
        WHEN 'month' THEN
            RETURN QUERY SELECT 
                DATE_TRUNC('month', reference_date)::DATE,
                (DATE_TRUNC('month', reference_date) + INTERVAL '1 month - 1 day')::DATE;
        
        WHEN 'quarter' THEN
            RETURN QUERY SELECT 
                DATE_TRUNC('quarter', reference_date)::DATE,
                (DATE_TRUNC('quarter', reference_date) + INTERVAL '3 months - 1 day')::DATE;
        
        WHEN 'year' THEN
            RETURN QUERY SELECT 
                DATE_TRUNC('year', reference_date)::DATE,
                (DATE_TRUNC('year', reference_date) + INTERVAL '1 year - 1 day')::DATE;
        
        ELSE
            -- Default to current month
            RETURN QUERY SELECT 
                DATE_TRUNC('month', reference_date)::DATE,
                (DATE_TRUNC('month', reference_date) + INTERVAL '1 month - 1 day')::DATE;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get financial year dates (configurable start month)
DROP FUNCTION IF EXISTS public.get_financial_year_dates(DATE, INTEGER) CASCADE;
CREATE OR REPLACE FUNCTION public.get_financial_year_dates(
    reference_date DATE DEFAULT CURRENT_DATE,
    fy_start_month INTEGER DEFAULT 1
)
RETURNS TABLE (
    fy_start DATE,
    fy_end DATE
) AS $$
DECLARE
    current_year INTEGER;
    fy_year INTEGER;
BEGIN
    current_year := EXTRACT(YEAR FROM reference_date);
    
    -- Determine which financial year we're in
    IF EXTRACT(MONTH FROM reference_date) >= fy_start_month THEN
        fy_year := current_year;
    ELSE
        fy_year := current_year - 1;
    END IF;
    
    RETURN QUERY SELECT 
        make_date(fy_year, fy_start_month, 1),
        make_date(fy_year + 1, fy_start_month, 1) - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- VALIDATION HELPERS
-- =====================================================

-- Function to validate email format
DROP FUNCTION IF EXISTS public.is_valid_email(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.is_valid_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate currency code
DROP FUNCTION IF EXISTS public.is_valid_currency_code(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.is_valid_currency_code(currency_code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if it's a valid 3-character currency code
    RETURN currency_code ~ '^[A-Z]{3}$' AND currency_code IN (
        'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL',
        'MXN', 'KRW', 'SGD', 'HKD', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF',
        'RUB', 'ZAR', 'THB', 'MYR', 'PHP', 'IDR', 'VND', 'EGP', 'TRY', 'ILS'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate phone number format
DROP FUNCTION IF EXISTS public.is_valid_phone(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.is_valid_phone(phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Basic phone validation (can be enhanced based on requirements)
    RETURN phone ~ '^\+?[1-9]\d{1,14}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- =====================================================
-- CLEANUP FUNCTIONS
-- =====================================================

-- Function to cleanup expired records across multiple tables
DROP FUNCTION IF EXISTS public.cleanup_expired_records() CASCADE;
CREATE OR REPLACE FUNCTION public.cleanup_expired_records()
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}'::jsonb;
    cleanup_count INTEGER;
BEGIN
    -- Cleanup expired verification tokens
    DELETE FROM public.verification_tokens 
    WHERE expires_at < now() AND used_at IS NULL;
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    result := result || jsonb_build_object('verification_tokens', cleanup_count);
    
    -- Cleanup expired user sessions
    UPDATE public.user_sessions 
    SET is_active = false 
    WHERE expires_at < now() AND is_active = true;
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    result := result || jsonb_build_object('expired_sessions', cleanup_count);
    
    -- Cleanup expired prediction results (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prediction_results') THEN
        DELETE FROM public.prediction_results WHERE expires_at < now();
        GET DIAGNOSTICS cleanup_count = ROW_COUNT;
        result := result || jsonb_build_object('prediction_results', cleanup_count);
    END IF;
    
    -- Log cleanup activity completed
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- AUDIT TRAIL HELPERS
-- =====================================================

-- Generic audit function for tracking changes
DROP FUNCTION IF EXISTS public.audit_table_changes() CASCADE;
CREATE OR REPLACE FUNCTION public.audit_table_changes()
RETURNS TRIGGER AS $$
DECLARE
    audit_data JSONB;
BEGIN
    -- Prepare audit data
    audit_data := jsonb_build_object(
        'table_name', TG_TABLE_NAME,
        'operation', TG_OP,
        'timestamp', now(),
        'user_id', auth.uid()
    );
    
    -- Add old and new values for updates
    IF TG_OP = 'UPDATE' THEN
        audit_data := audit_data || jsonb_build_object(
            'old_values', to_jsonb(OLD),
            'new_values', to_jsonb(NEW)
        );
    ELSIF TG_OP = 'INSERT' THEN
        audit_data := audit_data || jsonb_build_object(
            'new_values', to_jsonb(NEW)
        );
    ELSIF TG_OP = 'DELETE' THEN
        audit_data := audit_data || jsonb_build_object(
            'old_values', to_jsonb(OLD)
        );
    END IF;
    
    -- Audit data prepared for logging
    
    -- Return the appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PERFORMANCE MONITORING
-- =====================================================

-- Function to get table statistics
DROP FUNCTION IF EXISTS public.get_table_stats() CASCADE;
CREATE OR REPLACE FUNCTION public.get_table_stats()
RETURNS TABLE (
    schema_name TEXT,
    table_name TEXT,
    row_count BIGINT,
    total_size TEXT,
    index_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname::TEXT,
        tablename::TEXT,
        n_tup_ins - n_tup_del AS row_count,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS index_size
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- NOTIFICATION SYSTEM STUB
-- =====================================================

-- Stub function to prevent errors from notification calls that were removed
-- This function does nothing but prevents "function does not exist" errors
CREATE OR REPLACE FUNCTION public.send_notification(
    notification_type TEXT,
    payload TEXT
)
RETURNS VOID AS $$
BEGIN
    -- This is a stub function that does nothing
    -- It prevents errors from existing code that might call this function
    -- Uncomment the line below to see notification calls in logs for debugging
    -- RAISE NOTICE 'Notification (disabled): % - %', notification_type, payload;
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANTS AND PERMISSIONS
-- =====================================================

-- Grant execute permissions on utility functions
GRANT EXECUTE ON FUNCTION public.update_timestamp() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_secure_token(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_uuid(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.safe_percentage(DECIMAL, DECIMAL, INTEGER) TO authenticated;
-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION public.format_currency(DECIMAL, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_budget_name(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sanitize_budget_name(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_currency(DECIMAL, TEXT, TEXT, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_period_dates(TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_year_dates(DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_currency_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_phone(TEXT) TO authenticated;

-- Grant execute permissions on family functions
GRANT EXECUTE ON FUNCTION public.get_family_membership(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_family_with_member(TEXT, TEXT, TEXT, BOOLEAN, UUID) TO authenticated;

-- Grant execute permissions on system functions
GRANT EXECUTE ON FUNCTION public.cleanup_expired_records() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_table_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_notification(TEXT, TEXT) TO authenticated;

-- =====================================================
-- MODULE COMMENTS
-- =====================================================

COMMENT ON FUNCTION public.update_timestamp() IS 'Generic trigger function to update timestamp fields';
COMMENT ON FUNCTION public.safe_percentage(DECIMAL, DECIMAL, INTEGER) IS 'Calculate percentage safely avoiding division by zero';
COMMENT ON FUNCTION public.format_currency(DECIMAL, TEXT, BOOLEAN) IS 'Format currency amounts with symbols and proper formatting - Enhanced with centavo support';
COMMENT ON FUNCTION public.validate_budget_name(TEXT) IS 'Validate budget names to prevent format string injection';
COMMENT ON FUNCTION public.sanitize_budget_name(TEXT) IS 'Sanitize budget names by removing/replacing problematic characters';
COMMENT ON FUNCTION public.get_period_dates(TEXT, DATE) IS 'Get start and end dates for financial periods (month, quarter, year)';
COMMENT ON FUNCTION public.get_family_membership(UUID) IS 'Get user family membership without materialized view dependency';
COMMENT ON FUNCTION public.create_family_with_member(TEXT, TEXT, TEXT, BOOLEAN, UUID) IS 'Create family with is_public support and add user as admin in single transaction';
COMMENT ON FUNCTION public.cleanup_expired_records() IS 'Clean up expired records across multiple tables';

-- =====================================================
-- END OF SHARED SCHEMA MODULE
-- =====================================================

-- Log successful deployment
DO $$
BEGIN
    RAISE NOTICE 'SUCCESS: 02-shared-schema.sql deployed successfully';
    RAISE NOTICE 'Environment Functions: detect_deployment_environment, validate_environment_for_operation, log_deployment_event';
    RAISE NOTICE 'Utility Functions: update_timestamp, safe_percentage, format_currency, get_period_dates';
    RAISE NOTICE 'Family Functions: get_family_membership, create_family_with_member';
    RAISE NOTICE 'Ready for: 03-family-schema.sql';
END $$;
