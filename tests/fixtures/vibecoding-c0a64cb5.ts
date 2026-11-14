// Minimal literal baseline: c0a64cb5 next.config.ts:12-19 and llms-full.txt/route.ts:32.
export const redirects = [
  {
    source: '/courses/O9aFw3KZqEFyGxnJB8fX/lessons/CY4AYMjQMSbND8TUYSFQ',
    destination: '/courses/claude-code-agents/lessons/2',
    statusCode: 301,
  },
];

export function oldLlmsCourseLine(): string {
  const lines: string[] = [];
  const config = { courseTitle: 'Vibecoding' };
  const SITE_URL = 'https://gelato.education';
  const slug = 'it-vibecoding';
  const landing = { seoDescription: 'URL regression fixture' };
    lines.push(`- [${config.courseTitle}](${SITE_URL}/courses/${slug}): ${landing.seoDescription}`);
  return lines.join('\n');
}
