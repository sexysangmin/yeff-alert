'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import SearchBar from '@/components/SearchBar';
import SearchResults from '@/components/SearchResults';
import AlertsList from '@/components/AlertsList';
import ClusteredMap from '@/components/ClusteredMap';
import PollingStationDetail from '@/components/PollingStationDetail';
import VideoRegistrationModal from '@/components/VideoRegistrationModal';
import NoSSR from '@/components/NoSSR';
import { PollingStation } from '@/types';

// 지도 컴포넌트를 동적 로딩으로 최적화
const ClusteredMapComponent = dynamic(() => import('@/components/ClusteredMap'), {
  loading: () => (
    <div className="h-[600px] bg-secondary rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-muted-foreground">지도 로딩 중...</p>
      </div>
    </div>
  ),
  ssr: false
});

const NoSSRComponent = dynamic(() => import('@/components/NoSSR'), { ssr: false });

export default function Home() {
  const [pollingStations, setPollingStations] = useState<PollingStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<PollingStation | null>(null);
  const [isVideoRegistrationOpen, setIsVideoRegistrationOpen] = useState(false);
  const [filteredStations, setFilteredStations] = useState<PollingStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isClient, setIsClient] = useState(false);
  const [showMonitoring, setShowMonitoring] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [showMap, setShowMap] = useState(false);

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
        
        // 데이터 분석
        if (data.length > 0) {
          console.log(`🔍 로드된 첫 번째: ${data[0]?.name} (ID: ${data[0]?.id})`);
          console.log(`🔍 로드된 마지막: ${data[data.length - 1]?.name} (ID: ${data[data.length - 1]?.id})`);
          
          // ID 범위 확인
          const ids = data.map((station: any) => {
            const match = station.id.match(/station_(\d+)/);
            return match ? parseInt(match[1]) : 0;
          }).filter((id: number) => id > 0);
          
          if (ids.length > 0) {
            const minId = Math.min(...ids);
            const maxId = Math.max(...ids);
            console.log(`📊 ID 범위: ${minId} ~ ${maxId} (총 ${ids.length}개)`);
          }
        }
        
        setPollingStations(data);
        setFilteredStations(data);
        setIsLoading(false);
        
        // 중복 ID 체크
        const ids = data.map((station: any) => station.id);
        const duplicateIds = ids.filter((id: string, index: number) => ids.indexOf(id) !== index);
        if (duplicateIds.length > 0) {
          console.warn('⚠️ 중복된 투표소 ID 발견:', duplicateIds);
          
          // 중복 제거
          const uniqueData = data.filter((station: any, index: number) => 
            ids.indexOf(station.id) === index
          );
          console.log('🔧 중복 제거 후:', uniqueData.length, '개 투표소');
          setPollingStations(uniqueData);
          setFilteredStations(uniqueData);
        }
        
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
            
            // 중복 ID 체크 및 제거
            const backupIds = processedBackupData.map(station => station.id);
            const backupDuplicateIds = backupIds.filter((id, index) => backupIds.indexOf(id) !== index);
            if (backupDuplicateIds.length > 0) {
              console.warn('⚠️ 백업 데이터에 중복된 투표소 ID 발견:', backupDuplicateIds);
              const uniqueBackupData = processedBackupData.filter((station, index) => 
                backupIds.indexOf(station.id) === index
              );
              console.log('🔧 백업 중복 제거 후:', uniqueBackupData.length, '개 투표소');
              setPollingStations(uniqueBackupData);
              setFilteredStations(uniqueBackupData);
            } else {
              setPollingStations(processedBackupData);
              setFilteredStations(processedBackupData);
            }
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
          
          // 중복 ID 체크 및 제거
          const ids = processedData.map(station => station.id);
          const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
          if (duplicateIds.length > 0) {
            console.warn('⚠️ JSON 데이터에 중복된 투표소 ID 발견:', duplicateIds);
            const uniqueData = processedData.filter((station, index) => 
              ids.indexOf(station.id) === index
            );
            console.log('🔧 JSON 중복 제거 후:', uniqueData.length, '개 투표소');
            setPollingStations(uniqueData);
            setFilteredStations(uniqueData);
          } else {
            setPollingStations(processedData);
            setFilteredStations(processedData);
          }
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
  const handleSearch = useCallback((query: string) => {
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
  }, [pollingStations]);

  // 필터 핸들러
  const handleFilter = useCallback((filters: { status: string }) => {
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
  }, [pollingStations, searchQuery]);

  // 투표소 선택 핸들러
  const handleStationSelect = useCallback((station: PollingStation) => {
    setSelectedStation(station);
  }, []);

  // 통계 데이터 메모이제이션
  const stats = useMemo(() => ({
    total: pollingStations.length,
    active: pollingStations.filter(s => s.isActive).length,
    alerts: pollingStations.filter(s => s.alerts.some(a => !a.resolved)).length
  }), [pollingStations]);

  // 로딩 중이거나 클라이언트가 준비되지 않았을 때
  if (isLoading || !isClient || !mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            투표소 정보를 불러오는 중...
          </h2>
          <p className="text-muted-foreground">
            전국 투표소 데이터를 안전하게 로드하고 있습니다.
          </p>
          <div className="mt-4 text-sm text-muted-foreground">
            ⏱️ 초기 로딩은 약 10-15초 소요됩니다
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header 
        onVideoRegistrationClick={() => setIsVideoRegistrationOpen(true)}
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
            
            <NoSSRComponent
              fallback={
                <div className="h-[600px] bg-secondary rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-muted-foreground">클러스터링 지도 로딩 중...</p>
                  </div>
                </div>
              }
            >
              <ClusteredMapComponent
                pollingStations={filteredStations}
                onStationSelect={handleStationSelect}
                selectedStation={selectedStation || undefined}
              />
            </NoSSRComponent>
          </div>
        )}

        {/* 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card/50 border border-border rounded-lg p-6 text-center shadow-lg hover:bg-card/70 transition-colors">
            <p className="text-muted-foreground mb-2">총 투표소</p>
            <h3 className="text-2xl font-bold text-foreground">{stats.total}</h3>
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
                {stats.active}
              </h3>
              {stats.active > 0 && (
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
              )}
            </div>
            <p className="text-muted-foreground">모니터링 중</p>
            {stats.active > 0 && (
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
                stats.alerts > 0 
                  ? 'text-red-500 animate-pulse' 
                  : 'text-amber-500'
              }`}>
                {stats.alerts}
              </h3>
              {stats.alerts > 0 && (
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              )}
            </div>
            <p className="text-muted-foreground">알림 발생</p>
            {stats.alerts > 0 && (
              <p className="text-xs text-red-600 mt-1">클릭하여 목록 보기</p>
            )}
          </button>
        </div>
      </main>

      {/* 연락처 정보 */}
      <footer className="bg-card/30 border-t border-border py-4">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            🛠️ 사이트 오류 또는 문의사항: <a href="tel:01024635035" className="text-primary hover:underline font-medium">010-2463-5035</a> (사이트 관리자)
          </p>
        </div>
      </footer>

      {/* 모달들 */}
      {selectedStation && (
        <PollingStationDetail
          station={selectedStation}
          onClose={() => setSelectedStation(null)}
        />
      )}

      <VideoRegistrationModal
        isOpen={isVideoRegistrationOpen}
        onClose={() => setIsVideoRegistrationOpen(false)}
      />
    </div>
  );
}
