-- 감시관 자동 승인 기능 업데이트 스크립트
-- 이 스크립트를 Supabase SQL Editor에서 실행하세요

-- 1. 기존 감시관 영상들을 자동 승인 처리
UPDATE video_streams 
SET 
  is_active = true,
  approved_at = COALESCE(approved_at, registered_at),
  updated_at = NOW()
WHERE 
  registered_by_type = 'monitor' 
  AND is_active = false 
  AND rejected_at IS NULL;

-- 2. 기존 감시관 영상들의 알림 메시지 업데이트
UPDATE alerts 
SET 
  message = REPLACE(message, '새로운 영상이 등록되었습니다:', '새로운 감시관 영상이 등록되었습니다:'),
  comment = REPLACE(comment, '승인 대기 중', '자동 승인됨'),
  comment = REPLACE(comment, '| 승인 대기 중', '(감시관) | 자동 승인됨')
WHERE 
  type = 'notice' 
  AND message LIKE '%영상이 등록되었습니다%'
  AND comment LIKE '%(감시관)%';

-- 3. 업데이트 결과 확인
SELECT 
  registered_by_type,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE is_active = true) as active_count,
  COUNT(*) FILTER (WHERE is_active = false AND rejected_at IS NULL) as pending_count,
  COUNT(*) FILTER (WHERE rejected_at IS NOT NULL) as rejected_count
FROM video_streams 
GROUP BY registered_by_type
ORDER BY registered_by_type;

-- 4. 감시관 영상의 상태 확인
SELECT 
  id,
  title,
  registered_by,
  registered_by_type,
  is_active,
  registered_at,
  approved_at,
  rejected_at
FROM video_streams 
WHERE registered_by_type = 'monitor'
ORDER BY registered_at DESC
LIMIT 10; 