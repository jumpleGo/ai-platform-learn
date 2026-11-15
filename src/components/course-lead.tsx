import { Fragment } from 'react';
import { getCourseLeadParts } from '@/lib/course-lead';
import { DoodleUnderline } from '@/components/doodle-decor';
import { RichText } from '@/components/markdown';

export function CourseLead({ slug, lead }: { slug: string; lead: string }) {
  const parts = getCourseLeadParts(slug);
  if (!parts) return <RichText text={lead} />;
  return parts.map((part, index) => part.underline ? (
    <span key={index} className="relative inline-block whitespace-nowrap text-brand-navy">
      {part.text}
      <DoodleUnderline
        thin
        color={part.underline === 'green' ? 'var(--color-scarf-green)' : 'var(--color-goose-red)'}
        className="opacity-70"
      />
    </span>
  ) : <Fragment key={index}>{part.text}</Fragment>);
}
