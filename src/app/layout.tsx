import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import "./globals.css";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "실리콘밸리 개인 일정표",
  description: "이름과 조를 입력하면 실리콘밸리 연수 일정을 개인 기준으로 정리해 보여주는 모바일 웹앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>{children}</body>
    </html>
  );
}
