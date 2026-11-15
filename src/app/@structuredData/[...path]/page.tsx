import { SiteStructuredData } from '@/components/site-structured-data';
import { getPublishedCoursesWithLessons, resolveLesson } from '@/lib/db/courses';
import { buildFallbackLanding, getCourseLanding } from '@/lib/course-landings';
import { getCourseDescription } from '@/lib/course-lead';
import { courseKey, lessonPath } from '@/lib/slug';
import { HOME_CRUMB } from '@/lib/breadcrumbs';
import { getLessonSeoContent } from '@/lib/free-lessons';
import { SITE_URL } from '@/lib/site';

// Слот помещает Course в корневой @graph и обновляет его при переходах по сайту.
// Catch-all также сбрасывает Course при уходе с лендинга на другую страницу.
export default async function StructuredDataPage({ params }: {
  params: Promise<{ path: string[] }>;
}) {
  const { path = [] } = await params;
  if (path.length === 4 && path[0] === 'courses' && path[2] === 'lessons') {
    const data = await resolveLesson(path[1], path[3]);
    if (!data) return <SiteStructuredData />;
    const slug = courseKey(data.course);
    // Lessons with SEO content already include breadcrumbs in their own graph.
    if (data.lesson.access === 'free' && getLessonSeoContent(slug, data.number)) return <SiteStructuredData />;
    return <SiteStructuredData breadcrumbs={[
      HOME_CRUMB,
      { name: data.course.title, url: `${SITE_URL}/courses/${slug}` },
      { name: data.lesson.title, url: `${SITE_URL}${lessonPath(slug, data.number)}` },
    ]} />;
  }
  if (path.length !== 2 || path[0] !== 'courses') return <SiteStructuredData />;
  const courses = await getPublishedCoursesWithLessons();
  const course = courses.find((item) => courseKey(item) === path[1]);
  if (!course) return <SiteStructuredData />;
  const slug = courseKey(course);
  const landing = getCourseLanding(slug) ?? buildFallbackLanding(course, course.lessons);
  return <SiteStructuredData course={{ slug, name: course.title, description: getCourseDescription(slug, landing.lead) }} />;
}
