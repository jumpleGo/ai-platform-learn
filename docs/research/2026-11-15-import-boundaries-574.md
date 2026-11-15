# #574: Граница импортов server-only модулей

## 1. Правило границы
Статическая проверка AST отслеживает runtime-импорты серверных модулей (содержащих `import 'server-only'`).
Нарушением границы считается серверный модуль, достижимый по графу импортов:
1. Из клиентского файла (директива `'use client'`) без барьера Server Action (`'use server'`).
2. Из тестового файла (`tests/*.test.ts(x)`) без изоляции через подмену (`vi.mock`).

Связи обрываются при наличии:
- `vi.mock` на целевой, промежуточный модуль или маркер `'server-only'` (если нет `vi.importActual`).
- Директивы `'use server'` на границе клиентского обхода (RPC-вызов Next.js).
- Чисто типовых импортов (`import type`, `export type`, `typeof import`).

## 2. Базовое состояние
- `NARROW_BASELINE_N = 0`: на `main` нарушений узкой границы нет.
- `EXCEPTIONS = []`: список исключений пуст.
- `NEW_DEPS = 0`: сторонние пакеты (dependency-cruiser, eslint-plugin-boundaries) не добавлялись; используется существующий `typescript` AST API.

## 3. Отброшенные ложные срабатывания (шаг 0 -> шаг 1)
Наивный поиск находил 73 импорта `server-only` модулей. Узкое правило корректно отбрасывает:
1. **Server Components**: `src/app/**/page.tsx` (без `'use client'`) импортируют серверные модули (например, `@/lib/db/courses`). Они выполняются на сервере и не попадают в клиентский бандл.
2. **Server Actions**: вызовы функций из модулей с `'use server'` в клиентских компонентах разрешены Next.js через сериализуемые RPC.
3. **Мокированные тесты**: `tests/courses.test.ts` мокирует `@/lib/db/courses` и `server-only` через `vi.mock`, изолируя окружение Vitest.
4. **Type-only импорты**: конструкции `import type { Course } from '@/lib/db/courses'` стираются при сборке и не создают рантайм-зависимостей.
5. **Межсерверные вызовы**: `src/lib/session.ts` импортирует `src/lib/firebase/admin.ts` — оба модуля серверные, граница не нарушается.

## 4. Детектируемая регрессия (#556, коммит 2b3f421)
Правило успешно ловит регрессию из ветки `2b3f421` — прямой импорт `@/lib/db/reels` в `src/app/sitemap.ts`.
Замороженный фрагмент (первые 10 строк `sitemap.ts`, SHA256 `e7b7584774f4f633c7f895a06b9bbc9e09a415a18757bc1b94c4044a97cd812f`):
```ts
import type { MetadataRoute } from 'next';
import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
import { listPublishedReels } from '@/lib/db/reels';
```
При проверке тестового файла, импортирующего такой `sitemap.ts` (с моком `courses`, но без мока `reels`), формируется нарушение:
`test:tests/sitemap-fixture.test.ts -> src/app/sitemap.ts -> src/lib/db/reels.ts -> server-only`.
При удалении строки импорта `reels` цепочка исчезает.
