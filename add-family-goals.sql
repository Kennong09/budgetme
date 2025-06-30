-- Add family_id column to goals table
ALTER TABLE IF EXISTS goals 
ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS shared_by UUID REFERENCES auth.users(id);

-- Update goal_details view to include family information
DROP VIEW IF EXISTS goal_details;

CREATE VIEW goal_details AS
SELECT 
  g.*,
  CASE 
    WHEN g.current_amount >= g.target_amount THEN 100
    ELSE ROUND((g.current_amount / g.target_amount) * 100)
  END AS percentage,
  CASE
    WHEN g.current_amount >= g.target_amount THEN 0
    ELSE g.target_amount - g.current_amount
  END AS remaining,
  CASE
    WHEN g.target_date::date < NOW()::date AND g.status != 'completed' THEN true
    ELSE false
  END AS is_overdue,
  CASE
    WHEN g.current_amount / g.target_amount >= 0.9 THEN 'excellent'
    WHEN g.current_amount / g.target_amount >= 0.7 THEN 'good'
    WHEN g.current_amount / g.target_amount >= 0.5 THEN 'fair'
    ELSE 'needs_attention'
  END AS progress_status,
  -- Add family information
  f.family_name,
  CASE WHEN g.family_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_family_goal,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email) AS shared_by_name
FROM goals g
LEFT JOIN families f ON g.family_id = f.id
LEFT JOIN auth.users u ON g.shared_by = u.id;

-- Create goal_contributions table
DROP VIEW IF EXISTS goal_contributions;
DROP TABLE IF EXISTS goal_contributions;

CREATE TABLE goal_contributions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT positive_contribution CHECK (amount > 0)
);

-- Add RLS policies for goal_contributions
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;

-- Policy for selecting goal contributions - users can view contributions for their goals and family goals
CREATE POLICY view_goal_contributions ON goal_contributions
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1
      FROM goals g
      JOIN family_members fm ON g.family_id = fm.family_id
      WHERE g.id = goal_contributions.goal_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );

-- Policy for inserting goal contributions - users can contribute to their goals and family goals
CREATE POLICY insert_goal_contributions ON goal_contributions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND (
      EXISTS (
        SELECT 1
        FROM goals g
        WHERE g.id = goal_contributions.goal_id AND (
          g.user_id = auth.uid() OR
          EXISTS (
            SELECT 1
            FROM family_members fm
            WHERE g.family_id = fm.family_id
              AND fm.user_id = auth.uid()
              AND fm.status = 'active'
          )
        )
      )
    )
  );

-- Update RLS policies for goals
DROP POLICY IF EXISTS goal_select_policy ON goals;
DROP POLICY IF EXISTS goal_insert_policy ON goals;
DROP POLICY IF EXISTS goal_update_policy ON goals;
DROP POLICY IF EXISTS goal_delete_policy ON goals;

-- Users can select their own goals or family goals if they're a member
CREATE POLICY goal_select_policy ON goals
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1
      FROM family_members fm
      WHERE goals.family_id = fm.family_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );

-- Users can insert their own goals or family goals if they're a family admin
CREATE POLICY goal_insert_policy ON goals
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND (
      family_id IS NULL OR
      EXISTS (
        SELECT 1
        FROM family_members fm
        WHERE goals.family_id = fm.family_id
          AND fm.user_id = auth.uid()
          AND fm.role = 'admin'
          AND fm.status = 'active'
      )
    )
  );

-- Users can update their own goals or family goals if they're a family admin
CREATE POLICY goal_update_policy ON goals
  FOR UPDATE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1
      FROM family_members fm
      WHERE goals.family_id = fm.family_id
        AND fm.user_id = auth.uid()
        AND fm.role = 'admin'
        AND fm.status = 'active'
    )
  );

-- Users can delete their own goals or family goals if they're a family admin
CREATE POLICY goal_delete_policy ON goals
  FOR DELETE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1
      FROM family_members fm
      WHERE goals.family_id = fm.family_id
        AND fm.user_id = auth.uid()
        AND fm.role = 'admin'
        AND fm.status = 'active'
    )
  ); 