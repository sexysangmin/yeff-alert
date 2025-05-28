-- Supabase 테이블 구조 (새로운 다중 스트림 시스템용)

-- 1. video_streams 테이블 생성/수정
CREATE TABLE IF NOT EXISTS video_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  polling_station_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  registered_by TEXT NOT NULL,
  registered_by_type TEXT NOT NULL DEFAULT 'public' CHECK (registered_by_type IN ('admin', 'monitor', 'public')),
  contact TEXT,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  last_checked TIMESTAMP WITH TIME ZONE,
  stream_status TEXT DEFAULT 'unknown' CHECK (stream_status IN ('live', 'offline', 'unknown')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  target_date TEXT DEFAULT 'day1' CHECK (target_date IN ('day1', 'day2')),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  reject_reason TEXT
);

-- 2. 인덱스 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_video_streams_station_id ON video_streams(polling_station_id);
CREATE INDEX IF NOT EXISTS idx_video_streams_registered_by_type ON video_streams(registered_by_type);
CREATE INDEX IF NOT EXISTS idx_video_streams_is_active ON video_streams(is_active);
CREATE INDEX IF NOT EXISTS idx_video_streams_registered_at ON video_streams(registered_at DESC);

-- 3. RLS (Row Level Security) 정책 설정
ALTER TABLE video_streams ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
CREATE POLICY "video_streams_select_policy" ON video_streams
    FOR SELECT USING (true);

-- 인증된 사용자만 삽입 가능 (일반인 등록)
CREATE POLICY "video_streams_insert_policy" ON video_streams
    FOR INSERT WITH CHECK (true);

-- 관리자만 업데이트/삭제 가능 (승인 처리)
CREATE POLICY "video_streams_update_policy" ON video_streams
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "video_streams_delete_policy" ON video_streams
    FOR DELETE USING (auth.role() = 'authenticated');

-- 4. 자동 업데이트 트리거 (updated_at 필드)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_video_streams_updated_at
    BEFORE UPDATE ON video_streams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. 기존 polling_stations 테이블에 필요한 컬럼 추가 (없는 경우에만)
ALTER TABLE polling_stations 
ADD COLUMN IF NOT EXISTS youtube_morning_registered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS youtube_afternoon_registered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS youtube_day1_morning_url TEXT,
ADD COLUMN IF NOT EXISTS youtube_day1_afternoon_url TEXT,
ADD COLUMN IF NOT EXISTS youtube_day2_morning_url TEXT,
ADD COLUMN IF NOT EXISTS youtube_day2_afternoon_url TEXT,
ADD COLUMN IF NOT EXISTS youtube_day1_morning_registered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS youtube_day1_afternoon_registered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS youtube_day2_morning_registered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS youtube_day2_afternoon_registered_at TIMESTAMP WITH TIME ZONE;

-- 6. alerts 테이블에 soft delete 컬럼 추가 (없는 경우에만)
ALTER TABLE alerts 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 7. deletion_logs 테이블 생성 (삭제 로그 저장용)
CREATE TABLE IF NOT EXISTS deletion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  deleted_data JSONB NOT NULL,
  deleted_by TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT
);

-- deletion_logs 인덱스 생성 (테이블 생성 직후)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deletion_logs') THEN
        CREATE INDEX IF NOT EXISTS idx_deletion_logs_table_name ON deletion_logs(table_name);
        CREATE INDEX IF NOT EXISTS idx_deletion_logs_deleted_at ON deletion_logs(deleted_at DESC);
    END IF;
END $$;

-- 8. 유용한 뷰 생성 (옵션)
CREATE OR REPLACE VIEW active_video_streams AS
SELECT 
    vs.*,
    ps.name as station_name,
    ps.address as station_address
FROM video_streams vs
JOIN polling_stations ps ON vs.polling_station_id = ps.id
WHERE vs.is_active = true
ORDER BY vs.registered_at DESC;

-- 9. 통계 함수 (옵션)
CREATE OR REPLACE FUNCTION get_stream_stats()
RETURNS TABLE(
    total_streams BIGINT,
    active_streams BIGINT,
    pending_streams BIGINT,
    public_streams BIGINT,
    monitor_streams BIGINT,
    admin_streams BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_streams,
        COUNT(*) FILTER (WHERE is_active = true) as active_streams,
        COUNT(*) FILTER (WHERE is_active = false) as pending_streams,
        COUNT(*) FILTER (WHERE registered_by_type = 'public') as public_streams,
        COUNT(*) FILTER (WHERE registered_by_type = 'monitor') as monitor_streams,
        COUNT(*) FILTER (WHERE registered_by_type = 'admin') as admin_streams
    FROM video_streams;
END;
$$ LANGUAGE plpgsql;

-- 추가 컬럼 (기존 테이블에 적용)
-- video_streams 테이블에 target_date 컬럼 추가
ALTER TABLE video_streams ADD COLUMN IF NOT EXISTS target_date TEXT DEFAULT 'day1' CHECK (target_date IN ('day1', 'day2'));

-- video_streams 테이블에 승인/거부 관련 컬럼 추가
ALTER TABLE video_streams ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE video_streams ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE video_streams ADD COLUMN IF NOT EXISTS reject_reason TEXT; 