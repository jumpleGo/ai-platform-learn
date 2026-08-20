// Проставляет slug курсам, созданным до появления человекочитаемых адресов.
// Запуск: npx tsx scripts/backfill-slugs.ts (env берётся из .env.local)
// С флагом --dry только показывает, какие slug получатся, ничего не записывая.
// admin.ts не импортируем из-за 'server-only' — инициализация продублирована намеренно.
process.loadEnvFile('.env.local');

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { slugify } from '../src/lib/slug';

function createApp(): App {
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === '1') {
    process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
    return initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
  }
  return initializeApp({
    credential: cert(JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64!, 'base64').toString()
    )),
  });
}

const db = getFirestore(getApps()[0] ?? createApp());

const DRY = process.argv.includes('--dry');

async function main() {
  const snap = await db.collection('courses').orderBy('order').get();
  const taken = new Set(snap.docs.map((d) => d.get('slug')).filter(Boolean) as string[]);

  for (const doc of snap.docs) {
    if (doc.get('slug')) {
      console.log(`skip ${doc.id} — уже ${doc.get('slug')}`);
      continue;
    }
    const root = slugify(String(doc.get('title') ?? '')) || 'kurs';
    let slug = root;
    for (let i = 2; taken.has(slug); i++) slug = `${root}-${i}`;
    taken.add(slug);
    if (!DRY) await doc.ref.update({ slug });
    console.log(`${doc.get('title')} [${doc.id}] → ${slug}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
