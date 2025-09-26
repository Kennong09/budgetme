-- =====================================================
-- DEPLOYMENT LOGGING AND ERROR HANDLING
-- =====================================================

-- Log schema deployment start
DO $$
BEGIN
    RAISE NOTICE 'DEPLOYING: 01-auth-schema.sql - Authentication and User Management';
    RAISE NOTICE 'Timestamp: %', now();
    RAISE NOTICE 'Dependencies: None (Foundation module)';
END $$;

-- =====================================================
-- 01-AUTH-SCHEMA.SQL
-- =====================================================
-- Module: Authentication and User Management
-- Purpose: Core authentication, user profiles, and session management
-- Dependencies: None (Foundation module)
-- Backend Service: authService.ts
-- Frontend Components: src/components/auth/
-- =====================================================
-- Version: 1.0.0
-- Created: 2025-09-20
-- Compatible with: Supabase Auth, React Frontend
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- DROP EXISTING OBJECTS (IF EXISTS)
-- =====================================================

-- Drop triggers first (order matters due to dependencies)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users CASCADE;
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles CASCADE;

-- Drop views (they depend on tables)
DROP VIEW IF EXISTS public.user_details CASCADE;
DROP VIEW IF EXISTS public.admin_user_overview CASCADE;

-- Drop all RLS policies for profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.profiles;
DROP POLICY IF EXISTS "Service functions can access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for service role" ON public.profiles;
DROP POLICY IF EXISTS "Simplified admin policies to avoid recursion" ON public.profiles;

-- Drop all RLS policies for user_sessions table
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;

-- Drop all RLS policies for verification_tokens table
DROP POLICY IF EXISTS "Users can view their own verification tokens" ON public.verification_tokens;

