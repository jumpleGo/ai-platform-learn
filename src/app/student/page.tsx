import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import { StudentAbout, StudentBanners } from './student-banners';
import { StudentInstall } from './student-install';
import styles from './student.module.css';

// Владелец репозитория может смениться — тогда правим только эти три строки
const KIT_REPO = 'https://github.com/bubli-mubli/gelato-student';
const INSTALL_SH = 'curl -fsSL https://raw.githubusercontent.com/bubli-mubli/gelato-student/main/install.sh | bash';
const INSTALL_PS = 'irm https://raw.githubusercontent.com/bubli-mubli/gelato-student/main/install.ps1 | iex';

// Моноширинный нужен только этой странице: вкладка «терминал» и команды установки
const mono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '700'],
});

const TITLE = 'Gelato Student — учись кодить с ИИшкой';
const DESCRIPTION =
  'Бесплатный учебный набор для OpenCode, Claude Code и Codex: агент-наставник не пишет код за тебя, а даёт подсказки по ступеням, проверяет решение, разбирает ошибки и объясняет код.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/student' },
  openGraph: {
    type: 'website',
    siteName: 'GELATO',
    locale: 'ru_RU',
    url: 'https://gelato.education/student',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/og-gelato.png', width: 1200, height: 630, alt: 'Gelato Student' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-gelato.png'],
  },
};

const SKILLS = [
  'подсказки по ступеням',
  'ревью',
  'разбор ошибок',
  'объяснение кода',
  '«объясни сам»',
  'задача на закрепление',
  'дневник прогресса',
];

export default function StudentPage() {
  return (
    <main className={`${styles.page} ${mono.variable}`}>
      <div className={styles.stack}>
        <div className={styles.aboutRow}>
          <StudentAbout />
        </div>
        <section className={styles.window} aria-labelledby="student-title">
          <header className={styles.bar}>
            <span className={styles.dots} aria-hidden="true">
              <i className={styles.dotRed} />
              <i className={styles.dotYellow} />
              <i className={styles.dotGreen} />
            </span>
            <span className={styles.tab}>терминал</span>
          </header>

          <div className={styles.body}>
            <p className={styles.kicker}>gelato student · бесплатно</p>
            <h1 id="student-title" className={styles.title}>
              учись кодить с ИИшкой, а не вместо себя
            </h1>
            <p className={styles.lead}>
              Набор для OpenCode, Claude Code и Codex. Наставник не пишет код за тебя: даёт подсказки по ступеням,
              проверяет решение, разбирает ошибки и объясняет непонятное.
            </p>

            <StudentInstall repo={KIT_REPO} installSh={INSTALL_SH} installPs={INSTALL_PS}>
              <p className={styles.note} aria-hidden="true">
                код пишешь ты!
              </p>
            </StudentInstall>

            <div className={styles.skills}>
              <p className={styles.skillsLabel}>7 скиллов в наборе</p>
              <ul className={styles.chips}>
                {SKILLS.map((skill) => (
                  <li key={skill} className={styles.chip}>
                    {skill}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </section>

        <StudentBanners />
      </div>
    </main>
  );
}
