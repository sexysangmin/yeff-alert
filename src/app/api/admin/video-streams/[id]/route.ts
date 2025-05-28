import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { action, reason, isActive } = await request.json();
    const streamId = params.id;

    let updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (action === 'approve') {
      updateData.is_active = true;
      updateData.approved_at = new Date().toISOString();
      updateData.rejected_at = null;
      updateData.reject_reason = null;
    } else if (action === 'reject') {
      updateData.is_active = false;
      updateData.rejected_at = new Date().toISOString();
      updateData.reject_reason = reason || '관리자에 의한 거부';
      updateData.approved_at = null;
    }

    const { data, error } = await supabase
      .from('video_streams')
      .update(updateData)
      .eq('id', streamId)
      .select()
      .single();

    if (error) {
      console.error('영상 스트림 업데이트 오류:', error);
      console.error('상세 오류 정보:', JSON.stringify(error, null, 2));
      console.error('업데이트하려던 데이터:', updateData);
      return NextResponse.json({ 
        error: '영상 스트림 업데이트 실패', 
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 });
    }

    return NextResponse.json({ 
      stream: data,
      message: action === 'approve' ? '영상이 승인되었습니다.' : '영상이 거부되었습니다.',
      success: true 
    });
  } catch (error) {
    console.error('영상 스트림 처리 API 오류:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const streamId = params.id;

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