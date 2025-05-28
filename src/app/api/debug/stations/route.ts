import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    console.log('🔍 투표소 데이터 디버깅 시작...');

    // 1. 일원1동, 역삼1동 관련 투표소 검색
    const { data: stations, error: stationsError } = await supabase
      .from('polling_stations')
      .select('id, name, address, district')
      .or('name.ilike.%일원1동%,name.ilike.%역삼1동%,address.ilike.%일원1동%,address.ilike.%역삼1동%');

    if (stationsError) {
      console.error('투표소 조회 오류:', stationsError);
      return NextResponse.json({ error: '투표소 조회 실패' }, { status: 500 });
    }

    console.log('🏢 찾은 투표소:', stations?.length || 0);
    stations?.forEach(station => {
      console.log(`- ${station.name} (${station.id}): ${station.address}`);
    });

    // 2. 모든 비디오 스트림 데이터 조회
    const { data: streams, error: streamsError } = await supabase
      .from('video_streams')
      .select('*')
      .order('registered_at', { ascending: false });

    if (streamsError) {
      console.error('스트림 조회 오류:', streamsError);
      return NextResponse.json({ error: '스트림 조회 실패' }, { status: 500 });
    }

    console.log('📹 전체 스트림 개수:', streams?.length || 0);

    // 3. 투표소 ID 매핑 확인
    const stationMap = new Map();
    const { data: allStations, error: allStationsError } = await supabase
      .from('polling_stations')
      .select('id, name, address');

    if (!allStationsError && allStations) {
      allStations.forEach(station => {
        stationMap.set(station.id, station);
      });
    }

    // 4. 스트림 데이터에 투표소 정보 매핑
    const streamsWithStationInfo = streams?.map(stream => {
      const station = stationMap.get(stream.polling_station_id);
      return {
        stream_id: stream.id,
        title: stream.title,
        registered_by: stream.registered_by,
        registered_at: stream.registered_at,
        is_active: stream.is_active,
        polling_station_id: stream.polling_station_id,
        station_name: station?.name || '투표소 정보 없음',
        station_address: station?.address || '주소 정보 없음',
        target_date: stream.target_date || 'day1',
        approved_at: stream.approved_at,
        rejected_at: stream.rejected_at,
        reject_reason: stream.reject_reason
      };
    }) || [];

    return NextResponse.json({
      success: true,
      debug_info: {
        target_stations: stations || [],
        total_streams: streams?.length || 0,
        total_stations: allStations?.length || 0,
        streams_with_station_info: streamsWithStationInfo,
        station_mapping_sample: Array.from(stationMap.entries()).slice(0, 5)
      }
    });

  } catch (error) {
    console.error('디버깅 API 오류:', error);
    return NextResponse.json({ 
      error: '디버깅 오류', 
      details: error instanceof Error ? error.message : '알 수 없는 오류' 
    }, { status: 500 });
  }
} 