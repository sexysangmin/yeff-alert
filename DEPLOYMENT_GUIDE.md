# 🚀 투표소 모니터링 시스템 배포 가이드

## 📋 단계별 배포 과정 (총 소요시간: 2-3시간)

### 1️⃣ Supabase 데이터베이스 설정 (30분)

#### **1.1 Supabase 계정 생성**
1. https://supabase.com 접속
2. "Start your project" 클릭
3. GitHub 계정으로 로그인
4. "New Project" 클릭

#### **1.2 프로젝트 생성**
1. **Organization**: Personal (또는 새로 생성)
2. **Project Name**: `yeff-alert-db`
3. **Database Password**: 강력한 비밀번호 설정 (꼭 기록해두세요!)
4. **Region**: Northeast Asia (Seoul) - 한국 사용자를 위해
5. **Pricing Plan**: Free tier (시작용) 또는 Pro ($25/월, 더 안정적)

#### **1.3 데이터베이스 테이블 생성**
프로젝트가 생성되면 SQL Editor에서 다음 쿼리 실행:

```sql
-- 투표소 테이블
CREATE TABLE polling_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  district TEXT NOT NULL,
  coordinates_lat DECIMAL(10, 8) NOT NULL,
  coordinates_lng DECIMAL(11, 8) NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  youtube_morning_url TEXT,
  youtube_afternoon_url TEXT,
  entry_count INTEGER DEFAULT 0,
  exit_count INTEGER DEFAULT 0,
  entrance_count INTEGER DEFAULT 0,
  inside_count INTEGER DEFAULT 0,
  outside_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 알림 테이블
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  polling_station_id UUID REFERENCES polling_stations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  comment TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  admin_id TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_polling_stations_district ON polling_stations(district);
CREATE INDEX idx_polling_stations_active ON polling_stations(is_active);
CREATE INDEX idx_alerts_station_id ON alerts(polling_station_id);
CREATE INDEX idx_alerts_resolved ON alerts(resolved);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE polling_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
CREATE POLICY "Allow read access for all users" ON polling_stations FOR SELECT USING (true);
CREATE POLICY "Allow read access for all users" ON alerts FOR SELECT USING (true);

-- 인증된 사용자만 쓰기 가능 (나중에 관리자 인증 추가 시)
CREATE POLICY "Allow insert for authenticated users" ON polling_stations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update for authenticated users" ON polling_stations FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow insert for authenticated users" ON alerts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

#### **1.4 API 키 복사**
1. Settings → API 메뉴 이동
2. **Project URL** 복사
3. **anon public** 키 복사
4. **service_role** 키 복사 (조심히 보관!)

---

### 2️⃣ 환경 변수 설정 (5분)

프로젝트 루트에 `.env.local` 파일 생성:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Next.js
NEXTAUTH_SECRET=your-random-secret-here
```

---

### 3️⃣ 로컬 테스트 (15분)

```bash
# 개발 서버 시작
npm run dev

# 브라우저에서 http://localhost:3000 접속
# 브라우저 콘솔에서 다음 메시지 확인:
# "🔄 API에서 투표소 데이터 로드 중..."
# "❌ API 데이터 로드 실패, JSON 폴백 시도:" (정상 - 아직 DB가 비어있음)

# 데이터베이스 초기화 (한 번만 실행)
curl -X POST http://localhost:3000/api/init

# 다시 새로고침하면:
# "✅ API 데이터 로드 완료: 3568개 투표소" (성공!)
```

---

### 4️⃣ Vercel 배포 (20분)

#### **4.1 Vercel 계정 생성**
1. https://vercel.com 접속
2. GitHub 계정으로 로그인

#### **4.2 프로젝트 배포**
1. "Add New..." → "Project" 클릭
2. GitHub 저장소 연결 (yeff-alert)
3. Framework Preset: Next.js (자동 감지)
4. **Environment Variables 추가**:
   ```
   NEXT_PUBLIC_SUPABASE_URL = your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key
   SUPABASE_SERVICE_ROLE_KEY = your-service-role-key
   NEXTAUTH_SECRET = your-random-secret
   ```
5. "Deploy" 클릭

#### **4.3 배포 확인**
1. 배포 완료 후 URL 접속 (예: https://yeff-alert.vercel.app)
2. 데이터베이스 초기화: `curl -X POST https://your-domain.vercel.app/api/init`
3. 사이트 새로고침하여 데이터 로드 확인

---

### 5️⃣ 성능 최적화 (30분)

#### **5.1 Supabase 설정 최적화**
```sql
-- 커넥션 풀링 최적화
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';

-- 쿼리 성능 최적화
ANALYZE polling_stations;
ANALYZE alerts;
```

#### **5.2 Vercel 설정**
1. Project Settings → Functions
2. **Region**: Seoul (iad1) - 한국 사용자 최적화
3. **Function Memory**: 1024MB (Pro 플랜 필요)

---

### 6️⃣ 도메인 연결 (선택사항, 10분)

#### **6.1 커스텀 도메인 구매**
- Namecheap, GoDaddy 등에서 도메인 구매

#### **6.2 Vercel에 도메인 연결**
1. Project Settings → Domains
2. 도메인 추가 및 DNS 설정

---

## 🚦 성능 벤치마크 목표

### **최소 성능 요구사항**
- ✅ **동시 접속자**: 50,000명
- ✅ **응답 시간**: < 500ms
- ✅ **가용성**: 99.9%
- ✅ **데이터 일관성**: 실시간 동기화

### **예상 트래픽 처리량**
- **API 요청**: 50,000 req/min
- **DB 쿼리**: 100,000 queries/min
- **대역폭**: 10GB/hour

---

## 💰 예상 비용 (월간)

### **Free Tier (개발/테스트용)**
- Vercel: $0
- Supabase: $0
- **총계**: $0/월
- **제한**: 동시접속 500명

### **Production (운영용)**
- Vercel Pro: $20/월
- Supabase Pro: $25/월
- **총계**: $45/월
- **제한**: 동시접속 50,000명

### **High Traffic (피크 시간)**
- Vercel Enterprise: $400/월
- Supabase Team: $599/월
- **총계**: $999/월
- **제한**: 무제한

---

## 🔧 문제 해결

### **자주 발생하는 오류**

#### 1. "API 데이터 로드 실패"
```bash
# 해결책: 환경변수 확인
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

#### 2. "Database connection failed"
- Supabase 프로젝트가 일시 정지되었을 수 있음
- Dashboard에서 프로젝트 재시작

#### 3. "Too many connections"
```sql
-- 연결 수 확인
SELECT count(*) FROM pg_stat_activity;

-- 유휴 연결 종료
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle';
```

---

## 📞 지원 및 연락처

### **긴급 상황 (24시간)**
- **Vercel Status**: https://vercel-status.com
- **Supabase Status**: https://status.supabase.com

### **기술 지원**
- **Vercel Support**: https://vercel.com/help
- **Supabase Discord**: https://discord.supabase.com

---

**🎉 축하합니다! 투표소 모니터링 시스템이 성공적으로 배포되었습니다!** 