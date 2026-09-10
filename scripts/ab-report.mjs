// Сводка по A/B-тестам из PostHog. Читает реестр src/lib/experiments.ts и для каждого
// теста считает экспозиции, конверсию в главную и второстепенные метрики по вариантам,
// плюс вероятность, что вариант лучше контроля. Ничего не решает сам — решение за человеком.
//
//   node scripts/ab-report.mjs            # все running-тесты
//   node scripts/ab-report.mjs <key>      # один тест, включая done
//   node scripts/ab-report.mjs --json     # машиночитаемо
//
// Ключ: POSTHOG_PERSONAL_API_KEY в .env.local (scope query:read).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECT = 259690;
const HOST = 'https://eu.posthog.com';

function loadKey() {
  if (process.env.POSTHOG_PERSONAL_API_KEY) return process.env.POSTHOG_PERSONAL_API_KEY;
  try {
    const env = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    const line = env.split('\n').find((l) => l.startsWith('POSTHOG_PERSONAL_API_KEY='));
    if (line) return line.slice('POSTHOG_PERSONAL_API_KEY='.length).trim();
  } catch {}
  console.error('Нет POSTHOG_PERSONAL_API_KEY ни в окружении, ни в .env.local');
  process.exit(1);
}

// Реестр — TS-файл; вытаскиваем объект EXPERIMENTS без сборки: это литерал, eval безопасен для своего кода
function loadExperiments() {
  const src = readFileSync(resolve(process.cwd(), 'src/lib/experiments.ts'), 'utf8');
  const start = src.indexOf('export const EXPERIMENTS = {');
  const end = src.indexOf('} as const satisfies', start);
  const literal = src.slice(start + 'export const EXPERIMENTS = '.length, end + 1);
  return Object.values(new Function(`return (${literal});`)());
}

async function hogql(key, query) {
  const res = await fetch(`${HOST}/api/projects/${PROJECT}/query/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
  });
  const json = await res.json();
  if (!json.results) throw new Error(json.detail ?? JSON.stringify(json));
  return json.results;
}

// Вероятность, что B лучше A, по бета-распределениям (Монте-Карло, без зависимостей)
function probBeatsControl(convA, nA, convB, nB, samples = 20000) {
  const gamma = (k) => {
    // Marsaglia–Tsang для k>=1, для k<1 через степенное преобразование
    if (k < 1) return gamma(k + 1) * Math.pow(Math.random(), 1 / k);
    const d = k - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x, v;
      do {
        const u1 = Math.random(), u2 = Math.random();
        x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  };
  const beta = (a, b) => {
    const x = gamma(a), y = gamma(b);
    return x / (x + y);
  };
  let wins = 0;
  for (let i = 0; i < samples; i++) {
    if (beta(convB + 1, nB - convB + 1) > beta(convA + 1, nA - convA + 1)) wins++;
  }
  return wins / samples;
}

async function report(key, exp) {
  const since = `toDateTime('${exp.startedAt} 00:00:00', 'Europe/Moscow')`;
  const metrics = [exp.primaryMetric, ...(exp.secondaryMetrics ?? [])];
  const metricCols = metrics
    .map((m, i) => `countIf(e.event = '${m}' and e.timestamp >= x.first_seen) > 0 as m${i}`)
    .join(', ');
  // Пользователь считается в варианте с момента первой экспозиции; метрики — только после неё
  const rows = await hogql(
    key,
    `select variant, count() as exposed, ${metrics.map((_, i) => `countIf(m${i}) as c${i}`).join(', ')}
     from (
       select x.distinct_id, x.variant, ${metricCols}
       from (
         select distinct_id, argMin(properties.variant, timestamp) as variant, min(timestamp) as first_seen
         from events
         where event = 'experiment_exposed' and properties.experiment = '${exp.key}' and timestamp >= ${since}
         group by distinct_id
       ) x
       left join (
         select distinct_id, event, timestamp from events
         where timestamp >= ${since} and properties.$pathname like '${exp.pathPrefix}%'
       ) e on e.distinct_id = x.distinct_id
       group by x.distinct_id, x.variant
     )
     group by variant order by variant`,
  );
  const byVariant = Object.fromEntries(rows.map(([v, exposed, ...cs]) => [v, { exposed, counts: cs }]));
  const control = exp.variants[0];
  const c = byVariant[control] ?? { exposed: 0, counts: metrics.map(() => 0) };
  const out = { key: exp.key, status: exp.status, hypothesis: exp.hypothesis, startedAt: exp.startedAt, variants: [] };
  for (const v of exp.variants) {
    const d = byVariant[v] ?? { exposed: 0, counts: metrics.map(() => 0) };
    const entry = { variant: v, exposed: d.exposed, metrics: {} };
    metrics.forEach((m, i) => {
      entry.metrics[m] = { conversions: d.counts[i], rate: d.exposed ? d.counts[i] / d.exposed : 0 };
    });
    if (v !== control && d.exposed && c.exposed) {
      entry.probBeatsControl = probBeatsControl(c.counts[0], c.exposed, d.counts[0], d.exposed);
    }
    entry.enoughData = d.exposed >= exp.minExposuresPerVariant;
    out.variants.push(entry);
  }
  return out;
}

function pct(x) {
  return `${(x * 100).toFixed(1)}%`;
}

function printMarkdown(r) {
  console.log(`\n## ${r.key} (${r.status}, с ${r.startedAt})`);
  console.log(`_${r.hypothesis}_\n`);
  const metrics = Object.keys(r.variants[0].metrics);
  console.log(`| Вариант | Экспозиций | ${metrics.join(' | ')} | P(лучше контроля) |`);
  console.log(`|---|---|${metrics.map(() => '---').join('|')}|---|`);
  for (const v of r.variants) {
    const cells = metrics.map((m) => `${v.metrics[m].conversions} (${pct(v.metrics[m].rate)})`);
    const p = v.probBeatsControl == null ? '—' : pct(v.probBeatsControl);
    console.log(`| ${v.variant}${v.enoughData ? '' : ' ⚠︎ мало данных'} | ${v.exposed} | ${cells.join(' | ')} | ${p} |`);
  }
  const weak = r.variants.filter((v) => !v.enoughData);
  if (weak.length) console.log('\nДанных пока мало: выводы преждевременны, ждём minExposuresPerVariant экспозиций на вариант.');
}

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const onlyKey = args.find((a) => !a.startsWith('--'));
const key = loadKey();
const experiments = loadExperiments().filter((e) => (onlyKey ? e.key === onlyKey : e.status === 'running'));
if (!experiments.length) {
  console.log(onlyKey ? `Эксперимент ${onlyKey} не найден` : 'Нет запущенных экспериментов');
  process.exit(0);
}
const results = [];
for (const exp of experiments) results.push(await report(key, exp));
if (asJson) console.log(JSON.stringify(results, null, 2));
else results.forEach(printMarkdown);
