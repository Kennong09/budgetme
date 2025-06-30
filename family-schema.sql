-- DROP EXISTING OBJECTS
-- First drop any existing policies
DROP POLICY IF EXISTS "Users can view families they belong to" ON families;
DROP POLICY IF EXISTS "Users can create families" ON families;
DROP POLICY IF EXISTS "Only family admins can update family details" ON families;
DROP POLICY IF EXISTS "Users can view their family members" ON family_members;
DROP POLICY IF EXISTS "Family admins can add members" ON family_members;
DROP POLICY IF EXISTS "Family admins can update members" ON family_members;
DROP POLICY IF EXISTS "Family admins can remove members" ON family_members;

-- Drop views and functions
DROP VIEW IF EXISTS family_details;
DROP FUNCTION IF EXISTS create_family_with_admin;

-- Drop tables (if they exist)
DROP TABLE IF EXISTS family_members;
DROP TABLE IF EXISTS families;

-- RECREATE TABLES WITH PROPER STRUCTURE

-- Create families table
CREATE TABLE IF NOT EXISTS families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_name VARCHAR(255) NOT NULL,
    description TEXT,
    currency_pref VARCHAR(10) NOT NULL DEFAULT 'USD',
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create family_members table
CREATE TABLE IF NOT EXISTS family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'viewer')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'pending', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (family_id, user_id)
);

-- CREATE MATERIALIZED VIEW FOR FAMILY MEMBERSHIP (to optimize lookups)
CREATE MATERIALIZED VIEW IF NOT EXISTS user_family_memberships AS
SELECT 
    fm.user_id,
    fm.family_id,
    fm.role,
    f.family_name,
    f.created_by
FROM 
    family_members fm
JOIN 
    families f ON fm.family_id = f.id
WHERE 
    fm.status = 'active';

-- CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_status ON family_members(status);
CREATE INDEX IF NOT EXISTS idx_user_family_memberships_user_id ON user_family_memberships(user_id);

-- Add a unique index on the materialized view (required for CONCURRENT refresh)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_family_memberships_unique ON user_family_memberships(user_id, family_id);

-- CREATE REFRESH FUNCTION FOR MATERIALIZED VIEW
CREATE OR REPLACE FUNCTION refresh_user_family_memberships()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_family_memberships;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- CREATE FUNCTION FOR SIMPLE NON-CONCURRENT REFRESH (FALLBACK)
CREATE OR REPLACE FUNCTION refresh_user_family_memberships_simple()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW user_family_memberships;
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION refresh_user_family_memberships_simple TO authenticated;

-- CREATE TRIGGERS TO REFRESH MATERIALIZED VIEW
DROP TRIGGER IF EXISTS refresh_memberships_family_insert ON families;
DROP TRIGGER IF EXISTS refresh_memberships_family_update ON families;
DROP TRIGGER IF EXISTS refresh_memberships_member_change ON family_members;

CREATE TRIGGER refresh_memberships_family_insert
AFTER INSERT ON families
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_user_family_memberships();

CREATE TRIGGER refresh_memberships_family_update
AFTER UPDATE ON families
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_user_family_memberships();

CREATE TRIGGER refresh_memberships_member_change
AFTER INSERT OR UPDATE OR DELETE ON family_members
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_user_family_memberships();

-- ADD NON-RECURSIVE RLS POLICIES

-- Enable RLS on families table
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- Users can view families they created
CREATE POLICY "Users can view families they created" ON families
    FOR SELECT USING (auth.uid() = created_by);

-- Users can view families they are members of
CREATE POLICY "Users can view families they belong to" ON families
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_family_memberships
            WHERE family_id = families.id AND user_id = auth.uid()
        )
    );

-- Users can create families
CREATE POLICY "Users can create families" ON families
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Only family creators can update family details
CREATE POLICY "Only family creators can update family details" ON families
    FOR UPDATE USING (auth.uid() = created_by);

-- Only family creators can delete families
CREATE POLICY "Only family creators can delete families" ON families
    FOR DELETE USING (auth.uid() = created_by);

