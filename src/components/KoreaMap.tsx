'use client';

import { useEffect, useState } from 'react';
import { PollingStation } from '@/types';

interface KoreaMapProps {
  pollingStations: PollingStation[];
  onStationSelect: (station: PollingStation) => void;
  selectedStation?: PollingStation;
}

export default function KoreaMap({ pollingStations, onStationSelect, selectedStation }: KoreaMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [mapComponents, setMapComponents] = useState<any>(null);

  useEffect(() => {
    // 클라이언트 사이드에서만 Leaflet 로드
    const loadMap = async () => {
      if (typeof window !== 'undefined') {
        const L = (await import('leaflet')).default;
        const { MapContainer, TileLayer, Marker, Popup } = await import('react-leaflet');
        
        // Leaflet 기본 아이콘 문제 해결
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        setMapComponents({ MapContainer, TileLayer, Marker, Popup, L });
        setIsClient(true);
      }
    };

    loadMap();
  }, []);

  // 한국 중심 좌표
  const center: [number, number] = [36.5, 127.5];

  if (!isClient || !mapComponents) {
    return (
      <div className="w-full h-[600px] bg-card border border-border rounded-lg flex items-center justify-center">
        <div className="text-muted-foreground">지도 로딩 중...</div>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, L } = mapComponents;

  const createCustomIcon = (station: PollingStation) => {
    let color = '#22c55e'; // 기본 녹색 (정상)
    
    if (station.alerts.some(alert => !alert.resolved)) {
      const hasEmergency = station.alerts.some(alert => alert.type === 'emergency' && !alert.resolved);
      color = hasEmergency ? '#ef4444' : '#f59e0b'; // 빨간색 (긴급) 또는 주황색 (일반 알림)
    } else if (!station.isActive) {
      color = '#6b7280'; // 회색 (비활성)
    }

    return L.divIcon({
      html: `
        <div style="
          width: 20px;
          height: 20px;
          background-color: ${color};
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
      `,
      className: '',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  };

  return (
    <div className="w-full h-[600px] bg-card border border-border rounded-lg overflow-hidden relative z-0">
      <MapContainer
        center={center}
        zoom={7}
        style={{ height: '100%', width: '100%' }}
        className="leaflet-container"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {pollingStations.map((station) => (
          <Marker
            key={station.id}
            position={[station.coordinates.lat, station.coordinates.lng]}
            icon={createCustomIcon(station)}
            eventHandlers={{
              click: () => onStationSelect(station)
            }}
          >
            <Popup>
              <div className="p-2 min-w-[250px]">
                <h3 className="font-bold text-lg mb-2">{station.name}</h3>
                <p className="text-sm text-gray-300 mb-2">{station.address}</p>
                
                <div className="flex justify-between text-sm mb-2">
                  <span>입장: {station.entryCount}명</span>
                  <span>퇴장: {station.exitCount}명</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded ${
                    station.isActive 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-600 text-white'
                  }`}>
                    {station.isActive ? '라이브 중' : '비활성'}
                  </span>
                  
                  {station.alerts.some(alert => !alert.resolved) && (
                    <span className="text-xs px-2 py-1 rounded bg-red-600 text-white">
                      알림 {station.alerts.filter(alert => !alert.resolved).length}건
                    </span>
                  )}
                </div>
                
                <button
                  onClick={() => onStationSelect(station)}
                  className="w-full mt-3 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  상세보기
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
} 