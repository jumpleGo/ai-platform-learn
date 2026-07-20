import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4, Underdog } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { NavigationProgress } from "@/components/navigation-progress";
import { PostHogProvider } from "@/lib/analytics/posthog-client";
import "./globals.css";

// Inter и JetBrains Mono поддерживают кириллицу (Geist — нет, русский текст падал в системный шрифт)
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin", "cyrillic"],
});

// Жирный «граффити-пузырь» для doodle-надписей (поддерживает кириллицу)
const underdog = Underdog({
  variable: "--font-underdog",
  subsets: ["latin", "cyrillic"],
  weight: "400",
});

const SITE_TITLE = "Claude Code с нуля — собери свою команду ИИ-агентов";
const SITE_DESCRIPTION =
  "Курс по Claude Code для тех, кто не программист. Без кода и терминала: учишься ставить задачи словами и собираешь команду ИИ-агентов, которые работают за тебя.";

export const metadata: Metadata = {
  metadataBase: new URL("https://gelato.su"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  icons: { icon: "/favicon.svg", apple: "/favicon.svg" },
  openGraph: {
    type: "website",
    siteName: "Claude Code с нуля",
    locale: "ru_RU",
    url: "https://gelato.su",
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
      className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable} ${underdog.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NavigationProgress />
        <PostHogProvider>{children}</PostHogProvider>
        <Toaster />
      </body>
    </html>
  );
}
