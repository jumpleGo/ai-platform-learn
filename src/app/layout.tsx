import { SITE_DESCRIPTION } from "@/lib/site-schema";
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { NavigationProgress } from "@/components/navigation-progress";
import { PostHogProvider } from "@/lib/analytics/posthog-client";
import { InlineTextEditor } from "@/components/dev/inline-text-editor";
import { PaymentModalProvider } from "@/components/payment/payment-modal-context";
import { YandexMetrika } from "@/components/yandex-metrika";
import { TikTokPixel } from "@/components/tiktok-pixel";
import "./globals.css";

// Вся типографика на двух гарнитурах, обе с кириллицей.
// Manrope — весь обычный текст: абзацы, заголовки, интерфейс.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

// BIPs — акцентный: теги-бейджи и маркерные надписи. Начертание одно (400),
// поэтому классы font-bold/font-extrabold на нём не используем.
const bips = localFont({
  src: "./fonts/BIPs.ttf",
  variable: "--font-bips",
  weight: "400",
  style: "normal",
  display: "swap",
});

const SITE_TITLE = "GELATO — школа осмысленной работы с ИИ";

export const metadata: Metadata = {
  metadataBase: new URL("https://gelato.education"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  // подтверждение прав в панелях вебмастеров; у Яндекса тег дублирует
  // файл public/yandex_*.html — сработает любой из двух способов
  verification: {
    yandex: "4e021a1aa1e2c117",
    google: "yJuSd9zsbVH4SsNaBOTb0dwA79Srzx2UctJHoTqxQb8",
  },
  openGraph: {
    type: "website",
    siteName: "GELATO",
    locale: "ru_RU",
    url: "https://gelato.education",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-gelato.png",
        width: 1200,
        height: 630,
        alt: "GELATO — школа работы с ИИ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-gelato.png"],
  },
};

export default function RootLayout({
  children,
  structuredData,
}: Readonly<{
  children: React.ReactNode;
  structuredData: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${manrope.variable} ${bips.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {structuredData}
        <NavigationProgress />
        <PostHogProvider>
          <PaymentModalProvider>{children}</PaymentModalProvider>
        </PostHogProvider>
        <Toaster />
        {process.env.NODE_ENV === "development" ? <InlineTextEditor /> : null}
        {process.env.NODE_ENV === "production" ? <YandexMetrika /> : null}
        {process.env.NODE_ENV === "production" ? <TikTokPixel /> : null}
      </body>
    </html>
  );
}
