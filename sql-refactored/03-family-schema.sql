
-- =====================================================
-- 03-FAMILY-SCHEMA.SQL
-- =====================================================
-- Module: Family Collaboration System
-- Purpose: Family financial management and collaboration features
-- Dependencies: 01-auth-schema.sql, 02-shared-schema.sql
-- Backend Services: familyService.ts, invitationService.ts, joinRequestService.ts
-- Frontend Components: src/components/family/
-- =====================================================
-- Version: 1.0.0
-- Created: 2025-09-20
-- Compatible with: Family management components
-- =====================================================

-- =====================================================
-- DROP EXISTING OBJECTS
-- =====================================================
-- Following proper dependency order: triggers, views, policies, functions, tables
-- Using CASCADE to remove dependent objects and IF EXISTS to prevent errors

-- Drop triggers first
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'families_updated_at') THEN
        DROP TRIGGER families_updated_at ON public.families;
        RAISE NOTICE 'Dropped trigger: families_updated_at';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'family_members_updated_at') THEN
        DROP TRIGGER family_members_updated_at ON public.family_members;
        RAISE NOTICE 'Dropped trigger: family_members_updated_at';
    END IF;
END $$;

-- Drop views
DROP VIEW IF EXISTS public.family_details CASCADE;
DROP VIEW IF EXISTS public.family_member_details CASCADE;
-- Drop RLS policies
DO $$
BEGIN
    -- Drop policies on families table
    DROP POLICY IF EXISTS "Users can view families they belong to" ON public.families;
    DROP POLICY IF EXISTS "Users can create families" ON public.families;
    DROP POLICY IF EXISTS "Family admins can update families" ON public.families;
    RAISE NOTICE 'Dropped policies on families table';
    
    -- Drop policies on family_members table
    DROP POLICY IF EXISTS "Users can view family members" ON public.family_members;
    DROP POLICY IF EXISTS "Family creators can manage members" ON public.family_members;
    RAISE NOTICE 'Dropped policies on family_members table';
    
    -- Drop policies on family_invitations table
    DROP POLICY IF EXISTS "Family admins and owners can view invitations" ON public.family_invitations;
    DROP POLICY IF EXISTS "Family admins and owners can create invitations" ON public.family_invitations;
    DROP POLICY IF EXISTS "Family admins and owners can update invitations" ON public.family_invitations;
    DROP POLICY IF EXISTS "Users can view their own invitations" ON public.family_invitations;
    RAISE NOTICE 'Dropped policies on family_invitations table';
    
    -- Drop policies on family_join_requests table
    DROP POLICY IF EXISTS "Users can view join requests" ON public.family_join_requests;
    DROP POLICY IF EXISTS "Users can create join requests" ON public.family_join_requests;
    DROP POLICY IF EXISTS "Users can update their own join requests" ON public.family_join_requests;
    DROP POLICY IF EXISTS "Family admins can manage join requests" ON public.family_join_requests;
    RAISE NOTICE 'Dropped policies on family_join_requests table';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping policies: %', SQLERRM;
END $$;

