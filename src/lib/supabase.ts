import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 데이터베이스 테이블 타입 정의
export interface PollingStationDB {
  id: string
  name: string
  address: string
  district: string
  coordinates_lat: number
  coordinates_lng: number
  is_active: boolean
  youtube_morning_url?: string
  youtube_afternoon_url?: string
  entry_count: number
  exit_count: number
  entrance_count: number
  inside_count: number
  outside_count: number
  last_updated: string
  created_at: string
  updated_at: string
}

export interface AlertDB {
  id: string
  polling_station_id: string
  type: string
  message: string
  comment?: string
  timestamp: string
  admin_id: string
  resolved: boolean
  created_at: string
} 