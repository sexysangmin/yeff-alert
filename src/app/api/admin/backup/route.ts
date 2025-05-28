import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 전체 데이터 백업
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json'; // json 또는 csv

    // 모든 투표소 데이터 조회
    const { data: stations, error: stationsError } = await supabase
      .from('polling_stations')
      .select('*')
      .order('id');

    if (stationsError) {
      console.error('투표소 데이터 조회 오류:', stationsError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // 모든 알림 데이터 조회
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false });

    if (alertsError) {
      console.error('알림 데이터 조회 오류:', alertsError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {
        polling_stations: stations || [],
        alerts: alerts || []
      },
      stats: {
        total_stations: stations?.length || 0,
        total_alerts: alerts?.length || 0,
        youtube_registrations: stations?.filter(s => s.youtube_morning_url || s.youtube_afternoon_url).length || 0
      }
    };

    if (format === 'csv') {
      // CSV 형태로 반환
      let csvContent = '';
      
      // 투표소 데이터 CSV
      csvContent += 'POLLING_STATIONS\n';
      csvContent += 'ID,Name,Address,YouTube_Morning,YouTube_Afternoon,Updated_At\n';
      stations?.forEach(station => {
        csvContent += `"${station.id}","${station.name}","${station.address}","${station.youtube_morning_url || ''}","${station.youtube_afternoon_url || ''}","${station.updated_at}"\n`;
      });
      
      csvContent += '\nALERTS\n';
      csvContent += 'ID,Type,Message,Station_ID,Admin_ID,Created_At,Resolved\n';
      alerts?.forEach(alert => {
        csvContent += `"${alert.id}","${alert.type}","${alert.message}","${alert.station_id}","${alert.admin_id}","${alert.created_at}","${alert.resolved}"\n`;
      });

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="yeff_alert_backup_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // JSON 형태로 반환
    return new NextResponse(JSON.stringify(backupData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="yeff_alert_backup_${new Date().toISOString().split('T')[0]}.json"`
      }
    });

  } catch (error) {
    console.error('백업 생성 오류:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 데이터 복원
export async function POST(request: NextRequest) {
  try {
    const backupData = await request.json();

    if (!backupData.data || !backupData.data.polling_stations) {
      return NextResponse.json({ error: 'Invalid backup format' }, { status: 400 });
    }

    // 기존 데이터 백업 (안전을 위해)
    const { data: existingStations } = await supabase
      .from('polling_stations')
      .select('*');

    // 새 데이터로 복원
    const { error: deleteError } = await supabase
      .from('polling_stations')
      .delete()
      .neq('id', ''); // 모든 데이터 삭제

    if (deleteError) {
      console.error('기존 데이터 삭제 오류:', deleteError);
      return NextResponse.json({ error: 'Failed to clear existing data' }, { status: 500 });
    }

    // 새 데이터 삽입
    const { error: insertError } = await supabase
      .from('polling_stations')
      .insert(backupData.data.polling_stations);

    if (insertError) {
      console.error('데이터 복원 오류:', insertError);
      // 실패 시 기존 데이터 복구 시도
      if (existingStations) {
        await supabase.from('polling_stations').insert(existingStations);
      }
      return NextResponse.json({ error: 'Failed to restore data' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `${backupData.data.polling_stations.length}개 투표소 데이터가 복원되었습니다.` 
    });

  } catch (error) {
    console.error('데이터 복원 오류:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 