'use client';

import { useEffect, useState } from 'react';
import { PollingStation } from '@/types';

interface ClusteredMapProps {
  pollingStations: PollingStation[];
  onStationSelect: (station: PollingStation) => void;
  selectedStation?: PollingStation;
}

export default function ClusteredMap({ pollingStations, onStationSelect, selectedStation }: ClusteredMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [mapComponents, setMapComponents] = useState<any>(null);
  const [mapKey, setMapKey] = useState(() => `map-${Date.now()}-${Math.random()}`);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setMounted(true);
    
    const loadMapComponents = async () => {
      try {
        const leaflet = await import('leaflet');
        const { MapContainer, TileLayer, useMap } = await import('react-leaflet');
        
        // MarkerCluster 플러그인 로드
        await import('leaflet.markercluster');
        
        console.log('🗺️ 클러스터링 지도 컴포넌트 로드 완료');
        
        setMapComponents({
          MapContainer,
          TileLayer,
          useMap,
          L: leaflet.default
        });
      } catch (error) {
        console.error('클러스터링 지도 로드 실패:', error);
      }
    };

    if (isClient) {
      loadMapComponents();
    }
  }, [isClient]);

  // 클라이언트에서만 렌더링
  if (!isClient || !mapComponents || !mounted) {
    return (
      <div className="h-[600px] bg-secondary rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">클러스터링 지도 로딩 중...</p>
        </div>
      </div>
    );
  }

  const { MapContainer, TileLayer, useMap, L } = mapComponents;

  // 클러스터링 컴포넌트
  function ClusterGroup() {
    const map = useMap();

    useEffect(() => {
      if (!map || !L || !L.markerClusterGroup) return;
      
      // 기존 클러스터 레이어들 완전 제거
      map.eachLayer((layer: any) => {
        if (layer instanceof L.MarkerClusterGroup || layer.options?.chunkedLoading) {
          map.removeLayer(layer);
        }
      });

      console.log('📊 클러스터링 시작:', pollingStations.length, '개 투표소');

      // 마커 클러스터 그룹 생성
      const markers = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 80, // 클러스터 반경
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        removeOutsideVisibleBounds: false,
        animate: true,
        animateAddingMarkers: false,
        // 커스텀 클러스터 아이콘 생성
        iconCreateFunction: function(cluster: any) {
          const childCount = cluster.getChildCount();
          const markers = cluster.getAllChildMarkers();
          
          // 클러스터 내 투표소들의 행정구역 분석
          const getLocationLevel = (station: any, zoomLevel: number) => {
            if (!station.address) return station.district || '지역';
            
            const address = station.address;
            const parts = address.split(' ');
            
            if (zoomLevel < 8) {
              // 매우 낮은 줌: 시/도 (서울, 경기, 부산 등)
              return parts[0] || station.district;
            } else if (zoomLevel < 10) {
              // 낮은 줌: 시/군/구 (종로구, 수원시, 해운대구 등)
              if (parts.length > 1) {
                return parts[1] || parts[0];
              }
              return parts[0] || station.district;
            } else if (zoomLevel < 12) {
              // 중간 줌: 동/읍/면 (청운효자동, 영통동 등)
              if (parts.length > 2) {
                return parts[2] || parts[1];
              } else if (parts.length > 1) {
                return parts[1];
              }
              return parts[0] || station.district;
            } else {
              // 높은 줌: 상세 지역
              if (parts.length > 3) {
                return parts[3] || parts[2];
              } else if (parts.length > 2) {
                return parts[2];
              }
              return parts[1] || parts[0] || station.district;
            }
          };
          
          const locations: { [key: string]: number } = {};
          const currentZoom = map.getZoom();
          
          markers.forEach((marker: any) => {
            const station = marker.options.stationData;
            if (station) {
              const location = getLocationLevel(station, currentZoom);
              locations[location] = (locations[location] || 0) + 1;
            }
          });
          
          // 가장 많은 투표소가 있는 행정구역
          const primaryLocation = Object.keys(locations).reduce((a, b) => 
            locations[a] > locations[b] ? a : b, Object.keys(locations)[0]
          );
          
          // 줌 레벨에 따른 표시 방식 결정
          let displayText = '';
          let className = 'cluster-icon';
          
          if (currentZoom < 8) {
            // 매우 낮은 줌: 시/도명만
            displayText = primaryLocation || '지역';
            className += ' cluster-district';
          } else if (currentZoom < 10) {
            // 낮은 줌: 시/군/구명만
            displayText = primaryLocation || '지역';
            className += ' cluster-district';
          } else if (currentZoom < 12) {
            // 중간 줌: 동/읍/면 + 개수
            displayText = `${primaryLocation}<br><small>${childCount}개</small>`;
            className += ' cluster-district-count';
          } else {
            // 높은 줌: 개수만 (곧 개별 마커로 분리될 예정)
            displayText = childCount.toString();
            className += ' cluster-count';
          }
          
          return L.divIcon({
            html: `<div class="${className}"><span>${displayText}</span></div>`,
            className: 'custom-cluster-icon',
            iconSize: [40, 40]
          });
        }
      });

      // 투표소 마커들 추가
      pollingStations.forEach((station) => {
        if (!station.coordinates) return;

        // 줌 레벨에 따른 커스텀 아이콘 생성
        const currentZoom = map.getZoom();
        let icon;
        
        if (currentZoom >= 13) {
          // 높은 줌: 투표소 이름 표시 (더 간결하게)
          let stationName = station.name;
          // 투표소명에서 불필요한 부분 제거
          stationName = stationName.replace(/사전투표소|투표소/g, '');
          stationName = stationName.length > 8 ? stationName.substring(0, 8) + '...' : stationName;
          
          icon = L.divIcon({
            className: 'custom-station-icon',
            html: `
              <div class="station-marker">
                <div class="station-dot" style="background-color: ${station.isActive ? '#10b981' : '#ef4444'};"></div>
                <div class="station-name">${stationName}</div>
              </div>
            `,
            iconSize: [100, 30],
            iconAnchor: [50, 15]
          });
        } else if (currentZoom >= 11) {
          // 중간 줌: 투표소 이름만 (배경 없이)
          let stationName = station.name;
          stationName = stationName.replace(/사전투표소/g, '');
          stationName = stationName.length > 12 ? stationName.substring(0, 12) + '...' : stationName;
          
          icon = L.divIcon({
            className: 'custom-station-text',
                          html: `
                <div class="station-text-marker" style="color: ${station.isActive ? '#10b981' : '#ef4444'};">
                  <span class="text-dot" style="color: ${station.isActive ? '#10b981' : '#ef4444'};">●</span>
                  ${stationName}
                </div>
              `,
            iconSize: [120, 20],
            iconAnchor: [60, 10]
          });
        } else {
          // 낮은 줌: 작은 점만 (멀리 있을 때)
          icon = L.divIcon({
            className: 'custom-div-icon',
                            html: `
                  <div style="
                    background-color: ${station.isActive ? '#10b981' : '#ef4444'};
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    box-shadow: 0 0 3px rgba(0,0,0,0.3);
                  "></div>
                `,
                            iconSize: [12, 12],
                iconAnchor: [6, 6]
          });
        }

        const marker = L.marker([station.coordinates.lat, station.coordinates.lng], { 
          icon,
          stationData: station // 투표소 데이터를 마커에 저장
        })
          .bindPopup(`
            <div class="p-2 min-w-[200px]">
              <h3 class="font-semibold text-sm mb-1">${station.name}</h3>
              <p class="text-xs text-gray-600 mb-1">${station.address}</p>
              <p class="text-xs">
                <span class="inline-block bg-gray-100 px-2 py-1 rounded mr-1">${station.district}</span>
                ${station.isActive ? '<span class="text-green-600">🟢 모니터링 중</span>' : '<span class="text-red-600">🔴 비활성</span>'}
              </p>
            </div>
          `)
          .on('click', () => {
            console.log('📍 클릭된 투표소:', station.name, station.district);
            onStationSelect(station);
          });

        markers.addLayer(marker);
      });

      // 지도에 클러스터 그룹 추가
      map.addLayer(markers);

      // 줌 레벨 변경 시 마커 스타일 업데이트
      const updateMarkers = () => {
        markers.clearLayers();
        
        pollingStations.forEach((station) => {
          if (!station.coordinates) return;

          const currentZoom = map.getZoom();
          let icon;
          
          if (currentZoom >= 13) {
            let stationName = station.name;
            stationName = stationName.replace(/사전투표소|투표소/g, '');
            stationName = stationName.length > 8 ? stationName.substring(0, 8) + '...' : stationName;
            
            icon = L.divIcon({
              className: 'custom-station-icon',
              html: `
                <div class="station-marker">
                  <div class="station-dot" style="background-color: ${station.isActive ? '#10b981' : '#ef4444'};"></div>
                  <div class="station-name">${stationName}</div>
                </div>
              `,
              iconSize: [100, 30],
              iconAnchor: [50, 15]
            });
          } else if (currentZoom >= 11) {
            let stationName = station.name;
            stationName = stationName.replace(/사전투표소/g, '');
            stationName = stationName.length > 12 ? stationName.substring(0, 12) + '...' : stationName;
            
            icon = L.divIcon({
              className: 'custom-station-text',
              html: `
                <div class="station-text-marker" style="color: ${station.isActive ? '#10b981' : '#ef4444'};">
                  <span class="text-dot" style="color: ${station.isActive ? '#10b981' : '#ef4444'};">●</span>
                  ${stationName}
                </div>
              `,
              iconSize: [120, 20],
              iconAnchor: [60, 10]
            });
          } else {
            icon = L.divIcon({
              className: 'custom-div-icon',
              html: `
                <div style="
                  background-color: ${station.isActive ? '#10b981' : '#ef4444'};
                  width: 8px;
                  height: 8px;
                  border-radius: 50%;
                  box-shadow: 0 0 3px rgba(0,0,0,0.3);
                "></div>
              `,
              iconSize: [12, 12],
              iconAnchor: [6, 6]
            });
          }

          const marker = L.marker([station.coordinates.lat, station.coordinates.lng], { 
            icon,
            stationData: station
          })
            .bindPopup(`
              <div class="p-2 min-w-[200px]">
                <h3 class="font-semibold text-sm mb-1">${station.name}</h3>
                <p class="text-xs text-gray-600 mb-1">${station.address}</p>
                <p class="text-xs">
                  <span class="inline-block bg-gray-100 px-2 py-1 rounded mr-1">${station.district}</span>
                  ${station.isActive ? '<span class="text-green-600">🟢 모니터링 중</span>' : '<span class="text-red-600">🔴 비활성</span>'}
                </p>
              </div>
            `)
            .on('click', () => {
              onStationSelect(station);
            });

          markers.addLayer(marker);
        });
      };

      map.on('zoomend', updateMarkers);

      console.log('✅ 클러스터링 완료:', pollingStations.length, '개 투표소');

      // 정리 함수
      return () => {
        map.off('zoomend', updateMarkers);
        if (map.hasLayer(markers)) {
          map.removeLayer(markers);
        }
      };
    }, [map, L, pollingStations, onStationSelect]);

    return null;
  }

  // 데이터 분석
  const districtCount: { [key: string]: number } = {};
  pollingStations.forEach(station => {
    districtCount[station.district] = (districtCount[station.district] || 0) + 1;
  });

  console.log('🏢 클러스터링 지역별 분포:', districtCount);

  return (
    <div className="relative">
      <div className="absolute top-4 left-4 z-[1000] bg-black/80 text-white px-3 py-1 rounded text-sm">
        🎯 총 {pollingStations.length}개 투표소 (클러스터링) - 줌인하면 개별 마커
      </div>
      
      <div className="absolute top-4 right-4 z-[1000] bg-black/80 text-white px-3 py-1 rounded text-xs">
        💡 원하는 지역을 줌인하거나 클릭하여 투표소를 확인하세요
      </div>
      
      <MapContainer
        key={mapKey}
        center={[36.5, 127.8]}
        zoom={7}
        style={{ height: '600px', width: '100%' }}
        className="rounded-lg"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <ClusterGroup />
      </MapContainer>
    </div>
  );
} 