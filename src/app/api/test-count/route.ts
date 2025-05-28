import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // 투표소 총 개수 확인
    const { count, error } = await supabase
      .from('polling_stations')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('카운트 조회 오류:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 실제 데이터 몇 개 가져와보기
    const { data: sampleData, error: sampleError } = await supabase
      .from('polling_stations')
      .select('id, name')
      .limit(10)

    if (sampleError) {
      console.error('샘플 데이터 조회 오류:', sampleError)
    }

    return NextResponse.json({
      totalCount: count,
      sampleData: sampleData || [],
      message: `데이터베이스에 총 ${count}개의 투표소가 있습니다.`
    })

  } catch (error) {
    console.error('테스트 API 오류:', error)
    return NextResponse.json({ 
      error: '테스트 실패',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 