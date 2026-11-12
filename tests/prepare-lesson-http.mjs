// Isolated production build input; never loads credentials or changes app code.
import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, renameSync, symlinkSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const root = process.cwd();
const ref = process.argv[2] ?? 'working';
const destination = resolve('eval', `lesson-http-${ref.replace(/[^\w-]/g, '_')}`);
if (existsSync(destination)) throw new Error(`Already exists: ${destination}`);
const inputs = ['src', 'public', 'package.json', 'package-lock.json', 'next.config.ts', 'postcss.config.mjs', 'tsconfig.json'];
if (ref === 'working') {
  mkdirSync(destination, { recursive: true });
  for (const input of inputs) cpSync(input, join(destination, input), { recursive: true });
} else {
  // A detached worktree keeps the optional parent probe off every branch.
  execFileSync('git', ['worktree', 'add', '--detach', destination, ref], { stdio: 'inherit' });
}
symlinkSync(realpathSync('node_modules'), join(destination, 'node_modules'), 'dir');
mkdirSync(join(destination, 'tests/fixtures'), { recursive: true });
cpSync(join(root, 'tests/fixtures/lesson-http.ts'), join(destination, 'tests/fixtures/lesson-http.ts'));
// Exact paths take precedence over @/*, including in Next's resolver. Keep all
// src files byte-for-byte intact; a Webpack alias alone was bypassed previously.
const tsconfigPath = join(destination, 'tsconfig.json');
const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
tsconfig.compilerOptions.paths = {
  ...tsconfig.compilerOptions.paths,
  '@/lib/db/courses': ['./tests/fixtures/lesson-http.ts'],
  '@/lib/db/stats': ['./tests/fixtures/lesson-http.ts'],
};
writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n');
renameSync(join(destination, 'next.config.ts'), join(destination, 'next.original.ts'));
writeFileSync(join(destination, 'next.config.ts'), `
import type { NextConfig } from 'next';
import original from './next.original';
export default {
  ...original,
  output: undefined,
} satisfies NextConfig;
`);
// Keep this HTTP-only test independent of the Google Fonts network service.
writeFileSync(join(destination, 'next-font-mock.cjs'), `
const font = require('node:path').resolve(__dirname, 'src/app/fonts/BIPs.ttf');
module.exports = new Proxy({}, { get: () => \`@font-face { font-family: 'Manrope'; font-style: normal; font-weight: 200 800; src: url(\${font}) format('truetype'); }\` });
`);
console.log(destination);
