'use client';

import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';
import { Lemon } from './lemon';
import {
  CANVAS_H,
  COPY,
  ROLL,
  SPOT,
  TRACK,
  X,
  Y,
  dropTail,
  measure,
  samplePath,
  scene,
} from '@/lib/scene';
import { LEGAL_NAV, PROGRAM_URL, TELEGRAM_DM } from '@/lib/site';
import './scene.css';

// «Линия внимания»: точка полотна, по которой считается прогресс анимаций.
// Чуть выше центра экрана — так герой действия оказывается там, куда смотрят.
const FOCUS = 0.52;

const srcSet = (srcs: { w: number; avif: string; webp: string }[], key: 'avif' | 'webp') =>
  srcs.map((s) => `/scene/${s[key]} ${s.w}w`).join(', ');

function Bubble({
  x,
  y,
  tail,
  className = '',
  children,
}: {
  x: number;
  y: number;
  tail: 'down' | 'right' | 'left';
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`scene-bubble ${className}`} data-reveal data-tail={tail} style={{ left: X(x), top: Y(y) }}>
      {children}
      <span className="scene-dots" aria-hidden>
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

// Загибается тот уголок, к которому ближе курсор
function moveSignFold(event: React.PointerEvent<HTMLDivElement>) {
  const sign = event.currentTarget;
  const rect = sign.getBoundingClientRect();
  sign.dataset.foldCorner = event.clientX - rect.left < rect.width / 2 ? 'left' : 'right';
}

// Границы блока в координатах полотна: offset*, а не rect — на них не влияют
// transform-анимации появления.
function bounds(el: HTMLElement) {
  return {
    top: el.offsetTop,
    bottom: el.offsetTop + el.offsetHeight,
    left: el.offsetLeft,
    right: el.offsetLeft + el.offsetWidth,
  };
}

const KEEP = /scene-eyebrow|scene-title|scene-card-title/;

// Текст правим внутри существующего узла, а не через textContent: замена узла
// ломает ссылки React, и следующий рендер падает с NotFoundError.
function setText(el: HTMLElement, value: string): boolean {
  const first = el.firstChild;
  if (!first || first.nextSibling || first.nodeType !== Node.TEXT_NODE) return false;
  (first as Text).data = value;
  return true;
}

// Шаги уменьшения текста перед тем, как что-то отбрасывать: сперва пытаемся
// вместить всё, и только если даже мельче не влезает — режем по предложениям.
const FIT_STEPS = [0.94, 0.88, 0.82];

export function GelateriaScene() {
  const stageRef = useRef<HTMLDivElement>(null);
  const rollRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const acc = useMemo(() => measure(ROLL), []);

  // Плавный скролл: полотно едет с инерцией, поэтому анимации по пути лимона
  // читаются как единый проезд камеры, а не как рывки колеса мыши.
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (localStorage.noLenis === '1') return; // ВРЕМЕННО: отладка лага скролла
    const lenis = new Lenis({ duration: 1.1, wheelMultiplier: 0.9, touchMultiplier: 1.6 });
    let raf = requestAnimationFrame(function tick(time) {
      lenis.raf(time);
      raf = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const roll = rollRef.current;
    if (!stage || !roll) return;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tracks = Array.from(stage.querySelectorAll<HTMLElement>('[data-from]'));

    // Появление текста — один раз, когда блок входит в кадр
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute('data-in', '');
          io.unobserve(e.target);
        }
      },
      { rootMargin: '-12% 0px -18% 0px' },
    );

    // Первый экран — чистая витрина: рассказ про школу начинается со скролла.
    // Иначе блок «о нас» стоит в кадре уже при загрузке и спорит с вывеской.
    const reveals = Array.from(stage.querySelectorAll('[data-reveal]'));
    let armed = false;
    const arm = () => {
      if (armed || scrollY < 24) return;
      armed = true;
      reveals.forEach((el) => io.observe(el));
    };

    const place = (t: number) => {
      const q = Math.min(1, Math.max(0, t));
      const p = samplePath(ROLL, acc, q);
      roll.style.setProperty('--lx', X(p.x));
      roll.style.setProperty('--ly', Y(p.y));
      roll.style.setProperty('--rot', `${p.rot.toFixed(1)}deg`);
      const fade = Math.min(1, Math.max(0, (1 - q) / 0.08));
      roll.style.setProperty('--lemon-opacity', fade.toFixed(3));
      roll.style.setProperty('--lemon-scale', (0.82 + fade * 0.18).toFixed(3));
    };

    if (still) {
      place(0);
      return () => io.disconnect();
    }

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = stage.getBoundingClientRect();
      const scale = rect.height / CANVAS_H; // пиксель полотна → пиксель экрана
      const focus = (-rect.top + innerHeight * FOCUS) / scale;

      for (const el of tracks) {
        const from = Number(el.dataset.from);
        const to = Number(el.dataset.to);
        const q = Math.min(1, Math.max(0, (focus - from) / (to - from)));
        el.style.setProperty('--q', q.toFixed(4));
      }

      const [rollFrom, rollTo] = TRACK.roll;
      place((focus - rollFrom) / (rollTo - rollFrom));

      arm();

      // шапка появляется, когда витрина уехала вверх; подсказка — наоборот
      const scrolled = scrollY > innerHeight * 1.25;
      navRef.current?.toggleAttribute('data-in', scrolled);
      hintRef.current?.toggleAttribute('data-hide', scrollY > 120);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    // touchmove и wheel — страховка: на мобильных браузерах событие scroll
    // может не доходить до window, и тогда текст никогда не появится
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('touchmove', onScroll, { passive: true });
    addEventListener('wheel', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      removeEventListener('scroll', onScroll);
      removeEventListener('touchmove', onScroll);
      removeEventListener('wheel', onScroll);
      removeEventListener('resize', onScroll);
    };
  }, [acc]);

  // Текста в свободной зоне рисунка может не хватить — на узком экране особенно.
  // Тогда лишнее обрезается по последнему законченному предложению, а блок
  // остаётся на своём месте. Правим только DOM: в исходнике текст полный.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const originals = new Map<HTMLElement, string>();
    const baseFont = new Map<HTMLElement, number>();

    const restore = () => {
      for (const [el, text] of originals) {
        setText(el, text);
        el.style.removeProperty('display');
        delete el.dataset.truncated;
      }
      originals.clear();
      for (const el of baseFont.keys()) el.style.removeProperty('font-size');
      baseFont.clear();
    };

    const fit = () => {
      // Пока картинки сцены не загрузились, полотно нулевой высоты: замер даст
      // «места нет» и текст спрячется весь. Ждём разложенной сцены.
      if (stage.offsetHeight < window.innerHeight) return;
      restore();
      const blocks = Array.from(stage.querySelectorAll<HTMLElement>('.scene-copy'));
      const others = Array.from(
        stage.querySelectorAll<HTMLElement>('.scene-copy, .scene-bubble, .scene-legal'),
      );

      for (const block of blocks) {
        const box = bounds(block);
        // ближайшее снизу препятствие, с которым блок пересекается по горизонтали
        let limit = Infinity;
        for (const other of others) {
          if (other === block || other.offsetParent !== block.offsetParent) continue;
          const r = bounds(other);
          if (r.top < box.top + 4) continue;
          if (Math.min(r.right, box.right) - Math.max(r.left, box.left) <= 4) continue;
          limit = Math.min(limit, r.top);
        }
        if (limit === Infinity) continue;

        const room = limit - 6;
        if (box.bottom <= room) continue;

        // сначала убираем пункты списка, потом абзацы: вывод под списком важнее
        // перечисления, поэтому он держится до последнего
        const trimmable = Array.from(block.querySelectorAll<HTMLElement>('p, li')).filter(
          (el) => !KEEP.test(el.className),
        );
        const targets = [
          ...trimmable.filter((el) => el.tagName === 'LI').reverse(),
          ...trimmable.filter((el) => el.tagName !== 'LI').reverse(),
        ];

        // сначала мельче — так на месте остаётся больше текста
        for (const step of FIT_STEPS) {
          if (bounds(block).bottom <= room) break;
          for (const el of targets) {
            if (!baseFont.has(el)) baseFont.set(el, parseFloat(getComputedStyle(el).fontSize));
            el.style.fontSize = `${(baseFont.get(el)! * step).toFixed(2)}px`;
          }
        }

        for (const el of targets) {
          if (bounds(block).bottom <= room) break;
          // элемент с разметкой внутри (ссылка, <strong>) не трогаем текстом —
          // только прячем целиком, иначе разрушим дерево React
          const plain = el.firstChild && !el.firstChild.nextSibling
            && el.firstChild.nodeType === Node.TEXT_NODE;
          if (!originals.has(el)) originals.set(el, el.textContent ?? '');
          if (!plain) {
            el.style.display = 'none';
            el.dataset.truncated = '';
            continue;
          }
          let text = el.textContent ?? '';
          while (bounds(block).bottom > room) {
            const shorter = dropTail(text);
            if (shorter === null) {
              el.style.display = 'none';
              break;
            }
            text = shorter;
            setText(el, text);
            el.dataset.truncated = '';
          }
        }
      }
    };

    let timer = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(fit, 150);
    };

    schedule();
    document.fonts?.ready.then(schedule);
    // полотно меняет высоту, когда докатываются срезы рисунка — тогда и мерим
    const observer = new ResizeObserver(schedule);
    observer.observe(stage);
    window.addEventListener('load', schedule);
    window.addEventListener('resize', schedule);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('load', schedule);
      window.removeEventListener('resize', schedule);
      restore();
    };
  }, []);

  return (
    <>
      <nav className="scene-nav" ref={navRef} aria-label="Разделы школы">
        <Link href="/free">Бесплатно</Link>
        <Link href="/courses">Обучения</Link>
        <a href={PROGRAM_URL}>Вайбкодинг</a>
      </nav>

      <div className="scene-hint" ref={hintRef}>
        {COPY.scroll}
        <svg viewBox="0 0 24 34" aria-hidden>
          <path
            d="M12 2v27M4 21l8 9 8-9"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="scene">
        <div className="scene-stage" ref={stageRef}>
          {/* ── полотно из трёх иллюстраций, порезанное на куски ── */}
          {scene.slices.map((slice, i) => (
            <picture key={slice.y}>
              <source
                type="image/avif"
                srcSet={srcSet(slice.srcs, 'avif')}
                sizes="(max-width: 700px) 152vw, 100vw"
              />
              <img
                className="scene-slice"
                src={`/scene/${slice.srcs[slice.srcs.length - 1].webp}`}
                srcSet={srcSet(slice.srcs, 'webp')}
                sizes="(max-width: 700px) 152vw, 100vw"
                width={scene.width}
                height={slice.h}
                style={{ top: Y(slice.y), height: Y(slice.h) }}
                loading={i < 2 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : 'auto'}
                alt={
                  i === 0
                    ? 'Джелатерия GELATO: полосатая маркиза, уточка в окне, лимонные деревья у входа'
                    : ''
                }
              />
            </picture>
          ))}

          {/* ── вывеска-наклейка ── */}
          <div
            className="scene-sign"
            data-fold-corner="left"
            onPointerMove={moveSignFold}
            style={{ left: X(SPOT.sign.x), top: Y(SPOT.sign.y), width: X(SPOT.sign.w) }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="scene-sign-face" src="/logo.webp" alt="GELATO" width={538} height={232} />
            <span className="scene-sign-curl scene-sign-curl--left" aria-hidden />
            <span className="scene-sign-curl scene-sign-curl--right" aria-hidden />
          </div>
          <div className="scene-stamp" style={{ left: X(SPOT.stamp.x), top: Y(SPOT.stamp.y) }}>
            Emil’s edition
          </div>

          {/* ── уточка в окне: облачко и падающий лимон ── */}
          <Bubble x={SPOT.duckBubble.x} y={SPOT.duckBubble.y} tail="down" className="scene-bubble--duck">
            {COPY.bubbles.duck}
          </Bubble>
          <div
            className="scene-lemon scene-lemon--window"
            data-from={TRACK.windowLemon[0]}
            data-to={TRACK.windowLemon[1]}
            style={{ left: X(SPOT.windowLemon.x), top: Y(SPOT.windowLemon.y), width: X(SPOT.lemon) }}
          >
            <Lemon />
          </div>

          {/* ── текст на фасаде ── */}
          <div className="scene-copy scene-hero" data-reveal style={{ '--l': X(756), '--r': X(180), '--t': Y(624) } as React.CSSProperties}>
            <p className="scene-eyebrow">{COPY.hero.eyebrow}</p>
            <h1 className="scene-title">{COPY.hero.title}</h1>
            <p className="scene-note">{COPY.hero.note}</p>
          </div>

          <div
            className="scene-copy scene-cards scene-wall-cards"
            data-plate
            data-reveal
            style={{ '--l': X(104), '--r': X(104), '--t': Y(1120) } as React.CSSProperties}
          >
            {COPY.wall.map((item, i) => (
              <div key={item.title} data-reveal style={{ '--d': `${i * 0.12}s` } as React.CSSProperties}>
                <p className="scene-card-title">{item.title}</p>
                <p className="scene-card-note">{item.note}</p>
              </div>
            ))}
          </div>

          {/* ── арка входа ── */}
          <Link
            href="/courses"
            className="scene-door"
            style={{ left: X(SPOT.door.x), top: Y(SPOT.door.y), width: X(SPOT.door.w), height: Y(SPOT.door.h) }}
          >
            <span className="scene-door-label">{COPY.door}</span>
            <span className="sr-only">Наши обучения</span>
          </Link>

          {/* ── двор: текст, облачко над столом, лимон на тропинке ── */}
          <div
            className="scene-copy scene-cards scene-yard-cards"
            data-plate
            data-reveal
            style={{ '--l': X(104), '--r': X(560), '--t': Y(2380) } as React.CSSProperties}
          >
            {COPY.yard.map((item, i) => (
              <div key={item.title} data-reveal style={{ '--d': `${i * 0.12}s` } as React.CSSProperties}>
                <p className="scene-card-title">{item.title}</p>
                <p className="scene-card-note">{item.note}</p>
              </div>
            ))}
          </div>

          <Bubble x={SPOT.tableBubble.x} y={SPOT.tableBubble.y} tail="down" className="scene-bubble--table">
            {COPY.bubbles.table}
          </Bubble>

          <div className="scene-lemon scene-lemon--roll" ref={rollRef} style={{ width: X(SPOT.lemon) }}>
            <Lemon />
          </div>

          <div
            className="scene-copy scene-project"
            data-plate
            data-reveal
            style={{ '--l': X(92), '--r': X(830), '--t': Y(3650) } as React.CSSProperties}
          >
            <p className="scene-eyebrow">{COPY.project.eyebrow}</p>
            <h2 className="scene-title">{COPY.project.title}</h2>
            <p className="scene-note">{COPY.project.note}</p>
          </div>

          <Bubble x={SPOT.dogBubble.x} y={SPOT.dogBubble.y} tail="left" className="scene-bubble--dog">
            {COPY.bubbles.dog}
          </Bubble>

          <div
            className="scene-copy scene-pains-copy"
            data-plate
            data-reveal
            style={{ '--l': X(104), '--r': X(760), '--t': Y(4480) } as React.CSSProperties}
          >
            <p className="scene-eyebrow">{COPY.pains.eyebrow}</p>
            <h2 className="scene-title">{COPY.pains.title}</h2>
            <ul className="scene-pains">
              {COPY.pains.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="scene-kicker">{COPY.pains.note}</p>
          </div>

          <div
            className="scene-copy scene-side-note"
            data-plate
            data-reveal
            style={{ '--l': X(1050), '--r': X(92), '--t': Y(4630) } as React.CSSProperties}
          >
            <h3 className="scene-card-title">{COPY.painsSide.title}</h3>
            <p className="scene-card-note">{COPY.painsSide.note}</p>
          </div>

          {/* ── море: кораблик уплывает за скроллом ── */}
          <div
            className="scene-boat"
            data-from={TRACK.boat[0]}
            data-to={TRACK.boat[1]}
            style={{ left: X(SPOT.boat.x), top: Y(SPOT.boat.y), width: X(SPOT.boat.w) }}
          >
            <picture>
              <source type="image/avif" srcSet={`/scene/${SPOT.boat.srcs[0].avif}`} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/scene/${SPOT.boat.srcs[0].webp}`}
                width={SPOT.boat.w}
                height={SPOT.boat.h}
                loading="lazy"
                alt=""
              />
            </picture>
          </div>

          <div
            className="scene-copy scene-water-copy"
            data-plate
            data-reveal
            style={{ '--l': X(90), '--r': X(1020), '--t': Y(5500) } as React.CSSProperties}
          >
            <p className="scene-eyebrow">{COPY.water.eyebrow}</p>
            <h2 className="scene-title">{COPY.water.title}</h2>
            <p className="scene-note">{COPY.water.note}</p>
          </div>

          {/* ── горы: финал ── */}
          <div
            className="scene-mountain-shade"
            data-reveal
            style={{ top: Y(5940), height: Y(900) }}
            aria-hidden
          />
          <div className="scene-finale" data-reveal style={{ top: Y(6180) }}>
            <p className="scene-eyebrow">{COPY.finale.eyebrow}</p>
            <h2 className="scene-title">{COPY.finale.title}</h2>
            <p className="scene-note">{COPY.finale.note}</p>
            <div className="scene-actions">
              <Link className="scene-btn scene-btn--solid" href="/courses">
                Наши обучения
              </Link>
              <Link className="scene-btn scene-btn--ghost" href="/free">
                Сначала бесплатно
              </Link>
              <a className="scene-btn scene-btn--ghost" href={TELEGRAM_DM}>
                Написать в личку
              </a>
            </div>
          </div>

          <div className="scene-legal" style={{ top: Y(6930) }}>
            <span>© GELATO</span>
            {LEGAL_NAV.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
