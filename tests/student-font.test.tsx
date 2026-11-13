import React from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';

const { localFont } = vi.hoisted(() => ({ localFont: vi.fn() }));

// Reproduce the Google font loader failure reported by CI for /student.
vi.mock('next/font/google', () => ({
  JetBrains_Mono: () => { throw new Error('next/font/google queries have exactly one entry'); },
}));
vi.mock('next/font/local', () => ({ default: localFont }));

it('renders Student with bundled 500/700 fonts when the Google font loader fails', async () => {
  localFont.mockReturnValue({ variable: 'bundled-jetbrains' });
  const { default: StudentPage } = await import('@/app/student/page');
  const html = renderToStaticMarkup(<StudentPage />);
  expect(html).toContain('bundled-jetbrains');
  expect(html).toContain('macOS/Linux');
  expect(html).toContain('Windows');

  expect(localFont).toHaveBeenCalledOnce();
  const options = localFont.mock.calls[0][0] as {
    variable: string;
    src: { path: string; weight: string; style: string }[];
  };
  expect(options.variable).toBe('--font-jetbrains');
  expect(options.src.map((font) => font.weight).sort()).toEqual(['500', '700']);
  for (const font of options.src) {
    expect(font.style).toBe('normal');
    const data = readFileSync(path.resolve('src/app/student', font.path));
    expect(data.subarray(0, 4).toString()).toBe('wOF2');
  }
});
