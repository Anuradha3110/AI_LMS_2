import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI-LMS Platform",
  description: "Universal AI-powered Learning Management System. Multi-tenant, plug-in for any website. 53 database tables, 100+ endpoints.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

