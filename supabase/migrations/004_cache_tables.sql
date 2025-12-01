-- =====================================================
-- Football Data Cache Tables
-- Purpose: Store API-Football data to reduce API calls
-- =====================================================

-- 1. Leagues Cache (24h TTL)
CREATE TABLE IF NOT EXISTS leagues_cache (
  id SERIAL PRIMARY KEY,
  league_id INT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  season INT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Standings Cache (1h TTL)
CREATE TABLE IF NOT EXISTS standings_cache (
  id SERIAL PRIMARY KEY,
  league_id INT NOT NULL,
  season INT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, season)
);

-- 3. Daily Fixtures Cache (1h TTL)
CREATE TABLE IF NOT EXISTS fixtures_cache (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  timezone VARCHAR(50) DEFAULT 'Europe/Istanbul',
  data JSONB NOT NULL,
  fixture_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Teams Cache (24h TTL)
CREATE TABLE IF NOT EXISTS teams_cache (
  id SERIAL PRIMARY KEY,
  team_id INT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Injuries Cache (2h TTL)
CREATE TABLE IF NOT EXISTS injuries_cache (
  id SERIAL PRIMARY KEY,
  league_id INT NOT NULL,
  season INT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, season)
);

-- 6. Sync Log (for monitoring)
CREATE TABLE IF NOT EXISTS sync_log (
  id SERIAL PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'success', 'error', 'partial'
  records_synced INT DEFAULT 0,
  error_message TEXT,
  duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_fixtures_cache_date ON fixtures_cache(date);
CREATE INDEX IF NOT EXISTS idx_fixtures_cache_updated ON fixtures_cache(updated_at);
CREATE INDEX IF NOT EXISTS idx_standings_cache_league ON standings_cache(league_id);
CREATE INDEX IF NOT EXISTS idx_standings_cache_updated ON standings_cache(updated_at);
CREATE INDEX IF NOT EXISTS idx_leagues_cache_updated ON leagues_cache(updated_at);
CREATE INDEX IF NOT EXISTS idx_teams_cache_updated ON teams_cache(updated_at);
CREATE INDEX IF NOT EXISTS idx_injuries_cache_updated ON injuries_cache(updated_at);
CREATE INDEX IF NOT EXISTS idx_sync_log_type_date ON sync_log(sync_type, created_at);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE leagues_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE standings_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixtures_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE injuries_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- Public read access (no auth required for cached data)
CREATE POLICY "Public read access" ON leagues_cache FOR SELECT USING (true);
CREATE POLICY "Public read access" ON standings_cache FOR SELECT USING (true);
CREATE POLICY "Public read access" ON fixtures_cache FOR SELECT USING (true);
CREATE POLICY "Public read access" ON teams_cache FOR SELECT USING (true);
CREATE POLICY "Public read access" ON injuries_cache FOR SELECT USING (true);

-- Service role write access (only edge functions can write)
CREATE POLICY "Service write access" ON leagues_cache FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write access" ON standings_cache FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write access" ON fixtures_cache FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write access" ON teams_cache FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write access" ON injuries_cache FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write access" ON sync_log FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to check if data is stale
CREATE OR REPLACE FUNCTION is_cache_stale(
  p_updated_at TIMESTAMPTZ,
  p_ttl_hours INT DEFAULT 1
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_updated_at < NOW() - (p_ttl_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old cache entries
CREATE OR REPLACE FUNCTION cleanup_old_cache() RETURNS void AS $$
BEGIN
  -- Delete fixtures older than 7 days
  DELETE FROM fixtures_cache WHERE date < CURRENT_DATE - INTERVAL '7 days';

  -- Delete sync logs older than 30 days
  DELETE FROM sync_log WHERE created_at < NOW() - INTERVAL '30 days';

  -- Delete injuries for past seasons (keep current season only)
  DELETE FROM injuries_cache WHERE season < EXTRACT(YEAR FROM CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE leagues_cache IS 'Cached league data from API-Football. TTL: 24 hours.';
COMMENT ON TABLE standings_cache IS 'Cached league standings. TTL: 1 hour.';
COMMENT ON TABLE fixtures_cache IS 'Cached daily fixtures. TTL: 1 hour.';
COMMENT ON TABLE teams_cache IS 'Cached team information. TTL: 24 hours.';
COMMENT ON TABLE injuries_cache IS 'Cached injury/suspension data. TTL: 2 hours.';
COMMENT ON TABLE sync_log IS 'Log of sync operations for monitoring.';
