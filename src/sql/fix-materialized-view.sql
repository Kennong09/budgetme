-- Fix for materialized view concurrent refresh
-- This script adds a unique index to the user_family_memberships materialized view
-- which is required for REFRESH MATERIALIZED VIEW CONCURRENTLY to work properly

-- First, check if the materialized view exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'user_family_memberships') THEN
        -- Create a unique index on the materialized view if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 
            FROM pg_indexes 
            WHERE tablename = 'user_family_memberships' AND indexname = 'idx_user_family_memberships_unique'
        ) THEN
            CREATE UNIQUE INDEX idx_user_family_memberships_unique 
            ON user_family_memberships (user_id, family_id);
            
            RAISE NOTICE 'Created unique index on user_family_memberships';
        ELSE
            RAISE NOTICE 'Unique index already exists on user_family_memberships';
        END IF;
        
        -- Refresh the materialized view (without CONCURRENTLY first time)
        REFRESH MATERIALIZED VIEW user_family_memberships;
        RAISE NOTICE 'Refreshed materialized view user_family_memberships';
    ELSE
        RAISE NOTICE 'Materialized view user_family_memberships does not exist';
    END IF;
END $$;

-- Drop existing triggers first to avoid dependency issues
DO $$
BEGIN
  -- Drop existing triggers if they exist
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'refresh_memberships_family_insert') THEN
    DROP TRIGGER refresh_memberships_family_insert ON families;
    RAISE NOTICE 'Dropped trigger refresh_memberships_family_insert';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'refresh_memberships_family_update') THEN
    DROP TRIGGER refresh_memberships_family_update ON families;
    RAISE NOTICE 'Dropped trigger refresh_memberships_family_update';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'refresh_memberships_member_change') THEN
    DROP TRIGGER refresh_memberships_member_change ON family_members;
    RAISE NOTICE 'Dropped trigger refresh_memberships_member_change';
  END IF;
END $$;

-- Now drop functions
DROP FUNCTION IF EXISTS public.refresh_user_family_memberships();
DROP FUNCTION IF EXISTS public.refresh_user_family_memberships_simple();
DROP FUNCTION IF EXISTS public.get_user_family_direct(UUID);

-- Function to safely refresh the materialized view with error handling
CREATE OR REPLACE FUNCTION public.safe_refresh_family_memberships()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Attempt to refresh concurrently, but catch errors to prevent failures
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_family_memberships;
    RAISE NOTICE 'Successfully refreshed materialized view concurrently';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Concurrent refresh failed: %', SQLERRM;
      -- Try non-concurrent as fallback
      BEGIN
        REFRESH MATERIALIZED VIEW public.user_family_memberships;
        RAISE NOTICE 'Successfully refreshed materialized view non-concurrently';
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Non-concurrent refresh also failed: %', SQLERRM;
      END;
  END;
END;
$$;

-- Create a function that listens for refresh notifications
CREATE OR REPLACE FUNCTION public.listen_for_refresh_events()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Send notification to refresh views asynchronously
  PERFORM pg_notify('refresh_family_views', '');
  RETURN NEW;
END;
$$;

-- Create triggers to refresh materialized view when data changes
DO $$
BEGIN
  -- Check if triggers already exist
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_family_memberships_families') THEN
    -- Create trigger on families table
    CREATE TRIGGER trg_refresh_family_memberships_families
    AFTER INSERT OR UPDATE OR DELETE ON families
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.listen_for_refresh_events();
    
    RAISE NOTICE 'Created trigger on families table';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_family_memberships_members') THEN
    -- Create trigger on family_members table
    CREATE TRIGGER trg_refresh_family_memberships_members
    AFTER INSERT OR UPDATE OR DELETE ON family_members
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.listen_for_refresh_events();
    
    RAISE NOTICE 'Created trigger on family_members table';
  END IF;
END $$;

-- Create a helper function to safely check user's family without requiring the materialized view
CREATE OR REPLACE FUNCTION public.get_family_membership(p_user_id UUID)
RETURNS TABLE (
  family_id UUID,
  family_name TEXT,
  description TEXT,
  currency_pref TEXT,
  is_member BOOLEAN,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id AS family_id,
    f.family_name,
    f.description,
    f.currency_pref,
    TRUE AS is_member,
    fm.role::TEXT
  FROM
    public.families f
    JOIN public.family_members fm ON f.id = fm.family_id
  WHERE
    fm.user_id = p_user_id
    AND fm.status = 'active'
  LIMIT 1;
  
  -- Return empty result if no rows found
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      NULL::UUID AS family_id,
      NULL::TEXT AS family_name,
      NULL::TEXT AS description,
      NULL::TEXT AS currency_pref,
      FALSE AS is_member,
      NULL::TEXT AS role;
  END IF;
END;
$$;

-- Update the check_user_family function to maintain better backwards compatibility
DO $$
BEGIN
  -- Drop the existing function first
  DROP FUNCTION IF EXISTS public.check_user_family(UUID);
  
  -- Decide which version to create (table or JSON)
  -- For better compatibility, we'll keep the JSON return type for this function
  CREATE OR REPLACE FUNCTION public.check_user_family(p_user_id UUID)
  RETURNS JSON 
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $func$
  DECLARE
    v_result JSON;
    v_family_data RECORD;
  BEGIN
    -- Get family info using our direct query
    SELECT * INTO v_family_data FROM public.get_family_membership(p_user_id) LIMIT 1;
    
    IF v_family_data.is_member THEN
      -- Build JSON response matching the old format
      SELECT json_build_object(
        'family_id', v_family_data.family_id,
        'family_name', v_family_data.family_name,
        'is_member', v_family_data.is_member,
        'role', v_family_data.role
      ) INTO v_result;
    ELSE
      -- No family found
      SELECT json_build_object(
        'is_member', false
      ) INTO v_result;
    END IF;
    
    RETURN v_result;
  EXCEPTION
    WHEN OTHERS THEN
      -- Handle errors
      RETURN json_build_object('error', SQLERRM);
  END;
  $func$;
END $$;

COMMENT ON FUNCTION public.safe_refresh_family_memberships IS 'Safely refreshes the user_family_memberships materialized view with error handling';
COMMENT ON FUNCTION public.get_family_membership IS 'Direct query to check for user family membership without using the materialized view';
COMMENT ON FUNCTION public.listen_for_refresh_events IS 'Trigger function to send notifications for asynchronous materialized view refresh'; 