import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PolarReels",
  description: "숏폼 창작 방향성 분석",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
