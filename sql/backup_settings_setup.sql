-- Backup Settings Setup for Admin Settings
-- This file creates the necessary backup settings in the admin_settings table

-- Insert backup settings with 'general' category
INSERT INTO admin_settings (setting_key, setting_value, setting_type, description, category, is_public, requires_admin) VALUES
('backup_auto_enabled', 'true'::jsonb, 'boolean', 'Enable automatic backups', 'general', false, true),
('backup_frequency', '"daily"'::jsonb, 'string', 'Backup frequency (daily, weekly, monthly)', 'general', false, true),
('backup_retention_days', '30'::jsonb, 'number', 'Number of days to retain backup files', 'general', false, true),
('backup_last_run', 'null'::jsonb, 'string', 'Last backup execution timestamp', 'general', false, true),
('backup_storage_location', '"supabase_storage"'::jsonb, 'string', 'Backup storage location', 'general', false, true),
('backup_compression_enabled', 'true'::jsonb, 'boolean', 'Enable backup compression', 'general', false, true),
('backup_encryption_enabled', 'true'::jsonb, 'boolean', 'Enable backup encryption', 'general', false, true),
('backup_notification_enabled', 'true'::jsonb, 'boolean', 'Enable backup completion notifications', 'general', false, true),
('backup_max_size_mb', '1000'::jsonb, 'number', 'Maximum backup size in MB', 'general', false, true),
('backup_cleanup_enabled', 'true'::jsonb, 'boolean', 'Enable automatic cleanup of old backups', 'general', false, true);

-- Create backup_logs table for tracking backup operations
CREATE TABLE IF NOT EXISTS backup_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    backup_type TEXT NOT NULL CHECK (backup_type IN ('manual', 'automatic', 'scheduled')),
    status TEXT NOT NULL CHECK (status IN ('started', 'in_progress', 'completed', 'failed', 'cancelled')),
    backup_size_bytes BIGINT,
    backup_duration_ms INTEGER,
    tables_backed_up TEXT[],
    error_message TEXT,
    backup_location TEXT,
    checksum TEXT,
    created_by UUID REFERENCES auth.users(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for backup logs
CREATE INDEX IF NOT EXISTS idx_backup_logs_status ON backup_logs(status);
CREATE INDEX IF NOT EXISTS idx_backup_logs_started_at ON backup_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_backup_logs_backup_type ON backup_logs(backup_type);

-- Create function to perform database backup
CREATE OR REPLACE FUNCTION perform_database_backup(
    p_backup_type TEXT DEFAULT 'manual',
    p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    backup_id UUID;
    start_time TIMESTAMP WITH TIME ZONE;
    end_time TIMESTAMP WITH TIME ZONE;
    backup_size BIGINT;
    tables_list TEXT[];
BEGIN
    -- Generate backup ID
    backup_id := gen_random_uuid();
    start_time := NOW();
    
    -- Get list of tables to backup
    SELECT ARRAY_AGG(table_name) INTO tables_list
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
    
    -- Insert backup log entry
    INSERT INTO backup_logs (
        id,
        backup_type,
        status,
        tables_backed_up,
        created_by,
        started_at,
        metadata
    ) VALUES (
        backup_id,
        p_backup_type,
        'started',
        tables_list,
        p_created_by,
        start_time,
        jsonb_build_object(
            'backup_id', backup_id,
            'tables_count', array_length(tables_list, 1),
            'database_version', version()
        )
    );
    
    -- Simulate backup process (in real implementation, this would be actual backup logic)
    PERFORM pg_sleep(2); -- Simulate backup time
    
    end_time := NOW();
    backup_size := 250000000; -- Simulate 250MB backup size
    
    -- Update backup log with completion
    UPDATE backup_logs 
    SET 
        status = 'completed',
        backup_size_bytes = backup_size,
        backup_duration_ms = EXTRACT(EPOCH FROM (end_time - start_time)) * 1000,
        completed_at = end_time,
        backup_location = 'supabase_storage://backups/' || backup_id || '.sql',
        checksum = encode(digest(backup_id::text, 'sha256'), 'hex')
    WHERE id = backup_id;
    
    -- Update last backup time in admin settings
    UPDATE admin_settings 
    SET setting_value = ('"' || end_time::text || '"')::jsonb,
        updated_at = NOW()
    WHERE setting_key = 'backup_last_run';
    
    RETURN backup_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get backup statistics
CREATE OR REPLACE FUNCTION get_backup_statistics()
RETURNS JSONB AS $$
DECLARE
    stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_backups', COUNT(*),
        'successful_backups', COUNT(*) FILTER (WHERE status = 'completed'),
        'failed_backups', COUNT(*) FILTER (WHERE status = 'failed'),
        'last_backup', MAX(completed_at),
        'average_duration_ms', AVG(backup_duration_ms),
        'total_size_bytes', SUM(backup_size_bytes),
        'recent_backups', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'type', backup_type,
                    'status', status,
                    'started_at', started_at,
                    'completed_at', completed_at,
                    'size_bytes', backup_size_bytes,
                    'duration_ms', backup_duration_ms
                )
            ), '[]'::jsonb)
            FROM (
                SELECT id, backup_type, status, started_at, completed_at, 
                       backup_size_bytes, backup_duration_ms
                FROM backup_logs 
                WHERE started_at >= NOW() - INTERVAL '7 days'
                ORDER BY started_at DESC
                LIMIT 10
            ) recent
        )
    ) INTO stats
    FROM backup_logs;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old backups
CREATE OR REPLACE FUNCTION cleanup_old_backups()
RETURNS INTEGER AS $$
DECLARE
    retention_days INTEGER;
    deleted_count INTEGER;
BEGIN
    -- Get retention period from admin settings
    SELECT (setting_value::TEXT::INTEGER) INTO retention_days
    FROM admin_settings 
    WHERE setting_key = 'backup_retention_days';
    
    -- Default to 30 days if not set
    IF retention_days IS NULL THEN
        retention_days := 30;
    END IF;
    
    -- Delete old backup logs
    DELETE FROM backup_logs 
    WHERE completed_at < NOW() - (retention_days || ' days')::INTERVAL
    AND status IN ('completed', 'failed');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION perform_database_backup TO authenticated;
GRANT EXECUTE ON FUNCTION get_backup_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_backups TO authenticated;

-- Create RLS policies for backup_logs table
ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;

-- Policy for admins to view all backup logs
CREATE POLICY "Admins can view all backup logs" ON backup_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Policy for admins to insert backup logs
CREATE POLICY "Admins can insert backup logs" ON backup_logs
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Policy for admins to update backup logs
CREATE POLICY "Admins can update backup logs" ON backup_logs
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );
