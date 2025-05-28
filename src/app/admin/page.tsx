'use client';

import { useState, useEffect } from 'react';
import { PollingStation } from '@/types';
import AdminDashboard from '@/components/AdminDashboard';

export default function AdminPage() {
  const [pollingStations, setPollingStations] = useState<PollingStation[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 세션에서 인증 상태 확인
    const adminAuth = sessionStorage.getItem('admin_authenticated');
    if (adminAuth === 'true') {
      setIsAuthenticated(true);
      loadPollingStations();
    } else {
      setLoading(false);
    }
  }, []);

  const loadPollingStations = async () => {
    try {
      const response = await fetch('/api/stations');
      if (response.ok) {
        const data = await response.json();
        setPollingStations(data);
      }
    } catch (error) {
      console.error('투표소 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // 관리자 비밀번호 확인 (실제로는 더 안전한 인증 시스템 필요)
    if (password === 'melodie2001!') {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_authenticated', 'true');
      loadPollingStations();
    } else {
      alert('잘못된 비밀번호입니다.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
            <h1 className="text-2xl font-bold text-center text-foreground mb-6">관리자 로그인</h1>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                  관리자 비밀번호
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="비밀번호를 입력하세요"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition-colors font-medium"
              >
                로그인
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminDashboard pollingStations={pollingStations} />
    </div>
  );
} 