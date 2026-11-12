// Isolated production build input; never loads credentials or changes app code.
import { cpSync, existsSync, mkdirSync, realpathSync, renameSync, symlinkSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const root = process.cwd();
const ref = process.argv[2] ?? 'working';
const destination = resolve('eval', `lesson-http-${ref.replace(/[^\w-]/g, '_')}`);
if (existsSync(destination)) throw new Error(`Already exists: ${destination}`);
mkdirSync(destination, { recursive: true });
const inputs = ['src', 'public', 'package.json', 'package-lock.json', 'next.config.ts', 'postcss.config.mjs', 'tsconfig.json'];
if (ref === 'working') {
  for (const input of inputs) cpSync(input, join(destination, input), { recursive: true });
} else {
  const archive = execFileSync('git', ['archive', ref, '--', ...inputs], { maxBuffer: 256 * 1024 * 1024 });
  execFileSync('tar', ['-x', '-C', destination], { input: archive });
}
symlinkSync(realpathSync('node_modules'), join(destination, 'node_modules'), 'dir');
for (const name of ['courses', 'stats']) {
  cpSync(join(root, 'tests/fixtures/lesson-http.ts'), join(destination, `src/lib/db/${name}.ts`));
}
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
