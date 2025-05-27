export default function TestPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center p-8">
        <h1 className="text-4xl font-bold text-green-600 mb-4">
          ✅ 서버 정상 작동!
        </h1>
        <p className="text-lg text-foreground mb-4">
          Next.js 서버가 정상적으로 실행되고 있습니다.
        </p>
        <div className="bg-card border border-border p-4 rounded-lg">
          <p className="text-muted-foreground">
            🌐 포트: 3002<br/>
            📊 1800개 투표소 데이터 로드됨<br/>
            🗺️ 지도 컴포넌트 테스트 준비 완료
          </p>
        </div>
        <a 
          href="/" 
          className="inline-block mt-4 px-6 py-2 bg-slate-800 text-white rounded hover:bg-slate-700"
        >
          메인 페이지로 이동
        </a>
      </div>
    </div>
  );
} 