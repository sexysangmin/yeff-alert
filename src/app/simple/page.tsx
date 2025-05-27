'use client';

import { useState, useEffect } from 'react';
import { PollingStation } from '@/types';

export default function SimplePage() {
  const [pollingStations, setPollingStations] = useState<PollingStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('📊 데이터 로딩 시작...');
        const response = await fetch('/data/polling_stations_partial_1800.json');
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ 데이터 로드 성공:', data.length, '개');
          setPollingStations(data.slice(0, 20)); // 처음 20개만
        } else {
          console.log('❌ 메인 데이터 로드 실패, 백업 시도...');
          const backupResponse = await fetch('/data/polling_stations_reprocessed_900.json');
          if (backupResponse.ok) {
            const backupData = await backupResponse.json();
            console.log('✅ 백업 데이터 로드 성공:', backupData.length, '개');
            setPollingStations(backupData.slice(0, 20));
          }
        }
      } catch (error) {
        console.error('❌ 데이터 로드 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-lg">데이터 로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-lg shadow-lg p-6 mb-6 border border-border">
          <h1 className="text-3xl font-bold text-center mb-4">
            🗳️ YEFF X 자유대학 ALERT
          </h1>
          <p className="text-center text-muted-foreground mb-6">
            전국 투표소 실시간 모니터링 시스템
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-500/20 p-4 rounded-lg text-center border border-blue-500/30">
              <div className="text-2xl font-bold text-blue-400">{pollingStations.length}</div>
              <div className="text-blue-300">표시된 투표소</div>
            </div>
            <div className="bg-green-500/20 p-4 rounded-lg text-center border border-green-500/30">
              <div className="text-2xl font-bold text-green-400">
                {pollingStations.filter(s => s.isActive).length}
              </div>
              <div className="text-green-300">모니터링 중</div>
            </div>
            <div className="bg-red-500/20 p-4 rounded-lg text-center border border-red-500/30">
              <div className="text-2xl font-bold text-red-400">
                {pollingStations.filter(s => s.alerts && s.alerts.length > 0).length}
              </div>
              <div className="text-red-300">알림 발생</div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-lg p-6 border border-border">
          <h2 className="text-xl font-bold mb-4">📍 투표소 목록 (처음 20개)</h2>
          
          <div className="space-y-2">
            {pollingStations.map((station, index) => (
              <div 
                key={station.id || index} 
                className="border border-border rounded-lg p-4 hover:bg-muted transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-foreground">{station.name}</h3>
                    <p className="text-muted-foreground text-sm">{station.address}</p>
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                      <span>입장: {station.entryCount || 0}명</span>
                      <span>퇴장: {station.exitCount || 0}명</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      station.isActive 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {station.isActive ? '라이브 중' : '비활성'}
                    </span>
                    
                    {station.coordinates && (
                      <span className="text-xs text-muted-foreground">
                        📍 {station.coordinates.lat.toFixed(4)}, {station.coordinates.lng.toFixed(4)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center">
          <a 
            href="/test" 
            className="inline-block mr-4 px-6 py-2 bg-slate-700 text-white rounded hover:bg-slate-600"
          >
            테스트 페이지
          </a>
          <a 
            href="/" 
            className="inline-block px-6 py-2 bg-slate-800 text-white rounded hover:bg-slate-700"
          >
            지도 포함 메인 페이지
          </a>
        </div>
      </div>
    </div>
  );
} 