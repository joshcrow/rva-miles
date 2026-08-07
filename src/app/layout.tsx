import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { ThemeProvider } from "@mui/material/styles";
import theme from "@/theme/theme";
import AppShell from "@/components/AppShell";
import SnackbarHost from "@/components/SnackbarHost";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "RVA Miles",
  description:
    "Log work drives in one tap and send the pay-period mileage report in three.",
  applicationName: "RVA Miles",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RVA Miles",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#7C3AED",
  width: "device-width",
  initialScale: 1,
  // Deliberately NOT locking maximumScale/userScalable: pinch-zoom stays
  // available. Inputs are 16px (theme) so iOS never auto-zooms on focus.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body>
        {/* Resolves the stored/system color scheme before paint — no flash,
            no blank screen while the theme hydrates. */}
        <InitColorSchemeScript attribute="data-mui-color-scheme" defaultMode="system" />
        <AppRouterCacheProvider options={{ key: "mui" }}>
          <ThemeProvider theme={theme} defaultMode="system" disableTransitionOnChange>
            <CssBaseline />
            <AppShell>{children}</AppShell>
            <SnackbarHost />
            <ServiceWorkerRegistrar />
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
