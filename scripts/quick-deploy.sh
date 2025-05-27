#!/bin/bash

echo "🚀 투표소 모니터링 시스템 빠른 배포 스크립트"
echo "=============================================="

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. 환경 변수 확인
echo -e "${BLUE}📋 Step 1: 환경 변수 확인${NC}"
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ .env.local 파일이 없습니다!${NC}"
    echo "다음 내용으로 .env.local 파일을 생성하세요:"
    echo ""
    echo "NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co"
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
    echo "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
    echo "NEXTAUTH_SECRET=your-random-secret"
    echo ""
    exit 1
else
    echo -e "${GREEN}✅ .env.local 파일 확인됨${NC}"
fi

# 2. 의존성 설치
echo -e "${BLUE}📦 Step 2: 의존성 설치${NC}"
npm install --legacy-peer-deps
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 의존성 설치 완료${NC}"
else
    echo -e "${RED}❌ 의존성 설치 실패${NC}"
    exit 1
fi

# 3. 빌드 테스트
echo -e "${BLUE}🔨 Step 3: 프로덕션 빌드 테스트${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 빌드 성공${NC}"
else
    echo -e "${RED}❌ 빌드 실패${NC}"
    exit 1
fi

# 4. Git 커밋 및 푸시
echo -e "${BLUE}📤 Step 4: Git 배포 준비${NC}"
git add .
git commit -m "🚀 Production ready: API integration and database setup"
git push origin main
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Git 푸시 완료${NC}"
else
    echo -e "${YELLOW}⚠️ Git 푸시 실패 (이미 최신 상태일 수 있음)${NC}"
fi

# 5. Vercel CLI 설치 및 배포
echo -e "${BLUE}🌐 Step 5: Vercel 배포${NC}"
if ! command -v vercel &> /dev/null; then
    echo "Vercel CLI 설치 중..."
    npm install -g vercel
fi

echo "Vercel 배포 시작..."
vercel --prod
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Vercel 배포 완료${NC}"
else
    echo -e "${RED}❌ Vercel 배포 실패${NC}"
    echo "수동으로 https://vercel.com 에서 배포해주세요."
fi

# 6. 배포 완료 안내
echo ""
echo -e "${GREEN}🎉 배포 프로세스 완료!${NC}"
echo ""
echo -e "${YELLOW}📋 다음 단계:${NC}"
echo "1. Vercel 대시보드에서 배포 URL 확인"
echo "2. 환경 변수가 올바르게 설정되었는지 확인"
echo "3. 데이터베이스 초기화: curl -X POST https://your-domain.vercel.app/api/init"
echo "4. 사이트 접속하여 기능 테스트"
echo ""
echo -e "${BLUE}💡 유용한 명령어:${NC}"
echo "로컬 테스트: npm run dev"
echo "빌드 테스트: npm run build"
echo "배포 확인: vercel --prod"
echo ""
echo -e "${GREEN}🚀 성공적인 배포를 위해 DEPLOYMENT_GUIDE.md를 참조하세요!${NC}" 