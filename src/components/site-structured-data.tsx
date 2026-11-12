import { COURSE_PAYMENT_CONFIGS } from '@/lib/payments/tariffs';
import { SITE_JSON_LD } from '@/lib/site-schema';
import { SITE_URL } from '@/lib/site';
import { breadcrumbList, COURSES_CRUMB, HOME_CRUMB } from '@/lib/breadcrumbs';

export type CourseSchemaInput = { slug: string; name: string; description: string };

export function SiteStructuredData({ course }: { course?: CourseSchemaInput }) {
  // Только тарифы самого курса: общая подписка и тестовая цена сюда не попадают.
  const prices = course
    ? COURSE_PAYMENT_CONFIGS[course.slug]?.tariffs.map((tariff) => tariff.price).filter((price) => Number.isFinite(price) && price > 0) ?? []
    : [];
  const offers = prices.length === 1
    ? { '@type': 'Offer', price: prices[0], priceCurrency: 'RUB' }
    : prices.length > 1
      ? { '@type': 'AggregateOffer', lowPrice: Math.min(...prices), highPrice: Math.max(...prices), priceCurrency: 'RUB', offerCount: prices.length }
      : undefined;
  const jsonLd = {
    ...SITE_JSON_LD,
    '@graph': [
      ...SITE_JSON_LD['@graph'],
      ...(course ? [{
        '@type': 'Course',
        '@id': `${SITE_URL}/courses/${course.slug}#course`,
        url: `${SITE_URL}/courses/${course.slug}`,
        name: course.name,
        description: course.description,
        inLanguage: 'ru',
        provider: { '@id': SITE_JSON_LD['@graph'][0]['@id'] },
        educationalLevel: 'beginner',
        hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online' },
        ...(offers ? { offers } : {}),
      }, breadcrumbList([HOME_CRUMB, COURSES_CRUMB, { name: course.name, url: `${SITE_URL}/courses/${course.slug}` }])] : []),
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />;
}
