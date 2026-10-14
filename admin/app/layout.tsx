import type { Metadata } from "next";
import "./globals.css";

import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: {
    default: "ATLASWANDERS | Admin Control Panel",
    template: "%s · ATLASWANDERS Admin",
  },
  description: "Central administration panel for ATLASWANDERS travel discovery and provider platform.",
  icons: {
    icon: "/brand/atlaswanders-favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}