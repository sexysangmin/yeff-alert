import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { PollingStation } from '@/types'
import fs from 'fs'
import path from 'path'

// 모든 투표소 조회
export async function GET() {
  try {
    // 환경 변수 확인
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isSupabaseConfigured = supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co';
    
    if (!isSupabaseConfigured) {
      console.log('⚠️ Supabase 미설정, JSON 데이터 직접 로드');
      throw new Error('Supabase 설정 필요');
    }

    // 투표소 데이터 조회
    const { data: stations, error: stationsError } = await supabase
      .from('polling_stations')
      .select('*')
      .order('created_at', { ascending: true })

    if (stationsError) {
      console.error('투표소 조회 오류:', stationsError)
      throw new Error('Supabase 조회 실패');
    }

    // 데이터가 없으면 JSON 폴백 시도
    if (!stations || stations.length === 0) {
      console.log('⚠️ Supabase에 데이터 없음, JSON 폴백 시도');
      throw new Error('데이터 없음');
    }

    console.log(`✅ Supabase에서 ${stations.length}개 투표소 로드 완료`);

    // 알림 데이터 별도 조회
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select('*')
      .order('timestamp', { ascending: false })

    if (alertsError) {
      console.error('알림 조회 오류:', alertsError)
      // 알림 에러는 무시하고 계속 진행
    }

    // 데이터베이스 형식을 프론트엔드 형식으로 변환
    const formattedStations = stations?.map(station => ({
      id: station.id,
      name: station.name,
      address: station.address,
      district: station.district,
      coordinates: {
        lat: station.coordinates_lat,
        lng: station.coordinates_lng
      },
      isActive: station.is_active,
      entryCount: station.entry_count || 0,
      exitCount: station.exit_count || 0,
      entryDetails: {
        entrance: station.entrance_count || 0,
        inside: station.inside_count || 0,
        outside: station.outside_count || 0,
        lastUpdated: new Date(station.last_updated || station.updated_at)
      },
      lastUpdated: new Date(station.last_updated || station.updated_at),
      alerts: alerts?.filter(alert => alert.polling_station_id === station.id)?.map((alert: any) => ({
        id: String(alert.id),
        pollingStationId: String(alert.polling_station_id),
        type: String(alert.type),
        message: String(alert.message),
        comment: alert.comment ? String(alert.comment) : null,
        timestamp: new Date(String(alert.timestamp)),
        adminId: String(alert.admin_id),
        resolved: Boolean(alert.resolved)
      })) || [],
      youtubeUrls: {
        morning: station.youtube_morning_url || '',
        afternoon: station.youtube_afternoon_url || ''
      }
    })) || []

    return NextResponse.json(formattedStations)
  } catch (error) {
    console.error('❌ Supabase 오류, JSON 폴백 시도:', error)
    
    try {
      // JSON 파일 폴백
      const jsonPath = path.join(process.cwd(), 'public', 'data', 'polling_stations_complete_all.json')
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
      
      console.log('📄 JSON 폴백 데이터 로드:', jsonData.length, '개 투표소')
      return NextResponse.json(jsonData)
      
    } catch (fallbackError) {
      console.error('❌ JSON 폴백도 실패:', fallbackError)
      
      // 최종 목 데이터
      const mockData = [
        {
          id: "station_1",
          name: "청운효자동사전투표소",
          address: "서울 종로구 청운효자동",
          district: "서울",
          coordinates: { lat: 37.5857308, lng: 126.9695124 },
          isActive: false,
          entryCount: 0,
          exitCount: 0,
          lastUpdated: new Date('2025-01-27T10:00:00.000Z'),
          alerts: [],
          youtubeUrls: { morning: "", afternoon: "" }
        }
      ]
      
      return NextResponse.json(mockData)
    }
  }
}

// 투표소 업데이트
export async function PUT(request: NextRequest) {
  try {
    const { stationId, updates } = await request.json()

    if (!stationId) {
      return NextResponse.json({ error: '투표소 ID가 필요합니다.' }, { status: 400 })
    }

    // 업데이트할 데이터 구성
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (updates.isActive !== undefined) {
      updateData.is_active = updates.isActive
    }

    if (updates.youtubeUrls) {
      updateData.youtube_morning_url = updates.youtubeUrls.morning || null
      updateData.youtube_afternoon_url = updates.youtubeUrls.afternoon || null
    }

    if (updates.entryDetails) {
      updateData.entrance_count = updates.entryDetails.entrance || 0
      updateData.inside_count = updates.entryDetails.inside || 0
      updateData.outside_count = updates.entryDetails.outside || 0
      updateData.last_updated = new Date().toISOString()
    }

    if (updates.entryCount !== undefined) {
      updateData.entry_count = updates.entryCount
    }

    if (updates.exitCount !== undefined) {
      updateData.exit_count = updates.exitCount
    }

    const { data, error } = await supabase
      .from('polling_stations')
      .update(updateData)
      .eq('id', stationId)
      .select()
      .single()

    if (error) {
      console.error('투표소 업데이트 오류:', error)
      return NextResponse.json({ error: '투표소 업데이트에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('투표소 업데이트 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
} 