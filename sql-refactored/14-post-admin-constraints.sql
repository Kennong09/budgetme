-- =====================================================
-- CLEANUP: DROP EXISTING OBJECTS
-- =====================================================

-- Drop views
DROP VIEW IF EXISTS public.admin_dashboard_summary CASCADE;

-- =====================================================
-- 14-POST-ADMIN-CONSTRAINTS.SQL
-- =====================================================
-- Module: Post-Admin Deployment Updates
-- Purpose: Update admin views that depend on tables created in later schemas
-- Dependencies: All schemas 01-13 must be executed first
-- =====================================================
-- Version: 1.0.0
-- Created: 2025-09-21
-- Compatible with: Supabase backend, React frontend
-- =====================================================

-- =====================================================
-- UPDATE ADMIN DASHBOARD VIEW WITH PREDICTIONS
-- =====================================================

-- Update the admin_dashboard_summary view to include predictions data
-- This was deferred from 08-admin-schema.sql to avoid circular dependency
DROP VIEW IF EXISTS public.admin_dashboard_summary;

CREATE VIEW public.admin_dashboard_summary AS
SELECT
    -- User statistics
    (SELECT COUNT(*) FROM public.profiles) as total_users,
    (SELECT COUNT(*) FROM public.profiles WHERE created_at > NOW() - INTERVAL '24 hours') as new_users_today,
    (SELECT COUNT(*) FROM public.profiles WHERE last_login > NOW() - INTERVAL '7 days') as active_users_week,
    
    -- System activity
    (SELECT COUNT(*) FROM public.system_activity_log WHERE created_at > NOW() - INTERVAL '24 hours') as activities_today,
    (SELECT COUNT(*) FROM public.system_activity_log WHERE severity IN ('error', 'critical') AND created_at > NOW() - INTERVAL '24 hours') as errors_today,
    
    -- Financial data
    (SELECT COUNT(*) FROM public.transactions WHERE created_at > NOW() - INTERVAL '24 hours') as transactions_today,
    (SELECT COUNT(*) FROM public.budgets WHERE status = 'active') as active_budgets,
    (SELECT COUNT(*) FROM public.goals WHERE status = 'in_progress') as active_goals,
    
    -- Families and collaboration
    (SELECT COUNT(*) FROM public.families) as total_families,
    (SELECT COUNT(*) FROM public.family_members WHERE status = 'active') as total_family_members,
    
    -- Predictions (now available from predictions schema)
    (SELECT COUNT(*) FROM public.prediction_requests WHERE request_at > NOW() - INTERVAL '24 hours') as predictions_today,
    
    -- Admin notifications
    (SELECT COUNT(*) FROM public.admin_notifications WHERE is_read = false) as unread_notifications;

-- Grant permissions on the recreated view
GRANT SELECT ON public.admin_dashboard_summary TO authenticated;

RAISE NOTICE 'SUCCESS: Updated admin_dashboard_summary view with predictions data';

-- =====================================================
-- END OF POST-ADMIN CONSTRAINTS MODULE
-- =====================================================