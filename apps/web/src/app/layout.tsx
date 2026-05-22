import type { Metadata, Viewport } from "next";
import { NavShell } from "@/components/layout/nav-shell";
import { TouchFocusBlur } from "@/components/touch-focus-blur";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { PwaPushSubscribe } from "@/components/pwa/pwa-push-subscribe";
import { PwaRegister } from "@/components/pwa/pwa-register";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Photo Drive",
  description: "개인 미디어 뷰어",
  applicationName: "Photo Drive",
  manifest: `${basePath}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Photo Drive",
  },
  icons: {
    icon: [
      { url: `${basePath}/icons/favicon-32.png`, sizes: "32x32", type: "image/png" },
      { url: `${basePath}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
    ],
    apple: [
      {
        url: `${basePath}/icons/apple-touch-icon.png`,
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ec4899",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-dvh select-none antialiased">
        <AuthSessionProvider>
          <main className="mx-auto min-h-dvh max-w-5xl">
            <NavShell>{children}</NavShell>
          </main>
          <TouchFocusBlur />
          <PwaRegister />
          <PwaPushSubscribe />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
