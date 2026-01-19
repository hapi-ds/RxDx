-- Create digital_signatures table for cryptographic document signing
-- This table stores cryptographic signatures for WorkItems to ensure document
-- integrity and provide non-repudiation for regulatory compliance

CREATE TABLE IF NOT EXISTS digital_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workitem_id UUID NOT NULL,
    workitem_version VARCHAR(20) NOT NULL,
    user_id UUID NOT NULL,
    signature_hash TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    invalidated_at TIMESTAMP WITH TIME ZONE,
    invalidation_reason TEXT
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_digital_signatures_workitem_id ON digital_signatures(workitem_id);
CREATE INDEX IF NOT EXISTS idx_digital_signatures_user_id ON digital_signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_digital_signatures_signed_at ON digital_signatures(signed_at DESC);
CREATE INDEX IF NOT EXISTS idx_digital_signatures_is_valid ON digital_signatures(is_valid);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_digital_signatures_workitem_version ON digital_signatures(workitem_id, workitem_version);
CREATE INDEX IF NOT EXISTS idx_digital_signatures_workitem_valid ON digital_signatures(workitem_id, is_valid);
CREATE INDEX IF NOT EXISTS idx_digital_signatures_user_signed_at ON digital_signatures(user_id, signed_at DESC);

-- Create unique constraint to prevent duplicate signatures on same workitem version by same user
CREATE UNIQUE INDEX IF NOT EXISTS idx_digital_signatures_unique_user_workitem_version 
ON digital_signatures(workitem_id, workitem_version, user_id) 
WHERE is_valid = TRUE;

-- Add table comment
COMMENT ON TABLE digital_signatures IS 'Cryptographic signatures for WorkItems ensuring document integrity and non-repudiation for regulatory compliance.';

-- Add column comments
COMMENT ON COLUMN digital_signatures.id IS 'Unique signature identifier';
COMMENT ON COLUMN digital_signatures.workitem_id IS 'ID of the signed WorkItem';
COMMENT ON COLUMN digital_signatures.workitem_version IS 'Version of the WorkItem that was signed (e.g., "1.2")';
COMMENT ON COLUMN digital_signatures.user_id IS 'ID of the user who created the signature';
COMMENT ON COLUMN digital_signatures.signature_hash IS 'Cryptographic signature (RSA with SHA-256)';
COMMENT ON COLUMN digital_signatures.content_hash IS 'SHA-256 hash of the signed content for integrity verification';
COMMENT ON COLUMN digital_signatures.signed_at IS 'Timestamp when the signature was created';
COMMENT ON COLUMN digital_signatures.is_valid IS 'Whether the signature is currently valid (false if WorkItem modified)';
COMMENT ON COLUMN digital_signatures.invalidated_at IS 'Timestamp when the signature was invalidated';
COMMENT ON COLUMN digital_signatures.invalidation_reason IS 'Reason for signature invalidation (e.g., "WorkItem modified")';

-- Add constraint to ensure invalidated signatures have invalidation details
ALTER TABLE digital_signatures 
ADD CONSTRAINT chk_invalidation_consistency 
CHECK (
    (is_valid = TRUE AND invalidated_at IS NULL AND invalidation_reason IS NULL) OR
    (is_valid = FALSE AND invalidated_at IS NOT NULL AND invalidation_reason IS NOT NULL)
);

-- Add constraint to ensure content_hash is exactly 64 characters (SHA-256)
ALTER TABLE digital_signatures 
ADD CONSTRAINT chk_content_hash_length 
CHECK (LENGTH(content_hash) = 64);