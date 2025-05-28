import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stationId, url, title, description, registeredBy, contact, registeredByType, targetDate } = body;

    // 입력 검증
    if (!stationId || !url || !title || !registeredBy) {
      return NextResponse.json({ 
        error: '필수 정보가 누락되었습니다.' 
      }, { status: 400 });
    }

    // 유튜브 URL 검증
    if (!url.toLowerCase().includes('youtube') && 
        !url.toLowerCase().includes('/live/') && 
        !url.toLowerCase().includes('/shorts/')) {
      return NextResponse.json({ 
        error: '올바른 유튜브 링크를 입력해주세요.' 
      }, { status: 400 });
    }

    // 투표소 존재 확인
    const { data: station, error: stationError } = await supabase
      .from('polling_stations')
      .select('id, name')
      .eq('id', stationId)
      .single();

    if (stationError || !station) {
      return NextResponse.json({ 
        error: '투표소를 찾을 수 없습니다.' 
      }, { status: 404 });
    }

    // 동일한 URL이 이미 등록되어 있는지 확인
    const { data: existingStream, error: checkError } = await supabase
      .from('video_streams')
      .select('id')
      .eq('polling_station_id', stationId)
      .eq('url', url)
      .single();

    if (existingStream) {
      return NextResponse.json({ 
        error: '이미 등록된 영상 링크입니다.' 
      }, { status: 409 });
    }

    // 스트림 등록
    const { data: newStream, error: insertError } = await supabase
      .from('video_streams')
      .insert([{
        polling_station_id: stationId,
        url: url.trim(),
        title: title.trim(),
        description: description?.trim() || null,
        registered_by: registeredBy.trim(),
        registered_by_type: registeredByType || 'public',
        contact: contact?.trim() || null,
        registered_at: new Date().toISOString(),
        is_active: registeredByType === 'monitor', // 감시관은 자동 승인, 일반인은 승인 대기
        stream_status: 'unknown',
        target_date: targetDate || 'day1',  // 날짜 정보 저장
        // 감시관인 경우 자동 승인 정보 추가
        ...(registeredByType === 'monitor' && {
          approved_at: new Date().toISOString()
        })
      }])
      .select()
      .single();

    if (insertError) {
      console.error('스트림 등록 실패:', insertError);
      return NextResponse.json({ 
        error: '영상 등록에 실패했습니다.' 
      }, { status: 500 });
    }

    // 관리자에게 알림 생성 (선택사항)
    await supabase
      .from('alerts')
      .insert([{
        polling_station_id: stationId,
        type: 'notice',
        message: registeredByType === 'monitor' 
          ? `새로운 감시관 영상이 등록되었습니다: ${title}` 
          : `새로운 영상이 등록되었습니다: ${title}`,
        comment: registeredByType === 'monitor'
          ? `등록자: ${registeredBy} (감시관) | 자동 승인됨`
          : `등록자: ${registeredBy} | 승인 대기 중`,
        timestamp: new Date().toISOString(),
        admin_id: 'system',
        resolved: false
      }]);

    return NextResponse.json({ 
      success: true,
      message: registeredByType === 'monitor' 
        ? '감시관 영상이 성공적으로 등록되고 승인되었습니다.' 
        : '영상이 성공적으로 등록되었습니다. 관리자 승인 후 공개됩니다.',
      streamId: newStream.id,
      isActive: registeredByType === 'monitor'
    });

  } catch (error) {
    console.error('공개 등록 API 오류:', error);
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 