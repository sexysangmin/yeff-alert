'use client';

import { useEffect, useRef, useState } from 'react';
import { PollingStation } from '@/types';

interface NaverMapProps {
  pollingStations: PollingStation[];
  onStationSelect: (station: PollingStation) => void;
  selectedStation?: PollingStation;
}

// 네이버 지도 타입 정의
declare global {
  interface Window {
    naver: any;
  }
}

export default function NaverMap({ pollingStations, onStationSelect, selectedStation }: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 네이버 지도 스크립트 로드
  useEffect(() => {
    const loadNaverMapScript = () => {
      if (window.naver) {
        console.log('네이버 지도 API 이미 로드됨');
        setIsLoaded(true);
        return;
      }

      const script = document.createElement('script');
      const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || 'p550kqn29b';
      console.log('네이버 지도 Client ID:', clientId);
      script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`;
      script.async = true;
      script.onload = () => {
        console.log('네이버 지도 스크립트 로드 성공');
        setIsLoaded(true);
      };
      script.onerror = (error) => {
        console.error('네이버 지도 스크립트 로드 실패:', error);
      };
      document.head.appendChild(script);
    };

    loadNaverMapScript();
  }, []);

  // 지도 초기화
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.naver) {
      console.log('지도 초기화 조건 확인:', { isLoaded, hasMapRef: !!mapRef.current, hasNaver: !!window.naver });
      return;
    }

    console.log('네이버 지도 초기화 시작');

    // 약간의 지연을 주어 DOM이 완전히 준비되도록 함
    const initMap = () => {
      try {
        if (!mapRef.current) return;

        // 컨테이너 크기 확인
        const container = mapRef.current;
        console.log('지도 컨테이너 크기:', {
          width: container.offsetWidth,
          height: container.offsetHeight,
          display: getComputedStyle(container).display
        });

        const mapOptions = {
          center: new window.naver.maps.LatLng(37.5665, 126.9780), // 서울 중심
          zoom: 10,
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: window.naver.maps.MapTypeControlStyle.BUTTON,
            position: window.naver.maps.Position.TOP_RIGHT
          },
          zoomControl: true,
          zoomControlOptions: {
            style: window.naver.maps.ZoomControlStyle.LARGE,
            position: window.naver.maps.Position.TOP_LEFT
          }
        };

        const naverMap = new window.naver.maps.Map(container, mapOptions);
        console.log('네이버 지도 생성 성공:', naverMap);
        
        // 지도 리사이즈 이벤트 리스너 추가
        const resizeMap = () => {
          if (naverMap) {
            window.naver.maps.Event.trigger(naverMap, 'resize');
          }
        };

        // 지도가 완전히 로드된 후 resize 트리거
        window.naver.maps.Event.once(naverMap, 'init', () => {
          console.log('지도 초기화 완료');
          setTimeout(resizeMap, 100);
        });

        setMap(naverMap);
      } catch (error) {
        console.error('네이버 지도 초기화 오류:', error);
      }
    };

    // DOM이 완전히 준비될 때까지 조금 기다림
    setTimeout(initMap, 100);
  }, [isLoaded]);

  // 마커 생성 및 업데이트
  useEffect(() => {
    if (!map || !window.naver) return;

    // 기존 마커들 제거
    markers.forEach(marker => marker.setMap(null));

    const newMarkers = pollingStations.map(station => {
      // 마커 색상 결정
      let iconColor = '#22c55e'; // 기본 녹색 (정상)
      
      if (station.alerts.some(alert => !alert.resolved)) {
        const hasEmergency = station.alerts.some(alert => alert.type === 'emergency' && !alert.resolved);
        iconColor = hasEmergency ? '#ef4444' : '#f59e0b'; // 빨간색 (긴급) 또는 주황색 (일반 알림)
      } else if (!station.isActive) {
        iconColor = '#6b7280'; // 회색 (비활성)
      }

      // 커스텀 마커 HTML
      const markerHtml = `
        <div style="
          width: 20px;
          height: 20px;
          background-color: ${iconColor};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ${station.alerts.some(alert => !alert.resolved) ? 'animation: pulse 2s infinite;' : ''}
        "></div>
        <style>
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
          }
        </style>
      `;

      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(station.coordinates.lat, station.coordinates.lng),
        map: map,
        icon: {
          content: markerHtml,
          size: new window.naver.maps.Size(20, 20),
          origin: new window.naver.maps.Point(0, 0),
          anchor: new window.naver.maps.Point(10, 10)
        }
      });

      // 정보창 생성
      const infoWindow = new window.naver.maps.InfoWindow({
        content: `
          <div style="
            padding: 16px; 
            min-width: 250px; 
            background: rgb(38 38 38); 
            color: white; 
            border-radius: 8px;
            font-family: Arial, sans-serif;
          ">
            <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 8px; color: white;">
              ${station.name}
            </h3>
            <p style="font-size: 14px; color: rgb(209 213 219); margin-bottom: 8px;">
              ${station.address}
            </p>
            
            <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px;">
              <span>입장: ${station.entryCount}명</span>
              <span>퇴장: ${station.exitCount}명</span>
            </div>
            
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <span style="
                font-size: 12px; 
                padding: 4px 8px; 
                border-radius: 4px; 
                background: ${station.isActive ? '#16a34a' : '#dc2626'};
                color: white;
              ">
                ${station.isActive ? '라이브 중' : '비활성'}
              </span>
              
              ${station.alerts.some(alert => !alert.resolved) ? `
                <span style="
                  font-size: 12px; 
                  padding: 4px 8px; 
                  border-radius: 4px; 
                  background: #dc2626;
                  color: white;
                ">
                  알림 ${station.alerts.filter(alert => !alert.resolved).length}건
                </span>
              ` : ''}
            </div>
            
            <button 
              onclick="window.selectStation('${station.id}')"
              style="
                width: 100%; 
                margin-top: 12px; 
                background: #2563eb; 
                color: white; 
                padding: 8px 12px; 
                border-radius: 4px; 
                border: none;
                cursor: pointer;
                font-size: 14px;
              "
              onmouseover="this.style.background='#1d4ed8'"
              onmouseout="this.style.background='#2563eb'"
            >
              상세보기
            </button>
          </div>
        `,
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        borderWidth: 0,
        anchorSize: new window.naver.maps.Size(0, 0),
        pixelOffset: new window.naver.maps.Point(0, -10)
      });

      // 마커 클릭 이벤트
      window.naver.maps.Event.addListener(marker, 'click', () => {
        // 모든 정보창 닫기
        markers.forEach(m => m.infoWindow?.close());
        
        // 현재 정보창 열기
        infoWindow.open(map, marker);
        marker.infoWindow = infoWindow;
      });

      // 마커에 정보창 연결
      marker.infoWindow = infoWindow;
      marker.station = station;

      return marker;
    });

    setMarkers(newMarkers);

    // 전역 함수 등록 (정보창에서 사용)
    window.selectStation = (stationId: string) => {
      const station = pollingStations.find(s => s.id === stationId);
      if (station) {
        onStationSelect(station);
      }
    };

    return () => {
      // 정리
      newMarkers.forEach(marker => {
        if (marker.infoWindow) {
          marker.infoWindow.close();
        }
        marker.setMap(null);
      });
    };
  }, [map, pollingStations, onStationSelect]);

  // 선택된 투표소가 변경되면 해당 마커로 이동
  useEffect(() => {
    if (!map || !selectedStation) return;

    const targetMarker = markers.find(marker => 
      marker.station && marker.station.id === selectedStation.id
    );

    if (targetMarker) {
      map.setCenter(new window.naver.maps.LatLng(
        selectedStation.coordinates.lat, 
        selectedStation.coordinates.lng
      ));
      map.setZoom(15);
    }
  }, [selectedStation, map, markers]);

  if (!isLoaded) {
    return (
      <div className="w-full h-[600px] bg-card border border-border rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-muted-foreground">네이버 지도 로딩 중...</div>
          <div className="text-xs text-muted-foreground mt-2">
            잠시만 기다려주세요. 네이버 지도 API를 불러오고 있습니다.
          </div>
        </div>
      </div>
    );
  }

  // 네이버 지도 API가 로드되었지만 지도가 아직 초기화되지 않은 경우
  if (!map && isLoaded) {
    return (
      <div className="w-full h-[600px] bg-card border border-border rounded-lg overflow-hidden">
        <div 
          ref={mapRef} 
          className="w-full h-full naver-map-container"
          style={{
            width: '100%',
            height: '600px',
            minHeight: '600px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div className="text-center text-muted-foreground">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            <div className="text-sm">지도 초기화 중...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] bg-card border border-border rounded-lg overflow-hidden" style={{ height: '600px' }}>
      <div 
        ref={mapRef} 
        className="naver-map-container" 
        style={{
          width: '100%',
          height: '600px',
          minHeight: '600px',
          position: 'relative',
          display: 'block'
        }}
      />
    </div>
  );
}

// 정리 함수
declare global {
  interface Window {
    selectStation: (stationId: string) => void;
  }
} 