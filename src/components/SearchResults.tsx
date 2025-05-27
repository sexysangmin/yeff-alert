'use client';

import { PollingStation } from '@/types';
import { MapPin, Users, AlertTriangle, Tv } from 'lucide-react';

interface SearchResultsProps {
  stations: PollingStation[];
  onStationSelect: (station: PollingStation) => void;
  isVisible: boolean;
}

export default function SearchResults({ stations, onStationSelect, isVisible }: SearchResultsProps) {
  if (!isVisible || stations.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-card border border-border rounded-lg shadow-lg mb-6 max-h-96 overflow-y-auto">
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">
          검색 결과 ({stations.length}개)
        </h3>
      </div>
      
      <div className="divide-y divide-border">
        {stations.map((station) => (
          <div
            key={station.id}
            onClick={() => onStationSelect(station)}
            className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <h4 className="font-medium text-foreground">{station.name}</h4>
                  
                  {/* 상태 표시 */}
                  <div className="flex items-center gap-1">
                    {station.isActive ? (
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    ) : (
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    )}
                    
                    {station.alerts.some(alert => !alert.resolved) && (
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                    )}
                    
                    {(station.youtubeUrls?.morning || station.youtubeUrls?.afternoon) && (
                      <Tv className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-2">{station.address}</p>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>입장: {station.entryCount}명</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>퇴장: {station.exitCount}명</span>
                  </div>
                  {station.alerts.some(alert => !alert.resolved) && (
                    <div className="text-orange-500 font-medium">
                      알림 {station.alerts.filter(alert => !alert.resolved).length}개
                    </div>
                  )}
                </div>
              </div>
              
              <div className="ml-4">
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    station.isActive ? 'text-green-500' : 'text-gray-400'
                  }`}>
                    {station.isActive ? '모니터링 중' : '비활성'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {station.lastUpdated.toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 