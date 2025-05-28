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
  // 날짜별 유튜브 URL (새로운 구조)
  youtubeDayUrls?: {
    day1: {
      morning: string;
      afternoon: string;
    };
    day2: {
      morning: string;
      afternoon: string;
    };
  };
  youtubeRegisteredAt?: {
    morning: Date | null;
    afternoon: Date | null;
  };
  // 날짜별 등록시간 (새로운 구조)
  youtubeDayRegisteredAt?: {
    day1: {
      morning: Date | null;
      afternoon: Date | null;
    };
    day2: {
      morning: Date | null;
      afternoon: Date | null;
    };
  };
  
  // 새로운 다중 스트림 시스템
  streams?: VideoStream[];
  
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

export interface VideoStream {
  id: string;
  url: string;
  title: string;
  description?: string;
  registeredBy: string; // 등록자 닉네임
  registeredByType: 'admin' | 'monitor' | 'public'; // 등록자 유형
  contact?: string; // 연락처 (선택사항)
  registeredAt: Date;
  isActive: boolean;
  viewCount?: number; // 조회수
  lastChecked?: Date; // 마지막 확인 시간 (스트림 상태 체크)
  streamStatus?: 'live' | 'offline' | 'unknown'; // 스트림 상태
  targetDate?: 'day1' | 'day2'; // 투표일 (5월 29일/30일)
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