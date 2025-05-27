export interface PollingStation {
  id: string;
  name: string;
  address: string;
  district: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  youtubeUrl?: string;
  youtubeUrls?: {
    morning: string;
    afternoon: string;
  };
  adminId?: string;
  entryCount: number;
  exitCount: number;
  // 새로운 출입 세부 정보
  entryDetails?: {
    entrance: number;
    inside: number;
    outside: number;
    lastUpdated: Date;
  };
  lastUpdated: Date;
  alerts: Alert[];
  isActive: boolean;
}

export interface Alert {
  id: string;
  pollingStationId: string;
  type: 'emergency' | 'unusual' | 'notice';
  message: string;
  comment?: string; // 긴급상황 신고 시 추가 코멘트
  timestamp: Date;
  adminId: string;
  resolved: boolean;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  pollingStationId?: string;
  isVerified: boolean;
}

export interface HourlyData {
  hour: number;
  entryCount: number;
  exitCount: number;
  timestamp: Date;
} 