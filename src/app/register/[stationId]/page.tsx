'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PollingStation, VideoStream } from '@/types';
import { Youtube, MapPin, Clock, User, Phone, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

export default function PublicRegisterPage() {
  const params = useParams();
  const router = useRouter();
  const stationId = params.stationId as string;
  
  const [station, setStation] = useState<PollingStation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // 폼 상태
  const [formData, setFormData] = useState({
    url: '',
    title: '',
    description: '',
    registeredBy: '',
    contact: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadStation();
  }, [stationId]);

  const loadStation = async () => {
    try {
      const response = await fetch('/api/stations');
      if (response.ok) {
        const stations = await response.json();
        const foundStation = stations.find((s: PollingStation) => s.id === stationId);
        if (foundStation) {
          setStation(foundStation);
        } else {
          router.push('/'); // 투표소를 찾을 수 없으면 메인으로
        }
      }
    } catch (error) {
      console.error('투표소 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.url.trim()) {
      newErrors.url = '유튜브 링크를 입력해주세요';
    } else if (!formData.url.toLowerCase().includes('youtube')) {
      newErrors.url = '올바른 유튜브 링크를 입력해주세요';
    }
    
    if (!formData.title.trim()) {
      newErrors.title = '영상 제목을 입력해주세요';
    }
    
    if (!formData.registeredBy.trim()) {
      newErrors.registeredBy = '등록자 이름을 입력해주세요';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    
    try {
      const response = await fetch('/api/public/register-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stationId,
          ...formData,
          registeredByType: 'public'
        })
      });

      if (response.ok) {
        setSubmitted(true);
        // 3초 후 메인 페이지로 이동
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        const errorData = await response.json();
        alert(`등록 실패: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('등록 오류:', error);
      alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">투표소 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">투표소를 찾을 수 없습니다</h1>
          <p className="text-muted-foreground mb-4">요청하신 투표소 정보가 존재하지 않습니다.</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            메인 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">등록 완료!</h1>
          <p className="text-muted-foreground mb-4">
            영상이 성공적으로 등록되었습니다. 곧 메인 페이지로 이동합니다.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              등록된 영상은 관리자 승인 후 공개됩니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <div className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/yeff-circle-logo.png" 
                alt="YEFF 로고" 
                className="h-8 w-8"
              />
              <h1 className="text-xl font-bold text-foreground">YEFF ALERT</h1>
            </div>
            <button
              onClick={() => router.push('/')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              메인 페이지로
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 투표소 정보 */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-start space-x-4">
            <div className="bg-primary/10 p-3 rounded-lg">
              <Youtube className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground mb-2">
                {station.name} 영상 등록
              </h2>
              <p className="text-muted-foreground flex items-center mb-1">
                <MapPin className="h-4 w-4 mr-1" />
                {station.address}
              </p>
              <p className="text-sm text-muted-foreground">
                이 투표소의 실시간 모니터링을 위한 유튜브 라이브 영상을 등록할 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* 기존 등록된 영상들 */}
        {station.streams && station.streams.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-foreground mb-4">현재 등록된 영상들</h3>
            <div className="space-y-3">
              {station.streams.map((stream) => (
                <div key={stream.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{stream.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      등록자: {stream.registeredBy} • {new Date(stream.registeredAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <a
                    href={stream.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors flex items-center"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    시청
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 등록 폼 */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">새 영상 등록</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Youtube className="inline h-4 w-4 mr-1" />
                유튜브 라이브 링크 *
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
                className={`w-full px-3 py-2 bg-background border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.url ? 'border-red-500' : 'border-border'
                }`}
              />
              {errors.url && <p className="text-sm text-red-500 mt-1">{errors.url}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                영상 제목 *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="예: 서울 종로구 청운효자동 투표소 라이브"
                className={`w-full px-3 py-2 bg-background border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.title ? 'border-red-500' : 'border-border'
                }`}
              />
              {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                영상 설명 (선택사항)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="영상에 대한 간단한 설명을 입력해주세요"
                rows={3}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <User className="inline h-4 w-4 mr-1" />
                등록자 이름 *
              </label>
              <input
                type="text"
                value={formData.registeredBy}
                onChange={(e) => setFormData({ ...formData, registeredBy: e.target.value })}
                placeholder="이름 또는 닉네임"
                className={`w-full px-3 py-2 bg-background border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.registeredBy ? 'border-red-500' : 'border-border'
                }`}
              />
              {errors.registeredBy && <p className="text-sm text-red-500 mt-1">{errors.registeredBy}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Phone className="inline h-4 w-4 mr-1" />
                연락처 (선택사항)
              </label>
              <input
                type="text"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                placeholder="전화번호 또는 이메일"
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">등록 전 확인사항</p>
                  <ul className="space-y-1 text-xs">
                    <li>• 유튜브 라이브 영상만 등록 가능합니다</li>
                    <li>• 등록된 영상은 관리자 승인 후 공개됩니다</li>
                    <li>• 부적절한 영상은 삭제될 수 있습니다</li>
                    <li>• 투표 방해 행위는 금지됩니다</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                  등록 중...
                </>
              ) : (
                <>
                  <Youtube className="h-4 w-4 mr-2" />
                  영상 등록하기
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 