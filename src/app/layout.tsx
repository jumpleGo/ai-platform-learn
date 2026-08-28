import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { NavigationProgress } from "@/components/navigation-progress";
import { PostHogProvider } from "@/lib/analytics/posthog-client";
import { InlineTextEditor } from "@/components/dev/inline-text-editor";
import { YandexMetrika } from "@/components/yandex-metrika";
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

const SITE_TITLE = "Claude Code с нуля — собери свою команду ИИ-агентов";
const SITE_DESCRIPTION =
  "Курс по Claude Code для тех, кто не программист. Без кода и терминала: учишься ставить задачи словами и собираешь команду ИИ-агентов, которые работают за тебя.";

export const metadata: Metadata = {
  metadataBase: new URL("https://gelato.education"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  icons: { icon: "/favicon.svg", apple: "/favicon.svg" },
  openGraph: {
    type: "website",
    siteName: "Claude Code с нуля",
    locale: "ru_RU",
    url: "https://gelato.education",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Курс по Claude Code с нуля, пиксельный клодик",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${manrope.variable} ${bips.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NavigationProgress />
        <PostHogProvider>{children}</PostHogProvider>
        <Toaster />
        {process.env.NODE_ENV === "development" ? <InlineTextEditor /> : null}
        {process.env.NODE_ENV === "production" ? <YandexMetrika /> : null}
      </body>
    </html>
  );
}
