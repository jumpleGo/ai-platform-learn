import {
  siClaude, siKimi, siDeepseek, siGooglegemini, siJavascript, siTypescript, siPhp, siPython,
  siEslint, siVitest, siJest, siGit, siGithub, type SimpleIcon,
} from 'simple-icons';
import type { LogoKey } from '@/lib/course-landings';

// Логотипы инструментов и стеков (simple-icons, оригинальные пути). Каждый живёт
// на нашей плитке в своём фирменном цвете — узнаваемо и при этом в одном ритме
// с остальными карточками. Codex — словом: логотипа OpenAI в пакете нет.
type Logo = { title: string; icon?: SimpleIcon; word?: string; dark?: boolean };

const LOGOS: Record<LogoKey, Logo> = {
  claude: { title: 'Claude Code', icon: siClaude },
  codex: { title: 'Codex', word: 'Codex' },
  kimi: { title: 'Kimi', icon: siKimi },
  deepseek: { title: 'DeepSeek', icon: siDeepseek },
  gemini: { title: 'Gemini', icon: siGooglegemini },
  // жёлтый JS на светлой плитке не читается — плитка тёмная
  js: { title: 'JavaScript', icon: siJavascript, dark: true },
  ts: { title: 'TypeScript', icon: siTypescript },
  php: { title: 'PHP', icon: siPhp },
  python: { title: 'Python', icon: siPython },
  eslint: { title: 'ESLint', icon: siEslint },
  vitest: { title: 'Vitest', icon: siVitest, dark: true },
  jest: { title: 'Jest', icon: siJest },
  git: { title: 'Git', icon: siGit },
  github: { title: 'GitHub', icon: siGithub },
};

// чёрные логотипы (Kimi, GitHub) перекрашиваем в наш navy — это и есть «лёгкий фильтр»
function logoColor(icon: SimpleIcon): string {
  return icon.hex === '000000' || icon.hex === '181717' || icon.hex === '191919'
    ? 'var(--color-brand-navy)'
    : `#${icon.hex}`;
}

export function BrandLogo({ name, size = 'md' }: { name: LogoKey; size?: 'sm' | 'md' }) {
  const logo = LOGOS[name];
  const tile = size === 'sm' ? 'size-8 rounded-lg' : 'size-10 rounded-xl';
  const glyph = size === 'sm' ? 'size-4' : 'size-5';
  return (
    <span
      title={logo.title}
      className={`inline-flex shrink-0 items-center justify-center border-2 ${tile} ${
        logo.dark ? 'border-brand-navy bg-brand-navy' : 'border-brand-navy/15 bg-white/80'
      }`}
    >
      {logo.icon ? (
        <svg viewBox="0 0 24 24" className={glyph} role="img" aria-label={logo.title} style={{ color: logo.dark ? `#${logo.icon.hex}` : logoColor(logo.icon) }}>
          <path d={logo.icon.path} fill="currentColor" />
        </svg>
      ) : (
        <span className={`font-mono font-black tracking-tight text-brand-navy ${size === 'sm' ? 'text-[9px]' : 'text-[11px]'}`}>
          {logo.word}
        </span>
      )}
    </span>
  );
}

// Пара логотипов «колодой»: вторая плитка чуть перекрывает первую и слегка повёрнута.
// Декоративный акцент в углу карточки, а не перечисление — максимум две
export function LogoStack({ logos, className = '' }: { logos: readonly LogoKey[]; className?: string }) {
  const [first, second] = logos;
  if (!first) return null;
  return (
    <span className={`relative inline-flex h-12 ${second ? 'w-[4.25rem]' : 'w-10'} shrink-0 ${className}`} aria-hidden>
      <span className="absolute top-1 left-0 -rotate-6 shadow-[0_2px_0_0_rgba(16,38,71,0.12)] rounded-xl">
        <BrandLogo name={first} />
      </span>
      {second && (
        <span className="absolute top-0 left-6 rotate-6 shadow-[0_2px_0_0_rgba(16,38,71,0.12)] rounded-xl">
          <BrandLogo name={second} />
        </span>
      )}
    </span>
  );
}

// Ряд логотипов под текстом карточки: подпись слева, плитки справа
export function BrandLogoRow({ logos, label, size = 'md', className = '' }: {
  logos: readonly LogoKey[];
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {label && <span className="mr-1 font-mono text-[11px] font-black uppercase tracking-wider text-brand-navy/50">{label}</span>}
      {logos.map((l) => <BrandLogo key={l} name={l} size={size} />)}
    </div>
  );
}
