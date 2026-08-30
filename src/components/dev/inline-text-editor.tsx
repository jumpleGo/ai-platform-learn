'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// Dev-редактор текста: включаешь режим (⌥E), кликаешь по любой надписи на странице,
// правишь на месте — правка уходит в /api/dev/text и переписывает исходник.
// Fast Refresh сам перерисовывает страницу из обновлённого файла.
// Enter внутри блока делает перенос строки, два Enter подряд — пустую строку.

type Candidate = { file: string; line: number; preview: string };

type ElementInfo = { tag: string; className: string; owner: string };

// Имя компонента, который отрисовал элемент. В dev React держит на фибере стек
// места создания JSX; первый кадр вне node_modules — нужный компонент. Нужно,
// чтобы отличить, в каком файле лежит именно этот <p className="...">.
function ownerOf(el: HTMLElement): string {
  try {
    const key = Object.keys(el).find((name) => name.startsWith('__reactFiber$'));
    const fiber = key ? (el as unknown as Record<string, { _debugStack?: Error }>)[key] : null;
    const stack = fiber?._debugStack?.stack ?? '';
    for (const row of stack.split('\n')) {
      const frame = row.match(/^\s*at ([A-Za-z_$][\w$]*) \((.*)\)/);
      if (frame && !frame[2].includes('node_modules')) return frame[1];
    }
  } catch {
    // внутренности React — не критично, если формат поменялся
  }
  return '';
}

type Pending = {
  before: string;
  after: string;
  preservesNewlines: boolean;
  element: ElementInfo;
  near: string[];
  classes: string[];
  candidates: Candidate[];
};

// Поле правки: либо сам блок (внутри только текст и <br>), либо обёртка вокруг
// одного текстового фрагмента, если рядом есть разметка вроде ссылки.
type Field = {
  el: HTMLElement;
  before: string;
  preservesNewlines: boolean;
  element: ElementInfo;
  near: string[];
  classes: string[];
  finish: () => void;
  cancel: () => void;
};

const ACCENT = '#7c3aed';

// Жирность и курсив в значении поля обозначаем markdown-маркерами: так они
// проходят через текстовый протокол и на сервере превращаются в <strong>/<em>.
const EMPHASIS: Record<string, string> = { STRONG: '**', B: '**', EM: '*', I: '*' };

// Значение поля: <br> и блочные узлы сводим к \n, чтобы переносы дошли до сервера.
// pristine — чтение до правки: переводы строк внутри текстового узла там могут
// быть только форматированием исходника (JSX их не показывает) — но только если
// элемент не сохраняет пробелы (whitespace-pre-line/pre-wrap). Если сохраняет,
// перенос настоящий и его схлопывать нельзя — иначе baseline «до правки» не
// совпадёт с реальным текстом в исходнике, и удаление переноса не отправится
// на сервер (после Fast Refresh старый перенос «вернётся»).
function readValue(root: HTMLElement, pristine = false, preservesNewlines = false): string {
  let out = '';
  const walk = (parent: Node) => {
    for (const node of parent.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const data = (node as Text).data;
        out += pristine && !preservesNewlines ? data.replace(/[^\S ]*\n[^\S ]*/g, ' ') : data;
      } else if (node.nodeName === 'BR') {
        out += '\n';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const marker = EMPHASIS[node.nodeName];
        if (marker) {
          out += marker;
          walk(node);
          out += marker;
          continue;
        }
        if (/^(DIV|P|LI)$/.test(node.nodeName) && out && !out.endsWith('\n')) out += '\n';
        walk(node);
      }
    }
  };
  walk(root);
  return out;
}

function textNodeAt(x: number, y: number): { node: Text; offset: number } | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };
  const position = doc.caretPositionFromPoint?.(x, y);
  if (position) {
    if (position.offsetNode.nodeType === Node.TEXT_NODE) {
      return { node: position.offsetNode as Text, offset: position.offset };
    }
    // Точка вне текста: браузер отдаёт элемент и индекс дочернего узла
    const child = position.offsetNode.childNodes[position.offset];
    if (child?.nodeType === Node.TEXT_NODE) return { node: child as Text, offset: 0 };
  }
  const range = doc.caretRangeFromPoint?.(x, y);
  if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
    return { node: range.startContainer as Text, offset: range.startOffset };
  }
  return null;
}

