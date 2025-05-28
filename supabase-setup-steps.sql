-- Supabase 설정 단계별 실행 가이드
-- 각 단계를 하나씩 실행하여 오류를 방지하세요

-- ==============================================
-- 1단계: video_streams 테이블 생성
-- ==============================================
CREATE TABLE IF NOT EXISTS video_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  polling_station_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  registered_by TEXT NOT NULL,
  registered_by_type TEXT NOT NULL DEFAULT 'public',
  contact TEXT,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  last_checked TIMESTAMP WITH TIME ZONE,
  stream_status TEXT DEFAULT 'unknown',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 2단계: video_streams 제약조건 추가
-- ==============================================
ALTER TABLE video_streams 
ADD CONSTRAINT check_registered_by_type 
CHECK (registered_by_type IN ('admin', 'monitor', 'public'));

ALTER TABLE video_streams 
ADD CONSTRAINT check_stream_status 
CHECK (stream_status IN ('live', 'offline', 'unknown'));

-- ==============================================
-- 3단계: video_streams 인덱스 생성
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_video_streams_station_id ON video_streams(polling_station_id);
CREATE INDEX IF NOT EXISTS idx_video_streams_registered_by_type ON video_streams(registered_by_type);
CREATE INDEX IF NOT EXISTS idx_video_streams_is_active ON video_streams(is_active);
CREATE INDEX IF NOT EXISTS idx_video_streams_registered_at ON video_streams(registered_at DESC);

-- ==============================================
-- 4단계: RLS 정책 설정
-- ==============================================
ALTER TABLE video_streams ENABLE ROW LEVEL SECURITY;

-- 기존 정책이 있다면 삭제
DROP POLICY IF EXISTS "video_streams_select_policy" ON video_streams;
DROP POLICY IF EXISTS "video_streams_insert_policy" ON video_streams;
DROP POLICY IF EXISTS "video_streams_update_policy" ON video_streams;
DROP POLICY IF EXISTS "video_streams_delete_policy" ON video_streams;

-- 새 정책 생성
CREATE POLICY "video_streams_select_policy" ON video_streams
    FOR SELECT USING (true);

CREATE POLICY "video_streams_insert_policy" ON video_streams
    FOR INSERT WITH CHECK (true);

CREATE POLICY "video_streams_update_policy" ON video_streams
    FOR UPDATE USING (true);

CREATE POLICY "video_streams_delete_policy" ON video_streams
    FOR DELETE USING (true);

-- ==============================================
-- 5단계: 자동 업데이트 트리거
-- ==============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_video_streams_updated_at ON video_streams;
CREATE TRIGGER update_video_streams_updated_at
    BEFORE UPDATE ON video_streams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- 6단계: 기존 테이블 컬럼 추가
-- ==============================================
ALTER TABLE polling_stations 
ADD COLUMN IF NOT EXISTS youtube_morning_registered_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE polling_stations 
ADD COLUMN IF NOT EXISTS youtube_afternoon_registered_at TIMESTAMP WITH TIME ZONE;

-- ==============================================
-- 7단계: alerts 테이블 soft delete 컬럼
-- ==============================================
ALTER TABLE alerts 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- ==============================================
-- 8단계: deletion_logs 테이블 생성
-- ==============================================
CREATE TABLE IF NOT EXISTS deletion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  deleted_data JSONB NOT NULL,
  deleted_by TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT
);

-- ==============================================
-- 9단계: deletion_logs 인덱스
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_deletion_logs_table_name ON deletion_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_deletion_logs_deleted_at ON deletion_logs(deleted_at DESC);

-- ==============================================
-- 10단계: 유용한 뷰 생성 (선택사항)
-- ==============================================
CREATE OR REPLACE VIEW active_video_streams AS
SELECT 
    vs.*,
    ps.name as station_name,
    ps.address as station_address
FROM video_streams vs
JOIN polling_stations ps ON vs.polling_station_id = ps.id
WHERE vs.is_active = true
ORDER BY vs.registered_at DESC;

-- ==============================================
-- 완료! 
-- ==============================================
-- 이제 애플리케이션에서 새로운 영상 등록 시스템을 사용할 수 있습니다. 