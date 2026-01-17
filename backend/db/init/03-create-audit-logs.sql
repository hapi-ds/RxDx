-- Create audit_logs table for compliance tracking
-- This table stores immutable audit trails for all system activities

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    details JSONB
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Create composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type_entity_id ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC);

-- Add comment to table
COMMENT ON TABLE audit_logs IS 'Immutable audit trail for compliance tracking. Records all CRUD operations, authentication attempts, and authorization decisions.';

-- Add comments to columns
COMMENT ON COLUMN audit_logs.id IS 'Unique audit log entry identifier';
COMMENT ON COLUMN audit_logs.user_id IS 'ID of the user who performed the action (NULL for system actions)';
COMMENT ON COLUMN audit_logs.action IS 'Type of action (CREATE, READ, UPDATE, DELETE, SIGN, AUTH, etc.)';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity affected (User, WorkItem, Requirement, etc.)';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID of the affected entity (NULL for list operations)';
COMMENT ON COLUMN audit_logs.timestamp IS 'When the action occurred';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the client (IPv4 or IPv6)';
COMMENT ON COLUMN audit_logs.details IS 'Additional context as JSON (changed fields, error messages, etc.)';
