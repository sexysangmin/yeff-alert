import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

// 알림 생성
export async function POST(request: NextRequest) {
  try {
    const { pollingStationId, type, message, comment, adminId } = await request.json()

    if (!pollingStationId || !type || !message || !adminId) {
      return NextResponse.json({ 
        error: '필수 필드가 누락되었습니다.' 
      }, { status: 400 })
    }

    const alertData = {
      id: uuidv4(),
      polling_station_id: pollingStationId,
      type,
      message,
      comment: comment || null,
      timestamp: new Date().toISOString(),
      admin_id: adminId,
      resolved: false,
      created_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('alerts')
      .insert(alertData)
      .select()
      .single()

    if (error) {
      console.error('알림 생성 오류:', error)
      return NextResponse.json({ error: '알림 생성에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('알림 생성 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// 알림 해결 처리
export async function PUT(request: NextRequest) {
  try {
    const { alertId, resolved } = await request.json()

    if (!alertId) {
      return NextResponse.json({ error: '알림 ID가 필요합니다.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('alerts')
      .update({ 
        resolved: resolved !== undefined ? resolved : true,
        updated_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .select()
      .single()

    if (error) {
      console.error('알림 업데이트 오류:', error)
      return NextResponse.json({ error: '알림 업데이트에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('알림 업데이트 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
} 