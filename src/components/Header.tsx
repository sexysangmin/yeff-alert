'use client';

import { Users, Shield } from 'lucide-react';
import Image from 'next/image';

interface HeaderProps {
  onHomeClick?: () => void;
  onMonitorClick?: () => void;
}

export default function Header({ onHomeClick, onMonitorClick }: HeaderProps) {
  const handleLogoClick = () => {
    // 홈으로 이동한 후 새로고침 (현재 페이지가 홈이 아닐 수도 있으므로)
    if (window.location.pathname !== '/') {
      window.location.href = '/';
    } else {
      window.location.reload();
    }
  };

  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12 sm:h-16">
          <div 
            className="flex items-center space-x-1 sm:space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleLogoClick}
          >
            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* YEFF 로고 */}
              <div className="relative w-6 h-6 sm:w-10 sm:h-10">
                <Image
                  src="/yeff-circle-logo.png"
                  alt="YEFF 로고"
                  width={40}
                  height={40}
                  className="object-contain rounded-full"
                  onError={(e) => {
                    // 이미지 로드 실패 시 대체 텍스트 표시
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="w-6 h-6 sm:w-10 sm:h-10 bg-primary rounded-full text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-bold">Y</div>';
                    }
                  }}
                />
              </div>
              
              {/* 자유대학 로고 */}
              <div className="relative w-6 h-6 sm:w-10 sm:h-10">
                <Image
                  src="/freeuniv.png"
                  alt="자유대학 로고"
                  width={40}
                  height={40}
                  className="object-contain"
                  onError={(e) => {
                    // 이미지 로드 실패 시 대체 텍스트 표시
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="w-6 h-6 sm:w-10 sm:h-10 bg-secondary rounded text-secondary-foreground flex items-center justify-center text-xs sm:text-sm font-bold">자</div>';
                    }
                  }}
                />
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-xl font-bold text-foreground truncate">
                <span className="hidden sm:inline">YEFF X 자유대학 ALERT</span>
                <span className="sm:hidden">YEFF</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                전국 투표소 실시간 모니터링
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-4">
            {/* 모바일에서는 상태 표시 숨김 */}
            <div className="hidden md:flex items-center space-x-2 text-sm text-foreground">
              <Users className="h-4 w-4" />
              <span>실시간 모니터링 중</span>
            </div>
            
            {/* 관리자 대시보드 링크 - 모바일에서 더 작게 */}
            <a
              href="/admin"
              className="hidden sm:inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 hover:shadow-lg transition-all duration-200 shadow-sm text-xs"
            >
              📊 관리자
            </a>
            
            {/* 모바일용 관리자 버튼 (아이콘만) */}
            <a
              href="/admin"
              className="sm:hidden inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
              title="관리자"
            >
              <span className="text-sm">📊</span>
            </a>
            
            {/* 감시단 버튼 - 모바일에서 더 작게 */}
            <button
              onClick={onMonitorClick}
              className="inline-flex items-center px-2 py-1 sm:px-4 sm:py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-500 hover:shadow-lg transition-all duration-200 shadow-sm text-xs sm:text-sm"
            >
              <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">감시단입니다</span>
              <span className="sm:hidden">감시단</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
} 