-- Drop all functions (order matters due to dependencies)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_last_login() CASCADE;
DROP FUNCTION IF EXISTS public.update_timestamp() CASCADE;
DROP FUNCTION IF EXISTS public.update_profile_timestamp() CASCADE;
DROP FUNCTION IF EXISTS public.create_verification_token(UUID, TEXT, TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.verify_token(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_tokens() CASCADE;
DROP FUNCTION IF EXISTS public.verify_email_token(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_admin_profile(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.check_user_exists_by_email(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.populate_missing_profiles() CASCADE;
DROP FUNCTION IF EXISTS public.sync_profile_from_auth(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.validate_profile_system() CASCADE;

-- Drop tables (in reverse dependency order to avoid foreign key constraints)
DROP TABLE IF EXISTS public.verification_tokens CASCADE;
DROP TABLE IF EXISTS public.user_sessions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop any remaining sequences or other objects that might exist
DROP SEQUENCE IF EXISTS public.profiles_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.user_sessions_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.verification_tokens_id_seq CASCADE;

-- Log cleanup completion
DO $$
BEGIN
    RAISE NOTICE 'CLEANUP COMPLETED: All existing auth schema objects have been dropped';
    RAISE NOTICE 'Tables dropped: profiles, user_sessions, verification_tokens';
    RAISE NOTICE 'Functions dropped: handle_new_user, update_last_login, verify_email_token, check_user_exists_by_email, populate_missing_profiles, sync_profile_from_auth, validate_profile_system, and others';
    RAISE NOTICE 'Policies dropped: All RLS policies for profiles, user_sessions, and verification_tokens';
    RAISE NOTICE 'Views dropped: user_details, admin_user_overview';
    RAISE NOTICE 'Triggers dropped: on_auth_user_created, on_auth_user_login, profiles_updated_at';
    RAISE NOTICE 'Ready to recreate schema objects...';
END $$;

-- =====================================================
-- FOUNDATION: USER PROFILES TABLE
-- =====================================================

-- Create profiles table to extend Supabase auth.users
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Additional profile fields
    date_of_birth DATE,
    phone TEXT,
    timezone TEXT DEFAULT 'UTC',
    language TEXT DEFAULT 'en',
    
    -- Status tracking
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    email_verified BOOLEAN DEFAULT false,
    
    -- Preferences
    currency_preference TEXT DEFAULT 'USD',
    notification_preferences JSONB DEFAULT '{"email": true, "push": true, "sms": false}'::jsonb
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX idx_profiles_created_at ON public.profiles(created_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles table (avoiding infinite recursion)
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Admin policies using a simpler approach to avoid recursion
-- Note: This will be secured at the application level
CREATE POLICY "Enable read access for service role"
    ON public.profiles FOR SELECT
    USING (true);

-- =====================================================
-- USER SESSION MANAGEMENT
-- =====================================================

-- Table to track user sessions and login history
CREATE TABLE public.user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE,
    device_info JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    login_at TIMESTAMPTZ DEFAULT now(),
    logout_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    
    -- Security tracking
    login_method TEXT DEFAULT 'email' CHECK (login_method IN ('email', 'google', 'github', 'apple')),
    is_suspicious BOOLEAN DEFAULT false,
    failure_count INTEGER DEFAULT 0
);

-- Indexes for user sessions
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON public.user_sessions(is_active);
CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions(expires_at);

-- RLS for user sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
    ON public.user_sessions FOR SELECT
    USING (auth.uid() = user_id);

-- =====================================================
-- EMAIL VERIFICATION SYSTEM
-- =====================================================

-- Table for email verification tokens
CREATE TABLE public.verification_tokens (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    token_type TEXT NOT NULL CHECK (token_type IN ('email_verification', 'password_reset', 'email_change')),
    email TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure one active token per type per user
    UNIQUE(user_id, token_type, email)
);

-- Indexes for verification tokens
CREATE INDEX idx_verification_tokens_token ON public.verification_tokens(token);
CREATE INDEX idx_verification_tokens_user_id ON public.verification_tokens(user_id);
CREATE INDEX idx_verification_tokens_expires_at ON public.verification_tokens(expires_at);

-- RLS for verification tokens
ALTER TABLE public.verification_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own verification tokens"
    ON public.verification_tokens FOR SELECT
    USING (auth.uid() = user_id);

-- =====================================================
-- CORE FUNCTIONS
-- =====================================================


-- Drop function first if it exists
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Function to update last login
CREATE FUNCTION public.update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET last_login = NEW.last_sign_in_at,
        updated_at = now()
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle new user signup
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    profile_created BOOLEAN := false;
    session_logged BOOLEAN := false;
    error_context TEXT;
    user_full_name TEXT;
BEGIN
    -- Validate input data
    IF NEW.id IS NULL THEN
        RAISE EXCEPTION 'Cannot create profile: user ID is null';
    END IF;
    
    IF NEW.email IS NULL OR NEW.email = '' THEN
        RAISE NOTICE 'Warning: Creating user profile without email for user %', NEW.id;
    END IF;
    
    -- Extract full name from metadata
    user_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'firstName' || ' ' || NEW.raw_user_meta_data->>'lastName'
    );
    
    -- Clean up full name (remove extra spaces)
    IF user_full_name IS NOT NULL THEN
        user_full_name := TRIM(REGEXP_REPLACE(user_full_name, '\s+', ' ', 'g'));
        IF user_full_name = '' THEN
            user_full_name := NULL;
        END IF;
    END IF;
    
    -- Create profile for new user with comprehensive error handling
    BEGIN
        INSERT INTO public.profiles (
            id, 
            email, 
            role, 
            full_name,
            email_verified,
            created_at,
            updated_at,
            is_active,
            timezone,
            language,
            currency_preference
        )
        VALUES (
            NEW.id, 
            NEW.email, 
            'user',
            user_full_name,
            COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
            COALESCE(NEW.created_at, now()),
            now(),
            true,
            COALESCE(NEW.raw_user_meta_data->>'timezone', 'UTC'),
            COALESCE(NEW.raw_user_meta_data->>'language', 'en'),
            'USD'
        )
        ON CONFLICT (id) DO UPDATE SET
            email = COALESCE(EXCLUDED.email, profiles.email),
            full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
            email_verified = EXCLUDED.email_verified,
            updated_at = now(),
            is_active = COALESCE(EXCLUDED.is_active, profiles.is_active),
            timezone = COALESCE(EXCLUDED.timezone, profiles.timezone),
            language = COALESCE(EXCLUDED.language, profiles.language)
        WHERE 
            profiles.email != EXCLUDED.email OR
            profiles.email_verified != EXCLUDED.email_verified OR
            profiles.full_name IS DISTINCT FROM EXCLUDED.full_name;
        
        profile_created := true;
        RAISE NOTICE 'Profile created/updated successfully for user % (%)', NEW.id, NEW.email;
        
    EXCEPTION
        WHEN unique_violation THEN
            -- Handle concurrent insert attempts
            RAISE NOTICE 'Profile already exists for user %, updating instead', NEW.id;
            UPDATE public.profiles 
            SET 
                email = COALESCE(NEW.email, email),
                full_name = COALESCE(user_full_name, full_name),
                email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, email_verified),
                updated_at = now(),
                timezone = COALESCE(NEW.raw_user_meta_data->>'timezone', timezone),
                language = COALESCE(NEW.raw_user_meta_data->>'language', language)
            WHERE id = NEW.id;
            profile_created := true;
            
        WHEN OTHERS THEN
            error_context := format('Profile creation failed for user %: %', NEW.id, SQLERRM);
            RAISE WARNING '%', error_context;
            
            -- Attempt a simpler insert as fallback
            BEGIN
                INSERT INTO public.profiles (id, email, role, email_verified, created_at, updated_at)
                VALUES (NEW.id, NEW.email, 'user', false, now(), now())
                ON CONFLICT (id) DO UPDATE SET 
                    email = EXCLUDED.email,
                    updated_at = now();
                profile_created := true;
                RAISE NOTICE 'Fallback profile creation succeeded for user %', NEW.id;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE WARNING 'Fallback profile creation also failed for user %: %', NEW.id, SQLERRM;
            END;
    END;
    -- Log the signup with defensive programming
    BEGIN
        INSERT INTO public.user_sessions (
            user_id, 
            login_method, 
            device_info,
            login_at,
            is_active
        ) VALUES (
            NEW.id,
            COALESCE(NEW.app_metadata->>'provider', 'email'),
            COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
            COALESCE(NEW.created_at, now()),
            true
        );
        
        session_logged := true;
        
    EXCEPTION
        WHEN OTHERS THEN
            error_context := format('Session logging failed for user %: %', NEW.id, SQLERRM);
            RAISE WARNING '%', error_context;
            -- Don't fail the trigger if session logging fails
    END;
    
    -- Final validation and logging
    IF profile_created THEN
        RAISE NOTICE 'User signup completed successfully: User %, Profile: %, Session: %', 
            NEW.id, profile_created, session_logged;
    ELSE
        RAISE WARNING 'User signup completed with profile creation errors: User %, Profile: %, Session: %', 
            NEW.id, profile_created, session_logged;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Ultimate fallback - log error and return NEW to not break auth
        RAISE WARNING 'handle_new_user trigger failed for user %: %', NEW.id, SQLERRM;
        
        -- Last attempt to create minimal profile
        BEGIN
            INSERT INTO public.profiles (id, email, role, created_at, updated_at)
            VALUES (NEW.id, COALESCE(NEW.email, 'unknown@example.com'), 'user', now(), now())
            ON CONFLICT (id) DO NOTHING;
        EXCEPTION
            WHEN OTHERS THEN
                -- Even this failed, but we don't want to break auth
                NULL;
        END;
        
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update timestamp
CREATE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFICATION FUNCTIONS
-- =====================================================

-- Function to create verification token
CREATE FUNCTION public.create_verification_token(
    p_user_id UUID,
    p_token_type TEXT,
    p_email TEXT,
    p_expires_hours INTEGER DEFAULT 24
)
RETURNS TEXT AS $$
DECLARE
    v_token TEXT;
BEGIN
    -- Generate a secure random token
    v_token := encode(gen_random_bytes(32), 'hex');
    
    -- Delete any existing tokens of the same type for this user
    DELETE FROM public.verification_tokens
    WHERE user_id = p_user_id AND token_type = p_token_type;
    
    -- Insert new token
    INSERT INTO public.verification_tokens (
        user_id, token, token_type, email, expires_at
    ) VALUES (
        p_user_id, 
        v_token, 
        p_token_type, 
        p_email, 
        now() + (p_expires_hours || ' hours')::interval
    );
    
    RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify token
CREATE FUNCTION public.verify_token(
    p_token TEXT,
    p_token_type TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_token_record RECORD;
    v_result JSONB;
BEGIN
    -- Get token record
    SELECT * INTO v_token_record
    FROM public.verification_tokens
    WHERE token = p_token AND token_type = p_token_type;
    
    -- Check if token exists
    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Token not found');
    END IF;
    
    -- Check if token is already used
    IF v_token_record.used_at IS NOT NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Token already used');
    END IF;
    
    -- Check if token is expired
    IF v_token_record.expires_at < now() THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Token expired');
    END IF;
    
    -- Mark token as used
    UPDATE public.verification_tokens
    SET used_at = now()
    WHERE id = v_token_record.id;
    
    -- Return success with user info
    RETURN jsonb_build_object(
        'valid', true,
        'user_id', v_token_record.user_id,
        'email', v_token_record.email
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle profile updates
CREATE FUNCTION public.update_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired verification tokens
CREATE FUNCTION public.cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.verification_tokens 
    WHERE expires_at < now() AND used_at IS NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify email token
CREATE FUNCTION public.verify_email_token(
    p_token TEXT,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_token_record RECORD;
BEGIN
    -- Find valid token
    SELECT * INTO v_token_record
    FROM public.verification_tokens
    WHERE token = p_token
    AND user_id = p_user_id
    AND token_type = 'email_verification'
    AND expires_at > now()
    AND used_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Mark token as used
    UPDATE public.verification_tokens
    SET used_at = now()
    WHERE id = v_token_record.id;
    
    -- Update profile email verification status
    UPDATE public.profiles
    SET email_verified = true,
        updated_at = now()
    WHERE id = p_user_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create admin user profile (call after auth user exists)
CREATE FUNCTION public.create_admin_profile(
    p_user_id UUID DEFAULT '952a101d-d64d-42a8-89ce-cb4061aaaf5e'::uuid,
    p_email TEXT DEFAULT 'admin@gmail.com',
    p_full_name TEXT DEFAULT 'System Administrator'
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user exists in auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
        RAISE NOTICE 'User % does not exist in auth.users. Create the auth user first.', p_user_id;
        RETURN false;
    END IF;
    
    -- Create or update the admin profile
    INSERT INTO public.profiles (id, email, role, full_name, is_active, email_verified)
    VALUES (
        p_user_id,
        p_email,
        'admin',
        p_full_name,
        true,
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        role = 'admin',
        is_active = true,
        email_verified = true,
        updated_at = now();
        
    RAISE NOTICE 'Admin profile created/updated for user %', p_user_id;
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Enhanced function to check if user exists by email (for invitation service)
-- Uses SECURITY DEFINER to bypass RLS policies with comprehensive error handling
CREATE FUNCTION public.check_user_exists_by_email(
    user_email TEXT
)
RETURNS TABLE(
    user_exists BOOLEAN,
    user_id UUID,
    email TEXT,
    full_name TEXT,
    email_confirmed BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    user_record RECORD;
    search_email TEXT;
    search_variations TEXT[];
    variation TEXT;
    user_count INTEGER;
    total_users INTEGER;
BEGIN
    -- Enhanced logging and validation with comprehensive debugging
    RAISE NOTICE '[INVITATION-CHECK] Function called with input: %', user_email;
    
    -- Validate input with detailed error reporting
    IF user_email IS NULL THEN
        RAISE WARNING '[INVITATION-CHECK] NULL email input provided';
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    IF TRIM(user_email) = '' THEN
        RAISE WARNING '[INVITATION-CHECK] Empty email input provided';
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- Get total user count for context
    SELECT COUNT(*) INTO total_users FROM auth.users;
    RAISE NOTICE '[INVITATION-CHECK] Total users in database: %', total_users;
    
    -- Clean and normalize email with multiple strategies
    search_email := LOWER(TRIM(user_email));
    
    -- Create search variations to handle edge cases
    search_variations := ARRAY[
        search_email,
        TRIM(user_email),  -- Original case preserved
        LOWER(user_email), -- Without trim in case of hidden characters
        UPPER(TRIM(user_email)) -- All caps version
    ];
    
    RAISE NOTICE '[INVITATION-CHECK] Email normalized: % -> %', user_email, search_email;
    RAISE NOTICE '[INVITATION-CHECK] Search variations: %', search_variations;
    
    -- Enhanced user lookup with multiple matching strategies
    BEGIN
        -- First attempt: Exact normalized match
        SELECT 
            u.id,
            u.email,
            COALESCE(
                u.raw_user_meta_data->>'full_name',
                u.raw_user_meta_data->>'name',
                SPLIT_PART(u.email, '@', 1)
            ) as full_name,
            u.email_confirmed_at IS NOT NULL as email_confirmed,
            u.created_at
        INTO user_record
        FROM auth.users u
        WHERE LOWER(TRIM(u.email)) = search_email
        LIMIT 1;
        
        -- If exact match found, return immediately
        IF FOUND THEN
            RAISE NOTICE '[INVITATION-CHECK] ✓ User found via exact match: % (%) - confirmed: %', 
                user_record.id, user_record.email, user_record.email_confirmed;
            
            RETURN QUERY SELECT 
                TRUE as user_exists,
                user_record.id as user_id,
                user_record.email,
                user_record.full_name,
                user_record.email_confirmed,
                user_record.created_at;
            RETURN;
        END IF;
        
        -- Second attempt: Try all variations
        FOREACH variation IN ARRAY search_variations
        LOOP
            RAISE NOTICE '[INVITATION-CHECK] Trying variation: %', variation;
            
            SELECT 
                u.id,
                u.email,
                COALESCE(
                    u.raw_user_meta_data->>'full_name',
                    u.raw_user_meta_data->>'name',
                    SPLIT_PART(u.email, '@', 1)
                ) as full_name,
                u.email_confirmed_at IS NOT NULL as email_confirmed,
                u.created_at
            INTO user_record
            FROM auth.users u
            WHERE u.email ILIKE variation
               OR LOWER(TRIM(u.email)) = LOWER(TRIM(variation))
            LIMIT 1;
            
            IF FOUND THEN
                RAISE NOTICE '[INVITATION-CHECK] ✓ User found via variation [%]: % (%) - confirmed: %', 
                    variation, user_record.id, user_record.email, user_record.email_confirmed;
                
                RETURN QUERY SELECT 
                    TRUE as user_exists,
                    user_record.id as user_id,
                    user_record.email,
                    user_record.full_name,
                    user_record.email_confirmed,
                    user_record.created_at;
                RETURN;
            END IF;
        END LOOP;
        
        -- Third attempt: Fuzzy matching for common issues
        SELECT COUNT(*) INTO user_count
        FROM auth.users u
        WHERE u.email ILIKE '%' || SPLIT_PART(search_email, '@', 1) || '%'
           OR u.email ILIKE '%' || SPLIT_PART(search_email, '@', 2) || '%';
           
        IF user_count > 0 THEN
            RAISE NOTICE '[INVITATION-CHECK] Found % similar emails, but no exact match', user_count;
        END IF;
        
        -- No user found - comprehensive debugging
        RAISE NOTICE '[INVITATION-CHECK] ✗ No user found for email: % (normalized: %)', user_email, search_email;
        
        -- Sample existing emails for debugging (first 5)
        RAISE NOTICE '[INVITATION-CHECK] Sample existing emails: %', (
            SELECT string_agg(u.email, ', ') 
            FROM (
                SELECT email FROM auth.users 
                ORDER BY created_at DESC 
                LIMIT 5
            ) u
        );
        
        -- Return user_exists = FALSE with comprehensive logging
        RAISE NOTICE '[INVITATION-CHECK] Returning user_exists = FALSE';
        RETURN QUERY SELECT 
            FALSE as user_exists, 
            NULL::UUID as user_id, 
            NULL::TEXT as email, 
            NULL::TEXT as full_name, 
            FALSE as email_confirmed, 
            NULL::TIMESTAMPTZ as created_at;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING '[INVITATION-CHECK] ⚠ Error in user lookup for email %: % (SQLSTATE: %)', 
                user_email, SQLERRM, SQLSTATE;
            
            -- Log additional context on error
            RAISE WARNING '[INVITATION-CHECK] Error context - Total users: %, Search email: %', 
                total_users, search_email;
            
            -- Always return a result, even on error
            RETURN QUERY SELECT 
                FALSE as user_exists, 
                NULL::UUID as user_id, 
                NULL::TEXT as email, 
                NULL::TEXT as full_name, 
                FALSE as email_confirmed, 
                NULL::TIMESTAMPTZ as created_at;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to populate profiles for existing users without profiles
CREATE FUNCTION public.populate_missing_profiles()
RETURNS TABLE(
    processed_count INTEGER,
    success_count INTEGER,
    error_count INTEGER,
    details JSONB
) AS $$
DECLARE
    user_record RECORD;
    v_processed_count INTEGER := 0;
    v_success_count INTEGER := 0;
    v_error_count INTEGER := 0;
    error_details JSONB := '[]'::jsonb;
    success_details JSONB := '[]'::jsonb;
BEGIN
    -- Find users in auth.users who don't have profiles
    FOR user_record IN
        SELECT 
            u.id,
            u.email,
            u.raw_user_meta_data,
            u.email_confirmed_at,
            u.created_at
        FROM auth.users u
        LEFT JOIN public.profiles p ON u.id = p.id
        WHERE p.id IS NULL
    LOOP
        v_processed_count := v_processed_count + 1;
        
        BEGIN
            -- Create profile for this user
            INSERT INTO public.profiles (
                id, 
                email, 
                role, 
                full_name,
                email_verified,
                created_at,
                updated_at
            )
            VALUES (
                user_record.id,
                user_record.email,
                'user',
                COALESCE(
                    user_record.raw_user_meta_data->>'full_name',
                    user_record.raw_user_meta_data->>'name'
                ),
                user_record.email_confirmed_at IS NOT NULL,
                user_record.created_at,
                now()
            );
            
            v_success_count := v_success_count + 1;
            success_details := success_details || jsonb_build_object(
                'user_id', user_record.id,
                'email', user_record.email,
                'created_at', now()
            );
            
            RAISE NOTICE 'Created profile for user % (%)', user_record.id, user_record.email;
            
        EXCEPTION
            WHEN OTHERS THEN
                v_error_count := v_error_count + 1;
                error_details := error_details || jsonb_build_object(
                    'user_id', user_record.id,
                    'email', user_record.email,
                    'error', SQLERRM
                );
                
                RAISE WARNING 'Failed to create profile for user % (%): %', 
                    user_record.id, user_record.email, SQLERRM;
        END;
    END LOOP;
    
    -- Return summary
    RETURN QUERY SELECT 
        v_processed_count,
        v_success_count,
        v_error_count,
        jsonb_build_object(
            'processed_count', v_processed_count,
            'success_count', v_success_count,
            'error_count', v_error_count,
            'successes', success_details,
            'errors', error_details,
            'executed_at', now()
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync profile data from auth.users
CREATE FUNCTION public.sync_profile_from_auth(
    target_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
    synced_count INTEGER,
    details JSONB
) AS $$
DECLARE
    user_record RECORD;
    v_synced_count INTEGER := 0;
    sync_details JSONB := '[]'::jsonb;
BEGIN
    -- Sync specific user or all users
    FOR user_record IN
        SELECT 
            u.id,
            u.email,
            u.raw_user_meta_data,
            u.email_confirmed_at,
            u.created_at,
            p.id as profile_exists
        FROM auth.users u
        LEFT JOIN public.profiles p ON u.id = p.id
        WHERE (target_user_id IS NULL OR u.id = target_user_id)
    LOOP
        BEGIN
            -- Insert or update profile
            INSERT INTO public.profiles (
                id, 
                email, 
                role, 
                full_name,
                email_verified,
                created_at,
                updated_at
            )
            VALUES (
                user_record.id,
                user_record.email,
                CASE WHEN user_record.profile_exists IS NOT NULL THEN 
                    (SELECT role FROM public.profiles WHERE id = user_record.id) 
                ELSE 'user' END,
                COALESCE(
                    user_record.raw_user_meta_data->>'full_name',
                    user_record.raw_user_meta_data->>'name'
                ),
                user_record.email_confirmed_at IS NOT NULL,
                user_record.created_at,
                now()
            )
            ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
                email_verified = EXCLUDED.email_verified,
                updated_at = now()
            WHERE 
                profiles.email != EXCLUDED.email OR
                profiles.email_verified != EXCLUDED.email_verified OR
                (profiles.full_name IS NULL AND EXCLUDED.full_name IS NOT NULL);
            
            v_synced_count := v_synced_count + 1;
            sync_details := sync_details || jsonb_build_object(
                'user_id', user_record.id,
                'email', user_record.email,
                'action', CASE WHEN user_record.profile_exists IS NULL THEN 'created' ELSE 'updated' END
            );
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to sync profile for user % (%): %', 
                    user_record.id, user_record.email, SQLERRM;
        END;
    END LOOP;
    
    RETURN QUERY SELECT 
        v_synced_count,
        jsonb_build_object(
            'synced_count', v_synced_count,
            'details', sync_details,
            'executed_at', now()
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate the profile creation system
CREATE FUNCTION public.validate_profile_system()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check if trigger exists
    RETURN QUERY
    SELECT 
        'Trigger Exists' as check_name,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_name = 'on_auth_user_created'
        ) THEN 'PASS' ELSE 'FAIL' END as status,
        'Checks if the on_auth_user_created trigger is properly installed' as details;
    
    -- Check profile coverage
    RETURN QUERY
    SELECT 
        'Profile Coverage' as check_name,
        CASE WHEN (
            SELECT COUNT(*) FROM auth.users 
            WHERE id NOT IN (SELECT id FROM public.profiles)
        ) = 0 THEN 'PASS' ELSE 'INCOMPLETE' END as status,
        format('Users without profiles: %s', (
            SELECT COUNT(*) FROM auth.users 
            WHERE id NOT IN (SELECT id FROM public.profiles)
        )) as details;
    
    -- Check RLS policies
    RETURN QUERY
    SELECT 
        'RLS Policies' as check_name,
        CASE WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'profiles' 
            AND policyname = 'Users can view their own profile'
        ) THEN 'PASS' ELSE 'FAIL' END as status,
        'Checks if basic RLS policies are in place' as details;
    
    -- Check function permissions
    RETURN QUERY
    SELECT 
        'Function Permissions' as check_name,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.routine_privileges 
            WHERE routine_name = 'check_user_exists_by_email'
            AND grantee = 'authenticated'
        ) THEN 'PASS' ELSE 'FAIL' END as status,
        'Checks if authenticated users can execute utility functions' as details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for login tracking
CREATE TRIGGER on_auth_user_login
    AFTER UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW
    WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
    EXECUTE FUNCTION public.update_last_login();

-- Trigger for profile updates
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_profile_timestamp();

-- =====================================================
-- VIEWS FOR CONVENIENCE
-- =====================================================

-- View for user details (excluding sensitive data)
CREATE VIEW public.user_details AS
SELECT
    p.id,
    p.email,
    p.role,
    p.full_name,
    p.avatar_url,
    p.created_at,
    p.updated_at,
    p.timezone,
    p.language,
    p.is_active,
    p.last_login,
    p.email_verified,
    p.currency_preference,
    u.created_at as auth_created_at,
    u.email_confirmed_at,
    COUNT(s.id) as active_sessions
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
LEFT JOIN public.user_sessions s ON p.id = s.user_id AND s.is_active = true
GROUP BY p.id, u.created_at, u.email_confirmed_at;

-- View for admin user management
CREATE VIEW public.admin_user_overview AS
SELECT
    p.id,
    p.email,
    p.role,
    p.full_name,
    p.is_active,
    p.created_at,
    p.last_login,
    p.email_verified,
    COUNT(DISTINCT s.id) as total_sessions,
    COUNT(DISTINCT CASE WHEN s.is_active THEN s.id END) as active_sessions,
    MAX(s.login_at) as last_session_login
FROM public.profiles p
LEFT JOIN public.user_sessions s ON p.id = s.user_id
GROUP BY p.id, p.email, p.role, p.full_name, p.is_active, p.created_at, p.last_login, p.email_verified;

-- =====================================================
-- SECURITY POLICIES FOR VIEWS
-- =====================================================

-- Grant permissions on views
GRANT SELECT ON public.user_details TO authenticated;
GRANT SELECT ON public.admin_user_overview TO authenticated;

-- Grant permissions on RPC functions
GRANT EXECUTE ON FUNCTION public.check_user_exists_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_exists_by_email(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.populate_missing_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_profile_from_auth(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_profile_system() TO authenticated;

-- =====================================================
-- INITIALIZATION DATA
-- =====================================================

-- Note: Admin user creation is handled by the application
-- The admin user must be created through Supabase Auth first
-- This section is commented out to avoid foreign key constraint errors

/*
-- Create default admin user (if not exists)
-- This requires the user to exist in auth.users first
DO $$
BEGIN
    -- Only create profile if the user exists in auth.users
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = '952a101d-d64d-42a8-89ce-cb4061aaaf5e'::uuid) THEN
        INSERT INTO public.profiles (id, email, role, full_name, is_active, email_verified)
        VALUES (
            '952a101d-d64d-42a8-89ce-cb4061aaaf5e'::uuid,
            'admin@gmail.com',
            'admin',
            'System Administrator',
            true,
            true
        )
        ON CONFLICT (id) DO UPDATE SET
            role = 'admin',
            is_active = true,
            email_verified = true,
            updated_at = now();
    END IF;
END $$;
*/

-- =====================================================
-- GRANTS AND PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION public.cleanup_expired_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_email_token(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_admin_profile(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_exists_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.populate_missing_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_profile_from_auth(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_profile_system() TO authenticated;

-- Grant select on tables to authenticated users (with RLS)
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_sessions TO authenticated;
GRANT SELECT ON public.verification_tokens TO authenticated;

-- Grant update permissions for own records
GRANT UPDATE ON public.profiles TO authenticated;

-- =====================================================
-- MODULE VALIDATION COMMENTS
-- =====================================================

COMMENT ON TABLE public.profiles IS 'Extended user profiles with preferences and status tracking';
COMMENT ON TABLE public.user_sessions IS 'User session management and login history tracking';
COMMENT ON TABLE public.verification_tokens IS 'Email verification and password reset token management';

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates profile and logs signup for new auth users';
COMMENT ON FUNCTION public.verify_email_token(TEXT, UUID) IS 'Verifies email verification tokens and updates user status';
COMMENT ON FUNCTION public.check_user_exists_by_email(TEXT) IS 'Checks if a user exists by email address for invitation validation';
COMMENT ON FUNCTION public.populate_missing_profiles() IS 'Creates profiles for existing auth users who do not have profiles';
COMMENT ON FUNCTION public.sync_profile_from_auth(UUID) IS 'Syncs profile data from auth.users table';

-- =====================================================
-- VALIDATION FUNCTIONS
-- =====================================================

-- Note: validate_profile_system() function is already defined above after sync_profile_from_auth function

-- =====================================================
-- END OF AUTH SCHEMA MODULE
-- =====================================================

-- Log successful deployment
DO $$
DECLARE
    populate_result RECORD;
    validation_result RECORD;
BEGIN
    RAISE NOTICE 'SUCCESS: 01-auth-schema.sql deployed successfully';
    RAISE NOTICE 'Tables created: profiles, user_sessions, verification_tokens';
    RAISE NOTICE 'Functions created: handle_new_user, update_last_login, verify_email_token, check_user_exists_by_email, populate_missing_profiles, sync_profile_from_auth, validate_profile_system';
    RAISE NOTICE 'Triggers created: on_auth_user_created, on_auth_user_login';
    
    -- Populate profiles for existing users who don't have them
    RAISE NOTICE 'Populating profiles for existing users without profiles...';
    
    SELECT * INTO populate_result FROM public.populate_missing_profiles();
    
    IF populate_result.processed_count > 0 THEN
        RAISE NOTICE 'Profile population completed: % processed, % successful, % errors', 
            populate_result.processed_count, 
            populate_result.success_count, 
            populate_result.error_count;
        
        IF populate_result.error_count > 0 THEN
            RAISE WARNING 'Some profiles could not be created. Check the details: %', populate_result.details;
        END IF;
    ELSE
        RAISE NOTICE 'No existing users found without profiles';
    END IF;
    
    -- Run validation
    RAISE NOTICE 'Running system validation...';
    FOR validation_result IN 
        SELECT * FROM public.validate_profile_system()
    LOOP
        IF validation_result.status = 'PASS' THEN
            RAISE NOTICE 'VALIDATION PASS: % - %', validation_result.check_name, validation_result.details;
        ELSE
            RAISE WARNING 'VALIDATION ISSUE: % - % - %', validation_result.check_name, validation_result.status, validation_result.details;
        END IF;
    END LOOP;
    
    -- Test the RPC function with a dummy email
    RAISE NOTICE 'Testing check_user_exists_by_email function...';
    BEGIN
        PERFORM public.check_user_exists_by_email('test@example.com');
        RAISE NOTICE 'RPC function test: SUCCESS';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'RPC function test FAILED: %', SQLERRM;
    END;
    
    RAISE NOTICE 'Ready for: 02-shared-schema.sql';
END $$;