function isEditable(node: Text): boolean {
  if (!node.data.trim()) return false;
  const parent = node.parentElement;
  if (!parent) return false;
  if (parent.closest('[data-text-edit-ui]')) return false;
  // подстановки и прочий производный текст править нечем
  if (parent.closest('[data-no-text-edit]')) return false;
  // текст обрезан по месту — в исходнике он длиннее, правка ушла бы не туда
  if (parent.closest('[data-truncated]')) return false;
  if (parent.closest('input, textarea, svg, script, style')) return false;
  return true;
}

// Блок целиком правим только если внутри нет другой разметки — иначе перенос
// пришлось бы вставлять в чужой JSX-узел. Два текстовых узла подряд тоже блокируют
// блочный режим: это разные JSX-выражения, между ними в исходнике {переменная},
// и склеенный текст («$ claude · 3 обучения») в файлах не найдётся.
function blockFor(node: Text): HTMLElement | null {
  const parent = node.parentElement;
  if (!parent) return null;
  let previousWasText = false;
  for (const child of parent.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      if (previousWasText) return null;
      previousWasText = true;
    } else if (child.nodeName === 'BR' || EMPHASIS[child.nodeName]) {
      // <strong>/<em> внутри блока — это разметка из того же места исходника
      previousWasText = false;
    } else {
      return null;
    }
  }
  return parent;
}

function rectOf(target: Node): DOMRect | null {
  const range = document.createRange();
  range.selectNodeContents(target);
  const rect = range.getBoundingClientRect();
  return rect.width || rect.height ? rect : null;
}

// Выделение → <strong>/<em>. Если выделение уже внутри такого тега, снимаем его.
function toggleEmphasis(field: HTMLElement, tag: 'strong' | 'em') {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
  const range = selection.getRangeAt(0);

  const names = tag === 'strong' ? ['STRONG', 'B'] : ['EM', 'I'];
  const start = range.startContainer;
  const host = (start.nodeType === Node.TEXT_NODE ? start.parentElement : (start as HTMLElement))
    ?.closest(names.join(','));
  if (host && field.contains(host)) {
    host.replaceWith(...host.childNodes);
    return;
  }

  const wrapper = document.createElement(tag);
  try {
    range.surroundContents(wrapper);
  } catch {
    // выделение пересекает границы узлов — переносим содержимое вручную
    wrapper.appendChild(range.extractContents());
    range.insertNode(wrapper);
  }
  selection.removeAllRanges();
  const after = document.createRange();
  after.selectNodeContents(wrapper);
  selection.addRange(after);
}

// Последний перенос строки в конце contenteditable-блока браузер держит как
// «фантомный»: курсор к нему не подпускают ни Backspace, ни Delete, ни
// Cmd+A — они трогают что угодно, кроме него. Поэтому конечный \n убираем
// вручную, когда каретка стоит сразу после него и дальше в поле ничего нет.
function removeTrailingBreak(field: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || !selection.isCollapsed || selection.rangeCount === 0) return false;
  const { startContainer: node, startOffset: offset } = selection.getRangeAt(0);
  if (node.nodeType !== Node.TEXT_NODE) return false;
  const text = node as Text;
  if (offset !== text.data.length || !text.data.endsWith('\n')) return false;

  let cur: Node = node;
  while (cur !== field) {
    if (cur.nextSibling) return false;
    const parent = cur.parentNode;
    if (!parent) return false;
    cur = parent;
  }

  text.data = text.data.slice(0, -1);
  const range = document.createRange();
  range.setStart(text, text.data.length);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

