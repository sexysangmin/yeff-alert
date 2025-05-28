'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { PollingStation } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import PollingStationDetail from './PollingStationDetail';
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

export default function AdminDashboard({ pollingStations }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'alerts' | 'streams' | 'approval' | 'youtube' | 'logs' | 'backup' | 'deletions'>('alerts');
  const [filterType, setFilterType] = useState<'all' | 'morning' | 'afternoon' | 'registered' | 'empty'>('all');
  const [selectedDate, setSelectedDate] = useState<'day1' | 'day2'>('day1');
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [deletionLogs, setDeletionLogs] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60); // 60초로 변경
  const [selectedStation, setSelectedStation] = useState<PollingStation | null>(null);
  const [advancedFeaturesUnlocked, setAdvancedFeaturesUnlocked] = useState(false);
  const [advancedPassword, setAdvancedPassword] = useState('');
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // 유튜브 링크가 있는 투표소들 (메모이제이션) - 감시관 영상 스트림 포함
  const youtubeStations = useMemo(() => 
    pollingStations.filter(station => {
      // 기존 공식 유튜브 링크 확인
      const hasOfficialUrls = station.youtubeUrls?.morning || station.youtubeUrls?.afternoon;
      
      // 새로운 날짜별 유튜브 링크 확인
      const hasDayUrls = station.youtubeDayUrls && (
        station.youtubeDayUrls.day1?.morning || station.youtubeDayUrls.day1?.afternoon ||
        station.youtubeDayUrls.day2?.morning || station.youtubeDayUrls.day2?.afternoon
      );
      
      // 감시관이 등록한 승인된 영상 스트림 확인
      const hasMonitorStreams = station.streams && station.streams.some(stream => 
        stream.isActive && stream.registeredByType === 'monitor'
      );
      
      // 셋 중 하나라도 있으면 포함
      return hasOfficialUrls || hasDayUrls || hasMonitorStreams;
    }), [pollingStations]
  );

  // 알림이 있는 투표소들 (메모이제이션)
  const alertStations = useMemo(() => 
    pollingStations.filter(station => 
      station.alerts.some(alert => !alert.resolved)
    ), [pollingStations]
  );

  // 승인 대기 중인 스트림들 (메모이제이션)
  const pendingApprovalStreams = useMemo(() => {
    const streams: Array<{
      stream: any;
      station: PollingStation;
    }> = [];
    
    pollingStations.forEach(station => {
      if (station.streams) {
        station.streams
          .filter(stream => 
            stream.registeredByType === 'public' && !stream.isActive
          )
          .forEach(stream => {
            streams.push({ stream, station });
          });
      }
    });
    
    return streams;
  }, [pollingStations]);

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
          timestamp: station.youtubeRegisteredAt?.morning || station.lastUpdated,
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
          timestamp: station.youtubeRegisteredAt?.afternoon || station.lastUpdated,
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
    
    // 삭제 로그 로드
    loadDeletionLogs();
  }, [youtubeStations, pollingStations]);

  // 삭제 로그 로드 함수
  const loadDeletionLogs = async () => {
    try {
      const response = await fetch('/api/admin/deletion-logs');
      if (response.ok) {
        const data = await response.json();
        setDeletionLogs(data.logs || []);
      }
    } catch (error) {
      console.error('삭제 로그 로드 실패:', error);
    }
  };

  // 데이터 복원 함수
  const handleRestoreData = async (logId: string, restoreType: string) => {
    if (!confirm(`정말로 이 데이터를 복원하시겠습니까?\n복원된 데이터는 현재 시스템에 다시 적용됩니다.`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/deletion-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logId,
          restoreType
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        loadDeletionLogs(); // 로그 새로고침
        handleRefresh(); // 전체 데이터 새로고침
      } else {
        const errorData = await response.json();
        alert(`복원 실패: ${errorData.error}`);
      }
    } catch (error) {
      console.error('복원 오류:', error);
      alert('네트워크 오류가 발생했습니다.');
    }
  };

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

  // 투표소 선택 핸들러
  const handleStationSelect = (station: PollingStation) => {
    setSelectedStation(station);
  };

  // 고급 기능 비밀번호 확인
  const handleAdvancedPasswordSubmit = () => {
    if (advancedPassword === '0929') {
      setAdvancedFeaturesUnlocked(true);
      setAdvancedPassword('');
      alert('✅ 고급 관리 기능이 활성화되었습니다.');
    } else {
      alert('❌ 잘못된 비밀번호입니다.');
      setAdvancedPassword('');
    }
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

  // 영상 스트림 승인 처리
  const handleApproveStream = async (streamId: string) => {
    try {
      const response = await fetch(`/api/admin/video-streams/${streamId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: true,
          status: 'approved'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert('✅ 영상이 승인되었습니다!');
        handleRefresh(); // 데이터 새로고침
      } else {
        const errorData = await response.json();
        console.error('영상 승인 실패:', errorData);
        alert(`영상 승인에 실패했습니다: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('영상 승인 처리 오류:', error);
      alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // 영상 스트림 거부 처리
  const handleRejectStream = async (streamId: string, reason?: string) => {
    const rejectReason = reason || prompt('거부 사유를 입력해주세요 (선택사항):');
    
    try {
      const response = await fetch(`/api/admin/video-streams/${streamId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: rejectReason
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert('❌ 영상이 거부되었습니다.');
        handleRefresh(); // 데이터 새로고침
      } else {
        const errorData = await response.json();
        console.error('영상 거부 실패:', errorData);
        alert(`영상 거부에 실패했습니다: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('영상 거부 처리 오류:', error);
      alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // 유튜브 링크 전체 삭제
  const handleBulkDeleteYoutube = async () => {
    if (!confirm('정말로 모든 유튜브 링크를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      console.log('🗑️ 유튜브 링크 삭제 시작...');
      const response = await fetch('/api/admin/clear-youtube', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 API 응답 상태:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 삭제 성공:', result);
        alert(result.message);
        handleRefresh(); // 데이터 새로고침
      } else {
        let errorMessage = '알 수 없는 오류';
        try {
          const errorData = await response.json();
          console.error('❌ 유튜브 링크 삭제 실패:', errorData);
          errorMessage = errorData.error || errorData.details || JSON.stringify(errorData);
        } catch (parseError) {
          console.error('❌ 오류 응답 파싱 실패:', parseError);
          const errorText = await response.text();
          console.error('❌ 원시 오류 응답:', errorText);
          errorMessage = `HTTP ${response.status}: ${errorText || response.statusText}`;
        }
        alert(`유튜브 링크 삭제에 실패했습니다: ${errorMessage}`);
      }
    } catch (error) {
      console.error('❌ 유튜브 링크 삭제 오류:', error);
      alert(`네트워크 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
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
  const downloadCSV = (type: 'youtube' | 'alerts' | 'logs' | 'deletions') => {
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
    } else if (type === 'deletions') {
      csvContent = 'ID,삭제타입,삭제시간,관리자ID,복원가능,데이터개수\n';
      deletionLogs.forEach(log => {
        const dataCount = log.deleted_data?.total_count || 0;
        csvContent += `${log.id},"${log.deletion_type}","${new Date(log.deleted_at).toLocaleString('ko-KR')}","${log.admin_id}","${log.can_restore ? 'Y' : 'N'}","${dataCount}"\n`;
      });
      filename = `deletion_logs_${new Date().toISOString().split('T')[0]}.csv`;
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
          <div className="flex items-center">
            <a 
              href="/" 
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <img 
                src="/yeff-circle-logo.png" 
                alt="YEFF 로고" 
                className="h-8 w-8"
              />
              <h1 className="text-2xl font-bold text-foreground">YEFF ALERT 관리자</h1>
            </a>
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
                <p className="text-sm text-muted-foreground">승인 대기</p>
                <p className="text-2xl font-bold text-foreground">{pendingApprovalStreams.length}</p>
              </div>
              <Check className="h-8 w-8 text-yellow-500" />
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
                onClick={() => setActiveTab('approval')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'approval'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Check className="inline h-4 w-4 mr-2" />
                승인 대기 ({pendingApprovalStreams.length})
              </button>
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
              <button
                onClick={() => setActiveTab('deletions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'deletions'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Trash2 className="inline h-4 w-4 mr-2" />
                삭제 로그 ({deletionLogs.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* 유튜브 링크 탭 */}
            {activeTab === 'youtube' && (
              <div>
                {/* 날짜 선택 헤더 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-blue-800">📅 선거 일정</h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedDate('day1')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          selectedDate === 'day1'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white text-blue-600 hover:bg-blue-100'
                        }`}
                      >
                        첫째날 (5월 29일)
                      </button>
                      <button
                        onClick={() => setSelectedDate('day2')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          selectedDate === 'day2'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white text-blue-600 hover:bg-blue-100'
                        }`}
                      >
                        둘째날 (5월 30일)
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-blue-600">
                    현재 선택: <strong>{selectedDate === 'day1' ? '첫째날 (5월 29일)' : '둘째날 (5월 30일)'}</strong> 유튜브 링크 관리
                  </div>
                </div>

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
                                {/* 기존 공식 유튜브 링크 */}
                                {station.youtubeUrls?.morning && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">🎥 공식 오전</span>
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
                                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">🎥 공식 오후</span>
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
                                
                                {/* 감시관이 등록한 영상 스트림 */}
                                {station.streams?.filter(stream => stream.isActive && stream.registeredByType === 'monitor').map((stream, index) => (
                                  <div key={stream.id} className="flex items-center gap-2">
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">👁️ 감시관</span>
                                    <a
                                      href={stream.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                                    >
                                      <ExternalLink className="h-3 w-3 mr-1" />
                                      {stream.title.substring(0, 40)}...
                                    </a>
                                    <span className="text-xs text-muted-foreground">
                                      ({stream.registeredBy})
                                    </span>
                                  </div>
                                ))}
                                
                                {/* 새로운 날짜별 유튜브 링크 */}
                                {station.youtubeDayUrls && (
                                  <>
                                    {/* Day 1 링크들 */}
                                    {station.youtubeDayUrls.day1?.morning && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">📅 Day1 오전</span>
                                        <a
                                          href={station.youtubeDayUrls.day1.morning}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                                        >
                                          <ExternalLink className="h-3 w-3 mr-1" />
                                          {station.youtubeDayUrls.day1.morning.substring(0, 50)}...
                                        </a>
                                      </div>
                                    )}
                                    {station.youtubeDayUrls.day1?.afternoon && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">📅 Day1 오후</span>
                                        <a
                                          href={station.youtubeDayUrls.day1.afternoon}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                                        >
                                          <ExternalLink className="h-3 w-3 mr-1" />
                                          {station.youtubeDayUrls.day1.afternoon.substring(0, 50)}...
                                        </a>
                                      </div>
                                    )}
                                    
                                    {/* Day 2 링크들 */}
                                    {station.youtubeDayUrls.day2?.morning && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">📅 Day2 오전</span>
                                        <a
                                          href={station.youtubeDayUrls.day2.morning}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                                        >
                                          <ExternalLink className="h-3 w-3 mr-1" />
                                          {station.youtubeDayUrls.day2.morning.substring(0, 50)}...
                                        </a>
                                      </div>
                                    )}
                                    {station.youtubeDayUrls.day2?.afternoon && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">📅 Day2 오후</span>
                                        <a
                                          href={station.youtubeDayUrls.day2.afternoon}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                                        >
                                          <ExternalLink className="h-3 w-3 mr-1" />
                                          {station.youtubeDayUrls.day2.afternoon.substring(0, 50)}...
                                        </a>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">등록시간</p>
                              <p className="text-sm text-foreground">
                                {(() => {
                                  try {
                                    // 데이터베이스에서 실제 등록시간 가져오기
                                    const morningRegisteredAt = station.youtubeRegisteredAt?.morning;
                                    const afternoonRegisteredAt = station.youtubeRegisteredAt?.afternoon;
                                    
                                    // 새로운 날짜별 등록시간들 가져오기
                                    const day1MorningRegisteredAt = station.youtubeDayRegisteredAt?.day1?.morning;
                                    const day1AfternoonRegisteredAt = station.youtubeDayRegisteredAt?.day1?.afternoon;
                                    const day2MorningRegisteredAt = station.youtubeDayRegisteredAt?.day2?.morning;
                                    const day2AfternoonRegisteredAt = station.youtubeDayRegisteredAt?.day2?.afternoon;
                                    
                                    // 감시관 영상 등록시간들 가져오기
                                    const monitorStreams = station.streams?.filter(stream => 
                                      stream.isActive && stream.registeredByType === 'monitor'
                                    ) || [];
                                    
                                    const allRegisteredTimes = [];
                                    
                                    // 기존 공식 링크 등록시간
                                    if (morningRegisteredAt) allRegisteredTimes.push(morningRegisteredAt);
                                    if (afternoonRegisteredAt) allRegisteredTimes.push(afternoonRegisteredAt);
                                    
                                    // 새로운 날짜별 등록시간
                                    if (day1MorningRegisteredAt) allRegisteredTimes.push(day1MorningRegisteredAt);
                                    if (day1AfternoonRegisteredAt) allRegisteredTimes.push(day1AfternoonRegisteredAt);
                                    if (day2MorningRegisteredAt) allRegisteredTimes.push(day2MorningRegisteredAt);
                                    if (day2AfternoonRegisteredAt) allRegisteredTimes.push(day2AfternoonRegisteredAt);
                                    
                                    // 감시관 영상 등록시간
                                    monitorStreams.forEach(stream => {
                                      if (stream.registeredAt) {
                                        allRegisteredTimes.push(stream.registeredAt);
                                      }
                                    });
                                    
                                    // 가장 최근 등록시간 찾기
                                    let latestRegisteredAt = null;
                                    if (allRegisteredTimes.length > 0) {
                                      latestRegisteredAt = allRegisteredTimes.reduce((latest, current) => {
                                        const currentDate = current instanceof Date ? current : new Date(current);
                                        const latestDate = latest instanceof Date ? latest : new Date(latest);
                                        return currentDate > latestDate ? currentDate : latestDate;
                                      });
                                    }
                                    
                                    if (latestRegisteredAt) {
                                      const date = latestRegisteredAt instanceof Date ? 
                                        latestRegisteredAt : new Date(latestRegisteredAt);
                                      return date.toLocaleString('ko-KR', {
                                        timeZone: 'Asia/Seoul',
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      });
                                    } else {
                                      // 등록시간이 없으면 최근 업데이트 시간 사용 (기존 데이터 호환성)
                                      const date = station.lastUpdated instanceof Date 
                                        ? station.lastUpdated 
                                        : new Date(station.lastUpdated);
                                      return date.toLocaleString('ko-KR', {
                                        timeZone: 'Asia/Seoul',
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      }) + ' (추정)';
                                    }
                                  } catch (error) {
                                    console.error('등록시간 표시 오류:', error);
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
                {/* 날짜 선택 헤더 */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-orange-800">📅 선거 일정</h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedDate('day1')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          selectedDate === 'day1'
                            ? 'bg-orange-600 text-white shadow-md'
                            : 'bg-white text-orange-600 hover:bg-orange-100'
                        }`}
                      >
                        첫째날 (5월 29일)
                      </button>
                      <button
                        onClick={() => setSelectedDate('day2')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          selectedDate === 'day2'
                            ? 'bg-orange-600 text-white shadow-md'
                            : 'bg-white text-orange-600 hover:bg-orange-100'
                        }`}
                      >
                        둘째날 (5월 30일)
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-orange-600">
                    현재 선택: <strong>{selectedDate === 'day1' ? '첫째날 (5월 29일)' : '둘째날 (5월 30일)'}</strong> 알림 관리
                  </div>
                </div>

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
                      <button
                        onClick={() => handleStationSelect(station)}
                        className="w-full text-left mb-3 hover:bg-muted/50 rounded-lg p-2 transition-colors"
                      >
                        <h3 className="font-medium text-foreground flex items-center">
                          <MapPin className="h-4 w-4 mr-2" />
                          {station.name}
                          <span className="ml-2 text-sm text-muted-foreground">({station.address})</span>
                          <span className="ml-auto text-xs text-blue-600">📺 영상 보기</span>
                        </h3>
                      </button>
                      
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
                  
                  {!advancedFeaturesUnlocked ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                        <span className="text-sm font-medium text-red-800">보안 잠금 상태</span>
                      </div>
                      <p className="text-sm text-red-700 mb-3">
                        고급 관리 기능을 사용하려면 추가 인증이 필요합니다.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={advancedPassword}
                          onChange={(e) => setAdvancedPassword(e.target.value)}
                          placeholder="고급 기능 비밀번호"
                          className="flex-1 px-3 py-2 bg-white border border-red-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          onKeyPress={(e) => e.key === 'Enter' && handleAdvancedPasswordSubmit()}
                        />
                        <button
                          onClick={handleAdvancedPasswordSubmit}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                        >
                          잠금 해제
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                            <span className="text-sm font-medium text-green-800">고급 기능 활성화됨</span>
                          </div>
                          <button
                            onClick={() => {
                              setAdvancedFeaturesUnlocked(false);
                              setAdvancedPassword('');
                            }}
                            className="text-xs text-green-600 hover:text-green-800 underline"
                          >
                            다시 잠금
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                          onClick={() => {
                            if (confirm('⚠️ 모든 유튜브 링크를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 백엔드 데이터베이스에서 완전히 제거됩니다.')) {
                              handleBulkDeleteYoutube();
                            }
                          }}
                          className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm"
                        >
                          🗑️ 유튜브 링크 전체 삭제
                        </button>
                        
                        <button
                          onClick={() => {
                            if (confirm('⚠️ 모든 알림을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 백엔드 데이터베이스에서 완전히 제거됩니다.')) {
                              handleBulkDeleteAlerts();
                            }
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                        >
                          🚨 알림 전체 삭제
                        </button>
                        
                        <button
                          onClick={() => {
                            if (confirm('⚠️ 시스템을 초기 상태로 재설정하시겠습니까?\n\n모든 데이터가 백엔드에서 완전히 삭제됩니다.')) {
                              // 시스템 리셋 로직
                              alert('기능 구현 예정');
                            }
                          }}
                          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                        >
                          🔄 시스템 리셋
                        </button>
                      </div>
                      
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-xs text-red-800">
                          ⚠️ 주의: 위 작업들은 백엔드 데이터베이스에서 데이터를 완전히 제거합니다. 삭제된 데이터는 복구할 수 없습니다.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 삭제 로그 탭 */}
            {activeTab === 'deletions' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center space-x-4">
                    <h2 className="text-lg font-semibold text-foreground">삭제된 데이터 로그</h2>
                    <p className="text-sm text-muted-foreground">
                      삭제된 데이터를 확인하고 필요시 복원할 수 있습니다.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={loadDeletionLogs}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      🔄 새로고침
                    </button>
                    <button
                      onClick={() => downloadCSV('deletions')}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      CSV 다운로드
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {deletionLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <Trash2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground">삭제된 데이터가 없습니다.</p>
                    </div>
                  ) : (
                    deletionLogs.map((log) => (
                      <div key={log.id} className="bg-secondary/50 border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`w-3 h-3 rounded-full ${
                                log.deletion_type === 'youtube_bulk_delete' ? 'bg-red-500' :
                                log.deletion_type === 'alerts_bulk_delete' ? 'bg-orange-500' :
                                'bg-gray-500'
                              }`} />
                              <span className={`text-sm px-2 py-1 rounded font-medium ${
                                log.deletion_type === 'youtube_bulk_delete' 
                                  ? 'bg-red-100 text-red-800' 
                                  : log.deletion_type === 'alerts_bulk_delete'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {log.deletion_type === 'youtube_bulk_delete' ? '🗑️ 유튜브 링크 전체 삭제' :
                                 log.deletion_type === 'alerts_bulk_delete' ? '🚨 알림 전체 삭제' :
                                 '🔄 기타 삭제'}
                              </span>
                              {log.can_restore && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  복원 가능
                                </span>
                              )}
                              {log.restored_at && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  복원됨
                                </span>
                              )}
                            </div>
                            
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>
                                <strong>삭제 시간:</strong> {new Date(log.deleted_at).toLocaleString('ko-KR', {
                                  timeZone: 'Asia/Seoul',
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                              <p>
                                <strong>관리자:</strong> {log.admin_id}
                              </p>
                              <p>
                                <strong>삭제된 항목 수:</strong> {log.deleted_data?.total_count || 0}개
                              </p>
                              {log.restored_at && (
                                <p>
                                  <strong>복원 시간:</strong> {new Date(log.restored_at).toLocaleString('ko-KR', {
                                    timeZone: 'Asia/Seoul',
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            {log.can_restore && !log.restored_at && (
                              <button
                                onClick={() => {
                                  const restoreType = log.deletion_type === 'youtube_bulk_delete' ? 'youtube' : 'alerts';
                                  handleRestoreData(log.id, restoreType);
                                }}
                                className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center text-sm"
                                title="데이터 복원"
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                복원
                              </button>
                            )}
                            
                            <button
                              onClick={() => {
                                const dataStr = JSON.stringify(log.deleted_data, null, 2);
                                const blob = new Blob([dataStr], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `deletion_backup_${log.id}.json`;
                                a.click();
                              }}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center text-sm"
                              title="백업 데이터 다운로드"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              다운로드
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 승인 대기 탭 */}
            {activeTab === 'approval' && (
              <div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold text-yellow-800">🔍 승인 대기 중인 영상</h3>
                  <p className="text-sm text-yellow-600 mt-1">
                    일반 시민과 유튜버가 등록한 영상들을 검토하고 승인/거부할 수 있습니다.
                  </p>
                </div>

                <div className="space-y-4">
                  {pendingApprovalStreams.length === 0 ? (
                    <div className="text-center py-12">
                      <Check className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">승인 대기 중인 영상이 없습니다.</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        모든 등록된 영상이 처리되었습니다.
                      </p>
                    </div>
                  ) : (
                    pendingApprovalStreams.map(({ stream, station }) => (
                      <div key={stream.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-medium">
                                📹 승인 대기
                              </span>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {stream.registeredByType === 'public' ? '👤 일반 시민' : '📺 유튜버'}
                              </span>
                              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                                📅 {stream.targetDate === 'day1' ? '첫째날 (5월 29일)' : '둘째날 (5월 30일)'}
                              </span>
                            </div>

                            {/* 투표소 정보 */}
                            <h3 className="font-medium text-foreground mb-2 flex items-center">
                              <MapPin className="h-4 w-4 mr-2 text-blue-600" />
                              {station.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3">
                              📍 {station.address}
                            </p>

                            {/* 영상 정보 */}
                            <div className="bg-white border border-yellow-200 rounded-lg p-4 mb-4">
                              <h4 className="font-medium text-foreground mb-2">📹 영상 정보</h4>
                              <div className="space-y-2">
                                <div>
                                  <span className="text-sm font-medium text-gray-700">제목:</span>
                                  <p className="text-sm text-foreground">{stream.title}</p>
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-gray-700">URL:</span>
                                  <a
                                    href={stream.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center mt-1"
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    {stream.url}
                                  </a>
                                </div>
                                {stream.description && (
                                  <div>
                                    <span className="text-sm font-medium text-gray-700">설명:</span>
                                    <p className="text-sm text-muted-foreground">{stream.description}</p>
                                  </div>
                                )}
                                <div>
                                  <span className="text-sm font-medium text-gray-700">등록자:</span>
                                  <p className="text-sm text-foreground">{stream.registeredBy}</p>
                                </div>
                                {stream.contact && (
                                  <div>
                                    <span className="text-sm font-medium text-gray-700">연락처:</span>
                                    <p className="text-sm text-foreground">{stream.contact}</p>
                                  </div>
                                )}
                                <div>
                                  <span className="text-sm font-medium text-gray-700">등록 시간:</span>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(stream.registeredAt).toLocaleString('ko-KR', {
                                      timeZone: 'Asia/Seoul',
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* 미리보기 링크 */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <p className="text-sm text-blue-800 font-medium mb-2">🔍 영상 미리보기</p>
                              <a
                                href={stream.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                영상 확인하기
                              </a>
                            </div>
                          </div>

                          {/* 승인/거부 버튼 */}
                          <div className="flex flex-col gap-2 ml-6">
                            <button
                              onClick={() => {
                                if (confirm(`"${stream.title}" 영상을 승인하시겠습니까?\n\n승인 후 즉시 공개됩니다.`)) {
                                  handleApproveStream(stream.id);
                                }
                              }}
                              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center text-sm font-medium"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              승인
                            </button>
                            
                            <button
                              onClick={() => {
                                if (confirm(`"${stream.title}" 영상을 거부하시겠습니까?\n\n거부된 영상은 삭제됩니다.`)) {
                                  handleRejectStream(stream.id);
                                }
                              }}
                              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center text-sm font-medium"
                            >
                              <X className="h-4 w-4 mr-1" />
                              거부
                            </button>

                            <button
                              onClick={() => handleStationSelect(station)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center text-sm"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              투표소 보기
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* 승인 통계 */}
                {pendingApprovalStreams.length > 0 && (
                  <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-foreground mb-2">📊 승인 통계</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-600">{pendingApprovalStreams.length}</p>
                        <p className="text-sm text-muted-foreground">승인 대기</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {pendingApprovalStreams.filter(({ stream }) => stream.targetDate === 'day1').length}
                        </p>
                        <p className="text-sm text-muted-foreground">첫째날 영상</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">
                          {pendingApprovalStreams.filter(({ stream }) => stream.targetDate === 'day2').length}
                        </p>
                        <p className="text-sm text-muted-foreground">둘째날 영상</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 투표소 세부사항 모달 */}
      {selectedStation && (
        <PollingStationDetail
          station={selectedStation}
          onClose={() => setSelectedStation(null)}
        />
      )}
    </div>
  );
}