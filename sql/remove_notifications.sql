-- SQL script to remove notification dependencies from the BudgetMe database

-- 1. Create a modified version of the check_budget_alerts function that doesn't call send_notification
CREATE OR REPLACE FUNCTION public.check_budget_alerts(p_budget_id UUID)
RETURNS VOID AS $$
DECLARE
    v_budget RECORD;
    v_percentage DECIMAL;
    v_alert_type TEXT;
    v_alert_level TEXT;
    v_message TEXT;
    v_should_alert BOOLEAN := false;
BEGIN
    -- Get budget details
    SELECT * INTO v_budget FROM public.budgets WHERE id = p_budget_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Calculate spending percentage
    v_percentage := public.safe_percentage(v_budget.spent, v_budget.amount);
    
    -- Determine alert conditions
    IF v_percentage >= 100 THEN
        v_alert_type := 'exceeded';
        v_alert_level := 'critical';
        -- SAFE: Use concatenation instead of format() to prevent injection
        v_message := 'Budget "' || v_budget.budget_name || '" has been exceeded! Spent: ' ||
                    public.format_currency(v_budget.spent, v_budget.currency) || ' of ' ||
                    public.format_currency(v_budget.amount, v_budget.currency) || ' (' ||
                    v_percentage::TEXT || '%)';
        v_should_alert := true;
    ELSIF v_percentage >= (v_budget.alert_threshold * 100) THEN
        v_alert_type := 'threshold';
        v_alert_level := 'warning';
        -- SAFE: Use concatenation instead of format() to prevent injection
        v_message := 'Budget "' || v_budget.budget_name || '" is at ' ||
                    v_percentage::TEXT || '% of limit. Spent: ' ||
                    public.format_currency(v_budget.spent, v_budget.currency) || ' of ' ||
                    public.format_currency(v_budget.amount, v_budget.currency);
        v_should_alert := true;
    END IF;
    
    -- Create alert if conditions are met and alerts are enabled
    IF v_should_alert AND v_budget.alert_enabled THEN
        -- Check if similar alert was sent recently (avoid spam)
        IF NOT EXISTS (
            SELECT 1 FROM public.budget_alerts
            WHERE budget_id = p_budget_id
            AND alert_type = v_alert_type
            AND triggered_at > now() - INTERVAL '1 hour'
        ) THEN
            INSERT INTO public.budget_alerts (
                budget_id,
                user_id,
                alert_type,
                alert_level,
                message,
                threshold_percentage,
                amount_spent,
                budget_amount
            ) VALUES (
                p_budget_id,
                v_budget.user_id,
                v_alert_type,
                v_alert_level,
                v_message,
                v_percentage,
                v_budget.spent,
                v_budget.amount
            );
            
            -- Update last alert sent timestamp
            UPDATE public.budgets
            SET last_alert_sent = now()
            WHERE id = p_budget_id;
            
            -- REMOVED: Call to public.send_notification
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create an empty send_notification function to handle any existing calls without failing
CREATE OR REPLACE FUNCTION public.send_notification(notification_type TEXT, payload TEXT)
RETURNS VOID AS $$
BEGIN
    -- This is a stub function that does nothing
    -- It prevents errors from existing code that might call this function
    RAISE NOTICE 'Notification disabled: %, %', notification_type, payload;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on the new functions
GRANT EXECUTE ON FUNCTION public.check_budget_alerts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_notification(TEXT, TEXT) TO authenticated;

-- Log that this script has been executed
DO $$
BEGIN
    RAISE NOTICE 'Notification dependencies have been removed or disabled in the budget schema';
END $$;