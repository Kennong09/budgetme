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

-- Add RLS policies for families table
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view families they belong to" ON families
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM family_members 
            WHERE family_id = families.id AND status = 'active'
        )
    );

CREATE POLICY "Users can create families" ON families
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Only family admins can update family details" ON families
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM family_members 
            WHERE family_id = families.id AND role = 'admin' AND status = 'active'
        )
    );

-- Add RLS policies for family_members table
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their family members" ON family_members
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM family_members AS fm
            WHERE fm.family_id = family_members.family_id AND fm.status = 'active'
        )
    );

CREATE POLICY "Family admins can add members" ON family_members
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM family_members
            WHERE family_id = family_members.family_id AND role = 'admin' AND status = 'active'
        ) OR (
            -- Allow users to add themselves as the first admin when creating a family
            NOT EXISTS (
                SELECT 1 FROM family_members 
                WHERE family_id = family_members.family_id
            ) AND auth.uid() = user_id AND role = 'admin'
        )
    );

CREATE POLICY "Family admins can update members" ON family_members
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM family_members
            WHERE family_id = family_members.family_id AND role = 'admin' AND status = 'active'
        )
    );

-- Create a view for family details with member counts
CREATE OR REPLACE VIEW family_details AS
SELECT 
    f.id,
    f.family_name,
    f.description,
    f.currency_pref,
    f.created_by,
    f.created_at,
    COUNT(fm.id) AS member_count,
    (
        SELECT COUNT(*) 
        FROM family_members 
        WHERE family_id = f.id AND status = 'active'
    ) AS active_member_count
FROM families f
LEFT JOIN family_members fm ON f.id = fm.family_id
GROUP BY f.id, f.family_name, f.description, f.currency_pref, f.created_by, f.created_at; 

-- Fix for infinite recursion in family_members policy
-- Drop the problematic policies first
DROP POLICY IF EXISTS "Users can view their family members" ON family_members;
DROP POLICY IF EXISTS "Family admins can add members" ON family_members;
DROP POLICY IF EXISTS "Family admins can update members" ON family_members;

-- Create new policies that avoid the recursion

-- 1. Policy for viewing family members - avoids recursive check
CREATE POLICY "Users can view their family members" ON family_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM families f
            WHERE f.id = family_members.family_id
            AND (
                -- User is the creator of the family
                f.created_by = auth.uid()
                OR
                -- Or user is directly the member being viewed
                family_members.user_id = auth.uid()
            )
        )
    );

-- 2. Policy for adding family members - avoids recursive check
CREATE POLICY "Family admins can add members" ON family_members
    FOR INSERT WITH CHECK (
        -- User is the creator of the family
        EXISTS (
            SELECT 1 FROM families f
            WHERE f.id = family_members.family_id
            AND f.created_by = auth.uid()
        )
        OR
        -- Allow users to add themselves as the first admin when creating a family
        (
            NOT EXISTS (
                SELECT 1 FROM family_members 
                WHERE family_id = family_members.family_id
            ) 
            AND auth.uid() = user_id 
            AND role = 'admin'
        )
    );

-- 3. Policy for updating family members - avoids recursive check
CREATE POLICY "Family admins can update members" ON family_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM families f
            WHERE f.id = family_members.family_id
            AND f.created_by = auth.uid()
        )
    );

-- 4. Add a delete policy for completeness
CREATE POLICY "Family admins can remove members" ON family_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM families f
            WHERE f.id = family_members.family_id
            AND f.created_by = auth.uid()
        )
    ); 

    -- Create a function to handle both creating a family and adding the user as admin in one transaction
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
    -- Start a transaction
    BEGIN
        -- Insert the family record
        INSERT INTO families (family_name, description, currency_pref, created_by)
        VALUES (p_family_name, p_description, p_currency_pref, p_user_id)
        RETURNING id INTO v_family_id;
        
        -- Insert the user as an admin member
        INSERT INTO family_members (family_id, user_id, role, status)
        VALUES (v_family_id, p_user_id, 'admin', 'active');
        
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
            -- Rollback happens automatically
            RAISE EXCEPTION 'Error creating family: %', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_family_with_admin TO authenticated; 