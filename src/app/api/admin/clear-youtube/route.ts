import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ 모든 유튜브 링크 삭제 시작...');
    
    // 먼저 현재 상태 확인 (기존 필드만)
    const { data: beforeData, error: beforeError } = await supabase
      .from('polling_stations')
      .select('id, name, youtube_morning_url, youtube_afternoon_url')
      .or('youtube_morning_url.not.is.null,youtube_afternoon_url.not.is.null');
      
    if (beforeError) {
      console.error('❌ 현재 데이터 조회 실패:', beforeError);
    } else {
      console.log(`📊 삭제 전 유튜브 링크가 있는 투표소: ${beforeData?.length || 0}개`);
    }
    
    // 기존 필드 삭제 (확실히 존재하는 필드)
    const { data, error } = await supabase
      .from('polling_stations')
      .update({
        youtube_morning_url: null,
        youtube_afternoon_url: null,
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .neq('id', '')
      .select('id, name');

    if (error) {
      console.error('❌ 유튜브 링크 삭제 실패:', error);
      return NextResponse.json({ 
        error: '유튜브 링크 삭제에 실패했습니다.', 
        details: error.message 
      }, { status: 500 });
    }

    console.log(`✅ ${data?.length || 0}개 투표소의 기존 유튜브 링크 삭제 완료`);
    
    // 새로운 날짜별 필드도 시도해보기 (오류가 발생해도 계속 진행)
    try {
      const { data: dayData, error: dayError } = await supabase
        .from('polling_stations')
        .update({
          youtube_day1_morning_url: null,
          youtube_day1_afternoon_url: null,
          youtube_day2_morning_url: null,
          youtube_day2_afternoon_url: null,
          updated_at: new Date().toISOString()
        })
        .neq('id', '')
        .select('id, name');
        
      if (dayError) {
        console.warn('⚠️ 날짜별 필드 삭제 실패 (필드가 존재하지 않을 수 있음):', dayError);
      } else {
        console.log(`✅ ${dayData?.length || 0}개 투표소의 날짜별 유튜브 링크 삭제 완료`);
      }
    } catch (dayDeleteError) {
      console.warn('⚠️ 날짜별 필드 삭제 시도 중 오류 (무시하고 계속):', dayDeleteError);
    }
    
    // 삭제 후 상태 확인
    const { data: afterData } = await supabase
      .from('polling_stations')
      .select('id, name, youtube_morning_url, youtube_afternoon_url')
      .or('youtube_morning_url.not.is.null,youtube_afternoon_url.not.is.null');
      
    console.log(`📊 삭제 후 유튜브 링크가 있는 투표소: ${afterData?.length || 0}개`);

    return NextResponse.json({ 
      success: true, 
      message: `모든 유튜브 링크가 성공적으로 삭제되었습니다. (${data?.length || 0}개 투표소 처리)`,
      processed: data?.length || 0
    });

  } catch (error) {
    console.error('❌ 유튜브 링크 삭제 API 오류:', error);
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
} 