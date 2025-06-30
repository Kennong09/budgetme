-- This SQL file only adds new helper functions without modifying existing ones

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

-- Create a transaction-safe function to create a family for a user
CREATE OR REPLACE FUNCTION public.create_family_with_member(
  p_family_name TEXT,
  p_description TEXT,
  p_currency_pref TEXT,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_family_id UUID;
BEGIN
  -- Make sure user is not already in a family
  IF EXISTS (
    SELECT 1 FROM family_members 
    WHERE user_id = p_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'User is already a member of a family';
  END IF;
  
  -- Create family
  INSERT INTO public.families (
    family_name, 
    description, 
    currency_pref, 
    created_by
  ) VALUES (
    p_family_name,
    p_description,
    p_currency_pref,
    p_user_id
  ) RETURNING id INTO v_family_id;
  
  -- Add user as admin
  INSERT INTO public.family_members (
    family_id,
    user_id,
    role,
    status
  ) VALUES (
    v_family_id,
    p_user_id,
    'admin',
    'active'
  );
  
  -- Try to refresh the view in a separate transaction to avoid conflicts
  PERFORM pg_notify('refresh_family_views', '');
  
  RETURN v_family_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

COMMENT ON FUNCTION public.safe_refresh_family_memberships IS 'Safely refreshes the user_family_memberships materialized view with error handling';
COMMENT ON FUNCTION public.get_family_membership IS 'Direct query to check for user family membership without using the materialized view'; 
COMMENT ON FUNCTION public.create_family_with_member IS 'Creates a family and adds the user as admin in a transaction-safe way'; 