# 🗳️ 투표소 실시간 모니터링 시스템

> **50,000명 동시접속 가능한 프로덕션급 투표소 모니터링 플랫폼**

![Next.js](https://img.shields.io/badge/Next.js-15.3.2-black)
![React](https://img.shields.io/badge/React-19.1.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-Latest-blue)
![Supabase](https://img.shields.io/badge/Supabase-Database-green)
![Vercel](https://img.shields.io/badge/Vercel-Deployment-black)

## 🚀 주요 기능

### 👥 **사용자 기능**
- 🗺️ **실시간 지도**: 전국 3,568개 투표소 위치 표시
- 🔍 **스마트 검색**: 투표소명, 주소 검색
- 📊 **실시간 통계**: 활성 투표소, 알림 현황
- 📱 **반응형 디자인**: 모바일, 태블릿, 데스크톱 최적화

### 👨‍💼 **관리자 기능**
- 🎥 **영상 링크 등록**: 유튜브 라이브 스트림 연동
- 🚨 **긴급 알림 시스템**: 실시간 상황 공유
- 👥 **출입 인원 관리**: 실시간 카운팅
- 💾 **데이터 저장**: 모든 변경사항 자동 저장

### 🛠️ **기술적 특징**
- ⚡ **실시간 업데이트**: API 기반 동기화
- 🔄 **자동 백업**: JSON 폴백 시스템
- 🌍 **CDN 최적화**: 전세계 빠른 로딩
- 🔒 **보안**: Row Level Security (RLS)

## 📊 성능 스펙

| 항목 | 성능 |
|------|------|
| **동시 접속자** | 50,000명 |
| **응답 시간** | < 500ms |
| **가용성** | 99.9% |
| **데이터베이스** | PostgreSQL (Supabase) |
| **CDN** | Global Edge Network |

## 🏗️ 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   사용자 브라우저  │ → │   Vercel CDN    │ → │   Next.js API   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Leaflet 지도   │    │   React 컴포넌트 │    │ Supabase 데이터베이스│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## ⚡ 빠른 시작 (1분 설치)

### **1. 프로젝트 클론**
```bash
git clone https://github.com/your-username/yeff-alert.git
cd yeff-alert
```

### **2. 의존성 설치**
```bash
npm install --legacy-peer-deps
```

### **3. 환경 변수 설정**
`.env.local` 파일 생성:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXTAUTH_SECRET=your_secret
```

### **4. 개발 서버 시작**
```bash
npm run dev
```

http://localhost:3000 에서 확인!

## 🚀 하루 만에 배포하기

### **자동 배포 스크립트 (권장)**
```bash
# Windows PowerShell
.\scripts\quick-deploy.ps1

# Linux/Mac
./scripts/quick-deploy.sh
```

### **수동 배포**
자세한 가이드는 [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md)를 참조하세요.

## 📱 스크린샷

### 🏠 메인 화면
- 실시간 투표소 현황
- 인터랙티브 지도
- 스마트 검색 기능

### 🗺️ 클러스터링 지도
- 줌 레벨별 자동 그룹화
- 행정구역별 표시
- 투표소 상세 정보

### 👨‍💼 관리자 대시보드
- 영상 링크 등록
- 긴급 알림 발송
- 출입 인원 관리

## 🛠️ 기술 스택

### **Frontend**
- **Framework**: Next.js 15.3.2 (App Router)
- **UI Library**: React 19 + TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Maps**: Leaflet + React-Leaflet

### **Backend**
- **API Routes**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: NextAuth.js (향후 추가)
- **File Storage**: Vercel Static Files

### **DevOps**
- **Deployment**: Vercel
- **Database Hosting**: Supabase
- **Version Control**: Git
- **CI/CD**: Vercel Git Integration

## 📚 API 문서

### **투표소 API**
```typescript
GET /api/stations          // 모든 투표소 조회
PUT /api/stations          // 투표소 업데이트
```

### **알림 API**
```typescript
POST /api/alerts           // 알림 생성
PUT /api/alerts            // 알림 상태 업데이트
```

### **데이터베이스 초기화**
```typescript
POST /api/init             // JSON 데이터 → DB 마이그레이션
```

## 🔧 개발 가이드

### **로컬 개발**
```bash
npm run dev          # 개발 서버
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버
npm run lint         # 코드 검사
```

### **데이터베이스 관리**
```bash
# 데이터베이스 초기화
curl -X POST http://localhost:3000/api/init

# 투표소 업데이트 테스트
curl -X PUT http://localhost:3000/api/stations \
  -H "Content-Type: application/json" \
  -d '{"stationId":"station_1","updates":{"isActive":true}}'
```

## 💰 운영 비용

| 플랜 | 월 비용 | 동시 접속자 | 적용 대상 |
|------|---------|-------------|-----------|
| **Free** | $0 | 500명 | 개발/테스트 |
| **Pro** | $45 | 50,000명 | 운영 환경 |
| **Enterprise** | $999 | 무제한 | 대규모 이벤트 |

## 🤝 기여하기

1. 이 저장소를 포크하세요
2. 기능 브랜치를 만드세요 (`git checkout -b feature/AmazingFeature`)
3. 변경사항을 커밋하세요 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 푸시하세요 (`git push origin feature/AmazingFeature`)
5. Pull Request를 열어주세요

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 지원

- 🐛 **버그 리포트**: [GitHub Issues](https://github.com/your-username/yeff-alert/issues)
- 💬 **질문**: [GitHub Discussions](https://github.com/your-username/yeff-alert/discussions)
- 📧 **이메일**: support@your-domain.com

## 🎉 특별 감사

- **Leaflet**: 오픈소스 지도 라이브러리
- **Supabase**: 백엔드 인프라
- **Vercel**: 배포 플랫폼
- **Next.js**: React 프레임워크

---

**⭐ 이 프로젝트가 유용하다면 스타를 눌러주세요!**

Made with ❤️ for transparent and fair elections
