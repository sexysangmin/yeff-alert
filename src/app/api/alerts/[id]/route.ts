import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 알림 해결 상태 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { resolved, resolvedBy } = await request.json();
    const { id: alertId } = await params;

    const updateData: any = {
      resolved: resolved
    };

    const { data, error } = await supabase
      .from('alerts')
      .update(updateData)
      .eq('id', alertId)
      .select()
      .single();

    if (error) {
      console.error('알림 업데이트 오류:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      alert: data,
      message: resolved ? '알림이 해결되었습니다.' : '알림이 미해결 상태로 변경되었습니다.'
    });

  } catch (error) {
    console.error('알림 업데이트 API 오류:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 알림 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: alertId } = await params;

    const { error } = await supabase
      .from('alerts')
      .delete()
      .eq('id', alertId);

    if (error) {
      console.error('알림 삭제 오류:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: '알림이 삭제되었습니다.'
    });

  } catch (error) {
    console.error('알림 삭제 API 오류:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 