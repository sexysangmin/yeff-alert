import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 삭제 로그 저장 함수
async function logDeletion(type: string, data: any, adminId: string = 'admin') {
  try {
    const { error } = await supabase
      .from('deletion_logs')
      .insert([{
        deletion_type: type,
        deleted_data: data,
        deleted_at: new Date().toISOString(),
        admin_id: adminId,
        can_restore: true
      }]);
    
    if (error) {
      console.error('삭제 로그 저장 실패:', error);
    } else {
      console.log('✅ 삭제 로그 저장 완료:', type);
    }
  } catch (error) {
    console.error('삭제 로그 저장 오류:', error);
  }
}

// 대량 삭제 API
export async function DELETE(request: NextRequest) {
  try {
    const { type } = await request.json();

    if (type === 'youtube') {
      // 삭제 전 현재 데이터 백업
      console.log('📋 유튜브 링크 삭제 전 백업 시작...');
      
      const { data: currentData, error: fetchError } = await supabase
        .from('polling_stations')
        .select(`
          id, name, 
          youtube_morning_url, youtube_afternoon_url, 
          youtube_morning_registered_at, youtube_afternoon_registered_at,
          youtube_day1_morning_url, youtube_day1_afternoon_url,
          youtube_day1_morning_registered_at, youtube_day1_afternoon_registered_at,
          youtube_day2_morning_url, youtube_day2_afternoon_url,
          youtube_day2_morning_registered_at, youtube_day2_afternoon_registered_at
        `)
        .or(`
          youtube_morning_url.not.is.null,
          youtube_afternoon_url.not.is.null,
          youtube_day1_morning_url.not.is.null,
          youtube_day1_afternoon_url.not.is.null,
          youtube_day2_morning_url.not.is.null,
          youtube_day2_afternoon_url.not.is.null
        `);

      if (fetchError) {
        console.error('현재 데이터 조회 실패:', fetchError);
        return NextResponse.json({ error: 'Failed to backup data' }, { status: 500 });
      }

      // 삭제할 데이터가 있는 경우에만 로그 저장
      if (currentData && currentData.length > 0) {
        const deletionData = {
          total_count: currentData.length,
          deleted_stations: currentData.filter(station => 
            station.youtube_morning_url || station.youtube_afternoon_url ||
            station.youtube_day1_morning_url || station.youtube_day1_afternoon_url ||
            station.youtube_day2_morning_url || station.youtube_day2_afternoon_url
          ),
          timestamp: new Date().toISOString()
        };

        await logDeletion('youtube_bulk_delete', deletionData);
        console.log(`📊 ${deletionData.deleted_stations.length}개 투표소의 유튜브 링크 백업 완료`);
      }

      // 모든 유튜브 링크 삭제 (기존 + 새로운 날짜별 필드)
      const { error } = await supabase
        .from('polling_stations')
        .update({
          // 기존 필드
          youtube_morning_url: null,
          youtube_afternoon_url: null,
          youtube_morning_registered_at: null,
          youtube_afternoon_registered_at: null,
          // 새로운 날짜별 필드
          youtube_day1_morning_url: null,
          youtube_day1_afternoon_url: null,
          youtube_day1_morning_registered_at: null,
          youtube_day1_afternoon_registered_at: null,
          youtube_day2_morning_url: null,
          youtube_day2_afternoon_url: null,
          youtube_day2_morning_registered_at: null,
          youtube_day2_afternoon_registered_at: null,
          is_active: false, // 모니터링 비활성화
          updated_at: new Date().toISOString()
        })
        .neq('id', ''); // 모든 레코드 대상

      if (error) {
        console.error('유튜브 링크 삭제 오류:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      console.log('✅ 유튜브 링크 전체 삭제 완료 (백업됨)');
      return NextResponse.json({ 
        success: true, 
        message: `모든 유튜브 링크가 삭제되고 모니터링이 비활성화되었습니다.\n백업은 삭제 로그에서 확인 가능합니다.`
      });

    } else if (type === 'alerts') {
      // 삭제 전 현재 알림 데이터 백업
      console.log('📋 알림 삭제 전 백업 시작...');
      
      const { data: currentAlerts, error: fetchError } = await supabase
        .from('alerts')
        .select('*')
        .order('timestamp', { ascending: false });

      if (fetchError) {
        console.error('현재 알림 조회 실패:', fetchError);
        return NextResponse.json({ error: 'Failed to backup alerts' }, { status: 500 });
      }

      // 삭제할 알림이 있는 경우에만 로그 저장
      if (currentAlerts && currentAlerts.length > 0) {
        const deletionData = {
          total_count: currentAlerts.length,
          deleted_alerts: currentAlerts,
          timestamp: new Date().toISOString()
        };

        await logDeletion('alerts_bulk_delete', deletionData);
        console.log(`📊 ${currentAlerts.length}개 알림 백업 완료`);
      }

      // 모든 알림을 소프트 삭제 (실제로는 deleted_at 필드 설정)
      const { error } = await supabase
        .from('alerts')
        .update({
          deleted_at: new Date().toISOString(),
          resolved: true // 삭제된 알림은 해결된 것으로 표시
        })
        .is('deleted_at', null); // 아직 삭제되지 않은 알림만

      if (error) {
        console.error('알림 소프트 삭제 오류:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      console.log('✅ 알림 전체 소프트 삭제 완료 (백업됨)');
      return NextResponse.json({ 
        success: true, 
        message: `모든 알림이 삭제되었습니다.\n백업은 삭제 로그에서 확인 가능합니다.`
      });

    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

  } catch (error) {
    console.error('대량 삭제 API 오류:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 