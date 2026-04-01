import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCP-Guard — Security Audit Platform",
  description: "Monitor, score, and protect your MCP tools",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
