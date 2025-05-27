-- 투표소 테이블
CREATE TABLE polling_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  district TEXT NOT NULL,
  coordinates_lat DECIMAL(10, 8) NOT NULL,
  coordinates_lng DECIMAL(11, 8) NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  youtube_morning_url TEXT,
  youtube_afternoon_url TEXT,
  entry_count INTEGER DEFAULT 0,
  exit_count INTEGER DEFAULT 0,
  entrance_count INTEGER DEFAULT 0,
  inside_count INTEGER DEFAULT 0,
  outside_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 알림 테이블
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  polling_station_id UUID REFERENCES polling_stations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  comment TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  admin_id TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_polling_stations_district ON polling_stations(district);
CREATE INDEX idx_polling_stations_active ON polling_stations(is_active);
CREATE INDEX idx_alerts_station_id ON alerts(polling_station_id);
CREATE INDEX idx_alerts_resolved ON alerts(resolved);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE polling_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
CREATE POLICY "Allow read access for all users" ON polling_stations FOR SELECT USING (true);
CREATE POLICY "Allow read access for all users" ON alerts FOR SELECT USING (true);

-- 인증된 사용자만 쓰기 가능
CREATE POLICY "Allow insert for authenticated users" ON polling_stations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update for authenticated users" ON polling_stations FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow insert for authenticated users" ON alerts FOR INSERT WITH CHECK (auth.role() = 'authenticated'); 