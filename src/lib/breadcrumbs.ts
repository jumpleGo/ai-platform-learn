import { SITE_URL } from '@/lib/site';

export type Crumb = { name: string; url: string };

export const HOME_CRUMB: Crumb = { name: 'GELATO', url: SITE_URL };
export const COURSES_CRUMB: Crumb = { name: 'Курсы', url: `${SITE_URL}/courses` };
export const BLOG_CRUMB: Crumb = { name: 'Блог', url: `${SITE_URL}/blog` };

// Узел BreadcrumbList для общего @graph страницы: последний пункт — сама страница (canonical)
export function breadcrumbList(crumbs: Crumb[]) {
  const last = crumbs[crumbs.length - 1];
  return {
    '@type': 'BreadcrumbList',
    '@id': `${last.url}#breadcrumb`,
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}