// Соседний текст вокруг блока: по нему сервер понимает, какое из одинаковых
// мест в исходниках правится, и не спрашивает «какой из пяти файлов».
function nearbyTexts(el: HTMLElement): string[] {
  const nodes = [
    el.previousElementSibling,
    el.nextElementSibling,
    el.parentElement?.previousElementSibling,
    el.parentElement?.nextElementSibling,
    el.parentElement?.parentElement?.previousElementSibling,
  ];
  const out: string[] = [];
  for (const node of nodes) {
    const text = node?.textContent?.replace(/\s+/g, ' ').trim();
    if (text && text.length > 3 && !out.includes(text)) out.push(text.slice(0, 160));
  }
  return out.slice(0, 4);
}

// Классы элемента и его родителей — вторая подсказка о месте в исходниках
function contextClasses(el: HTMLElement): string[] {
  const out: string[] = [];
  let node: HTMLElement | null = el;
  for (let i = 0; i < 7 && node; i++, node = node.parentElement) {
    const value = node.getAttribute('class')?.replace(/\s+/g, ' ').trim();
    if (value && !out.includes(value)) out.push(value);
  }
  return out;
}

export function InlineTextEditor() {
  const [active, setActive] = useState(false);
  const [hover, setHover] = useState<DOMRect | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const fieldRef = useRef<Field | null>(null);

  const save = useCallback(
    async (
      before: string,
      after: string,
      preservesNewlines: boolean,
      element: ElementInfo,
      near: string[],
      classes: string[],
      target?: Candidate,
    ) => {
      const response = await fetch('/api/dev/text', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          before,
          after,
          preservesNewlines,
          element,
          near,
          classes,
          path: window.location.pathname,
          file: target?.file,
          line: target?.line,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.status === 409) {
        setPending({
          before,
          after,
          preservesNewlines,
          element,
          near,
          classes,
          candidates: data.candidates ?? [],
        });
        toast.warning('Текст встречается в нескольких местах — выбери файл');
        return;
      }
      if (!response.ok) {
        toast.error(data.error ?? 'Не удалось сохранить', {
          description: before.replace(/\n/g, ' ⏎ ').slice(0, 140),
        });
        return;
      }
      setPending(null);
      if (data.warning)
        toast.warning(data.warning, {
          description: data.looked ?? `${data.file}:${data.line}`,
          duration: 12000,
        });
      else if (data.styled || data.wired)
        toast.success(`${data.file}:${data.line}`, {
          description: [
            data.styled && `+ whitespace-pre-line → ${data.styled}`,
            data.wired && `+ RichText → ${data.wired}`,
          ]
            .filter(Boolean)
            .join(' · '),
        });
      else toast.success(`${data.file}:${data.line}`);
    },
    [],
  );

  const commit = useCallback(
    (keep: boolean) => {
      const field = fieldRef.current;
      if (!field) return;
      fieldRef.current = null;
      const after = readValue(field.el);
      if (!keep) {
        field.cancel();
        return;
      }
      field.finish();
      if (after !== field.before)
        void save(
          field.before,
          after,
          field.preservesNewlines,
          field.element,
          field.near,
          field.classes,
        );
    },
    [save],
  );

  const beginEdit = useCallback(
    (node: Text, offset: number) => {
      const block = blockFor(node);
      const el = block ?? document.createElement('span');
      let field: Field;

      // Правка идёт в DOM, которым владеет React. Поэтому запоминаем его узлы и
      // при завершении ставим на место ровно их: если подсунуть новые, React на
      // следующем рендере не найдёт свои и упадёт с NotFoundError. Новый текст
      // приезжает из исходника Fast Refresh'ем.
      const kids = block ? Array.from(block.childNodes) : [];
      const kidText = kids.map((kid) => (kid.nodeType === Node.TEXT_NODE ? (kid as Text).data : null));
      const putBack = (value: string | null) => {
        // снимаем режим правки с элемента: без этого блок остаётся
        // contenteditable и следующая правка уже не сохраняется
        el.removeAttribute('contenteditable');
        el.removeAttribute('data-text-edit-field');
        el.style.removeProperty('outline');
        el.style.removeProperty('outline-offset');
        el.style.removeProperty('border-radius');
        el.style.removeProperty('white-space');
        if (!el.isConnected) return;
        try {
          if (block) {
            block.replaceChildren(...kids);
            kids.forEach((kid, i) => {
              const data = kidText[i];
              if (data !== null) (kid as Text).data = data;
            });
            // единственный текстовый узел можно сразу показать новым — без замены узла
            if (value !== null && kids.length === 1 && kidText[0] !== null) {
              (kids[0] as Text).data = value;
            }
          } else {
            node.data = value ?? node.data;
            el.replaceWith(node);
          }
        } catch {
          // разметку уже пересобрал React — тогда и восстанавливать нечего
        }
      };

      if (block) {
        const preservesNewlines = /pre/.test(getComputedStyle(block).whiteSpace);
        field = {
          el: block,
          before: readValue(block, true, preservesNewlines),
          preservesNewlines,
          element: {
            tag: block.tagName,
            className: block.getAttribute('class') ?? '',
            owner: ownerOf(block),
          },
          near: nearbyTexts(block),
          classes: contextClasses(block),
          finish: () => putBack(readValue(block)),
          cancel: () => putBack(null),
        };
      } else {
        // Текст вперемешку с разметкой: правим только этот фрагмент
        const host = node.parentElement;
        const parentStyle = host ? getComputedStyle(host) : null;
        const preservesNewlines = /pre/.test(parentStyle?.whiteSpace ?? '');
        const original = preservesNewlines ? node.data : node.data.replace(/[^\S ]*\n[^\S ]*/g, ' ');
        node.data = original;
        node.parentNode?.replaceChild(el, node);
        el.appendChild(node);
        field = {
          el,
          before: original,
          preservesNewlines,
          element: host
            ? { tag: host.tagName, className: host.getAttribute('class') ?? '', owner: ownerOf(host) }
            : { tag: '', className: '', owner: '' },
          near: host ? nearbyTexts(host) : [],
          classes: host ? contextClasses(host) : [],
          finish: () => putBack(readValue(el)),
          cancel: () => putBack(original),
        };
      }

      el.dataset.textEditField = '';
      el.contentEditable = 'plaintext-only';
      if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
      el.spellcheck = false;
      // pre-wrap — чтобы переносы и пустые строки было видно во время правки
      el.style.whiteSpace = 'pre-wrap';
      el.style.outline = `2px solid ${ACCENT}`;
      el.style.outlineOffset = '2px';
      el.style.borderRadius = '2px';
      fieldRef.current = field;
      setHover(null);

      // Enter отдаём браузеру — в plaintext-only он вставляет перенос.
      // Сохранение — ⌘/Ctrl+Enter, отмена — Escape.
      el.addEventListener('keydown', (event) => {
        const modifier = event.metaKey || event.ctrlKey;
        if (modifier && (event.key === 'b' || event.key === 'i')) {
          event.preventDefault();
          event.stopPropagation();
          toggleEmphasis(el, event.key === 'b' ? 'strong' : 'em');
        } else if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          commit(false);
        } else if (event.key === 'Enter' && modifier) {
          event.preventDefault();
          event.stopPropagation();
          commit(true);
        } else if (event.key === 'Backspace' && !modifier && removeTrailingBreak(el)) {
          event.preventDefault();
          event.stopPropagation();
        }
      });
      el.addEventListener('blur', () => commit(true));

      // Каретку ставим сразу и повторно в следующем кадре: браузер, забирая фокус
      // в свежий contenteditable, успевает сбросить выделение в начало.
      const placeCaret = () => {
        if (fieldRef.current !== field) return;
        const range = document.createRange();
        range.setStart(node, Math.min(offset, node.data.length));
        range.collapse(true);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      };
      el.focus();
      placeCaret();
      requestAnimationFrame(placeCaret);
    },
    [commit],
  );

  // ⌥/Ctrl+E — переключение режима; работает всегда, даже когда режим выключен
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'KeyE' && (event.altKey || event.ctrlKey) && !event.metaKey) {
        event.preventDefault();
        setActive((value) => !value);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!active) {
      commit(true);
      setHover(null);
      return;
    }

    const onMove = (event: MouseEvent) => {
      if (fieldRef.current) return;
      const found = textNodeAt(event.clientX, event.clientY);
      if (!found || !isEditable(found.node)) {
        setHover(null);
        return;
      }
      setHover(rectOf(blockFor(found.node) ?? found.node));
    };

    // Клик перехватываем на capture: в режиме правки ссылки и кнопки не срабатывают
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-text-edit-ui]')) return;
      if (target?.closest('[data-text-edit-field]')) return;
      event.preventDefault();
      event.stopPropagation();
      commit(true);
      const found = textNodeAt(event.clientX, event.clientY);
      if (found && isEditable(found.node)) beginEdit(found.node, found.offset);
    };

    const onScrollOrResize = () => setHover(null);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('click', onClick, true);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [active, beginEdit, commit]);

  return (
    <div data-text-edit-ui="">
      {active && hover ? (
        <div
          style={{
            position: 'fixed',
            left: hover.left - 2,
            top: hover.top - 2,
            width: hover.width + 4,
            height: hover.height + 4,
            border: `1px dashed ${ACCENT}`,
            borderRadius: 3,
            background: 'rgba(124, 58, 237, 0.08)',
            pointerEvents: 'none',
            zIndex: 2147483000,
          }}
        />
      ) : null}

      {pending ? (
        <div
          style={{
            position: 'fixed',
            right: 16,
            bottom: 64,
            zIndex: 2147483001,
            width: 420,
            maxHeight: '50vh',
            overflowY: 'auto',
            padding: 12,
            borderRadius: 12,
            border: '1px solid rgba(0,0,0,0.1)',
            background: '#fff',
            color: '#111',
            boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
            font: '12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Где править?</div>
          {pending.candidates.map((candidate) => (
            <button
              key={`${candidate.file}:${candidate.line}`}
              type="button"
              onClick={() =>
                void save(
                  pending.before,
                  pending.after,
                  pending.preservesNewlines,
                  pending.element,
                  pending.near,
                  pending.classes,
                  candidate,
                )
              }
              style={{
                display: 'block',
                width: '100%',
                marginBottom: 4,
                padding: '6px 8px',
                borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.08)',
                background: '#f6f6f7',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span style={{ color: ACCENT }}>
                {candidate.file}:{candidate.line}
              </span>
              <br />
              <span style={{ opacity: 0.7 }}>{candidate.preview}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPending(null)}
            style={{
              marginTop: 4,
              padding: '4px 8px',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: '#666',
              cursor: 'pointer',
            }}
          >
            отмена
          </button>
        </div>
      ) : null}

      {active ? (
        <div
          style={{
            position: 'fixed',
            left: 16,
            bottom: 16,
            zIndex: 2147483001,
            padding: '6px 10px',
            borderRadius: 8,
            background: 'rgba(17,17,17,0.86)',
            color: '#fff',
            font: '400 11px/1.5 ui-sans-serif, system-ui',
            pointerEvents: 'none',
            backdropFilter: 'blur(6px)',
          }}
        >
          Enter — перенос · ⌘B/⌘I — жирный/курсив · ⌘↵ или клик мимо — сохранить · Esc — отмена
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setActive((value) => !value)}
        title="Режим правки текста (⌥E)"
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          zIndex: 2147483001,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 32,
          padding: '0 12px',
          borderRadius: 999,
          border: `1px solid ${active ? ACCENT : 'rgba(0,0,0,0.12)'}`,
          background: active ? ACCENT : 'rgba(255,255,255,0.92)',
          color: active ? '#fff' : '#444',
          font: '600 12px/1 ui-sans-serif, system-ui',
          boxShadow: '0 6px 20px rgba(0,0,0,0.16)',
          cursor: 'pointer',
          backdropFilter: 'blur(6px)',
        }}
      >
        {active ? 'текст: правка' : 'текст'}
        <span style={{ opacity: 0.7, fontWeight: 400 }}>⌥E</span>
      </button>
    </div>
  );
}
