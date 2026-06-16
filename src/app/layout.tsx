import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "weld-board · 团队看板",
  description: "模块边界 · 统一技术方案 · 谁在做什么 · 产品功能",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
