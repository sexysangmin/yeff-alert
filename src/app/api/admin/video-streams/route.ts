import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // 먼저 모든 스트림 데이터를 가져옵니다
    const { data: streams, error } = await supabase
      .from('video_streams')
      .select('*')
      .order('registered_at', { ascending: false });

    if (error) {
      console.error('영상 스트림 조회 오류:', error);
      return NextResponse.json({ error: '영상 스트림 조회 실패' }, { status: 500 });
    }

    // 모든 투표소 데이터를 가져옵니다
    const { data: stations, error: stationsError } = await supabase
      .from('polling_stations')
      .select('id, name');

    if (stationsError) {
      console.error('투표소 조회 오류:', stationsError);
      return NextResponse.json({ error: '투표소 조회 실패' }, { status: 500 });
    }

    // 투표소 ID와 이름을 매핑하는 객체 생성
    const stationMap = new Map();
    stations?.forEach(station => {
      stationMap.set(station.id, station.name);
    });

    // 스트림 데이터에 투표소 이름 추가
    const streamsWithStationNames = streams?.map(stream => ({
      ...stream,
      polling_station_name: stationMap.get(stream.polling_station_id) || `투표소 ID: ${stream.polling_station_id}`
    })) || [];

    console.log('✅ 영상 스트림 조회 완료:', streamsWithStationNames.length);

    return NextResponse.json({ 
      streams: streamsWithStationNames,
      success: true 
    });
  } catch (error) {
    console.error('영상 스트림 API 오류:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
} 