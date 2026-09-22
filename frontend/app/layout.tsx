import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

import { getAppConfig } from "@/features/app-config/api/app-config.api";
import { FALLBACK_CONFIG } from "@/features/app-config/types";
import { AppShell } from "@/components/shared/app-shell";
import { Providers } from "@/providers/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const FALLBACK_DESCRIPTION =
  "Explore • Experience • Belong. Discover palaces, heritage, hills and beaches. Book guides, hotels, restaurants and plan your path.";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getAppConfig().catch(() => null);
  const appName = config?.app_name || FALLBACK_CONFIG.app_name;
  const description = config?.app_description || FALLBACK_DESCRIPTION;

  return {
    title: {
      default: appName,
      template: `%s · ${appName}`,
    },
    description,
    applicationName: appName,
    appleWebApp: {
      capable: true,
      title: appName,
      statusBarStyle: "default",
    },
    ...(config?.icon ? { icons: { icon: config.icon } } : {}),
    formatDetection: { telephone: false },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getAppConfig().catch(() => null);

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers initialConfig={config}>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}