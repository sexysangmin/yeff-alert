'use client';

import { useState, useEffect } from 'react';
import { X, Shield, User, Youtube, Phone, MapPin, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PollingStation } from '@/types';

interface VideoRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VideoRegistrationModal({ isOpen, onClose }: VideoRegistrationModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<'select' | 'monitor-auth' | 'public-info' | 'station-select' | 'register-form'>('select');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [userType, setUserType] = useState<'monitor' | 'public'>('public');
  
  // 투표소 관련 상태
  const [pollingStations, setPollingStations] = useState<PollingStation[]>([]);
  const [filteredStations, setFilteredStations] = useState<PollingStation[]>([]);
  const [stationSearchQuery, setStationSearchQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState<PollingStation | null>(null);
  
  // 영상 등록 폼 상태
  const [formData, setFormData] = useState({
    url: '',
    title: '',
    description: '',
    registeredBy: '',
    contact: '',
    targetDate: 'day1' as 'day1' | 'day2'  // 첫째날/둘째날 선택
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 투표소 데이터 로드
  useEffect(() => {
    if (step === 'station-select' && pollingStations.length === 0) {
      loadPollingStations();
    }
  }, [step]);

  const loadPollingStations = async () => {
    try {
      const response = await fetch('/api/stations');
      if (response.ok) {
        const data = await response.json();
        setPollingStations(data);
        setFilteredStations(data);
      }
    } catch (error) {
      console.error('투표소 데이터 로드 실패:', error);
    }
  };

  // 투표소 검색
  useEffect(() => {
    if (!stationSearchQuery.trim()) {
      setFilteredStations(pollingStations);
    } else {
      const filtered = pollingStations.filter(station =>
        station.name.toLowerCase().includes(stationSearchQuery.toLowerCase()) ||
        station.address.toLowerCase().includes(stationSearchQuery.toLowerCase())
      );
      setFilteredStations(filtered);
    }
  }, [stationSearchQuery, pollingStations]);

  if (!isOpen) return null;

  const handleRoleSelect = (role: 'monitor' | 'public') => {
    setUserType(role);
    if (role === 'monitor') {
      setStep('monitor-auth');
    } else {
      setStep('public-info');
    }
  };

  const handleMonitorAuth = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === 'J112') {
      // 감시단 대시보드로 이동
      onClose();
      resetModal();
      router.push('/monitor');
    } else {
      setError('잘못된 비밀번호입니다.');
    }
  };

  const handlePublicNext = () => {
    setStep('station-select');
  };

  const handleStationSelect = (station: PollingStation) => {
    setSelectedStation(station);
    setStep('register-form');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStation) return;
    
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/public/register-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stationId: selectedStation.id,
          url: formData.url,
          title: formData.title,
          description: formData.description,
          registeredBy: formData.registeredBy,
          contact: formData.contact,
          registeredByType: 'public',
          targetDate: formData.targetDate
        })
      });

      const result = await response.json();

      if (response.ok) {
        const successMessage = userType === 'monitor' 
          ? '✅ 감시관 영상이 성공적으로 등록되고 승인되었습니다!\n\n즉시 공개됩니다.'
          : '✅ 영상이 성공적으로 등록되었습니다!\n\n관리자 승인 후 공개됩니다.';
        
        alert(successMessage);
        onClose();
        resetModal();
      } else {
        setError(result.error || '등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('영상 등록 오류:', error);
      setError('서버 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetModal = () => {
    setStep('select');
    setPassword('');
    setError('');
    setSelectedStation(null);
    setStationSearchQuery('');
    setFormData({
      url: '',
      title: '',
      description: '',
      registeredBy: '',
      contact: '',
      targetDate: 'day1'
    });
  };

  const handleClose = () => {
    onClose();
    resetModal();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto relative z-[10000]">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-2">
            <Youtube className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold text-foreground">영상 등록</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* 역할 선택 단계 */}
          {step === 'select' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center mb-6">
                어떤 역할로 영상을 등록하시겠어요?
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => handleRoleSelect('monitor')}
                  className="w-full p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Shield className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">공식 감시단</h3>
                      <p className="text-sm text-muted-foreground">
                        YEFF 공식 감시단으로 등록하기
                      </p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => handleRoleSelect('public')}
                  className="w-full p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <User className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">일반시민/유튜버</h3>
                      <p className="text-sm text-muted-foreground">
                        일반시민 또는 유튜버로 등록 요청하기
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* 감시단 인증 단계 */}
          {step === 'monitor-auth' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Shield className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">감시단 인증</h3>
                <p className="text-sm text-muted-foreground">
                  감시단 비밀번호를 입력해주세요
                </p>
              </div>

              <form onSubmit={handleMonitorAuth} className="space-y-4">
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
                    autoFocus
                  />
                  {error && (
                    <p className="text-destructive text-sm mt-1">{error}</p>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setStep('select')}
                    className="flex-1 bg-secondary text-secondary-foreground py-2 rounded-md font-medium hover:bg-secondary/80 transition-colors"
                  >
                    뒤로
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-primary-foreground py-2 rounded-md font-medium hover:bg-primary/90 transition-colors"
                  >
                    감시단 로그인
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 일반인 영상 등록 안내 */}
          {step === 'public-info' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">영상 등록 안내</h3>
                <p className="text-sm text-muted-foreground">
                  누구나 투표소 영상을 등록할 수 있습니다
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-blue-900">✅ 등록 절차:</h4>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. 투표소를 선택하세요</li>
                  <li>2. 유튜브 영상 정보를 입력하세요</li>
                  <li>3. 관리자 승인 후 공개됩니다</li>
                </ol>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  💡 실시간 스트리밍 또는 녹화된 영상 모두 가능합니다
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep('select')}
                  className="flex-1 bg-secondary text-secondary-foreground py-2 rounded-md font-medium hover:bg-secondary/80 transition-colors"
                >
                  뒤로
                </button>
                <button
                  onClick={handlePublicNext}
                  className="flex-1 bg-primary text-primary-foreground py-2 rounded-md font-medium hover:bg-primary/90 transition-colors"
                >
                  투표소 선택하기
                </button>
              </div>
            </div>
          )}

          {/* 투표소 선택 단계 */}
          {step === 'station-select' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-foreground">투표소 선택</h3>
                <p className="text-sm text-muted-foreground">
                  영상을 등록할 투표소를 선택해주세요
                </p>
              </div>

              {/* 검색바 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={stationSearchQuery}
                  onChange={(e) => setStationSearchQuery(e.target.value)}
                  placeholder="투표소 이름 또는 주소 검색..."
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* 투표소 목록 */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredStations.length > 0 ? (
                  filteredStations.slice(0, 50).map((station) => (
                    <button
                      key={station.id}
                      onClick={() => handleStationSelect(station)}
                      className="w-full p-3 text-left border border-border rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <h4 className="font-medium text-foreground text-sm">{station.name}</h4>
                          <p className="text-xs text-muted-foreground">{station.address}</p>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    검색 결과가 없습니다
                  </p>
                )}
              </div>

              <button
                onClick={() => setStep('public-info')}
                className="w-full bg-secondary text-secondary-foreground py-2 rounded-md font-medium hover:bg-secondary/80 transition-colors"
              >
                뒤로
              </button>
            </div>
          )}

          {/* 영상 등록 폼 */}
          {step === 'register-form' && selectedStation && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-foreground">영상 등록</h3>
                <div className="bg-secondary/30 rounded-lg p-2 mt-2">
                  <p className="text-sm font-medium text-foreground">{selectedStation.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedStation.address}</p>
                </div>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    유튜브 링크 *
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({...formData, url: e.target.value})}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    투표일 선택 *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="targetDate"
                        value="day1"
                        checked={formData.targetDate === 'day1'}
                        onChange={(e) => setFormData({...formData, targetDate: e.target.value as 'day1' | 'day2'})}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-foreground">5월 29일 (첫째날)</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="targetDate"
                        value="day2"
                        checked={formData.targetDate === 'day2'}
                        onChange={(e) => setFormData({...formData, targetDate: e.target.value as 'day1' | 'day2'})}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-foreground">5월 30일 (둘째날)</span>
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    영상이 해당하는 투표일을 선택해주세요
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    영상 제목 *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="영상 제목을 입력하세요"
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    등록자 이름 *
                  </label>
                  <input
                    type="text"
                    value={formData.registeredBy}
                    onChange={(e) => setFormData({...formData, registeredBy: e.target.value})}
                    placeholder="본명 또는 닉네임"
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    연락처
                  </label>
                  <input
                    type="text"
                    value={formData.contact}
                    onChange={(e) => setFormData({...formData, contact: e.target.value})}
                    placeholder="전화번호 또는 이메일 (선택사항)"
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    영상 설명
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="영상에 대한 간단한 설명 (선택사항)"
                    rows={3}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setStep('station-select')}
                    className="flex-1 bg-secondary text-secondary-foreground py-2 rounded-md font-medium hover:bg-secondary/80 transition-colors"
                    disabled={isSubmitting}
                  >
                    뒤로
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-primary-foreground py-2 rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? '등록 중...' : '영상 등록하기'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* 하단 문의 정보 */}
        <div className="px-6 pb-6 pt-0">
          <div className="pt-4 border-t border-border">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>문의사항이 있으시면</span>
            </div>
            <p className="text-sm text-foreground mt-1 font-medium">
              010-2463-5035로 연락 바랍니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 