-- Enable RLS on family_members table
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Users can view family members if they are a member of that family
CREATE POLICY "Users can view family members" ON family_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM families f
            WHERE f.id = family_members.family_id 
            AND (
                f.created_by = auth.uid() OR
                auth.uid() = family_members.user_id OR
                EXISTS (
                    SELECT 1 FROM user_family_memberships
                    WHERE family_id = family_members.family_id AND user_id = auth.uid()
                )
            )
        )
    );

-- Family creators can add members
CREATE POLICY "Family creators can add members" ON family_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM families f
            WHERE f.id = family_members.family_id AND f.created_by = auth.uid()
        ) OR 
        -- Allow users to add themselves as the first admin when creating a family
        (
            NOT EXISTS (
                SELECT 1 FROM family_members 
                WHERE family_id = family_members.family_id
            ) AND 
            auth.uid() = user_id AND 
            role = 'admin'
        )
    );

-- Family creators can update member details
CREATE POLICY "Family creators can update members" ON family_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM families f
            WHERE f.id = family_members.family_id AND f.created_by = auth.uid()
        )
    );

-- Family creators can remove members
CREATE POLICY "Family creators can remove members" ON family_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM families f
            WHERE f.id = family_members.family_id AND f.created_by = auth.uid()
        )
    );

-- CREATE FUNCTION FOR FAMILY CREATION WITH ADMIN MEMBER
CREATE OR REPLACE FUNCTION create_family_with_admin(
    p_family_name TEXT,
    p_description TEXT,
    p_currency_pref TEXT,
    p_user_id UUID
) RETURNS JSON AS $$
DECLARE
    v_family_id UUID;
    v_result JSON;
BEGIN
    -- Insert the family record
    INSERT INTO families (family_name, description, currency_pref, created_by)
    VALUES (p_family_name, p_description, p_currency_pref, p_user_id)
    RETURNING id INTO v_family_id;
    
    -- Insert the user as an admin member
    INSERT INTO family_members (family_id, user_id, role, status)
    VALUES (v_family_id, p_user_id, 'admin', 'active');
    
    -- Refresh the materialized view
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_family_memberships;
    
    -- Create the result JSON
    SELECT json_build_object(
        'id', v_family_id,
        'family_name', p_family_name,
        'description', p_description,
        'currency_pref', p_currency_pref,
        'created_by', p_user_id,
        'created_at', now()
    ) INTO v_result;
    
    -- Return the result
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        -- In case of error, return error details
        RETURN json_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_family_with_admin TO authenticated;

-- CREATE FUNCTION TO CHECK IF USER IS IN A FAMILY
CREATE OR REPLACE FUNCTION check_user_family(
    p_user_id UUID
) RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'is_member', CASE WHEN COUNT(*) > 0 THEN true ELSE false END,
        'family_id', MAX(family_id),
        'family_name', MAX(family_name),
        'role', MAX(role)
    ) INTO v_result
    FROM user_family_memberships
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(v_result, json_build_object('is_member', false));
EXCEPTION
    WHEN OTHERS THEN
        -- In case of error, return error details
        RETURN json_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_user_family TO authenticated;

-- CREATE FAMILY DETAILS VIEW
CREATE OR REPLACE VIEW family_details AS
SELECT 
    f.id,
    f.family_name,
    f.description,
    f.currency_pref,
    f.created_by,
    f.created_at,
    f.updated_at,
    COUNT(fm.id) AS member_count,
    (
        SELECT COUNT(*) 
        FROM family_members 
        WHERE family_id = f.id AND status = 'active'
    ) AS active_member_count
FROM 
    families f
LEFT JOIN 
    family_members fm ON f.id = fm.family_id
GROUP BY 
    f.id, f.family_name, f.description, f.currency_pref, f.created_by, f.created_at, f.updated_at;

-- Initial refresh of the materialized view
REFRESH MATERIALIZED VIEW user_family_memberships; 