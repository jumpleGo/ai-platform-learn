// Сообщает Яндексу и Bing о новых или изменённых страницах через IndexNow.
// Запуск: node scripts/indexnow.mjs /blog/slug-1 /blog/slug-2
// Ключ лежит в public/460dd8419dac7340d775ae7a71222585.txt — поисковик сверяет его с сайтом.
const KEY = '460dd8419dac7340d775ae7a71222585';
const HOST = 'gelato.education';

const paths = process.argv.slice(2);
if (paths.length === 0) {
  console.error('Укажи пути: node scripts/indexnow.mjs /blog/slug');
  process.exit(1);
}

const urlList = paths.map((p) => `https://${HOST}${p.startsWith('/') ? p : `/${p}`}`);
const body = JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList });

for (const endpoint of ['https://yandex.com/indexnow', 'https://api.indexnow.org/indexnow']) {
  const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body });
  console.log(endpoint, res.status);
}
