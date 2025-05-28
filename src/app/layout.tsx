import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "YEFF X 자유대학 ALERT - 전국 투표소 실시간 모니터링",
  description: "투명하고 공정한 선거를 위한 시민 감시 시스템",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // 외부 스크립트 오류 무시
              window.addEventListener('error', function(e) {
                if (e.filename && (e.filename.includes('infird.com') || e.filename.includes('cdn'))) {
                  e.preventDefault();
                  return false;
                }
              });
              
              // 네트워크 오류 무시
              window.addEventListener('unhandledrejection', function(e) {
                if (e.reason && e.reason.message && e.reason.message.includes('ERR_CONNECTION_RESET')) {
                  e.preventDefault();
                  return false;
                }
              });
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}
