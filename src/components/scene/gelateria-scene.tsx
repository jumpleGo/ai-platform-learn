'use client';

import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Lemon } from './lemon';
import {
  CANVAS_H,
  CANVAS_W,
  COPY,
  HIT_IMPACT_POINT,
  ROLL,
  SPOT,
  TRACK,
  X,
  Y,
  dropTail,
  measure,
  rollRotationEnd,
  sampleHit,
  samplePath,
  scene,
} from '@/lib/scene';
import { LEGAL_NAV, PROGRAM_URL } from '@/lib/site';
import './scene.css';
import { RichText } from '@/components/markdown';
import { LessonQuizDialog } from '@/components/lesson-quiz';
import { track } from '@/lib/analytics/track-client';
import { EVENTS } from '@/lib/analytics/events';

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
    <div className={`scene-bubble ${className} whitespace-pre-line`} data-reveal data-tail={tail} style={{ left: X(x), top: Y(y) }}>
      {children}
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
  const hitRef = useRef<HTMLDivElement>(null);
  const finaleBtnRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const acc = useMemo(() => measure(ROLL), []);
  const rollRotEnd = useMemo(() => rollRotationEnd(acc), [acc]);
  const [quizOpen, setQuizOpen] = useState(false);

  // Плавный скролл: полотно едет с инерцией, поэтому анимации по пути лимона
  // читаются как единый проезд камеры, а не как рывки колеса мыши.
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
    // На телефоне первый смысловой блок — точка входа в историю, поэтому он
    // виден сразу. Остальная сцена по-прежнему раскрывается после скролла.
    if (matchMedia('(max-width: 700px)').matches) {
      stage.querySelector('.scene-hero')?.setAttribute('data-in', '');
    }
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
      // никакого плавного угасания перед прыжком: лимон катится сплошным,
      // без просвечивания, и пропадает мгновенно ровно в точке хэндофа
      // прыгающему лимону (см. placeHit, у которого там же появляется 1)
      roll.style.setProperty('--lemon-opacity', q < 1 ? '1' : '0');
    };

    // Прыжок на кораблик, отскок и удар в кнопку — продолжение того же
    // «проезда камеры», скраббится скроллом туда и обратно, как и всё
    // остальное на сцене (см. sampleHit/splashProgress в lib/scene.ts).
    const placeHit = (t: number, boatOffsetX: number, buttonOffset: { x: number; y: number }) => {
      const hit = hitRef.current;
      if (!hit) return;
      const q = Math.min(1, Math.max(0, t));
      const p = sampleHit(q, rollRotEnd, boatOffsetX, buttonOffset);
      hit.style.setProperty('--hx', X(p.x));
      hit.style.setProperty('--hy', Y(p.y));
      hit.style.setProperty('--hrot', `${p.rot.toFixed(1)}deg`);
      hit.style.setProperty('--hit-opacity', p.opacity.toFixed(3));
      // заливка красится не по скроллу (после удара до конца страницы может
      // не хватить места докрутить), а сразу после касания — фиксированным
      // по времени CSS-transition, включается булевым data-hit
      finaleBtnRef.current?.toggleAttribute('data-hit', q >= 1);
    };

    if (still) {
      place(0);
      placeHit(0, 0, { x: 0, y: 0 });
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

      // Сдвиг кораблика от точки, на которую нарисована посадка (та же
      // формула, что и его transform в scene.css: .scene-boat { translateX:
      // (--q - 0.42) * 26cqw }, cqw тут — то же самое % ширины канвы, что и в
      // X()/Y(), поэтому переводится в пиксели канвы напрямую).
      const [boatFrom, boatTo] = TRACK.boat;
      const qBoat = Math.min(1, Math.max(0, (focus - boatFrom) / (boatTo - boatFrom)));
      const mobile = innerWidth <= 700;
      // CSS мобильного кораблика использует более короткий проезд (10cqw)
      // и постоянный сдвиг вправо (17cqw). Точка посадки лимона обязана
      // повторять ровно ту же формулу, иначе он прыгает мимо палубы.
      const boatShiftCqw = mobile ? (qBoat - 0.42) * 10 + 17 : (qBoat - 0.42) * 26;
      const boatOffsetX = boatShiftCqw / 100 * CANVAS_W;

      // Насколько измеренный в DOM центр кнопки (та же точка 30%/55%, откуда
      // растёт заливка) отличается от нарисованной точки удара.
      let buttonOffset = { x: 0, y: 0 };
      const btnRect = finaleBtnRef.current?.getBoundingClientRect();
      if (btnRect && btnRect.width > 0) {
        const targetX = (btnRect.left - rect.left + btnRect.width * 0.3) / scale;
        const targetY = (btnRect.top - rect.top + btnRect.height * 0.55) / scale;
        buttonOffset = { x: targetX - HIT_IMPACT_POINT.x, y: targetY - HIT_IMPACT_POINT.y };
      }

      const [hitFrom, hitTo] = TRACK.hit;
      // На мобильном видимая высота полотна короче относительно viewport,
      // поэтому до десктопной точки 6560 px пользователь физически не успевал
      // доскроллить. Сжимаем только финальный отрезок полёта: траектория и
      // измеренная точка удара в кнопку остаются теми же.
      const effectiveHitTo = mobile ? 6400 : hitTo;
      placeHit((focus - hitFrom) / (effectiveHitTo - hitFrom), boatOffsetX, buttonOffset);

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
      // Мобильная раскадровка зумирована и разнесена отдельно: там нельзя
      // жертвовать смысловыми абзацами ради свободного места на рисунке.
      if (matchMedia('(max-width: 700px)').matches) return;
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
        <Link href={PROGRAM_URL}>Вайбкодинг</Link>
      </nav>

      <LessonQuizDialog open={quizOpen} onOpenChange={setQuizOpen} />

      {/* фильтр неровного «малярного» края для заливки кнопки — лимон бьёт в неё в конце сцены */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <filter id="scene-splash-edge" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves={2} seed={7} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={26} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <div className="scene-hint" ref={hintRef}>
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
            Emil's Gelateria Italiana
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
            <p className="scene-eyebrow whitespace-pre-line">{COPY.hero.eyebrow}</p>
            <h1 className="scene-title whitespace-pre-line"><RichText text={COPY.hero.title} /></h1>
            <div className="scene-note scene-hero-story"><RichText text={COPY.hero.story} /></div>
            <div className="scene-note scene-hero-brand"><RichText text={COPY.hero.brand} /></div>
            <p className="scene-hero-cta">{COPY.hero.cta}</p>
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
            style={{ '--l': X(104), '--r': X(104), '--t': Y(2290) } as React.CSSProperties}
          >
            {COPY.yard.map((item, i) => (
              <div
                key={item.title}
                className={`scene-yard-card scene-yard-card--${i === 0 ? 'benefit' : 'emil'}`}
                data-reveal
                style={{ '--d': `${i * 0.12}s` } as React.CSSProperties}
              >
                <p className="scene-card-title">{item.title}</p>
                <p className="scene-card-note">{item.note}</p>
              </div>
            ))}
          </div>

          <Bubble x={SPOT.tableBubble.x} y={SPOT.tableBubble.y} tail="right" className="scene-bubble--table">
            {COPY.bubbles.table}
          </Bubble>

          {/* Портрет вынесен из фоновой панели отдельным прозрачным слоем:
              так его можно точно подогнать, не пережимая всю иллюстрацию. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="scene-emil-avatar"
            src="/scene/emil-avatar-collage-v2.webp"
            alt="Эмиль"
            width={384}
            height={360}
            style={{ left: X(SPOT.emilAvatar.x), top: Y(SPOT.emilAvatar.y), width: X(SPOT.emilAvatar.w) }}
          />

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
            <p className="scene-note">
              {COPY.project.note}{' '}
              <span className="scene-project-expert">{COPY.project.expertNote}</span>
            </p>
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
              {COPY.pains.items.map((item, index) => (
                <li key={item}>
                  {index === 1 ? (
                    <>Объясняете задачу, получаете не&nbsp;то&nbsp;—<br className="scene-mobile-break" /> и&nbsp;переделываете по&nbsp;кругу.</>
                  ) : item}
                </li>
              ))}
            </ul>
            <p className="scene-kicker">{COPY.pains.note}</p>
          </div>

          <div
            className="scene-copy scene-side-note"
            data-plate
            data-reveal
            style={{ '--l': X(950), '--r': X(72), '--t': Y(4860) } as React.CSSProperties}
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

          {/* ── лимон прыгает на кораблик, отскакивает и летит бить кнопку ──
              позиция считается из того же «focus», что и катящийся лимон
              (см. placeHit/TRACK.hit) — скраббится скроллом в обе стороны. */}
          <div className="scene-lemon scene-lemon--hit" ref={hitRef} style={{ width: X(SPOT.lemon) }} aria-hidden>
            <Lemon />
          </div>

          {/* ── горы: финал ── */}
          <div
            className="scene-mountain-shade"
            data-reveal
            style={{ top: Y(5940), height: Y(900) }}
            aria-hidden
          />
          <div className="scene-finale" data-reveal style={{ top: Y(6450) }}>
            <p className="scene-eyebrow">{COPY.finale.eyebrow}</p>
            <h2 className="scene-title">{COPY.finale.title}</h2>
            <p className="scene-note">{COPY.finale.note}</p>
            <div className="scene-actions">
              <button
                type="button"
                ref={finaleBtnRef}
                className="scene-btn scene-btn--ghost"
                onClick={() => {
                  track(EVENTS.quizStarted, { place: 'scene' });
                  setQuizOpen(true);
                }}
              >
                <span className="scene-btn-splash" aria-hidden />
                <span className="scene-btn-label">
                  <Sparkles className="size-4" aria-hidden />
                  Пройти тест
                </span>
              </button>
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
