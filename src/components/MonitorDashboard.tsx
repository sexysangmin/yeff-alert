'use client';

import { useState, useEffect } from 'react';
import { PollingStation } from '@/types';
import { Search, MapPin, Youtube, Clock, AlertTriangle } from 'lucide-react';

interface MonitorDashboardProps {
  pollingStations: PollingStation[];
  onStationUpdate: (stationId: string, updates: Partial<PollingStation>) => void;
}

export default function MonitorDashboard({ pollingStations, onStationUpdate }: MonitorDashboardProps) {
  const [selectedStation, setSelectedStation] = useState<PollingStation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [morningUrl, setMorningUrl] = useState('');
  const [afternoonUrl, setAfternoonUrl] = useState('');
  
  // 긴급상황 신고 관련
  const [emergencyComment, setEmergencyComment] = useState('');
  const [showEmergencyForm, setShowEmergencyForm] = useState(false);

  // 검색 필터링
  const filteredStations = pollingStations.filter(station =>
    station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    station.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 선택된 투표소 상태 동기화
  useEffect(() => {
    if (selectedStation) {
      const updatedStation = pollingStations.find(s => s.id === selectedStation.id);
      if (updatedStation && updatedStation !== selectedStation) {
        console.log('🔄 선택된 투표소 상태 동기화:', {
          old: selectedStation.isActive,
          new: updatedStation.isActive
        });
        setSelectedStation(updatedStation);
        setMorningUrl(updatedStation.youtubeUrls?.morning || '');
        setAfternoonUrl(updatedStation.youtubeUrls?.afternoon || '');
      }
    }
  }, [pollingStations, selectedStation]);

  const handleStationSelect = (station: PollingStation) => {
    console.log('🎯 투표소 선택:', station.name, 'isActive:', station.isActive);
    setSelectedStation(station);
    setMorningUrl(station.youtubeUrls?.morning || '');
    setAfternoonUrl(station.youtubeUrls?.afternoon || '');
    
    // 긴급상황 폼 초기화
    setShowEmergencyForm(false);
    setEmergencyComment('');
  };

  const handleUrlUpdate = async () => {
    if (!selectedStation) {
      console.error('❌ 선택된 투표소가 없습니다.');
      alert('❌ 투표소를 먼저 선택해주세요.');
      return;
    }
    
    console.log('🔄 유튜브 URL 업데이트 시작:', {
      stationId: selectedStation.id,
      stationName: selectedStation.name,
      morningUrl: morningUrl,
      afternoonUrl: afternoonUrl
    });
    
    // 유튜브 URL 검증
    const validateYouTubeUrl = (url: string) => {
      if (!url.trim()) return true; // 빈 값은 허용
      
      // 더 관대한 유튜브 URL 검증 - 도메인만 확인
      const trimmedUrl = url.trim().toLowerCase();
      return trimmedUrl.includes('youtube.com') || 
             trimmedUrl.includes('youtu.be') ||
             trimmedUrl.includes('youtube');
    };

    const morningUrlTrimmed = morningUrl.trim();
    const afternoonUrlTrimmed = afternoonUrl.trim();

    console.log('🔍 URL 검증:', {
      morningUrlTrimmed,
      afternoonUrlTrimmed,
      morningValid: validateYouTubeUrl(morningUrlTrimmed),
      afternoonValid: validateYouTubeUrl(afternoonUrlTrimmed)
    });

    // URL 검증
    if (morningUrlTrimmed && !validateYouTubeUrl(morningUrlTrimmed)) {
      console.error('❌ 오전 유튜브 링크 검증 실패:', morningUrlTrimmed);
      alert('❌ 오전 유튜브 링크가 올바르지 않습니다. YouTube URL을 확인해주세요.');
      return;
    }

    if (afternoonUrlTrimmed && !validateYouTubeUrl(afternoonUrlTrimmed)) {
      console.error('❌ 오후 유튜브 링크 검증 실패:', afternoonUrlTrimmed);
      alert('❌ 오후 유튜브 링크가 올바르지 않습니다. YouTube URL을 확인해주세요.');
      return;
    }
    
    const hasUrls = !!(morningUrlTrimmed || afternoonUrlTrimmed);
    console.log('📊 URL 상태:', { hasUrls, morningUrlTrimmed, afternoonUrlTrimmed });
    
    const updates = {
      youtubeUrls: {
        morning: morningUrlTrimmed,
        afternoon: afternoonUrlTrimmed
      },
      isActive: hasUrls,
      lastUpdated: new Date()
    };
    
    console.log('🔄 API로 투표소 업데이트 시도:', {
      stationId: selectedStation.id,
      stationName: selectedStation.name,
      updates
    });
    
    try {
      console.log('🌐 API 요청 시작...');
      
      const response = await fetch('/api/stations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store',
        body: JSON.stringify({
          stationId: selectedStation.id,
          updates: {
            youtubeUrls: {
              morning: morningUrlTrimmed,
              afternoon: afternoonUrlTrimmed
            }
          }
        })
      });

      console.log('📡 API 응답 상태:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API 오류 ${response.status}: ${errorData.error || '알 수 없는 오류'}`);
      }

      const result = await response.json();
      console.log('✅ API 응답 성공:', result);

      // 성공 시 등록시간을 localStorage에 저장
      const now = new Date().toISOString();
      if (morningUrlTrimmed) {
        localStorage.setItem(`youtube_${selectedStation.id}_morning_registered_at`, now);
        console.log('💾 오전 유튜브 등록시간 저장:', now);
      }
      if (afternoonUrlTrimmed) {
        localStorage.setItem(`youtube_${selectedStation.id}_afternoon_registered_at`, now);
        console.log('💾 오후 유튜브 등록시간 저장:', now);
      }
      
      // 링크가 제거된 경우 등록시간도 제거
      if (!morningUrlTrimmed) {
        localStorage.removeItem(`youtube_${selectedStation.id}_morning_registered_at`);
        console.log('🗑️ 오전 유튜브 등록시간 제거');
      }
      if (!afternoonUrlTrimmed) {
        localStorage.removeItem(`youtube_${selectedStation.id}_afternoon_registered_at`);
        console.log('🗑️ 오후 유튜브 등록시간 제거');
      }

      // 성공 시 즉시 데이터 새로고침
      console.log('🔄 데이터 강제 새로고침...');
      window.location.reload();

      if (hasUrls) {
        alert('✅ 유튜브 링크가 성공적으로 등록되었습니다!')
      } else {
        alert('✅ 유튜브 링크가 성공적으로 제거되었습니다!')
      }
    } catch (error: unknown) {
      console.error('❌ API 업데이트 실패:', error);
      
      // API 실패 시 로컬 상태만 업데이트
      onStationUpdate(selectedStation.id, updates);
      
      if (hasUrls) {
        alert('⚠️ 유튜브 링크가 임시로 등록되었습니다. (서버 동기화 필요)\n\n에러: ' + (error instanceof Error ? error.message : String(error)));
      } else {
        alert('⚠️ 유튜브 링크가 임시로 제거되었습니다. (서버 동기화 필요)\n\n에러: ' + (error instanceof Error ? error.message : String(error)));
      }
    }
  };

  const handleEmergencyAlert = async () => {
    if (!selectedStation) return;
    
    console.log('🚨 API로 긴급 알림 생성 시도');
    
    try {
      // API로 알림 생성
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pollingStationId: selectedStation.id,
          type: 'emergency',
          message: '긴급상황 발생',
          comment: emergencyComment || null,
          adminId: 'current_admin'
        })
      });

      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ API 알림 생성 성공:', result);
      
      // 로컬 상태에 새 알림 추가
      const newAlert = {
        id: result.data.id,
        pollingStationId: selectedStation.id,
        type: 'emergency' as const,
        message: '긴급상황 발생',
        comment: emergencyComment || undefined,
        timestamp: new Date(result.data.timestamp),
        adminId: 'current_admin',
        resolved: false
      };
      
      const updates = {
        alerts: [...selectedStation.alerts, newAlert]
      };
      
      onStationUpdate(selectedStation.id, updates);
      setShowEmergencyForm(false);
      setEmergencyComment('');
      alert('✅ 긴급 알림이 성공적으로 발송되었습니다!');
      
    } catch (error) {
      console.error('❌ API 알림 생성 실패:', error);
      
      // API 실패 시 로컬에만 추가
      const newAlert = {
        id: `alert_${Date.now()}`,
        pollingStationId: selectedStation.id,
        type: 'emergency' as const,
        message: '긴급상황 발생',
        comment: emergencyComment || undefined,
        timestamp: new Date(),
        adminId: 'current_admin',
        resolved: false
      };
      
      const updates = {
        alerts: [...selectedStation.alerts, newAlert]
      };
      
      onStationUpdate(selectedStation.id, updates);
      setShowEmergencyForm(false);
      setEmergencyComment('');
      alert('⚠️ 긴급 알림이 임시로 생성되었습니다. (서버 동기화 필요)');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">감시단 대시보드</h1>
          <p className="text-muted-foreground">투표소를 선택하고 유튜브 라이브 링크를 등록하세요.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 투표소 목록 */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">투표소 목록</h2>
              <div className="text-sm text-muted-foreground">
                총 {pollingStations.length}개 / 표시 {filteredStations.length}개
              </div>
            </div>
            
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="투표소 검색..."
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {searchQuery.trim() && (
                <div className="mt-2 text-xs text-muted-foreground">
                  '{searchQuery}' 검색 결과: {filteredStations.length}개 투표소
                </div>
              )}
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto border border-border/50 rounded-md p-2 bg-background/50">
              {filteredStations.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {searchQuery.trim() 
                    ? `'${searchQuery}' 검색 결과가 없습니다.`
                    : '투표소 데이터를 불러오는 중...'
                  }
                </div>
              ) : (
                <>
                  {filteredStations.length > 10 && (
                    <div className="text-xs text-muted-foreground text-center pb-2 border-b border-border/30 mb-2">
                      📜 스크롤하여 더 많은 투표소를 확인하세요
                    </div>
                  )}
                  {filteredStations.map((station) => (
                    <div
                      key={station.id}
                      onClick={() => handleStationSelect(station)}
                      className={`p-3 rounded-md border cursor-pointer transition-colors ${
                        selectedStation?.id === station.id
                          ? 'bg-primary/10 border-primary'
                          : 'bg-background border-border hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-foreground">{station.name}</h3>
                          <p className="text-sm text-muted-foreground flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {station.address}
                          </p>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          {station.isActive && (
                            <span className="text-xs px-2 py-1 bg-green-600 text-white rounded">
                              활성
                            </span>
                          )}
                          {station.alerts.some(alert => !alert.resolved) && (
                            <span className="text-xs px-2 py-1 bg-red-600 text-white rounded">
                              알림
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* 설정 패널 */}
          <div className="bg-card border border-border rounded-lg p-6">
            {selectedStation ? (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  {selectedStation.name} 설정
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <Clock className="inline h-4 w-4 mr-1" />
                      오전 유튜브 라이브 링크
                    </label>
                    <input
                      type="url"
                      value={morningUrl}
                      onChange={(e) => setMorningUrl(e.target.value)}
                      placeholder="유튜브 주소"
                      className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <Clock className="inline h-4 w-4 mr-1" />
                      오후 유튜브 라이브 링크
                    </label>
                    <input
                      type="url"
                      value={afternoonUrl}
                      onChange={(e) => setAfternoonUrl(e.target.value)}
                      placeholder="유튜브 주소"
                      className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <button
                    onClick={handleUrlUpdate}
                    className={`w-full py-2 rounded-md font-medium transition-colors flex items-center justify-center ${
                      (morningUrl.trim() || afternoonUrl.trim()) 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    <Youtube className="h-4 w-4 mr-2" />
                    {(morningUrl.trim() || afternoonUrl.trim()) ? '링크 등록 (활성화)' : '링크 제거 (비활성화)'}
                  </button>

                  <div className="pt-4 border-t border-border">
                    {!showEmergencyForm ? (
                      <button
                        onClick={() => setShowEmergencyForm(true)}
                        className="w-full bg-destructive text-destructive-foreground py-2 rounded-md font-medium hover:bg-destructive/90 transition-colors flex items-center justify-center"
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        긴급상황 신고
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-foreground">
                          긴급상황 코멘트
                        </label>
                        <textarea
                          value={emergencyComment}
                          onChange={(e) => setEmergencyComment(e.target.value)}
                          placeholder="긴급상황에 대한 상세 설명을 입력하세요..."
                          rows={3}
                          className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleEmergencyAlert}
                            className="flex-1 bg-destructive text-destructive-foreground py-2 rounded-md font-medium hover:bg-destructive/90 transition-colors"
                          >
                            신고 전송
                          </button>
                          <button
                            onClick={() => {
                              setShowEmergencyForm(false);
                              setEmergencyComment('');
                            }}
                            className="flex-1 bg-muted text-muted-foreground py-2 rounded-md font-medium hover:bg-muted/80 transition-colors"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border">
                  <h3 className="font-medium text-foreground mb-2">현재 상태</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">활성 상태:</span>
                      <div className="flex items-center gap-2">
                        <span className={selectedStation.isActive ? 'text-green-500' : 'text-red-500'}>
                          {selectedStation.isActive ? '활성' : '비활성'}
                        </span>
                        {(morningUrl.trim() || afternoonUrl.trim()) && !selectedStation.isActive && (
                          <span className="text-xs text-amber-500 animate-pulse">
                            → 등록시 활성화됨
                          </span>
                        )}
                        {!(morningUrl.trim() || afternoonUrl.trim()) && selectedStation.isActive && (
                          <span className="text-xs text-red-500 animate-pulse">
                            → 등록시 비활성화됨
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">영상 링크:</span>
                      <span className="text-foreground">
                        {(morningUrl.trim() || afternoonUrl.trim()) ? 
                          `${morningUrl.trim() ? '오전' : ''}${morningUrl.trim() && afternoonUrl.trim() ? '+' : ''}${afternoonUrl.trim() ? '오후' : ''}` : 
                          '없음'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">알림 개수:</span>
                      <span className="text-foreground">
                        {selectedStation.alerts.filter(alert => !alert.resolved).length}건
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>투표소를 선택하여 설정을 시작하세요.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 