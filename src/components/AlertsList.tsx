'use client';

import { useState, useEffect } from 'react';
import { PollingStation } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { MapPin, Clock, AlertTriangle, Eye, Power } from 'lucide-react';

interface AlertsListProps {
  pollingStations: PollingStation[];
  onStationSelect: (station: PollingStation) => void;
  onAlertsViewed: () => void;
  showMonitoring?: boolean;
  showAlerts?: boolean;
  showInactive?: boolean;
  onClose?: () => void;
}

export default function AlertsList({ pollingStations, onStationSelect, onAlertsViewed, showMonitoring = true, showAlerts = true, showInactive = false, onClose }: AlertsListProps) {
  const [viewedAlerts, setViewedAlerts] = useState<Set<string>>(new Set());
  
  // 모니터링 중인 투표소
  const monitoringStations = pollingStations.filter(station => station.isActive);
  
  // 비활성 투표소
  const inactiveStations = pollingStations.filter(station => !station.isActive);
  
  // 알림이 있는 투표소 (시간순 정렬)
  const alertStations = pollingStations
    .filter(station => station.alerts.some(alert => !alert.resolved))
    .map(station => ({
      ...station,
      latestAlert: station.alerts
        .filter(alert => !alert.resolved)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
    }))
    .sort((a, b) => new Date(b.latestAlert.timestamp).getTime() - new Date(a.latestAlert.timestamp).getTime());

  // 새로운 알림이 있는지 확인
  const hasNewAlerts = alertStations.some(station => 
    !viewedAlerts.has(`${station.id}-${station.latestAlert.id}`)
  );

  const handleStationClick = (station: PollingStation) => {
    // 알림 확인 처리
    if (station.alerts.some(alert => !alert.resolved)) {
      const alertKey = `${station.id}-${station.alerts.find(a => !a.resolved)?.id}`;
      setViewedAlerts(prev => new Set(prev).add(alertKey));
    }
    onStationSelect(station);
  };

  const handleViewAllAlerts = () => {
    const allAlertKeys = alertStations.map(station => 
      `${station.id}-${station.latestAlert.id}`
    );
    setViewedAlerts(new Set(allAlertKeys));
    onAlertsViewed();
  };

  // 모든 표시 옵션이 false인 경우만 null 반환
  if (!showMonitoring && !showAlerts && !showInactive) {
    return null;
  }

  return (
    <div className="mb-8 space-y-4">
      
      {/* 모니터링 중인 투표소 */}
      {showMonitoring && (
        monitoringStations.length > 0 ? (
          <div className="bg-card/50 border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Eye className="w-5 h-5 text-emerald-500" />
                모니터링 중인 투표소
                <span className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full">
                  {monitoringStations.length}
                </span>
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-40 overflow-y-auto">
              {monitoringStations.slice(0, 6).map((station) => (
                <div
                  key={station.id}
                  onClick={() => handleStationClick(station)}
                  className="bg-secondary/50 hover:bg-secondary/80 border border-border rounded-lg p-3 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground text-sm">{station.name}</h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {station.district} {station.address}
                      </p>
                    </div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              ))}
              {monitoringStations.length > 6 && (
                <div className="text-center text-sm text-muted-foreground py-2">
                  외 {monitoringStations.length - 6}개 투표소
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-card/50 border border-border rounded-lg p-6 text-center">
            <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">모니터링 중인 투표소가 없습니다</h3>
            <p className="text-muted-foreground text-sm">
              현재 활발히 모니터링되고 있는 투표소가 없습니다.<br />
              투표소가 활성화되면 여기에 표시됩니다.
            </p>
          </div>
        )
      )}

      {/* 알림 발생 투표소 */}
      {showAlerts && (
        alertStations.length > 0 ? (
        <div className="bg-card/50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              알림 발생 투표소
              <span className={`text-white text-xs px-2 py-1 rounded-full ${
                hasNewAlerts ? 'bg-red-500 animate-pulse' : 'bg-red-400'
              }`}>
                {alertStations.length}
              </span>
            </h3>
            {hasNewAlerts && (
              <button
                onClick={handleViewAllAlerts}
                className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition-colors"
              >
                모두 확인
              </button>
            )}
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {alertStations.map((station) => {
              const alertKey = `${station.id}-${station.latestAlert.id}`;
              const isNewAlert = !viewedAlerts.has(alertKey);
              
              return (
                <div
                  key={station.id}
                  onClick={() => handleStationClick(station)}
                  className={`border rounded-lg p-3 cursor-pointer transition-all ${
                    isNewAlert 
                      ? 'bg-red-50 border-red-300 animate-pulse hover:bg-red-100' 
                      : 'bg-secondary/50 border-border hover:bg-secondary/80'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground text-sm">{station.name}</h4>
                        {isNewAlert && (
                          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                        <MapPin className="w-3 h-3" />
                        {station.district} {station.address}
                      </p>
                      <div className="bg-red-100 border border-red-200 rounded p-2">
                                                 <p className="text-sm text-red-800 font-medium mb-1">
                           {station.latestAlert.type === 'emergency' && '🚨 긴급상황'}
                           {station.latestAlert.type === 'unusual' && '⚠️ 이상상황'}
                           {station.latestAlert.type === 'notice' && '📢 공지사항'}
                         </p>
                         <p className="text-xs text-red-700">{station.latestAlert.message}</p>
                        <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(station.latestAlert.timestamp), { 
                            addSuffix: true, 
                            locale: ko 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        ) : (
          <div className="bg-card/50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">알림이 발생한 투표소가 없습니다</h3>
            <p className="text-muted-foreground text-sm">
              현재 처리되지 않은 알림이 없습니다.<br />
              새로운 알림이 발생하면 여기에 표시됩니다.
            </p>
          </div>
        )
      )}

      {/* 비활성 투표소 */}
      {showInactive && (
        inactiveStations.length > 0 ? (
          <div className="bg-card/50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Power className="w-5 h-5 text-gray-500" />
                비활성 투표소
                <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full">
                  {inactiveStations.length}
                </span>
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
              {inactiveStations.slice(0, 9).map((station) => (
                <div
                  key={station.id}
                  onClick={() => handleStationClick(station)}
                  className="bg-secondary/30 hover:bg-secondary/50 border border-gray-200 rounded-lg p-3 cursor-pointer transition-colors opacity-75"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground text-sm">{station.name}</h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {station.district} {station.address}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        최종 업데이트: {formatDistanceToNow(new Date(station.lastUpdated), { 
                          addSuffix: true, 
                          locale: ko 
                        })}
                      </p>
                    </div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  </div>
                </div>
              ))}
              {inactiveStations.length > 9 && (
                <div className="text-center text-sm text-muted-foreground py-2">
                  외 {inactiveStations.length - 9}개 투표소
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-card/50 border border-gray-200 rounded-lg p-6 text-center">
            <Power className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">비활성 투표소가 없습니다</h3>
            <p className="text-muted-foreground text-sm">
              모든 투표소가 활성화되어 있습니다.<br />
              정말 좋은 상황입니다! 🎉
            </p>
          </div>
        )
      )}
    </div>
  );
} 