-- Add is_public column to families table if it doesn't exist
ALTER TABLE families
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Add status column to families table if it doesn't exist
ALTER TABLE families
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

-- Update existing families to default values
UPDATE families
SET is_public = FALSE, status = 'active'
WHERE is_public IS NULL OR status IS NULL; 