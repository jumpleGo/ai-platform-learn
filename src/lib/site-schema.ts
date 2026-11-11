export const SITE_DESCRIPTION =
  "Школа GELATO учит работать с ИИ по делу: объяснять задачу словами, держать контекст, проверять результат и собирать своих агентов. Бесплатные уроки и обучения с личной проверкой.";

// Разметка организации и сайта: по ней Google и ИИ-ассистенты понимают,
// что GELATO — это школа, чем она занимается и где её искать.
export const SITE_JSON_LD = {
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
