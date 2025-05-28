import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 대량 삭제 API
export async function DELETE(request: NextRequest) {
  try {
    const { type } = await request.json();

    if (type === 'youtube') {
      // 모든 유튜브 링크 삭제 및 모니터링 비활성화
      const { error } = await supabase
        .from('polling_stations')
        .update({
          youtube_morning_url: null,
          youtube_afternoon_url: null,
          is_active: false, // 모니터링 비활성화
          updated_at: new Date().toISOString()
        })
        .neq('id', ''); // 모든 레코드 대상

      if (error) {
        console.error('유튜브 링크 삭제 오류:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: '모든 유튜브 링크가 삭제되고 모니터링이 비활성화되었습니다.'
      });

    } else if (type === 'alerts') {
      // 모든 알림 삭제
      const { error } = await supabase
        .from('alerts')
        .delete()
        .neq('id', ''); // 모든 레코드 대상

      if (error) {
        console.error('알림 삭제 오류:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: '모든 알림이 삭제되었습니다.'
      });

    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

  } catch (error) {
    console.error('대량 삭제 API 오류:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 