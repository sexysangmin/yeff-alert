import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'

export async function POST() {
  try {
    console.log('🚀 데이터베이스 초기화 시작...')

    // 기존 JSON 데이터 로드
    const filePath = path.join(process.cwd(), 'public', 'data', 'polling_stations_complete_all.json')
    const fileContent = fs.readFileSync(filePath, 'utf8')
    const jsonData = JSON.parse(fileContent)
    console.log(`📊 JSON 데이터 로드 완료: ${jsonData.length}개 투표소`)

    // 기존 데이터 삭제 (선택사항)
    console.log('🗑️ 기존 데이터 정리 중...')
    await supabase.from('alerts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('polling_stations').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 투표소 데이터 변환 및 삽입
    const pollingStations = (jsonData as Record<string, unknown>[]).map((station) => ({
      id: station.id || uuidv4(),
      name: station.name,
      address: station.address,
      district: station.district,
      coordinates_lat: (station.coordinates as { lat: number; lng: number })?.lat || 0,
      coordinates_lng: (station.coordinates as { lat: number; lng: number })?.lng || 0,
      is_active: station.isActive || false,
      youtube_morning_url: (station.youtubeUrls as { morning?: string; afternoon?: string })?.morning || null,
      youtube_afternoon_url: (station.youtubeUrls as { morning?: string; afternoon?: string })?.afternoon || null,
      entry_count: station.entryCount || 0,
      exit_count: station.exitCount || 0,
      entrance_count: (station.entryDetails as any)?.entrance || 0,
      inside_count: (station.entryDetails as any)?.inside || 0,
      outside_count: (station.entryDetails as any)?.outside || 0,
      last_updated: station.lastUpdated || new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    console.log('�� 투표소 데이터 삽입 중...')
    
    // 대용량 데이터를 작은 배치로 나누어 삽입
    const BATCH_SIZE = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < pollingStations.length; i += BATCH_SIZE) {
      const batch = pollingStations.slice(i, i + BATCH_SIZE);
      console.log(`💾 배치 ${Math.floor(i/BATCH_SIZE) + 1} 삽입 중: ${batch.length}개 투표소`);
      
      const { error: batchError } = await supabase
        .from('polling_stations')
        .insert(batch);

      if (batchError) {
        console.error(`배치 ${Math.floor(i/BATCH_SIZE) + 1} 삽입 오류:`, batchError);
        throw new Error(`배치 삽입 실패: ${batchError.message}`);
      }
      
      insertedCount += batch.length;
      console.log(`✅ ${insertedCount}/${pollingStations.length} 투표소 삽입 완료`);
    }

    // 알림 데이터 삽입
    const alerts: any[] = []
    jsonData.forEach((station: any) => {
      if (station.alerts && station.alerts.length > 0) {
        station.alerts.forEach((alert: any) => {
          alerts.push({
            id: String(alert.id || `alert_${uuidv4()}`),
            polling_station_id: String(station.id),
            type: alert.type,
            message: alert.message,
            comment: alert.comment || null,
            timestamp: alert.timestamp || new Date().toISOString(),
            admin_id: alert.adminId || 'system',
            resolved: alert.resolved || false,
            created_at: new Date().toISOString()
          })
        })
      }
    })

    if (alerts.length > 0) {
      console.log(`🚨 알림 데이터 삽입 중: ${alerts.length}개`)
      const { error: alertsError } = await supabase
        .from('alerts')
        .insert(alerts)

      if (alertsError) {
        console.error('알림 데이터 삽입 오류:', alertsError)
        throw alertsError
      }
    }

    console.log('✅ 데이터베이스 초기화 완료!')

    return NextResponse.json({
      success: true,
      message: `데이터베이스 초기화 완료: ${pollingStations.length}개 투표소, ${alerts.length}개 알림`
    })

  } catch (error) {
    console.error('❌ 데이터베이스 초기화 오류:', error)
    
    let errorMessage = '알 수 없는 오류가 발생했습니다.';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
      errorDetails = Object.keys(error).join(', ');
    } else {
      errorMessage = String(error);
    }
    
    return NextResponse.json({ 
      error: '데이터베이스 초기화에 실패했습니다.',
      message: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 