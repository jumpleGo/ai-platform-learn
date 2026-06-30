import 'server-only';

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

// Оформляет черновой конспект в красивый markdown через OpenRouter (OpenAI-совместимый API).
export async function formatMaterials(raw: string): Promise<string> {
  const text = raw.trim();
  if (!text) throw new Error('Сначала вставьте конспект');

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('Не задан OPENROUTER_API_KEY');
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: text },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const out = data.choices?.[0]?.message?.content?.trim();
  if (!out) throw new Error('Пустой ответ модели');
  // снимаем возможное ограждение ```markdown ... ``` вокруг всего ответа
  return out.replace(/^```(?:markdown)?\n?/i, '').replace(/\n?```$/, '').trim();
}
