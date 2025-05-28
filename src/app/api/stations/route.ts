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

    console.log('🔄 Supabase에서 데이터 로드 시도...');

    // Supabase는 기본적으로 1000개 제한이 있으므로 페이지네이션 필요
    let allStations: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    console.log('📄 페이지네이션으로 모든 투표소 데이터 로드 시작...');

    while (hasMore) {
      const { data: stations, error: stationsError, count } = await supabase
        .from('polling_stations')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: true })
        .range(from, from + pageSize - 1);

      if (stationsError) {
        console.error('투표소 조회 오류:', stationsError)
        throw new Error('Supabase 조회 실패');
      }

      if (!stations || stations.length === 0) {
        hasMore = false;
      } else {
        allStations = [...allStations, ...stations];
        console.log(`📊 페이지 ${Math.floor(from/pageSize) + 1}: ${stations.length}개 로드 (총 ${allStations.length}개)`);
        
        from += pageSize;
        hasMore = stations.length === pageSize;
        
        // 전체 개수 확인 (첫 번째 요청에서만)
        if (count !== null && from === pageSize) {
          console.log(`📈 Supabase 전체 투표소 개수: ${count}개`);
        }
      }
    }

    // 알림 데이터 별도 조회
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select('*')
      .order('timestamp', { ascending: false });

    if (alertsError) {
      console.error('알림 조회 오류:', alertsError)
      // 알림 에러는 무시하고 계속 진행
    }

    // 데이터가 없으면 JSON 폴백 시도
    if (allStations.length === 0) {
      console.log('⚠️ Supabase에 데이터 없음, JSON 폴백 시도');
      throw new Error('데이터 없음');
    }

    console.log(`✅ Supabase에서 총 ${allStations.length}개 투표소 로드 완료`);

    // 데이터베이스 형식을 프론트엔드 형식으로 변환
    const formattedStations = allStations?.map(station => ({
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

    const response = NextResponse.json(formattedStations);
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    return response;
  } catch (error) {
    console.error('❌ Supabase 오류, JSON 폴백 시도:', error)
    
    try {
      // JSON 파일 폴백
      const jsonPath = path.join(process.cwd(), 'public', 'data', 'polling_stations_complete_all.json')
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
      
      console.log('📄 JSON 폴백 데이터 로드:', jsonData.length, '개 투표소')
      
      const response = NextResponse.json(jsonData);
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      return response;
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
  console.log('🔄 PUT /api/stations 요청 받음');
  
  try {
    const body = await request.json();
    console.log('📋 요청 본문:', body);
    
    const { stationId, updates } = body;

    if (!stationId) {
      console.error('❌ stationId가 없음');
      return NextResponse.json({ error: '투표소 ID가 필요합니다.' }, { status: 400 })
    }

    console.log('🎯 업데이트할 투표소 ID:', stationId);
    console.log('📝 업데이트 데이터:', updates);

    // 업데이트할 데이터 구성
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (updates.isActive !== undefined) {
      updateData.is_active = updates.isActive
      console.log('✅ isActive 업데이트:', updates.isActive);
    }

    if (updates.youtubeUrls) {
      updateData.youtube_morning_url = updates.youtubeUrls.morning || null
      updateData.youtube_afternoon_url = updates.youtubeUrls.afternoon || null
      
      console.log('📺 유튜브 URL 업데이트:', {
        morning: updateData.youtube_morning_url,
        afternoon: updateData.youtube_afternoon_url
      });
      
      // 유튜브 링크가 모두 제거되면 모니터링 비활성화
      if (!updates.youtubeUrls.morning && !updates.youtubeUrls.afternoon) {
        updateData.is_active = false
        console.log('❌ 모든 유튜브 링크 제거됨, 비활성화');
      } else {
        updateData.is_active = true
        console.log('✅ 유튜브 링크 있음, 활성화');
      }
    }

    if (updates.entryDetails) {
      updateData.entrance_count = updates.entryDetails.entrance || 0
      updateData.inside_count = updates.entryDetails.inside || 0
      updateData.outside_count = updates.entryDetails.outside || 0
      updateData.last_updated = new Date().toISOString()
      console.log('👥 출입 세부정보 업데이트:', updates.entryDetails);
    }

    if (updates.entryCount !== undefined) {
      updateData.entry_count = updates.entryCount
      console.log('📊 입장 수 업데이트:', updates.entryCount);
    }

    if (updates.exitCount !== undefined) {
      updateData.exit_count = updates.exitCount
      console.log('📊 퇴장 수 업데이트:', updates.exitCount);
    }

    console.log('💾 최종 업데이트 데이터:', updateData);
    console.log('🔍 Supabase 업데이트 시도...');

    const { data, error } = await supabase
      .from('polling_stations')
      .update(updateData)
      .eq('id', stationId)
      .select()
      .single()

    if (error) {
      console.error('❌ Supabase 업데이트 오류:', error)
      return NextResponse.json({ 
        error: '투표소 업데이트에 실패했습니다.',
        details: error.message 
      }, { status: 500 })
    }

    console.log('✅ Supabase 업데이트 성공:', data);
    return NextResponse.json({ success: true, data })
    
  } catch (error) {
    console.error('❌ PUT API 전체 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 