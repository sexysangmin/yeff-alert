'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import SearchBar from '@/components/SearchBar';
import SearchResults from '@/components/SearchResults';
import AlertsList from '@/components/AlertsList';
import ClusteredMap from '@/components/ClusteredMap';
import PollingStationDetail from '@/components/PollingStationDetail';
import MonitorLoginModal from '@/components/MonitorLoginModal';
import MonitorDashboard from '@/components/MonitorDashboard';
import NoSSR from '@/components/NoSSR';
import { PollingStation } from '@/types';

export default function Home() {
  const [pollingStations, setPollingStations] = useState<PollingStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<PollingStation | null>(null);
  const [isMonitorLoginOpen, setIsMonitorLoginOpen] = useState(false);
  const [isMonitorMode, setIsMonitorMode] = useState(false);
  const [filteredStations, setFilteredStations] = useState<PollingStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isClient, setIsClient] = useState(false);
  const [showMonitoring, setShowMonitoring] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [showMap, setShowMap] = useState(true);

  // 클라이언트 사이드 렌더링 확인
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Hydration 에러 방지를 위한 추가 체크
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // 투표소 데이터 로드
  useEffect(() => {
    const loadPollingStations = async () => {
      try {
        console.log('🔄 API에서 투표소 데이터 로드 중...');
        
        // 환경 변수 확인
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const isSupabaseConfigured = supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co';
        
        if (!isSupabaseConfigured) {
          console.log('⚠️ Supabase 미설정, JSON 데이터 직접 로드');
          throw new Error('Supabase 설정 필요');
        }
        
        // API에서 데이터 로드 시도
        const response = await fetch('/api/stations');
        
        if (!response.ok) {
          throw new Error(`API 오류: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ API 데이터 로드 완료:', data.length, '개 투표소');
        
        setPollingStations(data);
        setFilteredStations(data);
        setIsLoading(false);
        
      } catch (error) {
        console.error('❌ API 데이터 로드 실패, JSON 폴백 시도:', error);
        
        try {
          // API 실패 시 JSON 파일 폴백
          const response = await fetch('/data/polling_stations_complete_all.json');
          if (!response.ok) {
            const backupResponse = await fetch('/data/polling_stations_partial_1800.json');
            if (!backupResponse.ok) {
              throw new Error('JSON 데이터도 불러올 수 없습니다.');
            }
            const backupData = await backupResponse.json();
            const processedBackupData = (backupData as PollingStation[]).map((station) => ({
              ...station,
              lastUpdated: station.lastUpdated ? new Date(station.lastUpdated instanceof Date ? station.lastUpdated.toISOString() : String(station.lastUpdated)) : new Date('2025-01-27T10:00:00.000Z'),
              alerts: (station.alerts || []).map((alert) => ({
                ...alert,
                timestamp: alert.timestamp ? new Date(alert.timestamp instanceof Date ? alert.timestamp.toISOString() : String(alert.timestamp)) : new Date('2025-01-27T10:00:00.000Z')
              }))
            }));
            setPollingStations(processedBackupData);
            setFilteredStations(processedBackupData);
            setIsLoading(false);
            return;
          }
          
          const jsonData = await response.json();
          console.log('📄 JSON 폴백 데이터 로드:', jsonData.length, '개 투표소');
          
          const processedData = (jsonData as PollingStation[]).map((station) => ({
            ...station,
            lastUpdated: station.lastUpdated ? new Date(station.lastUpdated instanceof Date ? station.lastUpdated.toISOString() : String(station.lastUpdated)) : new Date('2025-01-27T10:00:00.000Z'),
            alerts: (station.alerts || []).map((alert) => ({
              ...alert,
              timestamp: alert.timestamp ? new Date(alert.timestamp instanceof Date ? alert.timestamp.toISOString() : String(alert.timestamp)) : new Date('2025-01-27T10:00:00.000Z')
            }))
          }));
          
          setPollingStations(processedData);
          setFilteredStations(processedData);
          setIsLoading(false);
          
        } catch (fallbackError) {
          console.error('❌ JSON 폴백도 실패, 목 데이터 사용:', fallbackError);
          
          // 최종 폴백: 목 데이터
          const mockData: PollingStation[] = [
            {
              id: "station_1",
              name: "청운효자동사전투표소",
              address: "서울 종로구 청운효자동",
              district: "서울",
              coordinates: { lat: 37.5857308, lng: 126.9695124 },
              isActive: false,
              entryCount: 0,
              exitCount: 0,
              lastUpdated: new Date('2025-01-27T10:00:00.000Z'),
              alerts: [],
              youtubeUrls: { morning: "", afternoon: "" }
            }
          ];
          
          setPollingStations(mockData);
          setFilteredStations(mockData);
          setIsLoading(false);
        }
      }
    };

    loadPollingStations();
  }, []);

  // 검색 핸들러
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredStations(pollingStations);
      return;
    }
    
    const filtered = pollingStations.filter(station =>
      station.name.toLowerCase().includes(query.toLowerCase()) ||
      station.address.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredStations(filtered);
  };

  // 필터 핸들러
  const handleFilter = (filters: { status: string }) => {
    let filtered = pollingStations;
    
    // 먼저 검색어가 있다면 검색 필터 적용
    if (searchQuery.trim()) {
      filtered = filtered.filter(station =>
        station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        station.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // 상태 필터 적용
    if (filters.status !== 'all') {
      switch (filters.status) {
        case 'active':
          filtered = filtered.filter(station => station.isActive);
          break;
        case 'inactive':
          filtered = filtered.filter(station => !station.isActive);
          break;
        case 'alert':
          filtered = filtered.filter(station => 
            station.alerts.some(alert => !alert.resolved)
          );
          break;
      }
    }
    
    setFilteredStations(filtered);
  };

  // 투표소 선택 핸들러
  const handleStationSelect = (station: PollingStation) => {
    setSelectedStation(station);
  };

  // 감시단 로그인 핸들러
  const handleMonitorLogin = (isAuthenticated: boolean) => {
    setIsMonitorMode(isAuthenticated);
  };

  // 홈으로 돌아가기 핸들러
  const handleHomeClick = () => {
    setIsMonitorMode(false);
    setSelectedStation(null);
  };

  // 투표소 업데이트 핸들러 (감시단용)
  const handleStationUpdate = (stationId: string, updates: Partial<PollingStation>) => {
    console.log('📝 page.tsx - 투표소 업데이트 받음:', {
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
      
      const updatedStation = updated.find(s => s.id === stationId);
      console.log('🔄 pollingStations 업데이트 완료:', {
        stationId,
        oldActive: prev.find(s => s.id === stationId)?.isActive,
        newActive: updatedStation?.isActive
      });
      
      return updated;
    });
    
    setFilteredStations(prev => {
      const updated = prev.map(station =>
        station.id === stationId
          ? { ...station, ...updates }
          : station
      );
      
      const updatedStation = updated.find(s => s.id === stationId);
      console.log('🔄 filteredStations 업데이트 완료:', {
        stationId,
        newActive: updatedStation?.isActive
      });
      
      return updated;
    });
  };

  // 로딩 중이거나 클라이언트가 준비되지 않았을 때
  if (isLoading || !isClient || !mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">투표소 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 감시단 모드일 때 다른 화면 표시
  if (isMonitorMode) {
    return (
      <div className="min-h-screen bg-background">
        <Header 
          onHomeClick={handleHomeClick} 
          onMonitorClick={() => setIsMonitorLoginOpen(true)}
        />
        <MonitorDashboard 
          pollingStations={pollingStations}
          onStationUpdate={handleStationUpdate}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header 
        onHomeClick={handleHomeClick} 
        onMonitorClick={() => setIsMonitorLoginOpen(true)}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:py-20 flex-1 flex flex-col justify-center">
        {/* 히어로 섹션 */}
        <div className="text-center mb-4">
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground mb-4 lg:mb-6">
            전국 투표소 실시간 모니터링
          </h1>
          <p className="text-xl md:text-2xl lg:text-3xl text-muted-foreground mb-8 lg:mb-10">
            투명하고 공정한 선거를 위한 시민 감시 시스템
          </p>
          
          {/* 검색바 */}
          <div className="mb-6">
                        <SearchBar 
              onSearch={handleSearch} 
              onFilter={handleFilter}
              pollingStations={pollingStations}
              currentFilter={currentFilter}
              showMap={showMap}
              onToggleMap={() => setShowMap(!showMap)}
              onShowMonitoring={() => {
                setShowMonitoring(true);
                setShowAlerts(false);
                setShowInactive(false);
                setCurrentFilter('active');
              }}
              onShowAlerts={() => {
                setShowAlerts(true);
                setShowMonitoring(false);
                setShowInactive(false);
                setCurrentFilter('alert');
              }}
              onShowInactive={() => {
                setShowInactive(true);
                setShowMonitoring(false);
                setShowAlerts(false);
                setCurrentFilter('inactive');
              }}
              onClearLists={() => {
                setShowMonitoring(false);
                setShowAlerts(false);
                setShowInactive(false);
                setCurrentFilter('all');
              }}
            />
          </div>
        </div>

        {/* 검색 결과 */}
        <SearchResults
          stations={filteredStations}
          onStationSelect={handleStationSelect}
          isVisible={searchQuery.trim().length > 0}
        />

        {/* 조건부 알림 및 모니터링 목록 */}
        {(showMonitoring || showAlerts || showInactive) && (
          <AlertsList
            pollingStations={pollingStations}
            onStationSelect={handleStationSelect}
            onAlertsViewed={() => setShowAlerts(false)}
            showMonitoring={showMonitoring}
            showAlerts={showAlerts}
            showInactive={showInactive}
            onClose={() => {
              setShowMonitoring(false);
              setShowAlerts(false);
              setShowInactive(false);
            }}
          />
        )}

        {/* 지도 */}
        {showMap && (
          <div className="mb-8 transition-all duration-500 ease-in-out animate-fade-in">
            <div className="bg-card/30 rounded-lg shadow-sm p-3 mb-3 border border-border">
              <h2 className="text-xl font-bold text-foreground">🗺️ 투표소 지도</h2>
              <p className="text-muted-foreground text-sm mt-1 font-medium">
                🎯 원하는 지역을 줌인하거나 클릭하여 투표소를 확인하세요
              </p>
            </div>
            
            <NoSSR
              fallback={
                <div className="h-[600px] bg-secondary rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-muted-foreground">클러스터링 지도 로딩 중...</p>
                  </div>
                </div>
              }
            >
              <ClusteredMap
                pollingStations={filteredStations}
                onStationSelect={handleStationSelect}
                selectedStation={selectedStation || undefined}
              />
            </NoSSR>
          </div>
        )}

        {/* 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card/50 border border-border rounded-lg p-6 text-center shadow-lg hover:bg-card/70 transition-colors">
            <h3 className="text-2xl font-bold text-foreground">{pollingStations.length}</h3>
            <p className="text-muted-foreground">총 투표소</p>
          </div>
          <button
            onClick={() => {
              const newShowMonitoring = !showMonitoring;
              setShowMonitoring(newShowMonitoring);
              setShowAlerts(false);
              setShowInactive(false);
              
              // 검색바 필터도 동기화
              if (newShowMonitoring) {
                setCurrentFilter('active');
                handleFilter({ status: 'active' });
              } else {
                setCurrentFilter('all');
                handleFilter({ status: 'all' });
              }
            }}
            className={`bg-card/50 border border-border rounded-lg p-6 text-center shadow-lg hover:bg-card/70 transition-all cursor-pointer ${
              showMonitoring ? 'ring-2 ring-emerald-500 bg-emerald-50' : ''
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <h3 className="text-2xl font-bold text-emerald-500">
                {pollingStations.filter(s => s.isActive).length}
              </h3>
              {pollingStations.filter(s => s.isActive).length > 0 && (
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
              )}
            </div>
            <p className="text-muted-foreground">모니터링 중</p>
            {pollingStations.filter(s => s.isActive).length > 0 && (
              <p className="text-xs text-emerald-600 mt-1">클릭하여 목록 보기</p>
            )}
          </button>
          <button
            onClick={() => {
              const newShowAlerts = !showAlerts;
              setShowAlerts(newShowAlerts);
              setShowMonitoring(false);
              setShowInactive(false);
              
              // 검색바 필터도 동기화
              if (newShowAlerts) {
                setCurrentFilter('alert');
                handleFilter({ status: 'alert' });
              } else {
                setCurrentFilter('all');
                handleFilter({ status: 'all' });
              }
            }}
            className={`bg-card/50 border border-border rounded-lg p-6 text-center shadow-lg hover:bg-card/70 transition-all cursor-pointer ${
              showAlerts ? 'ring-2 ring-red-500 bg-red-50' : ''
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <h3 className={`text-2xl font-bold ${
                pollingStations.filter(s => s.alerts.some(a => !a.resolved)).length > 0 
                  ? 'text-red-500 animate-pulse' 
                  : 'text-amber-500'
              }`}>
                {pollingStations.filter(s => s.alerts.some(a => !a.resolved)).length}
              </h3>
              {pollingStations.filter(s => s.alerts.some(a => !a.resolved)).length > 0 && (
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              )}
            </div>
            <p className="text-muted-foreground">알림 발생</p>
            {pollingStations.filter(s => s.alerts.some(a => !a.resolved)).length > 0 && (
              <p className="text-xs text-red-600 mt-1">클릭하여 목록 보기</p>
            )}
          </button>
        </div>
      </main>

      {/* 모달들 */}
      {selectedStation && (
        <PollingStationDetail
          station={selectedStation}
          onClose={() => setSelectedStation(null)}
        />
      )}

      <MonitorLoginModal
        isOpen={isMonitorLoginOpen}
        onClose={() => setIsMonitorLoginOpen(false)}
        onLogin={handleMonitorLogin}
      />
    </div>
  );
}
