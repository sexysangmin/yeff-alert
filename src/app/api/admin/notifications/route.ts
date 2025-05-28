import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since'); // 마지막 확인 시간
    
    // 최근 활동 조회
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000); // 기본 24시간
    
    // 최근 유튜브 링크 등록 (실제 컬럼명 사용)
    const { data: recentStations, error: stationsError } = await supabase
      .from('polling_stations')
      .select('*')
      .or(`youtube_morning_url.neq.null,youtube_afternoon_url.neq.null`)
      .gte('updated_at', sinceDate.toISOString())
      .order('updated_at', { ascending: false });

    if (stationsError) {
      console.error('Supabase 조회 오류:', stationsError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // 최근 알림 조회
    const { data: recentAlerts, error: alertsError } = await supabase
      .from('alerts')
      .select('*')
      .gte('timestamp', sinceDate.toISOString())
      .order('timestamp', { ascending: false });

    if (alertsError) {
      console.error('알림 조회 오류:', alertsError);
      // 알림 테이블이 없을 수도 있으므로 빈 배열로 처리
      console.log('알림 테이블이 없거나 접근할 수 없습니다. 빈 배열로 처리합니다.');
    }

    // 통계 계산
    const stats = {
      totalStations: 0,
      youtubeRegistrations: recentStations?.length || 0,
      newAlerts: recentAlerts?.length || 0,
      lastUpdate: new Date().toISOString()
    };

    // 전체 투표소 수 조회
    const { count } = await supabase
      .from('polling_stations')
      .select('*', { count: 'exact', head: true });
    
    stats.totalStations = count || 0;

    return NextResponse.json({
      success: true,
      stats,
      recentActivity: {
        youtubeRegistrations: recentStations || [],
        alerts: recentAlerts || []
      }
    });

  } catch (error) {
    console.error('알림 API 오류:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 새로운 알림 생성
export async function POST(request: NextRequest) {
  try {
    const { type, message, stationId, adminId } = await request.json();

    const { data, error } = await supabase
      .from('alerts')
      .insert([{
        type,
        message,
        polling_station_id: stationId,
        admin_id: adminId,
        timestamp: new Date().toISOString(),
        resolved: false
      }])
      .select();

    if (error) {
      console.error('알림 생성 오류:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true, alert: data[0] });

  } catch (error) {
    console.error('알림 생성 API 오류:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 