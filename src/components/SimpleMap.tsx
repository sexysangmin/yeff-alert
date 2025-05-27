'use client';

import { useEffect, useState } from 'react';
import { PollingStation } from '@/types';

interface SimpleMapProps {
  pollingStations: PollingStation[];
  onStationSelect: (station: PollingStation) => void;
  selectedStation?: PollingStation;
}

export default function SimpleMap({ pollingStations, onStationSelect, selectedStation }: SimpleMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [mapComponents, setMapComponents] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);
    
    // 동적 임포트로 지도 컴포넌트 로드
    const loadMapComponents = async () => {
      try {
        const { MapContainer, TileLayer, CircleMarker, Popup } = await import('react-leaflet');
        console.log('🗺️ 지도 컴포넌트 로드 완료');
        
        setMapComponents({
          MapContainer,
          TileLayer,
          CircleMarker,
          Popup
        });
      } catch (error) {
        console.error('지도 로드 실패:', error);
      }
    };

    if (isClient) {
      loadMapComponents();
    }
  }, [isClient]);

  // 클라이언트에서만 렌더링
  if (!isClient || !mapComponents) {
    return (
      <div className="h-[600px] bg-secondary rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">지도 로딩 중...</p>
        </div>
      </div>
    );
  }

  const { MapContainer, TileLayer, CircleMarker, Popup } = mapComponents;

  // 데이터 분석
  console.log('📊 투표소 데이터:', pollingStations.length, '개');
  
  const districtCount: { [key: string]: number } = {};
  pollingStations.forEach(station => {
    districtCount[station.district] = (districtCount[station.district] || 0) + 1;
  });
  console.log('🏢 전체 지역별 분포:', districtCount);

  const mapStations = pollingStations.slice(0, 500).filter(station => station.coordinates);
  const mapDistrictCount: { [key: string]: number } = {};
  mapStations.forEach(station => {
    mapDistrictCount[station.district] = (mapDistrictCount[station.district] || 0) + 1;
  });
  console.log('🗺️ 지도 표시될 500개 투표소 지역별 분포:', mapDistrictCount);

  return (
    <div className="relative">
      <div className="absolute top-4 left-4 z-[1000] bg-black/80 text-white px-3 py-1 rounded text-sm">
        📍 총 {pollingStations.length}개 투표소 표시 중
      </div>
      
      <MapContainer
        center={[36.5, 127.8]}
        zoom={7}
        style={{ height: '600px', width: '100%' }}
        className="rounded-lg"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {pollingStations.map((station) => {
          if (!station.coordinates) {
            return null;
          }
          
          return (
            <CircleMarker
              key={station.id}
              center={[station.coordinates.lat, station.coordinates.lng]}
              radius={station.isActive ? 6 : 4}
              fillColor={station.isActive ? '#10b981' : '#ef4444'}
              color={station.isActive ? '#059669' : '#dc2626'}
              weight={1}
              opacity={0.9}
              fillOpacity={0.7}
              eventHandlers={{
                click: () => {
                  console.log('📍 클릭된 투표소:', station.name, station.district);
                  onStationSelect(station);
                }
              }}
            >
              <Popup>
                <div className="text-sm">
                  <h3 className="font-semibold">{station.name}</h3>
                  <p className="text-gray-600">{station.address}</p>
                  <p className="text-xs mt-1">
                    지역: <span className="font-medium">{station.district}</span> | 상태: {station.isActive ? '🟢 모니터링 중' : '🔴 비활성'}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
} 