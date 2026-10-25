'use client';
import { useEffect, useState } from 'react';
import { track } from '@/lib/analytics/track-client';
import { EVENTS } from '@/lib/analytics/events';
import styles from './student.module.css';

const COUNTER_ID = 110434658;

type Os = 'unix' | 'windows';

// Цель в Метрике ставим вместе с событием PostHog: рилсовый трафик смотрим в обеих
function goal(name: string, props: Record<string, unknown>) {
  track(name, props);
  window.ym?.(COUNTER_ID, 'reachGoal', name, props);
}

export function StudentInstall({
  repo,
  installSh,
  installPs,
  children,
}: {
  repo: string;
  installSh: string;
  installPs: string;
  children: React.ReactNode;
}) {
  const [os, setOs] = useState<Os>('unix');
  const [copied, setCopied] = useState(false);
  const command = os === 'unix' ? installSh : installPs;

  // Люди с Windows сразу видят свою команду
  useEffect(() => {
    if (/Windows/i.test(navigator.userAgent)) setOs('windows');
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    goal(EVENTS.studentCopyClicked, { os });
  };

  return (
    <div className={styles.install}>
      <div className={styles.installHead}>
        <span className={styles.installLabel}>установка в одну команду</span>
        <div className={styles.switch} role="tablist" aria-label="Система">
          <button
            type="button"
            role="tab"
            aria-selected={os === 'unix'}
            className={styles.switchBtn}
            onClick={() => setOs('unix')}
          >
            macOS/Linux
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={os === 'windows'}
            className={styles.switchBtn}
            onClick={() => setOs('windows')}
          >
            Windows
          </button>
        </div>
      </div>

      <div className={styles.command}>
        <code className={styles.code}>
          <span className={styles.prompt} aria-hidden="true">
            {os === 'unix' ? '$' : 'PS>'}
          </span>
          {command}
        </code>
        <button type="button" className={styles.copy} onClick={copy}>
          {copied ? 'Скопировано' : 'Скопировать'}
        </button>
      </div>
      <p className={styles.hint}>
        {os === 'unix'
          ? 'Вставь в терминал, потом запусти OpenCode, Claude Code или Codex в папке проекта.'
          : 'Вставь в PowerShell, потом запусти OpenCode, Claude Code или Codex в папке проекта.'}
      </p>

      <div className={styles.actions}>
        <a
          href={repo}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.github}
          onClick={() => goal(EVENTS.studentRepoClicked, { os })}
        >
          Открыть на GitHub <span aria-hidden="true">→</span>
        </a>
        {children}
      </div>
    </div>
  );
}
