    -- Check if family_id column exists before adding it
    DO $$ 
    BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='goals' AND column_name='family_id') THEN
            ALTER TABLE goals 
            ADD COLUMN family_id UUID REFERENCES families(id) NULL;
        END IF;
    END $$;

    -- Check if is_shared column exists before adding it
    DO $$ 
    BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='goals' AND column_name='is_shared') THEN
            ALTER TABLE goals
            ADD COLUMN is_shared BOOLEAN DEFAULT false;
        END IF;
    END $$;

    -- Update the view to include the new columns
    DROP VIEW IF EXISTS goal_details;
    CREATE VIEW goal_details AS
    SELECT 
        g.*,
        CASE
            WHEN g.current_amount >= g.target_amount THEN 100
            ELSE (g.current_amount / g.target_amount * 100)
        END as percentage,
        g.target_amount - g.current_amount as remaining,
        CASE
            WHEN g.target_date < CURRENT_DATE AND g.status != 'completed' AND g.status != 'cancelled' THEN true
            ELSE false
        END as is_overdue
        -- No need to add is_shared here as it's already in the goals table
    FROM goals g;

    -- Create index on family_id for better performance
    CREATE INDEX IF NOT EXISTS idx_goals_family_id ON goals(family_id); 