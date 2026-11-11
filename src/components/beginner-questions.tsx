import Link from 'next/link';
import type { CourseWithLessons } from '@/lib/db/courses';
import { courseKey, lessonPath } from '@/lib/slug';

const ANSWERS = [
  {
    question: 'Я новичок: с чего начать ИИ с нуля?',
    answer: 'Начните с одной небольшой задачи: попросите ИИ составить письмо, объяснить незнакомую тему или подготовить план работы. Напишите, кому нужен результат, добавьте исходные сведения и проверьте ответ. Программировать для этого не нужно. В Gelato курс для новичков посвящён Claude Code. Курс платный; сначала можно посмотреть бесплатный вводный урок и оценить объяснения автора.',
  },
  {
    question: 'Как бесплатно научиться пользоваться ChatGPT для работы без программирования?',
    answer: 'Учиться пользоваться ChatGPT можно на своих повседневных задачах без программирования: опишите цель, дайте пример и попросите несколько вариантов ответа. Сравните их, уточните запрос и проверьте факты перед использованием. Для знакомства с подходом Gelato есть бесплатный вводный урок. Курс платный и посвящён Claude Code; отдельная программа обучения ChatGPT в нём не заявлена.',
  },
  {
    question: 'Простым языком: как работают нейросети?',
    answer: 'Нейросеть учится на множестве примеров: находит повторяющиеся связи в текстах, изображениях или звуках. Получив ваш вопрос, текстовая нейросеть подбирает вероятное продолжение и строит ответ слово за словом, опираясь на эти связи. Это не проверка истины: она может ошибаться и выдумывать факты, поэтому важные сведения нужно сверять с надёжными источниками.',
  },
];

// Один открытый блок для обеих главных и вводного лендинга, вне ветвления A/B.
export function BeginnerQuestions({ course }: { course?: CourseWithLessons }) {
  const lesson = course?.published && !course.isTest
    ? course.lessons.find((item) => item.published !== false && item.access === 'free')
    : undefined;
  const href = course && lesson
    ? `${lessonPath(courseKey(course), lesson.number)}?from=course_landing`
    : null;

  return (
    <div id="beginner-questions" role="region" aria-label="Ответы новичкам об ИИ" className="space-y-8 rounded-3xl border-2 border-brand-navy/15 bg-card p-5 sm:p-8">
      {ANSWERS.map((item) => (
        <article key={item.question} className="max-w-3xl space-y-3">
          <h2 className="font-heading text-xl font-bold leading-snug text-brand-navy sm:text-2xl">
            {item.question}
          </h2>
          <p className="text-lg leading-relaxed text-brand-charcoal sm:text-xl">
            {item.answer}
          </p>
        </article>
      ))}
      {href && (
        <Link href={href} className="inline-flex min-h-11 items-center font-bold text-brand-navy underline underline-offset-4 hover:text-brand-forest focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-navy">
          Посмотреть бесплатный вводный урок курса Gelato
        </Link>
      )}
    </div>
  );
}
