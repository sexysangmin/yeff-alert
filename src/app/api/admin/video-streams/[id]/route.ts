import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 연결 확인
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isSupabaseConfigured = supabaseUrl && 
  supabaseServiceKey && 
  supabaseUrl !== 'https://placeholder.supabase.co';

const supabase = isSupabaseConfigured ? createClient(supabaseUrl!, supabaseServiceKey!) : null;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { action, reason, isActive } = await request.json();
    const streamId = params.id;

    console.log('🎯 영상 스트림 처리 요청:', { streamId, action, reason, isActive });

    // Supabase가 설정되지 않은 경우
    if (!supabase) {
      console.warn('⚠️ Supabase 미설정, 임시 응답 반환');
      return NextResponse.json({ 
        message: action === 'approve' ? '영상이 승인되었습니다.' : 
                 action === 'reject' ? '영상이 거부되었습니다.' : 
                 '영상 상태가 업데이트되었습니다.',
        success: true,
        note: 'Supabase 미설정으로 임시 처리됨'
      });
    }

    let updateData: any = {
      updated_at: new Date().toISOString()
    };

    // 직접 isActive 값이 전달된 경우
    if (isActive !== undefined) {
      updateData.is_active = isActive;
      console.log('📝 isActive 직접 설정:', isActive);
    }
    // action 기반 처리
    else if (action === 'approve') {
      updateData.is_active = true;
      updateData.approved_at = new Date().toISOString();
      updateData.rejected_at = null;
      updateData.reject_reason = null;
      console.log('✅ 승인 처리');
    } else if (action === 'reject') {
      updateData.is_active = false;
      updateData.rejected_at = new Date().toISOString();
      updateData.reject_reason = reason || '관리자에 의한 거부';
      updateData.approved_at = null;
      console.log('❌ 거부 처리:', reason);
    }

    console.log('💾 업데이트할 데이터:', updateData);

    const { data, error } = await supabase
      .from('video_streams')
      .update(updateData)
      .eq('id', streamId)
      .select()
      .single();

    if (error) {
      console.error('❌ 영상 스트림 업데이트 오류:', error);
      return NextResponse.json({ 
        error: '영상 스트림 업데이트 실패', 
        details: error.message
      }, { status: 500 });
    }

    console.log('✅ 영상 스트림 업데이트 성공:', data);

    return NextResponse.json({ 
      stream: data,
      message: action === 'approve' ? '영상이 승인되었습니다.' : 
               action === 'reject' ? '영상이 거부되었습니다.' : 
               '영상 상태가 업데이트되었습니다.',
      success: true 
    });
  } catch (error) {
    console.error('❌ 영상 스트림 처리 API 오류:', error);
    return NextResponse.json({ 
      error: '서버 오류',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const streamId = params.id;

    // Supabase가 설정되지 않은 경우
    if (!supabase) {
      console.warn('⚠️ Supabase 미설정, 임시 응답 반환');
      return NextResponse.json({ 
        message: '영상이 삭제되었습니다.',
        success: true,
        note: 'Supabase 미설정으로 임시 처리됨'
      });
    }

    // 먼저 영상 정보를 가져와서 삭제 로그에 저장
    const { data: streamData, error: fetchError } = await supabase
      .from('video_streams')
      .select('*')
      .eq('id', streamId)
      .single();

    if (fetchError) {
      console.error('영상 스트림 조회 오류:', fetchError);
      return NextResponse.json({ error: '영상 스트림 조회 실패' }, { status: 500 });
    }

    // 삭제 로그 생성
    const { error: logError } = await supabase
      .from('deletion_logs')
      .insert({
        delete_type: 'video_stream',
        deleted_data: streamData,
        deleted_at: new Date().toISOString(),
        admin_id: 'admin', // TODO: 실제 관리자 ID로 변경
        is_restorable: true
      });

    if (logError) {
      console.error('삭제 로그 생성 오류:', logError);
    }

    // 영상 스트림 삭제
    const { error: deleteError } = await supabase
      .from('video_streams')
      .delete()
      .eq('id', streamId);

    if (deleteError) {
      console.error('영상 스트림 삭제 오류:', deleteError);
      return NextResponse.json({ error: '영상 스트림 삭제 실패' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: '영상이 삭제되었습니다.',
      success: true 
    });
  } catch (error) {
    console.error('영상 스트림 삭제 API 오류:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
} 