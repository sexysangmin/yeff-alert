'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, Activity, AlertTriangle, X } from 'lucide-react';
import { PollingStation } from '@/types';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onFilter: (filters: { district?: string; status: string }) => void;
  pollingStations?: PollingStation[];
  onShowMonitoring?: () => void;
  onShowAlerts?: () => void;
  onShowInactive?: () => void;
  onClearLists?: () => void;
  currentFilter?: string;
  showMap?: boolean;
  onToggleMap?: () => void;
}

export default function SearchBar({ onSearch, onFilter, pollingStations = [], onShowMonitoring, onShowAlerts, onShowInactive, onClearLists, currentFilter, showMap, onToggleMap }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');


  // 외부에서 currentFilter가 변경되면 동기화
  useEffect(() => {
    if (currentFilter && currentFilter !== activeFilter) {
      setActiveFilter(currentFilter);
    }
  }, [currentFilter]);

  // 각 상태별 투표소 수 계산
  const monitoringCount = pollingStations.filter(s => s.isActive).length;
  const alertCount = pollingStations.filter(s => s.alerts.some(a => !a.resolved)).length;
  const inactiveCount = pollingStations.filter(s => !s.isActive).length;
  const totalCount = pollingStations.length;

  // 필터 옵션들
  const statusFilters = [
    { key: 'all', label: '전체', icon: MapPin, color: 'text-muted-foreground', count: totalCount },
    { key: 'active', label: '모니터링 중', icon: Activity, color: 'text-green-500', count: monitoringCount },
    { key: 'alert', label: '알림 발생', icon: AlertTriangle, color: 'text-orange-500', count: alertCount },
    { key: 'inactive', label: '비활성', icon: MapPin, color: 'text-gray-500', count: inactiveCount }
  ];



  // 검색어 변경 처리
  const handleQueryChange = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  // 필터 변경 처리
  const handleFilterChange = (status: string) => {
    setActiveFilter(status);
    onFilter({ 
      status
    });
  };

  // 검색 초기화
  const handleClearSearch = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className="w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto space-y-4 lg:space-y-6">
      {/* 상단 필터 버튼들 */}
      <div className="flex flex-wrap gap-2 justify-center">
        {statusFilters.map((filter) => {
          const Icon = filter.icon;
          const isActive = activeFilter === filter.key;
          
          return (
            <button
              key={filter.key}
              onClick={() => {
                handleFilterChange(filter.key);
                
                // 먼저 기존 목록들을 모두 초기화
                if (onClearLists) {
                  onClearLists();
                }
                
                // 그 다음 해당 버튼에 맞는 목록만 표시
                if (filter.key === 'active' && onShowMonitoring) {
                  onShowMonitoring();
                } else if (filter.key === 'alert' && onShowAlerts) {
                  onShowAlerts();
                } else if (filter.key === 'inactive' && onShowInactive) {
                  onShowInactive();
                }
              }}
              className={`inline-flex items-center px-4 py-2 lg:px-6 lg:py-3 rounded-full text-sm lg:text-base font-medium transition-all hover:scale-105 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md hover:bg-primary/90'
                  : 'bg-secondary/50 text-secondary-foreground hover:bg-secondary/40'
              }`}
            >
              <Icon className={`h-4 w-4 mr-2 ${isActive ? 'text-primary' : filter.color}`} />
              {filter.label}
              {filter.key !== 'all' && filter.key !== 'inactive' && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                  isActive 
                    ? 'bg-primary-foreground text-primary' 
                    : filter.key === 'active' 
                      ? 'bg-emerald-100 text-emerald-700'
                      : filter.key === 'alert'
                        ? 'bg-red-100 text-red-700'
                        : filter.key === 'inactive'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-secondary text-secondary-foreground'
                }`}>
                  {filter.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        {/* 검색 입력창 */}
        <div className="relative flex-1">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="투표소명 또는 주소로 검색..."
              className="w-full bg-secondary border border-border rounded-lg pl-12 pr-12 py-3 lg:py-4 lg:pl-16 lg:pr-16 text-foreground lg:text-lg placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent hover:bg-secondary/40 transition-colors"
            />
            {query && (
              <button
                onClick={handleClearSearch}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
        
        {/* 지도 토글 버튼 */}
        {onToggleMap && (
          <button
            onClick={onToggleMap}
            className={`px-4 py-3 lg:px-6 lg:py-4 rounded-lg font-medium lg:text-lg transition-all duration-200 transform hover:scale-105 whitespace-nowrap ${
              showMap 
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm' 
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border'
            }`}
          >
            {showMap ? '🗺️ 지도 숨기기' : '🗺️ 지도 보기'}
          </button>
        )}
      </div>

      {/* 활성 필터 표시 */}
      {activeFilter !== 'all' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>활성 필터:</span>
          <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded">
            {statusFilters.find(f => f.key === activeFilter)?.label}
          </span>
        </div>
      )}
    </div>
  );
} 