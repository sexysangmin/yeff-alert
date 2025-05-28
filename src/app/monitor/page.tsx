'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import MonitorDashboard from '@/components/MonitorDashboard';
import VideoRegistrationModal from '@/components/VideoRegistrationModal';
import { PollingStation } from '@/types';

export default function MonitorPage() {
  const router = useRouter();
  const [pollingStations, setPollingStations] = useState<PollingStation[]>([]);
  const [isVideoRegistrationOpen, setIsVideoRegistrationOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 홈으로 돌아가기 핸들러
  const handleHomeClick = () => {
    router.push('/');
  };

  // 투표소 데이터 로드
  useEffect(() => {
    const loadPollingStations = async () => {
      try {
        console.log('🔄 감시단 페이지에서 투표소 데이터 로드 중...');
        
        const response = await fetch('/api/stations');
        
        if (!response.ok) {
          throw new Error(`API 오류: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ 감시단 페이지 API 데이터 로드 완료:', data.length, '개 투표소');
        
        setPollingStations(data);
        setIsLoading(false);
        
      } catch (error) {
        console.error('❌ 감시단 페이지 데이터 로드 실패:', error);
        setIsLoading(false);
      }
    };

    loadPollingStations();
  }, []);

  // 투표소 업데이트 핸들러
  const handleStationUpdate = (stationId: string, updates: Partial<PollingStation>) => {
    console.log('📝 감시단 페이지 - 투표소 업데이트 받음:', {
      stationId,
      updates,
      isActive: updates.isActive
    });
    
    setPollingStations(prev => {
      const updated = prev.map(station => 
        station.id === stationId 
          ? { ...station, ...updates }
          : station
      );
      
      return updated;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            감시단 대시보드 로딩 중...
          </h2>
          <p className="text-muted-foreground">
            투표소 데이터를 불러오고 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header 
        onHomeClick={handleHomeClick} 
        onVideoRegistrationClick={() => setIsVideoRegistrationOpen(true)}
      />
      
      <div className="flex-1">
        <MonitorDashboard 
          pollingStations={pollingStations}
          onStationUpdate={handleStationUpdate}
        />
      </div>

      {/* 연락처 정보 */}
      <footer className="bg-card/30 border-t border-border py-4">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            🛠️ 사이트 오류 또는 문의사항: <a href="tel:01024635035" className="text-primary hover:underline font-medium">010-2463-5035</a> (사이트 관리자)
          </p>
        </div>
      </footer>

      <VideoRegistrationModal
        isOpen={isVideoRegistrationOpen}
        onClose={() => setIsVideoRegistrationOpen(false)}
      />
    </div>
  );
} 