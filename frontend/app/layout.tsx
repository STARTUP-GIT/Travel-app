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

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const FALLBACK_DESCRIPTION =
  "Global travel discovery and local-services marketplace connecting travellers with authentic experiences across Karnataka and beyond.";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getAppConfig().catch(() => null);
  const appName = config?.app_name || config?.brandName || FALLBACK_CONFIG.brandName;
  const defaultTitle = config?.webTitle || config?.defaultTitle || `${appName} | Discover Places. Experience Local.`;
  const titleFormat = config?.titleFormat || `%s | ${appName}`;
  const description = config?.app_description || config?.defaultMetaDescription || FALLBACK_DESCRIPTION;
  const favicon = config?.icon || config?.faviconUrl || "/brand/atlaswanders-favicon.svg";
  const ogImage = config?.openGraphImageUrl || "/brand/atlaswanders_og_banner.jpg";

  return {
    title: {
      default: defaultTitle,
      template: titleFormat,
    },
    description,
    applicationName: appName,
    appleWebApp: {
      capable: true,
      title: appName,
      statusBarStyle: "default",
    },
    icons: {
      icon: [{ url: favicon }],
      shortcut: [favicon],
      apple: [favicon],
    },
    openGraph: {
      title: config?.openGraphTitle || defaultTitle,
      description: config?.openGraphDescription || description,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: appName }] : [],
      siteName: appName,
    },
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