import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { NavigationProgress } from "@/components/navigation-progress";
import { PostHogProvider } from "@/lib/analytics/posthog-client";
import { InlineTextEditor } from "@/components/dev/inline-text-editor";
import { PaymentModalProvider } from "@/components/payment/payment-modal-context";
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

const SITE_TITLE = "GELATO — школа осмысленной работы с ИИ";
const SITE_DESCRIPTION =
  "Школа GELATO учит работать с ИИ по делу: объяснять задачу словами, держать контекст, проверять результат и собирать своих агентов. Бесплатные уроки и обучения с личной проверкой.";

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

// Разметка организации и сайта: по ней Google и ИИ-ассистенты понимают,
// что GELATO — это школа, чем она занимается и где её искать.
const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["EducationalOrganization", "Organization"],
      "@id": "https://gelato.education/#organization",
      name: "GELATO",
      alternateName: "Школа GELATO",
      url: "https://gelato.education",
      logo: "https://gelato.education/logo.webp",
      image: "https://gelato.education/og-gelato.png",
      description: SITE_DESCRIPTION,
      inLanguage: "ru-RU",
      sameAs: ["https://t.me/gelato_ai"],
      knowsAbout: [
        "работа с ИИ",
        "промпт-инжиниринг",
        "ИИ-агенты",
        "вайбкодинг",
        "Claude Code",
        "ИИ-анимация",
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://gelato.education/#website",
      url: "https://gelato.education",
      name: "GELATO",
      description: SITE_DESCRIPTION,
      inLanguage: "ru-RU",
      publisher: { "@id": "https://gelato.education/#organization" },
    },
  ],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(SITE_JSON_LD).replace(/</g, "\\u003c"),
          }}
        />
        <NavigationProgress />
        <PostHogProvider>
          <PaymentModalProvider>{children}</PaymentModalProvider>
        </PostHogProvider>
        <Toaster />
        {process.env.NODE_ENV === "development" ? <InlineTextEditor /> : null}
        {process.env.NODE_ENV === "production" ? <YandexMetrika /> : null}
      </body>
    </html>
  );
}
