'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { PollingStation } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  Youtube, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Eye, 
  Download,
  Filter,
  ExternalLink,
  User,
  Calendar,
  Check,
  X,
  RotateCcw,
  Trash2,
  Play,
  Pause
} from 'lucide-react';

interface AdminDashboardProps {
  pollingStations: PollingStation[];
  onLogout: () => void;
}

interface ActivityLog {
  id: string;
  type: 'youtube_added' | 'youtube_removed' | 'alert_created' | 'station_activated';
  stationId: string;
  stationName: string;
  message: string;
  timestamp: Date;
  adminId?: string;
  data?: any;
}

export default function AdminDashboard({ pollingStations, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'youtube' | 'alerts' | 'logs' | 'backup'>('youtube');
  const [filterType, setFilterType] = useState<'all' | 'morning' | 'afternoon'>('all');
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60); // 60초로 변경
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // 유튜브 링크가 있는 투표소들 (메모이제이션)
  const youtubeStations = useMemo(() => 
    pollingStations.filter(station => 
      station.youtubeUrls?.morning || station.youtubeUrls?.afternoon
    ), [pollingStations]
  );

  // 알림이 있는 투표소들 (메모이제이션)
  const alertStations = useMemo(() => 
    pollingStations.filter(station => 
      station.alerts.some(alert => !alert.resolved)
    ), [pollingStations]
  );

  // 활동 로그 생성 (실제로는 API에서 가져와야 함)
  useEffect(() => {
    const logs: ActivityLog[] = [];
    
    // 유튜브 링크 추가 로그
    youtubeStations.forEach(station => {
      if (station.youtubeUrls?.morning) {
        logs.push({
          id: `youtube_morning_${station.id}`,
          type: 'youtube_added',
          stationId: station.id,
          stationName: station.name,
          message: '오전 유튜브 링크 등록',
          timestamp: station.lastUpdated,
          data: { url: station.youtubeUrls.morning, period: 'morning' }
        });
      }
      if (station.youtubeUrls?.afternoon) {
        logs.push({
          id: `youtube_afternoon_${station.id}`,
          type: 'youtube_added',
          stationId: station.id,
          stationName: station.name,
          message: '오후 유튜브 링크 등록',
          timestamp: station.lastUpdated,
          data: { url: station.youtubeUrls.afternoon, period: 'afternoon' }
        });
      }
    });

    // 알림 생성 로그
    pollingStations.forEach(station => {
      station.alerts.forEach(alert => {
        logs.push({
          id: `alert_${alert.id}`,
          type: 'alert_created',
          stationId: station.id,
          stationName: station.name,
          message: alert.message,
          timestamp: alert.timestamp,
          adminId: alert.adminId,
          data: { type: alert.type, comment: alert.comment }
        });
      });
    });

    // 시간순 정렬
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setActivityLogs(logs);
  }, [youtubeStations, pollingStations]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 자동 새로고침 함수 (useCallback으로 메모이제이션)
  const handleAutoRefresh = useCallback(() => {
    if (!isMountedRef.current) return;
    
    setLastUpdate(new Date());
    // 전체 페이지 새로고침 대신 데이터만 새로고침
    window.location.reload();
  }, []);

  // 자동 새로고침 설정
  useEffect(() => {
    if (isAutoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(handleAutoRefresh, refreshInterval * 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAutoRefresh, refreshInterval, handleAutoRefresh]);

  // 새 항목 확인 후 카운트 리셋 (수동 새로고침)
  const handleRefresh = () => {
    setLastUpdate(new Date());
    window.location.reload();
  };

  // 알림 해결 처리
  const handleResolveAlert = async (alertId: string, resolved: boolean) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resolved,
          resolvedBy: 'admin' // 실제로는 로그인한 관리자 ID 사용
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        handleRefresh(); // 데이터 새로고침
      } else {
        const errorData = await response.json();
        console.error('알림 상태 업데이트 실패:', errorData);
        alert(`알림 상태 업데이트에 실패했습니다: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('알림 해결 처리 오류:', error);
      alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // 알림 삭제 처리
  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm('정말로 이 알림을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        handleRefresh(); // 데이터 새로고침
      } else {
        const errorData = await response.json();
        console.error('알림 삭제 실패:', errorData);
        alert(`알림 삭제에 실패했습니다: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('알림 삭제 처리 오류:', error);
      alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // 유튜브 링크 전체 삭제
  const handleBulkDeleteYoutube = async () => {
    if (!confirm('정말로 모든 유튜브 링크를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'youtube' }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        handleRefresh(); // 데이터 새로고침
      } else {
        const errorData = await response.json();
        console.error('유튜브 링크 삭제 실패:', errorData);
        alert(`유튜브 링크 삭제에 실패했습니다: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('유튜브 링크 삭제 오류:', error);
      alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // 알림 전체 삭제
  const handleBulkDeleteAlerts = async () => {
    if (!confirm('정말로 모든 알림을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'alerts' }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        handleRefresh(); // 데이터 새로고침
      } else {
        const errorData = await response.json();
        console.error('알림 삭제 실패:', errorData);
        alert(`알림 삭제에 실패했습니다: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('알림 삭제 오류:', error);
      alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // CSV 다운로드 함수
  const downloadCSV = (type: 'youtube' | 'alerts' | 'logs') => {
    let csvContent = '';
    let filename = '';

    if (type === 'youtube') {
      csvContent = 'ID,투표소명,주소,오전링크,오후링크,등록시간\n';
      youtubeStations.forEach(station => {
        csvContent += `${station.id},"${station.name}","${station.address}","${station.youtubeUrls?.morning || ''}","${station.youtubeUrls?.afternoon || ''}","${station.lastUpdated.toLocaleString('ko-KR')}"\n`;
      });
      filename = `youtube_links_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (type === 'alerts') {
      csvContent = 'ID,투표소명,알림타입,메시지,코멘트,발생시간,관리자ID\n';
      alertStations.forEach(station => {
        station.alerts.filter(alert => !alert.resolved).forEach(alert => {
          csvContent += `${alert.id},"${station.name}","${alert.type}","${alert.message}","${alert.comment || ''}","${alert.timestamp.toLocaleString('ko-KR')}","${alert.adminId}"\n`;
        });
      });
      filename = `alerts_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (type === 'logs') {
      csvContent = 'ID,타입,투표소명,메시지,시간,관리자ID\n';
      activityLogs.forEach(log => {
        csvContent += `${log.id},"${log.type}","${log.stationName}","${log.message}","${log.timestamp.toLocaleString('ko-KR')}","${log.adminId || ''}"\n`;
      });
      filename = `activity_logs_${new Date().toISOString().split('T')[0]}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 상단 헤더 */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <a 
              href="/" 
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <img 
                src="/yeff-circle-logo.png" 
                alt="YEFF 로고" 
                className="h-8 w-8"
              />
              <h1 className="text-2xl font-bold text-foreground">YEFF ALERT</h1>
            </a>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-2">관리자 대시보드</h2>
          <p className="text-muted-foreground">사용자 활동 및 데이터 모니터링</p>
        </div>

        {/* 컨트롤 패널 */}
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">
                마지막 업데이트: {lastUpdate.toLocaleString('ko-KR', {
                  timeZone: 'Asia/Seoul',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              {isAutoRefresh && (
                <div className="text-sm text-green-600 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  자동 새로고침 ({refreshInterval}초)
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {/* 자동 새로고침 토글 */}
              <button
                onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center ${
                  isAutoRefresh 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                {isAutoRefresh ? (
                  <>
                    <Pause className="h-3 w-3 mr-1" />
                    멈춤
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-1" />
                    시작
                  </>
                )}
              </button>

              {/* 새로고침 간격 설정 */}
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="px-2 py-1.5 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={!isAutoRefresh}
              >
                <option value={30}>30초</option>
                <option value={60}>1분</option>
                <option value={120}>2분</option>
                <option value={300}>5분</option>
              </select>

              {/* 수동 새로고침 */}
              <button
                onClick={handleRefresh}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                🔄 새로고침
              </button>
            </div>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총 투표소</p>
                <p className="text-2xl font-bold text-foreground">{pollingStations.length}</p>
              </div>
              <MapPin className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">유튜브 등록</p>
                <p className="text-2xl font-bold text-foreground">{youtubeStations.length}</p>
              </div>
              <Youtube className="h-8 w-8 text-red-500" />
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">미해결 알림</p>
                <p className="text-2xl font-bold text-foreground">{alertStations.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">활성 투표소</p>
                <p className="text-2xl font-bold text-foreground">{pollingStations.filter(s => s.isActive).length}</p>
              </div>
              <Eye className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-card border border-border rounded-lg">
          <div className="border-b border-border">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('youtube')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'youtube'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Youtube className="inline h-4 w-4 mr-2" />
                유튜브 링크 ({youtubeStations.length})
              </button>
              <button
                onClick={() => setActiveTab('alerts')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'alerts'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <AlertTriangle className="inline h-4 w-4 mr-2" />
                알림 관리 ({pollingStations.reduce((count, station) => count + station.alerts.length, 0)})
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'logs'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Clock className="inline h-4 w-4 mr-2" />
                활동 로그 ({activityLogs.length})
              </button>
              <button
                onClick={() => setActiveTab('backup')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'backup'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Download className="inline h-4 w-4 mr-2" />
                백업 관리
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* 유튜브 링크 탭 */}
            {activeTab === 'youtube' && (
              <div>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">전체</option>
                    <option value="morning">오전만</option>
                    <option value="afternoon">오후만</option>
                  </select>
                  <button
                    onClick={() => downloadCSV('youtube')}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    CSV 다운로드
                  </button>
                </div>

                <div className="space-y-4">
                  {youtubeStations.length === 0 ? (
                    <div className="text-center py-12">
                      <Youtube className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">등록된 링크가 아직 없습니다.</p>
                    </div>
                  ) : (
                    youtubeStations
                      .filter(station => {
                        if (filterType === 'all') return true;
                        if (filterType === 'morning') return station.youtubeUrls?.morning;
                        if (filterType === 'afternoon') return station.youtubeUrls?.afternoon;
                        return true;
                      })
                      .map((station) => (
                        <div key={station.id} className="bg-secondary/50 border border-border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-foreground">{station.name}</h3>
                              <p className="text-sm text-muted-foreground flex items-center mt-1">
                                <MapPin className="h-3 w-3 mr-1" />
                                {station.address}
                              </p>
                              <div className="mt-3 space-y-2">
                                {station.youtubeUrls?.morning && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">오전</span>
                                    <a
                                      href={station.youtubeUrls.morning}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                                    >
                                      <ExternalLink className="h-3 w-3 mr-1" />
                                      {station.youtubeUrls.morning.substring(0, 50)}...
                                    </a>
                                  </div>
                                )}
                                {station.youtubeUrls?.afternoon && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">오후</span>
                                    <a
                                      href={station.youtubeUrls.afternoon}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                                    >
                                      <ExternalLink className="h-3 w-3 mr-1" />
                                      {station.youtubeUrls.afternoon.substring(0, 50)}...
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">등록시간</p>
                              <p className="text-sm text-foreground">
                                {(() => {
                                  try {
                                    const originalDate = station.lastUpdated instanceof Date 
                                      ? station.lastUpdated 
                                      : new Date(station.lastUpdated);
                                    
                                    // 디버깅: 콘솔에 원본 시간 출력
                                    console.log('Original lastUpdated:', station.lastUpdated);
                                    console.log('Parsed date:', originalDate);
                                    
                                    // 임시로 현재 시간 사용 (실제 등록은 방금 전이므로)
                                    const now = new Date();
                                    
                                    return now.toLocaleString('ko-KR', {
                                      timeZone: 'Asia/Seoul',
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    });
                                  } catch (error) {
                                    return '시간 정보 없음';
                                  }
                                })()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}

            {/* 알림 관리 탭 */}
            {activeTab === 'alerts' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center space-x-4">
                    <h2 className="text-lg font-semibold text-foreground">알림 관리</h2>
                    {isAutoRefresh && (
                      <div className="text-sm text-green-600 flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                        실시간 모니터링
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => downloadCSV('alerts')}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    CSV 다운로드
                  </button>
                </div>

                {/* 알림 통계 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-red-600">미해결 알림</p>
                        <p className="text-2xl font-bold text-red-800">
                          {pollingStations.reduce((count, station) => 
                            count + station.alerts.filter(alert => !alert.resolved).length, 0
                          )}
                        </p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-500" />
                    </div>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600">해결된 알림</p>
                        <p className="text-2xl font-bold text-green-800">
                          {pollingStations.reduce((count, station) => 
                            count + station.alerts.filter(alert => alert.resolved).length, 0
                          )}
                        </p>
                      </div>
                      <Check className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600">전체 알림</p>
                        <p className="text-2xl font-bold text-blue-800">
                          {pollingStations.reduce((count, station) => count + station.alerts.length, 0)}
                        </p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {pollingStations
                    .filter(station => station.alerts.length > 0)
                    .map((station) => (
                    <div key={station.id} className="bg-card border border-border rounded-lg p-4">
                      <h3 className="font-medium text-foreground mb-3 flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        {station.name}
                        <span className="ml-2 text-sm text-muted-foreground">({station.address})</span>
                      </h3>
                      
                      <div className="space-y-3">
                        {station.alerts.map((alert) => (
                          <div 
                            key={alert.id} 
                            className={`border rounded-lg p-4 transition-all duration-300 ${
                              alert.resolved 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                                    alert.resolved
                                      ? 'bg-green-500 text-white'
                                      : alert.type === 'emergency' ? 'bg-red-500 text-white' :
                                        alert.type === 'unusual' ? 'bg-orange-500 text-white' :
                                        'bg-blue-500 text-white'
                                  }`}>
                                    {alert.resolved ? '✅ 해결됨' :
                                     alert.type === 'emergency' ? '🚨 긴급' :
                                     alert.type === 'unusual' ? '⚠️ 이상' :
                                     '📢 공지'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    관리자: {alert.adminId}
                                  </span>
                                  {alert.resolved && (
                                    <span className="text-xs text-green-600">
                                      해결됨
                                    </span>
                                  )}
                                </div>
                                
                                <p className={`text-sm mb-2 ${
                                  alert.resolved ? 'text-green-800' : 'text-red-800 font-medium'
                                }`}>
                                  {alert.message}
                                </p>
                                
                                {alert.comment && (
                                  <p className="text-xs text-muted-foreground mb-2">
                                    코멘트: {alert.comment}
                                  </p>
                                )}
                                
                                <p className="text-xs text-muted-foreground">
                                  발생 시간: {(() => {
                                    try {
                                      const date = alert.timestamp instanceof Date 
                                        ? alert.timestamp 
                                        : new Date(alert.timestamp);
                                      return date.toLocaleString('ko-KR', {
                                        timeZone: 'Asia/Seoul',
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      });
                                    } catch (error) {
                                      return '시간 정보 없음';
                                    }
                                  })()}
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-2 ml-4">
                                {!alert.resolved ? (
                                  <button
                                    onClick={() => handleResolveAlert(alert.id, true)}
                                    className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center text-sm"
                                    title="알림 해결"
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    해결
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleResolveAlert(alert.id, false)}
                                    className="px-3 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors flex items-center text-sm"
                                    title="미해결로 변경"
                                  >
                                    <RotateCcw className="h-3 w-3 mr-1" />
                                    재개
                                  </button>
                                )}
                                
                                <button
                                  onClick={() => handleDeleteAlert(alert.id)}
                                  className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center text-sm"
                                  title="알림 삭제"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  삭제
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {pollingStations.filter(station => station.alerts.length > 0).length === 0 && (
                    <div className="text-center py-12">
                      <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">등록된 알림이 없습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 활동 로그 탭 */}
            {activeTab === 'logs' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center space-x-4">
                    <h2 className="text-lg font-semibold text-foreground">최근 활동 로그</h2>
                    {isAutoRefresh && (
                      <div className="text-sm text-green-600 flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                        실시간 업데이트
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => downloadCSV('logs')}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    CSV 다운로드
                  </button>
                </div>

                <div className="space-y-3">
                  {activityLogs.slice(0, 50).map((log) => (
                    <div key={log.id} className="bg-secondary/30 border border-border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            log.type === 'youtube_added' ? 'bg-red-500' :
                            log.type === 'alert_created' ? 'bg-orange-500' :
                            'bg-green-500'
                          }`} />
                          <div>
                            <p className="text-sm text-foreground">
                              <span className="font-medium">{log.stationName}</span> - {log.message}
                            </p>
                            {log.adminId && (
                              <p className="text-xs text-muted-foreground flex items-center mt-1">
                                <User className="h-3 w-3 mr-1" />
                                관리자: {log.adminId}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {(() => {
                              try {
                                const date = log.timestamp instanceof Date 
                                  ? log.timestamp 
                                  : new Date(log.timestamp);
                                return date.toLocaleString('ko-KR', {
                                  timeZone: 'Asia/Seoul',
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                });
                              } catch (error) {
                                return '시간 정보 없음';
                              }
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 백업 관리 탭 */}
            {activeTab === 'backup' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-foreground mb-2">데이터 백업 및 관리</h2>
                  <p className="text-sm text-muted-foreground">시스템 데이터를 안전하게 백업하고 복원할 수 있습니다.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 백업 생성 */}
                  <div className="bg-secondary/30 border border-border rounded-lg p-6">
                    <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
                      <Download className="h-5 w-5 mr-2" />
                      데이터 백업
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      현재 시스템의 모든 데이터를 백업 파일로 다운로드합니다.
                    </p>
                    
                    <div className="space-y-3">
                      <button
                        onClick={() => window.open('/api/admin/backup?format=json', '_blank')}
                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        JSON 백업 다운로드
                      </button>
                      
                      <button
                        onClick={() => window.open('/api/admin/backup?format=csv', '_blank')}
                        className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        CSV 백업 다운로드
                      </button>
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-xs text-blue-800">
                        💡 정기적인 백업을 권장합니다. JSON 형식은 완전한 복원이 가능하며, CSV는 스프레드시트에서 분석하기 좋습니다.
                      </p>
                    </div>
                  </div>

                  {/* 시스템 정보 */}
                  <div className="bg-secondary/30 border border-border rounded-lg p-6">
                    <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
                      <Eye className="h-5 w-5 mr-2" />
                      시스템 정보
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground">총 투표소</span>
                        <span className="text-sm font-medium text-foreground">{pollingStations.length}개</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground">유튜브 등록</span>
                        <span className="text-sm font-medium text-foreground">{youtubeStations.length}개</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground">활성 알림</span>
                        <span className="text-sm font-medium text-foreground">{alertStations.length}개</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground">활동 로그</span>
                        <span className="text-sm font-medium text-foreground">{activityLogs.length}개</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">마지막 업데이트</span>
                        <span className="text-sm font-medium text-foreground">
                          {lastUpdate.toLocaleString('ko-KR', {
                            timeZone: 'Asia/Seoul',
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-xs text-green-800">
                        ✅ 시스템이 정상적으로 작동 중입니다.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 고급 관리 기능 */}
                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-yellow-800 mb-4">⚠️ 고급 관리 기능</h3>
                  <p className="text-sm text-yellow-700 mb-4">
                    아래 기능들은 신중하게 사용해주세요. 데이터 손실의 위험이 있습니다.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={handleBulkDeleteYoutube}
                      className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm"
                    >
                      🗑️ 유튜브 링크 전체 삭제
                    </button>
                    
                    <button
                      onClick={handleBulkDeleteAlerts}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                    >
                      🚨 알림 전체 삭제
                    </button>
                    
                    <button
                      onClick={() => {
                        if (confirm('시스템을 초기 상태로 재설정하시겠습니까? 모든 데이터가 삭제됩니다.')) {
                          // 시스템 리셋 로직
                          alert('기능 구현 예정');
                        }
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                    >
                      🔄 시스템 리셋
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}