import 'server-only';
import { isShortcut } from '@/lib/markdown';

// Описывает наш markdown-диалект (см. lib/markdown.ts), чтобы модель выдавала
// ровно то, что мы умеем рендерить.
const SYSTEM = `Ты — редактор учебных материалов. Превращаешь черновые заметки преподавателя
в аккуратный, структурированный конспект на русском языке.

Используй ТОЛЬКО этот markdown:
- ## и ### — заголовки разделов;
- "- " — маркированные списки, "1." — нумерованные;
- **жирный** — для ключевых акцентов;
- [текст](https://...) — ссылки;
- > — выноски с подсказками/важным;
- одиночные бэктики \`...\` — команды и код.

Не используй заголовок одного уровня (#) — только ## и ###.
Сочетания клавиш пиши обычным текстом вида Cmd+Enter, Ctrl+Shift+P, Esc (без ** и бэктиков) — они оформятся автоматически.

Правила:
- структурируй и причёсывай ТОЛЬКО то, что есть в заметках; ничего не выдумывай и не дополняй фактами;
- разбивай на логические разделы, выделяй главное, делай списки из перечислений;
- пиши кратко и по делу;
- верни ТОЛЬКО markdown, без преамбул, пояснений и markdown-ограждения вокруг всего ответа.`;

// Провайдер — любой OpenAI-совместимый API, задаётся через env (по умолчанию Kimi / Moonshot).
const BASE_URL = process.env.AI_BASE_URL || 'https://api.moonshot.ai/v1';
const MODEL = process.env.AI_MODEL || 'kimi-k2.7-code-highspeed';

// Оформляет черновой конспект в красивый markdown.
export async function formatMaterials(raw: string): Promise<string> {
  const text = raw.trim();
  if (!text) throw new Error('Сначала вставьте конспект');

  const key = process.env.AI_API_KEY;
  if (!key) throw new Error('Не задан AI_API_KEY');

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    // temperature не шлём: модели kimi-k2 принимают только значение 1 и отвечают 400 на любое другое
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: text },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`AI ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const out = data.choices?.[0]?.message?.content?.trim();
  if (!out) throw new Error('Пустой ответ модели');
  // снимаем возможное ограждение ```markdown ... ``` вокруг всего ответа
  const md = out.replace(/^```(?:markdown)?\n?/i, '').replace(/\n?```$/, '').trim();
  // модель нет-нет да и завернёт сочетание клавиш в **жирный** — так оно отрендерится
  // текстом вместо kbd-плашки, поэтому разворачиваем обратно
  return md.replace(/\*\*([^*\n]+)\*\*/g, (whole, inner: string) => (isShortcut(inner) ? inner : whole));
}
