import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThemeRegistry from "@/components/providers/ThemeRegistry";

export const metadata: Metadata = {
  title: "RVA Miles - Work Mileage Tracker",
  description: "Track work mileage for expense reimbursement",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RVA Miles",
  },
};

export const viewport: Viewport = {
  themeColor: "#8B5CF6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
