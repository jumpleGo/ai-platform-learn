import { ChevronDown } from 'lucide-react';
import { Markdown, RichText } from '@/components/markdown';

function splitSections(source: string) {
  const intro: string[] = [];
  const sections: { title: string; lines: string[] }[] = [];
  let lines = intro;
  let inCode = false;

  for (const line of source.replace(/\r\n?/g, '\n').split('\n')) {
    // Как и в Markdown, строки внутри ``` остаются кодом, даже если начинаются с ##.
    if (line.trim().startsWith('```')) inCode = !inCode;
    const heading = !inCode && line.match(/^##\s+(.+)$/);
    if (heading) {
      lines = [];
      sections.push({ title: heading[1], lines });
    } else {
      lines.push(line);
    }
  }

  return { intro: intro.join('\n'), sections };
}

export function PracticumSections({ source, className = '' }: {
  source: string;
  className?: string;
}) {
  const { intro, sections } = splitSections(source);

  return (
    <div className={`space-y-3 ${className}`}>
      <Markdown source={intro} variant="read" />
      {sections.map((section, index) => (
        <details
          key={index}
          open={index === 0}
          className="group rounded-2xl border border-brand-navy/15 bg-card open:border-brand-navy/30"
        >
          <summary className="cursor-pointer list-none rounded-2xl p-4 transition-colors hover:bg-brand-yellow/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-navy sm:px-6 [&::-webkit-details-marker]:hidden">
            <h2 className="flex items-start justify-between gap-3 font-heading text-lg leading-snug font-extrabold text-brand-navy sm:text-xl">
              <span className="min-w-0"><RichText text={section.title} /></span>
              <ChevronDown className="mt-0.5 size-5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
            </h2>
          </summary>
          <Markdown
            source={section.lines.join('\n')}
            variant="read"
            className="border-t border-brand-navy/10 px-4 py-5 sm:px-6"
          />
        </details>
      ))}
    </div>
  );
}
