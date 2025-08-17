-- Create family_join_requests table to store requests to join families
CREATE TABLE family_join_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  -- Add a unique constraint to prevent duplicate join requests
  CONSTRAINT unique_family_user UNIQUE (family_id, user_id)
);

-- Add comment to table
COMMENT ON TABLE family_join_requests IS 'Stores requests from users to join family groups';

-- Add RLS policies
ALTER TABLE family_join_requests ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to create join requests for themselves
CREATE POLICY create_own_join_requests ON family_join_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to view their own join requests
CREATE POLICY read_own_join_requests ON family_join_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
  
-- Create policy to allow family admins to view join requests for their family
CREATE POLICY read_family_admin_join_requests ON family_join_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = family_join_requests.family_id
      AND family_members.user_id = auth.uid()
      AND family_members.role = 'admin'
    )
  );
  
-- Create policy to allow family admins to update join requests for their family
CREATE POLICY update_family_admin_join_requests ON family_join_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = family_join_requests.family_id
      AND family_members.user_id = auth.uid()
      AND family_members.role = 'admin'
    )
  );

-- Add is_public column to families table
ALTER TABLE families ADD COLUMN is_public BOOLEAN DEFAULT false;
COMMENT ON COLUMN families.is_public IS 'When true, family can be discovered and users can request to join'; 