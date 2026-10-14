import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

import { getAppConfig } from "@/features/app-config/api/app-config.api";
import { FALLBACK_CONFIG } from "@/features/app-config/types";
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
  "Provider portal for hotels, restaurants and tour guides: manage your listings, review stay and reservation requests, and keep your profile up to date.";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getAppConfig().catch(() => null);
  const brandName = config?.brandName || "ATLASWANDERS";
  const defaultTitle = `${brandName} | Provider Portal`;
  const titleFormat = config?.titleFormat || `%s | ${brandName}`;
  const description = config?.defaultMetaDescription || config?.app_description || FALLBACK_DESCRIPTION;
  const favicon = config?.faviconUrl || config?.icon || "/brand/atlaswanders-favicon.svg";
  const ogImage = config?.openGraphImageUrl || "/brand/atlaswanders_og_banner.jpg";

  return {
    title: {
      default: defaultTitle,
      template: titleFormat,
    },
    description,
    applicationName: `${brandName} Provider`,
    appleWebApp: {
      capable: true,
      title: `${brandName} Providers`,
      statusBarStyle: "default",
    },
    icons: {
      icon: [
        { url: favicon, type: "image/svg+xml" },
        { url: "/brand/atlaswanders-favicon.svg", sizes: "32x32" },
      ],
      apple: favicon,
    },
    openGraph: {
      title: defaultTitle,
      description,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: brandName }] : [],
      siteName: `${brandName} Provider Portal`,
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers initialConfig={config}>{children}</Providers>
      </body>
    </html>
  );
}
