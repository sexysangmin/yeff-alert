'use client';

import { useState } from 'react';
import { PollingStation } from '@/types';
import { X, MapPin, Users, Clock, AlertTriangle, Youtube, DoorOpen, Building, UserCheck } from 'lucide-react';

interface PollingStationDetailProps {
  station: PollingStation;
  onClose: () => void;
}

export default function PollingStationDetail({ station, onClose }: PollingStationDetailProps) {
  const [selectedTime, setSelectedTime] = useState<'morning' | 'afternoon'>('morning');
  
  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return null;
    
    console.log('🎥 유튜브 URL 변환 시도:', url);
    
    // YouTube URL을 embed URL로 변환 (더 포괄적인 패턴)
    let videoId = null;
    
    // 일반적인 패턴들
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,  // youtube.com/watch?v=...
      /(?:youtu\.be\/)([^&\n?#]+)/,              // youtu.be/...
      /(?:youtube\.com\/embed\/)([^&\n?#]+)/,    // youtube.com/embed/...
      /(?:youtube\.com\/v\/)([^&\n?#]+)/         // youtube.com/v/...
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        videoId = match[1];
        break;
      }
    }
    
    if (!videoId) {
      console.error('❌ 유효하지 않은 유튜브 URL:', url);
      return null;
    }
    
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
    console.log('✅ 유튜브 embed URL 생성:', embedUrl);
    
    return embedUrl;
  };

  const currentUrl = selectedTime === 'morning' 
    ? station.youtubeUrls?.morning 
    : station.youtubeUrls?.afternoon;
  
  const embedUrl = currentUrl ? getYoutubeEmbedUrl(currentUrl) : null;
  
  // 현재 시간에 따라 기본 선택 결정
  const currentHour = new Date().getHours();
  const defaultTime = currentHour < 12 ? 'morning' : 'afternoon';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-[10000]">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">{station.name}</h2>
            <p className="text-sm text-muted-foreground flex items-center mt-1">
              <MapPin className="h-4 w-4 mr-1" />
              {station.address}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 시간 선택 탭 */}
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedTime('morning')}
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                selectedTime === 'morning'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <Clock className="h-4 w-4 mr-2" />
              오전 (06:00 - 12:00)
            </button>
            <button
              onClick={() => setSelectedTime('afternoon')}
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                selectedTime === 'afternoon'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <Clock className="h-4 w-4 mr-2" />
              오후 (12:00 - 18:00)
            </button>
          </div>

          {/* 라이브 스트림 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center">
              <Youtube className="h-5 w-5 mr-2" />
              실시간 모니터링
            </h3>
            
            {embedUrl ? (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={`${station.name} ${selectedTime === 'morning' ? '오전' : '오후'} 라이브`}
                />
              </div>
            ) : (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Youtube className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>
                    {selectedTime === 'morning' ? '오전' : '오후'} 라이브 스트림이 
                    <br />
                    아직 등록되지 않았습니다
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 출입 인원 세부 정보 */}
          {station.entryDetails && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center">
                <Users className="h-5 w-5 mr-2" />
                출입 인원 현황
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-background border border-border rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <DoorOpen className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium text-foreground">입구</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground mt-1">{station.entryDetails.entrance}명</p>
                </div>
                
                <div className="bg-background border border-border rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Building className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium text-foreground">관내</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground mt-1">{station.entryDetails.inside}명</p>
                </div>
                
                <div className="bg-background border border-border rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="h-5 w-5 text-purple-500" />
                    <span className="text-sm font-medium text-foreground">관외</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground mt-1">{station.entryDetails.outside}명</p>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground text-center">
                마지막 업데이트: {station.entryDetails.lastUpdated.toLocaleString('ko-KR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
            </div>
          )}

          {/* 알림 정보 */}
          {station.alerts.filter(alert => !alert.resolved).length > 0 && (
            <div className="bg-background border border-border rounded-lg p-4">
              <div className="flex items-center space-x-2 justify-center">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span className="text-sm font-medium text-foreground">현재 알림</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1 text-center">
                {station.alerts.filter(alert => !alert.resolved).length}건
              </p>
            </div>
          )}

          {/* 알림 목록 */}
          {station.alerts.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">최근 알림</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {station.alerts
                  .filter(alert => !alert.resolved)
                  .slice(0, 3)
                  .map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-md border ${
                        alert.type === 'emergency'
                          ? 'bg-red-50 border-red-200 text-red-800'
                          : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">{alert.message}</span>
                      </div>
                      {alert.comment && (
                        <p className="text-sm mt-2 pl-6">
                          {alert.comment}
                        </p>
                      )}
                      <p className="text-xs mt-1">
                        {alert.timestamp.toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 상태 정보 */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <span className="text-sm text-muted-foreground">투표소 상태</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              station.isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {station.isActive ? '모니터링 중' : '비활성'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 