-- Drop functions with detailed logging
DROP FUNCTION IF EXISTS public.create_family_with_admin(TEXT, TEXT, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.invite_to_family(UUID, TEXT, TEXT, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.accept_family_invitation(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.reassign_member_role(UUID, UUID, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.transfer_family_ownership(UUID, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.check_user_family(UUID) CASCADE;


-- Drop indexes
DROP INDEX IF EXISTS idx_families_created_by CASCADE;
DROP INDEX IF EXISTS idx_families_public CASCADE;
DROP INDEX IF EXISTS idx_families_currency CASCADE;
DROP INDEX IF EXISTS idx_family_members_family_id CASCADE;
DROP INDEX IF EXISTS idx_family_members_user_id CASCADE;
DROP INDEX IF EXISTS idx_family_members_status CASCADE;
DROP INDEX IF EXISTS idx_family_members_active CASCADE;
DROP INDEX IF EXISTS idx_family_invitations_family_id CASCADE;
DROP INDEX IF EXISTS idx_family_invitations_email CASCADE;
DROP INDEX IF EXISTS idx_family_invitations_token CASCADE;
DROP INDEX IF EXISTS idx_family_invitations_status CASCADE;
DROP INDEX IF EXISTS idx_family_invitations_expires CASCADE;
DROP INDEX IF EXISTS idx_family_join_requests_family_id CASCADE;
DROP INDEX IF EXISTS idx_family_join_requests_user_id CASCADE;
DROP INDEX IF EXISTS idx_family_join_requests_status CASCADE;


-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS public.family_join_requests CASCADE;
DROP TABLE IF EXISTS public.family_invitations CASCADE;
DROP TABLE IF EXISTS public.family_members CASCADE;
DROP TABLE IF EXISTS public.families CASCADE;

-- =====================================================
-- FAMILIES TABLE
-- =====================================================

CREATE TABLE public.families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_name VARCHAR(255) NOT NULL,
    description TEXT,
    currency_pref VARCHAR(10) NOT NULL DEFAULT 'USD',
    is_public BOOLEAN DEFAULT false,
    
    -- Family settings
    max_members INTEGER DEFAULT 10 CHECK (max_members > 0),
    allow_goal_sharing BOOLEAN DEFAULT true,
    allow_budget_sharing BOOLEAN DEFAULT true,
    
    -- Creator and management
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_currency CHECK (public.is_valid_currency_code(currency_pref))
);

-- =====================================================
-- FAMILY MEMBERS TABLE
-- =====================================================
-- IMPORTANT: Family roles are SEPARATE from profile roles!
-- Profile roles (profiles.role): 'user', 'admin', 'moderator' - for system-wide permissions
-- Family roles (family_members.role): 'admin', 'member', 'viewer' - for family-specific permissions
-- These are completely independent role systems!

CREATE TABLE public.family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- FAMILY-SPECIFIC ROLE (NOT related to profiles.role)
    -- 'admin': Can invite/remove members, change family settings
    -- 'member': Can participate in all family activities
    -- 'viewer': Can only view family information
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'pending', 'inactive', 'removed')),
    
    -- Member permissions
    can_create_goals BOOLEAN DEFAULT false,
    can_view_budgets BOOLEAN DEFAULT true,
    can_contribute_goals BOOLEAN DEFAULT true,
    
    -- Invitation details
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Constraints
    UNIQUE (family_id, user_id)
);

-- =====================================================
-- FAMILY INVITATIONS TABLE
-- =====================================================
-- IMPORTANT: invitation.role is a FAMILY role, not a profile role!
-- Valid family roles for invitations: 'admin', 'member', 'viewer'

CREATE TABLE public.family_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Invitation details
    email TEXT NOT NULL,
    -- FAMILY ROLE to assign when invitation is accepted
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    invitation_token TEXT UNIQUE NOT NULL,
    message TEXT,
    
    -- Status and expiry
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days'),
    responded_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- FAMILY JOIN REQUESTS TABLE
-- =====================================================

CREATE TABLE public.family_join_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Request details
    message TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    
    -- Response details
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Constraints
    UNIQUE (family_id, user_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Family indexes
CREATE INDEX idx_families_created_by ON public.families(created_by);
CREATE INDEX idx_families_public ON public.families(is_public) WHERE is_public = true;
CREATE INDEX idx_families_currency ON public.families(currency_pref);

-- Family member indexes
CREATE INDEX idx_family_members_family_id ON public.family_members(family_id);
CREATE INDEX idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX idx_family_members_status ON public.family_members(status);
CREATE INDEX idx_family_members_active ON public.family_members(family_id, status) WHERE status = 'active';

-- Invitation indexes
CREATE INDEX idx_family_invitations_family_id ON public.family_invitations(family_id);
CREATE INDEX idx_family_invitations_email ON public.family_invitations(email);
CREATE INDEX idx_family_invitations_token ON public.family_invitations(invitation_token);
CREATE INDEX idx_family_invitations_status ON public.family_invitations(status);
CREATE INDEX idx_family_invitations_expires ON public.family_invitations(expires_at);

-- Join request indexes
CREATE INDEX idx_family_join_requests_family_id ON public.family_join_requests(family_id);
CREATE INDEX idx_family_join_requests_user_id ON public.family_join_requests(user_id);
CREATE INDEX idx_family_join_requests_status ON public.family_join_requests(status);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_join_requests ENABLE ROW LEVEL SECURITY;

-- Families policies
CREATE POLICY "Users can view families they belong to" ON public.families
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM public.family_members 
            WHERE family_id = families.id AND status = 'active'
        )
    );

CREATE POLICY "Users can create families" ON public.families
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Family admins can update families" ON public.families
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM public.family_members 
            WHERE family_id = families.id AND role = 'admin' AND status = 'active'
        )
    );

-- Family members policies
CREATE POLICY "Users can view family members" ON public.family_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.families f
            WHERE f.id = family_members.family_id
            AND f.created_by = auth.uid()
        ) OR family_members.user_id = auth.uid()
    );

CREATE POLICY "Family creators can manage members" ON public.family_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.families f
            WHERE f.id = family_members.family_id
            AND f.created_by = auth.uid()
        )
    );

