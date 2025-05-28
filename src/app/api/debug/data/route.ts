import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    console.log('🔍 디버깅 API 호출 - 활성화된 투표소와 유튜브 링크 확인');

    // 활성화된 투표소 조회
    const { data: activeStations, error: activeError } = await supabase
      .from('polling_stations')
      .select('id, name, is_active, youtube_morning_url, youtube_afternoon_url, youtube_day1_morning_url, youtube_day1_afternoon_url, youtube_day2_morning_url, youtube_day2_afternoon_url')
      .eq('is_active', true)
      .limit(10);

    if (activeError) {
      console.error('활성화된 투표소 조회 오류:', activeError);
    }

    // 유튜브 링크가 있는 투표소 조회 (기본 링크)
    const { data: youtubeStations, error: youtubeError } = await supabase
      .from('polling_stations')
      .select('id, name, is_active, youtube_morning_url, youtube_afternoon_url')
      .or('youtube_morning_url.neq.,youtube_afternoon_url.neq.')
      .limit(10);

    if (youtubeError) {
      console.error('유튜브 투표소 조회 오류:', youtubeError);
    }

    // 날짜별 유튜브 링크가 있는 투표소 조회
    const { data: dayYoutubeStations, error: dayYoutubeError } = await supabase
      .from('polling_stations')
      .select('id, name, is_active, youtube_day1_morning_url, youtube_day1_afternoon_url, youtube_day2_morning_url, youtube_day2_afternoon_url')
      .or('youtube_day1_morning_url.neq.,youtube_day1_afternoon_url.neq.,youtube_day2_morning_url.neq.,youtube_day2_afternoon_url.neq.')
      .limit(10);

    if (dayYoutubeError) {
      console.error('날짜별 유튜브 투표소 조회 오류:', dayYoutubeError);
    }

    // 전체 통계
    const { data: totalStats, error: statsError } = await supabase
      .from('polling_stations')
      .select('id')
      .limit(1);

    const { count: totalCount } = await supabase
      .from('polling_stations')
      .select('id', { count: 'exact' });

    const { count: activeCount } = await supabase
      .from('polling_stations')
      .select('id', { count: 'exact' })
      .eq('is_active', true);

    const { count: youtubeCount } = await supabase
      .from('polling_stations')
      .select('id', { count: 'exact' })
      .or('youtube_morning_url.neq.,youtube_afternoon_url.neq.');

    const { count: dayYoutubeCount } = await supabase
      .from('polling_stations')
      .select('id', { count: 'exact' })
      .or('youtube_day1_morning_url.neq.,youtube_day1_afternoon_url.neq.,youtube_day2_morning_url.neq.,youtube_day2_afternoon_url.neq.');

    console.log('📊 디버깅 통계:', {
      totalCount,
      activeCount,
      youtubeCount,
      dayYoutubeCount
    });

    return NextResponse.json({
      success: true,
      debug: {
        stats: {
          total: totalCount,
          active: activeCount,
          withYoutube: youtubeCount,
          withDayYoutube: dayYoutubeCount
        },
        samples: {
          activeStations: activeStations?.slice(0, 5) || [],
          youtubeStations: youtubeStations?.slice(0, 5) || [],
          dayYoutubeStations: dayYoutubeStations?.slice(0, 5) || []
        }
      }
    });
    
  } catch (error) {
    console.error('🔍 디버깅 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
} 