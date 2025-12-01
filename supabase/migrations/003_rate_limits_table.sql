-- Rate limit tracking tablosu (Maç bazlı)
-- Her IP günde 3 farklı maç analizi yapabilir
-- Aynı maçı tekrar görüntülemek limit harcamaz

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,    -- IPv6 için 45 karakter yeterli
  fixture_id BIGINT NOT NULL,          -- Hangi maç analiz edildi
  endpoint VARCHAR(50) NOT NULL,       -- 'claude-analysis' veya 'claude-predictions'
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  first_request_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Her IP + maç + endpoint + gün için tek kayıt
  CONSTRAINT rate_limits_unique UNIQUE (ip_address, fixture_id, endpoint, request_date)
);

-- Hızlı lookup için index (IP + endpoint + tarih bazlı sorgular)
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_date
ON rate_limits(ip_address, endpoint, request_date);

-- RLS politikası - Service role her şeyi yapabilir
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role için tam erişim
CREATE POLICY "Service role full access" ON rate_limits
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Opsiyonel: 7 günden eski kayıtları temizleme fonksiyonu
-- Bu fonksiyonu bir cron job ile çalıştırabilirsiniz
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE request_date < CURRENT_DATE - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Yorum: Bu SQL'i Supabase SQL Editor'da çalıştırın
-- Dashboard > SQL Editor > New Query > Yapıştır > Run
