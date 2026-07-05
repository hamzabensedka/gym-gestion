import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getLocale } from "@/lib/locale";
import { isRtl } from "@/lib/i18n";
import { LocaleProvider } from "@/components/i18n/locale-provider";

export const metadata: Metadata = {
  title: {
    default: "Gym Gestion",
    template: "%s · Gym Gestion",
  },
  description:
    "Gestion simple et rapide de salle de sport pour la Tunisie : membres, abonnements, check-in QR et présence.",
  applicationName: "Gym Gestion",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Gym Gestion",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#57cc99",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dir = isRtl(locale) ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className="h-full"
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)] antialiased">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
