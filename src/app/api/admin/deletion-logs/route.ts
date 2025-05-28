import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 삭제 로그 조회 API
export async function GET() {
  try {
    const { data: deletionLogs, error } = await supabase
      .from('deletion_logs')
      .select('*')
      .order('deleted_at', { ascending: false })
      .limit(100); // 최근 100개만

    if (error) {
      console.error('삭제 로그 조회 오류:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      logs: deletionLogs || []
    });

  } catch (error) {
    console.error('삭제 로그 API 오류:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 특정 삭제 로그 복원 API
export async function POST(request: NextRequest) {
  try {
    const { logId, restoreType } = await request.json();

    if (!logId) {
      return NextResponse.json({ error: 'Log ID is required' }, { status: 400 });
    }

    // 삭제 로그 조회
    const { data: log, error: logError } = await supabase
      .from('deletion_logs')
      .select('*')
      .eq('id', logId)
      .single();

    if (logError || !log) {
      return NextResponse.json({ error: 'Deletion log not found' }, { status: 404 });
    }

    if (!log.can_restore) {
      return NextResponse.json({ error: 'This log cannot be restored' }, { status: 400 });
    }

    // 복원 로직
    if (log.deletion_type === 'youtube_bulk_delete' && restoreType === 'youtube') {
      const deletedStations = log.deleted_data.deleted_stations;
      
      // 각 투표소의 유튜브 링크 복원
      for (const station of deletedStations) {
        if (station.youtube_morning_url || station.youtube_afternoon_url) {
          const { error: updateError } = await supabase
            .from('polling_stations')
            .update({
              youtube_morning_url: station.youtube_morning_url,
              youtube_afternoon_url: station.youtube_afternoon_url,
              youtube_morning_registered_at: station.youtube_morning_registered_at,
              youtube_afternoon_registered_at: station.youtube_afternoon_registered_at,
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', station.id);

          if (updateError) {
            console.error(`투표소 ${station.id} 복원 실패:`, updateError);
          }
        }
      }

      // 복원 완료 후 로그 업데이트
      await supabase
        .from('deletion_logs')
        .update({
          can_restore: false,
          restored_at: new Date().toISOString(),
          restored_by: 'admin'
        })
        .eq('id', logId);

      return NextResponse.json({
        success: true,
        message: `${deletedStations.length}개 투표소의 유튜브 링크가 복원되었습니다.`
      });

    } else if (log.deletion_type === 'alerts_bulk_delete' && restoreType === 'alerts') {
      const deletedAlerts = log.deleted_data.deleted_alerts;
      
      // 각 알림 복원 (deleted_at을 null로 설정)
      for (const alert of deletedAlerts) {
        const { error: updateError } = await supabase
          .from('alerts')
          .update({
            deleted_at: null,
            resolved: alert.resolved // 원래 상태로 복원
          })
          .eq('id', alert.id);

        if (updateError) {
          console.error(`알림 ${alert.id} 복원 실패:`, updateError);
        }
      }

      // 복원 완료 후 로그 업데이트
      await supabase
        .from('deletion_logs')
        .update({
          can_restore: false,
          restored_at: new Date().toISOString(),
          restored_by: 'admin'
        })
        .eq('id', logId);

      return NextResponse.json({
        success: true,
        message: `${deletedAlerts.length}개 알림이 복원되었습니다.`
      });

    } else {
      return NextResponse.json({ error: 'Invalid restore type' }, { status: 400 });
    }

  } catch (error) {
    console.error('복원 API 오류:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 