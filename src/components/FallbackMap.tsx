'use client';

import { PollingStation } from '@/types';

interface FallbackMapProps {
  pollingStations: PollingStation[];
  onStationSelect: (station: PollingStation) => void;
}

export default function FallbackMap({ pollingStations, onStationSelect }: FallbackMapProps) {
  // 지역별로 그룹화
  const groupedStations = pollingStations.reduce((groups, station) => {
    const district = station.district || '기타';
    if (!groups[district]) {
      groups[district] = [];
    }
    groups[district].push(station);
    return groups;
  }, {} as Record<string, PollingStation[]>);

  return (
    <div className="w-full h-[600px] bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden shadow-lg">
      <div className="bg-slate-800/80 text-slate-300 p-4 text-center border-b border-slate-700">
        🗺️ 지도 대신 지역별 목록으로 표시
        <br />
        <span className="text-sm text-slate-400">투표소를 클릭하여 상세 정보를 확인하세요</span>
      </div>
      
      <div className="h-[540px] overflow-y-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(groupedStations).map(([district, stations]) => (
            <div key={district} className="bg-slate-800/90 rounded-lg border border-slate-700 p-4 shadow-md hover:bg-slate-800 transition-colors">
              <h3 className="font-bold text-lg mb-3 text-emerald-400">
                📍 {district} ({stations.length}개)
              </h3>
              
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {stations.slice(0, 5).map((station, index) => (
                  <div 
                    key={station.id || index}
                    className="p-2 border border-slate-600 rounded hover:bg-slate-700/70 cursor-pointer transition-colors"
                    onClick={() => onStationSelect(station)}
                  >
                    <div className="font-medium text-sm text-white">{station.name}</div>
                    <div className="text-xs text-slate-400">{station.address}</div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className={`px-1 py-0.5 rounded text-xs ${
                        station.isActive 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-slate-700 text-slate-400'
                      }`}>
                        {station.isActive ? '활성' : '비활성'}
                      </span>
                      <span className="text-slate-400">
                        입장: {station.entryCount || 0} | 퇴장: {station.exitCount || 0}
                      </span>
                    </div>
                  </div>
                ))}
                
                {stations.length > 5 && (
                  <div className="text-center text-xs text-slate-400 py-2">
                    +{stations.length - 5}개 더...
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {Object.keys(groupedStations).length === 0 && (
          <div className="text-center text-slate-400 py-8">
            투표소 데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
} 