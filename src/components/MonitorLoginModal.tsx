'use client';

import { useState } from 'react';
import { X, Shield, Phone } from 'lucide-react';

interface MonitorLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (isAuthenticated: boolean) => void;
}

export default function MonitorLoginModal({ isOpen, onClose, onLogin }: MonitorLoginModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === 'J112') {
      onLogin(true);
      onClose();
      setPassword('');
      setError('');
    } else {
      setError('잘못된 비밀번호입니다.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4 relative z-[10000]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold text-foreground">감시단 인증</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              감시단 인증 비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {error && (
              <p className="text-destructive text-sm mt-1">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:bg-primary/90 transition-colors"
          >
            로그인
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span>영상 링크 등록을 원할시</span>
          </div>
          <p className="text-sm text-foreground mt-1 font-medium">
            010-2463-5035로 문의 바랍니다.
          </p>
        </div>
      </div>
    </div>
  );
} 