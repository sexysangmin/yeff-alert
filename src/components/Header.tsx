'use client';

import { Users, Shield } from 'lucide-react';
import Image from 'next/image';

interface HeaderProps {
  onHomeClick?: () => void;
  onMonitorClick?: () => void;
}

export default function Header({ onHomeClick, onMonitorClick }: HeaderProps) {
  const handleLogoClick = () => {
    if (onHomeClick) {
      onHomeClick();
    } else {
      // 기본적으로 페이지 새로고침으로 홈으로 이동
      window.location.reload();
    }
  };

  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div 
            className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleLogoClick}
          >
            <div className="flex items-center space-x-2">
              {/* YEFF 로고 */}
              <div className="relative w-8 h-8">
                <Image
                  src="/yeff.png"
                  alt="YEFF 로고"
                  width={32}
                  height={32}
                  className="object-contain"
                  onError={(e) => {
                    // 이미지 로드 실패 시 대체 텍스트 표시
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="w-8 h-8 bg-primary rounded text-primary-foreground flex items-center justify-center text-sm font-bold">Y</div>';
                    }
                  }}
                />
              </div>
              
              {/* 자유대학 로고 */}
              <div className="relative w-8 h-8">
                <Image
                  src="/freeuniv.png"
                  alt="자유대학 로고"
                  width={32}
                  height={32}
                  className="object-contain"
                  onError={(e) => {
                    // 이미지 로드 실패 시 대체 텍스트 표시
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="w-8 h-8 bg-secondary rounded text-secondary-foreground flex items-center justify-center text-sm font-bold">자</div>';
                    }
                  }}
                />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                YEFF X 자유대학 ALERT
              </h1>
              <p className="text-sm text-muted-foreground">
                전국 투표소 실시간 모니터링
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-foreground">
              <Users className="h-4 w-4" />
              <span>실시간 모니터링 중</span>
            </div>
            <button
              onClick={onMonitorClick}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-500 hover:shadow-lg transition-all duration-200 shadow-sm"
            >
              <Shield className="h-4 w-4 mr-2" />
              감시단입니다
            </button>
          </div>
        </div>
      </div>
    </header>
  );
} 