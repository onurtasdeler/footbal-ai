-- ============================================================================
-- AI Analysis Localization Migration
-- Adds language column to cache tables for multi-language AI responses
-- ============================================================================

-- 1. Add language column to match_analyses table
-- Default 'tr' for existing records (backward compatibility)
ALTER TABLE match_analyses
ADD COLUMN IF NOT EXISTS language VARCHAR(2) DEFAULT 'tr';

-- 2. Add language column to match_predictions table
ALTER TABLE match_predictions
ADD COLUMN IF NOT EXISTS language VARCHAR(2) DEFAULT 'tr';

-- 3. Drop existing unique constraint on fixture_id (match_analyses)
-- First, find and drop the constraint
DO $$
BEGIN
    -- Drop constraint if exists for match_analyses
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'match_analyses_fixture_id_key'
        AND conrelid = 'match_analyses'::regclass
    ) THEN
        ALTER TABLE match_analyses DROP CONSTRAINT match_analyses_fixture_id_key;
    END IF;

    -- Also try dropping primary key if it's on fixture_id
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'match_analyses_pkey'
        AND conrelid = 'match_analyses'::regclass
    ) THEN
        -- Don't drop primary key, just continue
        NULL;
    END IF;
END $$;

-- 4. Drop existing unique constraint on fixture_id (match_predictions)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'match_predictions_fixture_id_key'
        AND conrelid = 'match_predictions'::regclass
    ) THEN
        ALTER TABLE match_predictions DROP CONSTRAINT match_predictions_fixture_id_key;
    END IF;
END $$;

-- 5. Create new composite unique constraint (fixture_id + language) for match_analyses
-- This allows same fixture to have different cache entries per language
ALTER TABLE match_analyses
ADD CONSTRAINT match_analyses_fixture_language_key
UNIQUE (fixture_id, language);

-- 6. Create new composite unique constraint for match_predictions
ALTER TABLE match_predictions
ADD CONSTRAINT match_predictions_fixture_language_key
UNIQUE (fixture_id, language);

-- 7. Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_match_analyses_language
ON match_analyses(language);

CREATE INDEX IF NOT EXISTS idx_match_predictions_language
ON match_predictions(language);

-- 8. Create composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_match_analyses_fixture_language
ON match_analyses(fixture_id, language);

CREATE INDEX IF NOT EXISTS idx_match_predictions_fixture_language
ON match_predictions(fixture_id, language);

-- ============================================================================
-- Verification Queries (run separately to verify)
-- ============================================================================
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'match_analyses' AND column_name = 'language';

-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'match_predictions' AND column_name = 'language';

-- SELECT conname, contype FROM pg_constraint
-- WHERE conrelid = 'match_analyses'::regclass;