-- Family invitations policies
CREATE POLICY "Family admins and owners can view invitations" ON public.family_invitations
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM public.family_members 
            WHERE family_id = family_invitations.family_id 
            AND role = 'admin' 
            AND status = 'active'
        ) OR auth.uid() IN (
            SELECT created_by FROM public.families 
            WHERE id = family_invitations.family_id
        )
    );

CREATE POLICY "Family admins and owners can create invitations" ON public.family_invitations
    FOR INSERT WITH CHECK (
        (
            auth.uid() IN (
                SELECT user_id FROM public.family_members 
                WHERE family_id = family_invitations.family_id 
                AND role = 'admin' 
                AND status = 'active'
            ) OR auth.uid() IN (
                SELECT created_by FROM public.families 
                WHERE id = family_invitations.family_id
            )
        ) AND auth.uid() = invited_by
    );

CREATE POLICY "Family admins and owners can update invitations" ON public.family_invitations
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM public.family_members 
            WHERE family_id = family_invitations.family_id 
            AND role = 'admin' 
            AND status = 'active'
        ) OR auth.uid() IN (
            SELECT created_by FROM public.families 
            WHERE id = family_invitations.family_id
        ) OR auth.uid() = invited_by
    );

CREATE POLICY "Users can view their own invitations" ON public.family_invitations
    FOR SELECT USING (
        email IN (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );
-- Family join requests policies
CREATE POLICY "Users can view join requests" ON public.family_join_requests
    FOR SELECT USING (
        user_id = auth.uid() OR 
        auth.uid() IN (
            SELECT user_id FROM public.family_members 
            WHERE family_id = family_join_requests.family_id 
            AND role = 'admin' 
            AND status = 'active'
        )
    );

CREATE POLICY "Users can create join requests" ON public.family_join_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own join requests" ON public.family_join_requests
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Family admins can manage join requests" ON public.family_join_requests
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM public.family_members 
            WHERE family_id = family_join_requests.family_id 
            AND role = 'admin' 
            AND status = 'active'
        )
    );

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER families_updated_at
    BEFORE UPDATE ON public.families
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER family_members_updated_at
    BEFORE UPDATE ON public.family_members
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- =====================================================
-- FAMILY MANAGEMENT FUNCTIONS
-- =====================================================

-- Note: Main create_family_with_member function is in 02-shared-schema.sql
-- This provides enhanced family creation with is_public support

-- Function to invite user to family
DROP FUNCTION IF EXISTS public.invite_to_family(UUID, TEXT, TEXT, TEXT, UUID) CASCADE;
CREATE FUNCTION public.invite_to_family(
    p_family_id UUID,
    p_email TEXT,
    p_role TEXT DEFAULT 'member',
    p_message TEXT DEFAULT NULL,
    p_invited_by UUID DEFAULT auth.uid()
)
RETURNS UUID AS $$
DECLARE
    v_invitation_id UUID;
    v_token TEXT;
