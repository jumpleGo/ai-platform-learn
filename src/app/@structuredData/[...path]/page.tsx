import { SiteStructuredData } from '@/components/site-structured-data';
import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
import { buildFallbackLanding, getCourseLanding } from '@/lib/course-landings';
import { getCourseDescription } from '@/lib/course-lead';
import { courseKey } from '@/lib/slug';

// Слот помещает Course в корневой @graph и обновляет его при переходах по сайту.
// Catch-all также сбрасывает Course при уходе с лендинга на другую страницу.
export default async function StructuredDataPage({ params }: {
  params: Promise<{ path: string[] }>;
}) {
  const { path = [] } = await params;
  if (path.length !== 2 || path[0] !== 'courses') return <SiteStructuredData />;
  const courses = await getPublishedCoursesWithLessons();
  const course = courses.find((item) => courseKey(item) === path[1]);
  if (!course) return <SiteStructuredData />;
  const slug = courseKey(course);
  const landing = getCourseLanding(slug) ?? buildFallbackLanding(course, course.lessons);
  return <SiteStructuredData course={{ slug, name: course.title, description: getCourseDescription(slug, landing.lead) }} />;
}
