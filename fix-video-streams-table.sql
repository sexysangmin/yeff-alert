-- 기존 video_streams 테이블 수정 스크립트
-- 이 스크립트를 Supabase SQL Editor에서 실행하세요

-- 1. 승인/거부 관련 컬럼 추가
ALTER TABLE video_streams ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE video_streams ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE video_streams ADD COLUMN IF NOT EXISTS reject_reason TEXT;

-- 2. target_date 컬럼 추가 (이미 있다면 무시됨)
ALTER TABLE video_streams ADD COLUMN IF NOT EXISTS target_date TEXT DEFAULT 'day1';

-- 3. target_date 제약조건 추가 (기존에 없다면)
DO $$
BEGIN
    BEGIN
        ALTER TABLE video_streams ADD CONSTRAINT check_target_date CHECK (target_date IN ('day1', 'day2'));
    EXCEPTION
        WHEN duplicate_object THEN
            NULL; -- 이미 제약조건이 있으면 무시
    END;
END $$;

-- 4. 필요한 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_video_streams_approved_at ON video_streams(approved_at);
CREATE INDEX IF NOT EXISTS idx_video_streams_rejected_at ON video_streams(rejected_at);
CREATE INDEX IF NOT EXISTS idx_video_streams_target_date ON video_streams(target_date);

-- 5. 테이블 구조 확인 (선택사항)
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'video_streams' 
-- ORDER BY ordinal_position; 