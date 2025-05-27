# 투표소 모니터링 시스템 빠른 배포 스크립트 (PowerShell)

Write-Host "🚀 투표소 모니터링 시스템 빠른 배포 스크립트" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. 환경 변수 확인
Write-Host "`n📋 Step 1: 환경 변수 확인" -ForegroundColor Blue
if (!(Test-Path ".env.local")) {
    Write-Host "❌ .env.local 파일이 없습니다!" -ForegroundColor Red
    Write-Host "다음 내용으로 .env.local 파일을 생성하세요:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co"
    Write-Host "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
    Write-Host "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
    Write-Host "NEXTAUTH_SECRET=your-random-secret"
    Write-Host ""
    exit 1
} else {
    Write-Host "✅ .env.local 파일 확인됨" -ForegroundColor Green
}

# 2. 의존성 설치
Write-Host "`n📦 Step 2: 의존성 설치" -ForegroundColor Blue
npm install --legacy-peer-deps
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 의존성 설치 완료" -ForegroundColor Green
} else {
    Write-Host "❌ 의존성 설치 실패" -ForegroundColor Red
    exit 1
}

# 3. 빌드 테스트
Write-Host "`n🔨 Step 3: 프로덕션 빌드 테스트" -ForegroundColor Blue
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 빌드 성공" -ForegroundColor Green
} else {
    Write-Host "❌ 빌드 실패" -ForegroundColor Red
    exit 1
}

# 4. Git 상태 확인
Write-Host "`n📤 Step 4: Git 배포 준비" -ForegroundColor Blue
git add .
git commit -m "🚀 Production ready: API integration and database setup"
git push origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Git 푸시 완료" -ForegroundColor Green
} else {
    Write-Host "⚠️ Git 푸시 실패 (이미 최신 상태일 수 있음)" -ForegroundColor Yellow
}

# 5. Vercel 배포 안내
Write-Host "`n🌐 Step 5: Vercel 배포" -ForegroundColor Blue
Write-Host "Vercel CLI 설치 및 배포를 진행합니다..." -ForegroundColor Yellow

# Vercel CLI 설치 확인
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if (!$vercelInstalled) {
    Write-Host "Vercel CLI 설치 중..." -ForegroundColor Yellow
    npm install -g vercel
}

# Vercel 배포
Write-Host "Vercel 배포 시작..." -ForegroundColor Yellow
vercel --prod

# 6. 배포 완료 안내
Write-Host ""
Write-Host "🎉 배포 프로세스 완료!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 다음 단계:" -ForegroundColor Yellow
Write-Host "1. Vercel 대시보드에서 배포 URL 확인"
Write-Host "2. 환경 변수가 올바르게 설정되었는지 확인"
Write-Host "3. 데이터베이스 초기화: curl -X POST https://your-domain.vercel.app/api/init"
Write-Host "4. 사이트 접속하여 기능 테스트"
Write-Host ""
Write-Host "💡 유용한 명령어:" -ForegroundColor Blue
Write-Host "로컬 테스트: npm run dev"
Write-Host "빌드 테스트: npm run build"
Write-Host "배포 확인: vercel --prod"
Write-Host ""
Write-Host "🚀 성공적인 배포를 위해 DEPLOYMENT_GUIDE.md를 참조하세요!" -ForegroundColor Green 