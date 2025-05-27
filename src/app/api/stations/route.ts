import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { PollingStation } from '@/types'

// 모든 투표소 조회
export async function GET() {
  try {
    // 투표소 데이터 조회
    const { data: stations, error: stationsError } = await supabase
      .from('polling_stations')
      .select('*')
      .order('created_at', { ascending: true })

    if (stationsError) {
      console.error('투표소 조회 오류:', stationsError)
      return NextResponse.json({ error: '투표소 데이터를 불러올 수 없습니다.' }, { status: 500 })
    }

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
    console.error('투표소 조회 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
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