BEGIN
    -- Verify inviter is family admin
    IF NOT EXISTS (
        SELECT 1 FROM public.family_members
        WHERE family_id = p_family_id
        AND user_id = p_invited_by
        AND role = 'admin'
        AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Only family admins can send invitations';
    END IF;
    
    -- Generate invitation token
    v_token := public.generate_secure_token(32);
    
    -- Create invitation
    INSERT INTO public.family_invitations (
        family_id, invited_by, email, role, invitation_token, message
    ) VALUES (
        p_family_id, p_invited_by, p_email, p_role, v_token, p_message
    ) RETURNING id INTO v_invitation_id;
    
    -- Invitation created successfully
    
    RETURN v_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept family invitation
DROP FUNCTION IF EXISTS public.accept_family_invitation(TEXT, UUID) CASCADE;
CREATE FUNCTION public.accept_family_invitation(
    p_invitation_token TEXT,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
DECLARE
    v_invitation RECORD;
    v_user_email TEXT;
BEGIN
    -- Get user email
    SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
    
    -- Find valid invitation
    SELECT * INTO v_invitation
    FROM public.family_invitations
    WHERE invitation_token = p_invitation_token
    AND email = v_user_email
    AND status = 'pending'
    AND expires_at > now();
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Add user to family
    INSERT INTO public.family_members (
        family_id, user_id, role, status, invited_by, invited_at, joined_at
    ) VALUES (
        v_invitation.family_id, p_user_id, v_invitation.role, 'active',
        v_invitation.invited_by, v_invitation.created_at, now()
    );
    
    -- Update invitation status
    UPDATE public.family_invitations
    SET status = 'accepted', responded_at = now()
    WHERE id = v_invitation.id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reassign member role (Owner and Admin only with strict restrictions)
DROP FUNCTION IF EXISTS public.reassign_member_role(UUID, UUID, TEXT, UUID) CASCADE;
CREATE FUNCTION public.reassign_member_role(
    p_family_id UUID,
    p_member_user_id UUID,
    p_new_role TEXT,
    p_requesting_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
DECLARE
    v_family_record RECORD;
    v_requesting_member RECORD;
    v_target_member RECORD;
    v_is_requesting_user_owner BOOLEAN := FALSE;
    v_is_requesting_user_admin BOOLEAN := FALSE;
BEGIN
    -- Validate role
    IF p_new_role NOT IN ('admin', 'member', 'viewer') THEN
        RAISE EXCEPTION 'Invalid role. Must be admin, member, or viewer';
    END IF;
    
    -- Get family information
    SELECT * INTO v_family_record
    FROM public.families
    WHERE id = p_family_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Family not found';
    END IF;
    
    -- Determine if requesting user is the owner
    v_is_requesting_user_owner := (v_family_record.created_by = p_requesting_user_id);
    
    -- Get requesting user's membership info
    SELECT * INTO v_requesting_member
    FROM public.family_members
    WHERE family_id = p_family_id
    AND user_id = p_requesting_user_id
    AND status = 'active';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Requesting user is not an active member of this family';
    END IF;
    
    -- Determine if requesting user is an admin
    v_is_requesting_user_admin := (v_requesting_member.role = 'admin');
    
    -- STRICT PERMISSION CHECK: Only owners and admins can manage roles
    -- Members and viewers are completely blocked from role management
    IF NOT (v_is_requesting_user_owner OR v_is_requesting_user_admin) THEN
        IF v_requesting_member.role = 'member' THEN
            RAISE EXCEPTION 'Members cannot manage family roles. Only owners and admins can assign roles';
        ELSIF v_requesting_member.role = 'viewer' THEN
            RAISE EXCEPTION 'Viewers cannot manage family roles. Only owners and admins can assign roles';
        ELSE
            RAISE EXCEPTION 'Only family owners and admins can reassign roles';
        END IF;
    END IF;
    
    -- Get target member info
    SELECT * INTO v_target_member
    FROM public.family_members
    WHERE family_id = p_family_id
    AND user_id = p_member_user_id
    AND status = 'active';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target member not found or not active in family';
    END IF;
    
    -- ADMIN RESTRICTIONS: Admins cannot manage the family owner
    IF v_is_requesting_user_admin AND NOT v_is_requesting_user_owner THEN
        -- Check if target is the family owner
        IF v_family_record.created_by = p_member_user_id THEN
            RAISE EXCEPTION 'Admin role cannot manage the family owner. Only the owner can change their own role or transfer ownership';
        END IF;
    END IF;
    
    -- OWNER RESTRICTIONS: Prevent demoting the family owner unless transferring ownership
    IF v_family_record.created_by = p_member_user_id AND p_new_role != 'admin' THEN
        RAISE EXCEPTION 'Cannot demote family owner. Transfer ownership first';
    END IF;
    
    -- Update member role
    UPDATE public.family_members
    SET 
        role = p_new_role,
        updated_at = now()
    WHERE family_id = p_family_id
    AND user_id = p_member_user_id;
    
    RAISE NOTICE 'Role updated for user % in family % to % by %', 
        p_member_user_id, p_family_id, p_new_role, 
        CASE 
            WHEN v_is_requesting_user_owner THEN 'OWNER' 
            WHEN v_is_requesting_user_admin THEN 'ADMIN'
            ELSE 'UNKNOWN'
        END;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to transfer family ownership
DROP FUNCTION IF EXISTS public.transfer_family_ownership(UUID, UUID, UUID) CASCADE;
CREATE FUNCTION public.transfer_family_ownership(
    p_family_id UUID,
    p_new_owner_user_id UUID,
    p_current_owner_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
DECLARE
    v_family_record RECORD;
    v_new_owner_member RECORD;
BEGIN
    -- Get family information
    SELECT * INTO v_family_record
    FROM public.families
    WHERE id = p_family_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Family not found';
    END IF;
    
    -- Verify current user is the family owner
    IF v_family_record.created_by != p_current_owner_user_id THEN
        RAISE EXCEPTION 'Only the family owner can transfer ownership';
    END IF;
    
    -- Prevent self-transfer
    IF p_current_owner_user_id = p_new_owner_user_id THEN
        RAISE EXCEPTION 'Cannot transfer ownership to yourself';
    END IF;
    
    -- Get new owner's membership info
    SELECT * INTO v_new_owner_member
    FROM public.family_members
    WHERE family_id = p_family_id
    AND user_id = p_new_owner_user_id
    AND status = 'active';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'New owner must be an active family member';
    END IF;
    
    -- New owner must be at least a member or admin
    IF v_new_owner_member.role = 'viewer' THEN
        RAISE EXCEPTION 'Cannot transfer ownership to a viewer. Promote them to member or admin first';
    END IF;
    
    -- Transfer ownership in families table
    UPDATE public.families
    SET 
        created_by = p_new_owner_user_id,
        updated_at = now()
    WHERE id = p_family_id;
    
    -- Ensure new owner has admin role
    UPDATE public.family_members
    SET 
        role = 'admin',
        updated_at = now()
    WHERE family_id = p_family_id
    AND user_id = p_new_owner_user_id;
    
    -- Demote previous owner to admin role (they remain in the family)
    UPDATE public.family_members
    SET 
        role = 'admin',
        updated_at = now()
    WHERE family_id = p_family_id
    AND user_id = p_current_owner_user_id;
    
    RAISE NOTICE 'Ownership transferred from % to % for family %', p_current_owner_user_id, p_new_owner_user_id, p_family_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS
-- =====================================================

-- Family details view
CREATE VIEW public.family_details AS
SELECT 
    f.id,
    f.family_name,
    f.description,
    f.currency_pref,
    f.is_public,
    f.created_by,
    f.created_at,
    
    -- Member counts
    COUNT(fm.id) AS total_members,
    COUNT(CASE WHEN fm.status = 'active' THEN 1 END) AS active_members,
    COUNT(CASE WHEN fm.role = 'admin' THEN 1 END) AS admin_count,
    
    -- Creator info
    p.full_name as creator_name,
    p.email as creator_email
    
FROM public.families f
LEFT JOIN public.family_members fm ON f.id = fm.family_id
LEFT JOIN public.profiles p ON f.created_by = p.id
GROUP BY f.id, f.family_name, f.description, f.currency_pref, f.is_public, 
         f.created_by, f.created_at, p.full_name, p.email;

-- Family member details view
CREATE VIEW public.family_member_details AS
SELECT
    fm.id,
    fm.family_id,
    fm.user_id,
    fm.role,
    fm.status,
    fm.can_create_goals,
    fm.can_view_budgets,
    fm.can_contribute_goals,
    fm.joined_at,
    fm.created_at,
    
    -- User information
    p.full_name,
    p.email,
    p.avatar_url,
    
    -- Family information
    f.family_name
    
FROM public.family_members fm
JOIN public.profiles p ON fm.user_id = p.id
JOIN public.families f ON fm.family_id = f.id;

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.families TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_join_requests TO authenticated;

GRANT SELECT ON public.family_details TO authenticated;
GRANT SELECT ON public.family_member_details TO authenticated;

GRANT EXECUTE ON FUNCTION public.invite_to_family(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_family_invitation(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reassign_member_role(UUID, UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_family_ownership(UUID, UUID, UUID) TO authenticated;

-- Fix missing check_user_family function
-- This creates an alias to the existing get_family_membership function

DROP FUNCTION IF EXISTS public.check_user_family(UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.check_user_family(p_user_id UUID)
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
    -- Call the existing get_family_membership function
    RETURN QUERY SELECT * FROM public.get_family_membership(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_user_family(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_family(UUID) TO anon;

-- Add comment
COMMENT ON FUNCTION public.check_user_family(UUID) IS 'Alias function for get_family_membership - checks if user is a member of any family';
-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.families IS 'Family groups for collaborative financial management';
COMMENT ON TABLE public.family_members IS 'Users belonging to families with roles and permissions';
COMMENT ON TABLE public.family_invitations IS 'Pending invitations to join families';
COMMENT ON TABLE public.family_join_requests IS 'Requests to join public families';

COMMENT ON FUNCTION public.invite_to_family(UUID, TEXT, TEXT, TEXT, UUID) IS 'Send family invitation to email address';
COMMENT ON FUNCTION public.accept_family_invitation(TEXT, UUID) IS 'Accept family invitation using token';
COMMENT ON FUNCTION public.reassign_member_role(UUID, UUID, TEXT, UUID) IS 'Reassign family member role (owner and admin only)';
COMMENT ON FUNCTION public.transfer_family_ownership(UUID, UUID, UUID) IS 'Transfer family ownership to another member (owner only)';

-- =====================================================
-- END OF FAMILY SCHEMA MODULE
-- =====================================================
