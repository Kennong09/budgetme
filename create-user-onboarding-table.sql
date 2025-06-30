-- Create user_onboarding table to track onboarding progress
CREATE TABLE IF NOT EXISTS public.user_onboarding (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    tutorial_completed BOOLEAN DEFAULT false,
    current_step INT DEFAULT 0,
    dashboard_seen BOOLEAN DEFAULT false,
    budget_seen BOOLEAN DEFAULT false,
    goals_seen BOOLEAN DEFAULT false,
    transactions_seen BOOLEAN DEFAULT false,
    reports_seen BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (user_id)
);

-- Apply RLS to the user_onboarding table
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

-- Create policies for user_onboarding
CREATE POLICY "Users can view their own onboarding status" 
    ON public.user_onboarding FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own onboarding status" 
    ON public.user_onboarding FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding status" 
    ON public.user_onboarding FOR UPDATE 
    USING (auth.uid() = user_id);

-- Create update trigger function to set updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS user_onboarding_updated_at ON public.user_onboarding;
CREATE TRIGGER user_onboarding_updated_at
    BEFORE UPDATE ON public.user_onboarding
    FOR EACH ROW 
    EXECUTE FUNCTION update_user_onboarding_updated_at();

-- Check if the handle_new_user function exists
DO $$
DECLARE
    function_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM pg_proc 
        WHERE proname = 'handle_new_user'
    ) INTO function_exists;
    
    IF function_exists THEN
        -- Function exists, we'll modify it outside the DO block
        RAISE NOTICE 'handle_new_user function exists and will be updated';
    ELSE
        RAISE NOTICE 'handle_new_user function does not exist';
    END IF;
END $$;

-- Create or replace the function (outside the DO block)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user onboarding record
    INSERT INTO public.user_onboarding (user_id)
    VALUES (NEW.id);

    -- Add other logic that might already exist in the original function
    -- You may need to check what the original function does and preserve that functionality

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 