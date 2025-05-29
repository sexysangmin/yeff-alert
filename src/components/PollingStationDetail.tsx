'use client';

import { useState } from 'react';
import { PollingStation } from '@/types';
import { X, MapPin, Users, Clock, AlertTriangle, Youtube, DoorOpen, Building, UserCheck, ExternalLink } from 'lucide-react';

interface PollingStationDetailProps {
  station: PollingStation;
  onClose: () => void;
}

export default function PollingStationDetail({ station, onClose }: PollingStationDetailProps) {
  const [selectedDate, setSelectedDate] = useState<'day1' | 'day2'>('day1');
  const [activeStreamIndex, setActiveStreamIndex] = useState(0);
  
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
      /(?:youtube\.com\/v\/)([^&\n?#]+)/,         // youtube.com/v/...
      /(?:youtube\.com\/live\/)([^&\n?#]+)/,     // youtube.com/live/...
      /(?:youtube\.com\/shorts\/)([^&\n?#]+)/,    // youtube.com/shorts/...
      /(?:youtube\.com\/)([^&\n?#\/]+)/,         // youtube.com/... (기타 모든 경로)
      /(?:youtu\.be\/)([^&\n?#\/]+)/             // youtu.be/... (기타 모든 경로)
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

  // targetDate 기준으로 필터링 (승인되지 않은 영상도 포함)
  const filteredStreams = station.streams ? 
    station.streams.filter(stream => stream.targetDate === selectedDate) : [];

  // 감시관 영상을 위로, 승인된 영상을 우선 정렬
  const sortedStreams = [...filteredStreams].sort((a, b) => {
    // 감시단 영상을 최우선으로 배치
    if (a.registeredByType === 'monitor' && b.registeredByType !== 'monitor') return -1;
    if (a.registeredByType !== 'monitor' && b.registeredByType === 'monitor') return 1;
    
    // 같은 유형 내에서는 승인된 영상을 먼저 배치
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    
    // streamStatus가 undefined인 경우 'unknown'으로 처리
    const aStatus = a.streamStatus || 'unknown';
    const bStatus = b.streamStatus || 'unknown';
    
    // 라이브중인 영상을 먼저 배치
    if (aStatus === 'live' && bStatus !== 'live') return -1;
    if (aStatus !== 'live' && bStatus === 'live') return 1;
    // 같은 상태일 경우 등록일 기준으로 정렬
    return new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime();
  });

  // 스트림 상태 텍스트 반환 함수
  const getStreamStatusText = (status?: string) => {
    switch (status) {
      case 'live':
        return '라이브중';
      case 'offline':
        return '라이브 종료';
      default:
        return '상태 확인중';
    }
  };

  // 스트림 상태 색상 반환 함수
  const getStreamStatusColor = (status?: string) => {
    switch (status) {
      case 'live':
        return 'bg-red-500';
      case 'offline':
        return 'bg-gray-400';
      default:
        return 'bg-yellow-500';
    }
  };

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
          {/* 날짜 선택 탭 */}
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedDate('day1')}
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                selectedDate === 'day1'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <Clock className="h-4 w-4 mr-2" />
              5월 29일 (첫째날)
            </button>
            <button
              onClick={() => setSelectedDate('day2')}
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                selectedDate === 'day2'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <Clock className="h-4 w-4 mr-2" />
              5월 30일 (둘째날)
            </button>
          </div>
          
          {/* 유튜브 영상 섹션 */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <Youtube className="h-5 w-5 mr-2" />
              실시간 영상
            </h3>
            
            {/* 공식 감시단 영상 (크게 표시) - 선택된 날짜의 오전/오후 영상 */}
            {station.youtubeDayUrls && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center">
                    <Youtube className="h-5 w-5 mr-2 text-red-500" />
                    공식 감시단 영상 ({selectedDate === 'day1' ? '5월 29일' : '5월 30일'})
                  </h3>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                    👁️ 공식 모니터링
                  </span>
                </div>
                
                <div className="space-y-6">
                  {/* 선택된 날짜의 오전 영상 */}
                  {station.youtubeDayUrls[selectedDate]?.morning && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                          🌅 오전 영상 ({selectedDate === 'day1' ? '5월 29일' : '5월 30일'})
                        </span>
                        <a
                          href={station.youtubeDayUrls[selectedDate].morning}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center font-medium"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          실시간 댓글 참여
                        </a>
                      </div>
                      <div className="aspect-video bg-secondary rounded-xl overflow-hidden shadow-lg">
                        {getYoutubeEmbedUrl(station.youtubeDayUrls[selectedDate].morning) ? (
                          <iframe
                            src={getYoutubeEmbedUrl(station.youtubeDayUrls[selectedDate].morning)!}
                            title={`${selectedDate === 'day1' ? '5월 29일' : '5월 30일'} 오전 공식 감시단 영상`}
                            className="w-full h-full"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <p>유효하지 않은 유튜브 링크입니다</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* 선택된 날짜의 오후 영상 */}
                  {station.youtubeDayUrls[selectedDate]?.afternoon && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium">
                          🌆 오후 영상 ({selectedDate === 'day1' ? '5월 29일' : '5월 30일'})
                        </span>
                        <a
                          href={station.youtubeDayUrls[selectedDate].afternoon}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center font-medium"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          실시간 댓글 참여
                        </a>
                      </div>
                      <div className="aspect-video bg-secondary rounded-xl overflow-hidden shadow-lg">
                        {getYoutubeEmbedUrl(station.youtubeDayUrls[selectedDate].afternoon) ? (
                          <iframe
                            src={getYoutubeEmbedUrl(station.youtubeDayUrls[selectedDate].afternoon)!}
                            title={`${selectedDate === 'day1' ? '5월 29일' : '5월 30일'} 오후 공식 감시단 영상`}
                            className="w-full h-full"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <p>유효하지 않은 유튜브 링크입니다</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 기존 공식 감시단 영상 (폴백용) */}
            {!station.youtubeDayUrls && (station.youtubeUrls?.morning || station.youtubeUrls?.afternoon) && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center">
                    <Youtube className="h-5 w-5 mr-2 text-red-500" />
                    공식 감시단 영상 (기존)
                  </h3>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                    👁️ 공식 모니터링
                  </span>
                </div>
                
                <div className="space-y-6">
                  {station.youtubeUrls?.morning && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                          🌅 오전 영상
                        </span>
                        <a
                          href={station.youtubeUrls.morning}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center font-medium"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          실시간 댓글 참여
                        </a>
                      </div>
                      <div className="aspect-video bg-secondary rounded-xl overflow-hidden shadow-lg">
                        {getYoutubeEmbedUrl(station.youtubeUrls.morning) ? (
                          <iframe
                            src={getYoutubeEmbedUrl(station.youtubeUrls.morning)!}
                            title="오전 공식 감시단 영상"
                            className="w-full h-full"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <p>유효하지 않은 유튜브 링크입니다</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {station.youtubeUrls?.afternoon && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium">
                          🌆 오후 영상
                        </span>
                        <a
                          href={station.youtubeUrls.afternoon}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center font-medium"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          실시간 댓글 참여
                        </a>
                      </div>
                      <div className="aspect-video bg-secondary rounded-xl overflow-hidden shadow-lg">
                        {getYoutubeEmbedUrl(station.youtubeUrls.afternoon) ? (
                          <iframe
                            src={getYoutubeEmbedUrl(station.youtubeUrls.afternoon)!}
                            title="오후 공식 감시단 영상"
                            className="w-full h-full"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <p>유효하지 않은 유튜브 링크입니다</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 시민 및 감시단 등록 영상들 (그리드 형식, 감시단 우선 정렬) */}
            {sortedStreams.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-foreground flex items-center">
                    <Users className="h-5 w-5 mr-2 text-green-500" />
                    등록된 영상 ({selectedDate === 'day1' ? '5월 29일' : '5월 30일'})
                  </h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                      👁️ 감시단: {sortedStreams.filter(s => s.registeredByType === 'monitor').length}개
                    </span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                      👤 시민: {sortedStreams.filter(s => s.registeredByType === 'public').length}개
                    </span>
                  </div>
                </div>
                
                {/* 영상 그리드 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {sortedStreams.map((stream) => (
                    <div key={stream.id} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                      {/* 영상 헤더 */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            stream.registeredByType === 'admin' 
                              ? 'bg-purple-100 text-purple-800'
                              : stream.registeredByType === 'monitor'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {stream.registeredByType === 'admin' ? '👮 관리자' :
                             stream.registeredByType === 'monitor' ? '👁️ 감시단' :
                             '👤 시민'}
                          </span>
                          <div className="flex items-center space-x-1">
                            <div className={`w-2 h-2 rounded-full ${getStreamStatusColor(stream.streamStatus)}`} />
                            <span className="text-xs font-medium text-foreground">
                              {getStreamStatusText(stream.streamStatus)}
                            </span>
                          </div>
                        </div>
                        {!stream.isActive && stream.registeredByType !== 'monitor' && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                            승인 대기
                          </span>
                        )}
                        {stream.registeredByType === 'monitor' && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            자동 승인
                          </span>
                        )}
                      </div>

                      {/* 영상 제목 */}
                      <h5 className="font-medium text-foreground mb-2" style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {stream.title}
                      </h5>

                      {/* 영상 플레이어 */}
                      <div className="aspect-video bg-secondary rounded-lg overflow-hidden mb-3">
                        {getYoutubeEmbedUrl(stream.url) ? (
                          <iframe
                            src={getYoutubeEmbedUrl(stream.url)!}
                            title={stream.title}
                            className="w-full h-full"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <p className="text-sm">유효하지 않은 유튜브 링크</p>
                          </div>
                        )}
                      </div>

                      {/* 영상 설명 */}
                      {stream.description && (
                        <div className="bg-secondary/30 rounded-lg p-3 mb-3">
                          <p className="text-sm text-foreground" style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {stream.description}
                          </p>
                        </div>
                      )}

                      {/* 영상 정보 및 액션 */}
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>등록자: {stream.registeredBy}</p>
                          <p>등록: {stream.registeredAt.toLocaleString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</p>
                        </div>
                        <a
                          href={stream.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center font-medium"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          실시간 댓글 참여
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 영상이 없을 때 */}
            {(!station.youtubeDayUrls || 
              (!station.youtubeDayUrls[selectedDate]?.morning && !station.youtubeDayUrls[selectedDate]?.afternoon)) && 
             (!station.youtubeUrls?.morning && !station.youtubeUrls?.afternoon) && 
             sortedStreams.length === 0 && (
              <div className="text-center py-8">
                <Youtube className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground mb-4">
                  {selectedDate === 'day1' ? '5월 29일' : '5월 30일'}에 등록된 실시간 영상이 없습니다.
                </p>
                <p className="text-sm text-muted-foreground">
                  영상 등록을 원하시면 우측 상단의 "영상등록" 버튼을 이용해주세요.
                </p>
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