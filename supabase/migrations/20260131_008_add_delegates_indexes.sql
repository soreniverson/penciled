-- Add missing indexes on delegates table for query performance
-- Delegates are frequently queried by principal_id and delegate_id

-- Index for looking up delegates by principal (who I've delegated to)
CREATE INDEX IF NOT EXISTS idx_delegates_principal
ON delegates(principal_id);

-- Index for looking up principals by delegate (who has delegated to me)
CREATE INDEX IF NOT EXISTS idx_delegates_delegate
ON delegates(delegate_id);

-- Composite index for checking existing delegation relationships
CREATE INDEX IF NOT EXISTS idx_delegates_principal_delegate
ON delegates(principal_id, delegate_id);
