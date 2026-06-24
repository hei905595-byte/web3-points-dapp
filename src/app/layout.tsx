import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nova Points — Web3 Rewards",
  description: "Connect your wallet, complete quests and earn onchain-ready points.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
