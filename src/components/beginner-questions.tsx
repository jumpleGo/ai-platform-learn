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

export function BeginnerQuestions({ course, answers = [] }: {
  course?: CourseWithLessons;
  answers?: typeof ANSWERS;
}) {
  const questions = new Map<string, Set<string>>();
  for (const item of [...answers, ...ANSWERS]) {
    if (!questions.has(item.question)) questions.set(item.question, new Set());
    questions.get(item.question)!.add(item.answer);
  }
  const lesson = course?.published && !course.isTest
    ? course.lessons.find((item) => item.published !== false && item.access === 'free')
    : undefined;
  const href = course && lesson
    ? `${lessonPath(courseKey(course), lesson.number)}?from=course_landing`
    : null;

  return (
    <div id="beginner-questions" role="region" aria-label="Ответы новичкам об ИИ" className="divide-y divide-brand-navy/15">
      {[...questions].map(([question, texts]) => (
        <details key={question} className="py-4">
          <summary className="cursor-pointer rounded font-heading text-base font-bold leading-snug text-brand-navy focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-navy sm:text-lg">
            {question}
          </summary>
          {[...texts].map((answer) => (
            <p key={answer} className="mt-3 max-w-3xl text-base leading-relaxed text-brand-charcoal">
              {answer}
            </p>
          ))}
        </details>
      ))}
      {href && (
        <Link href={href} className="inline-flex min-h-11 items-center font-bold text-brand-navy underline underline-offset-4 hover:text-brand-forest focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-navy">
          бесплатный вводный урок
        </Link>
      )}
    </div>
  );
}
