import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

// PROGRESS #574, step 1: NARROW_LIST=[] on 56c7582. Keep exceptions literal:
// never derive them from the current graph, a snapshot, or repository history.
const EXCEPTIONS: readonly string[] = [];

// First 10 lines of src/app/sitemap.ts at commit 2b3f421 (#556), including final LF.
// sha256: e7b7584774f4f633c7f895a06b9bbc9e09a415a18757bc1b94c4044a97cd812f
const SITEMAP_2B3F421 = `import type { MetadataRoute } from 'next';
import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
import { listPublishedReels } from '@/lib/db/reels';
import { trainingCourses } from '@/lib/catalog';
import { courseKey, lessonPath } from '@/lib/slug';
import { SITE_URL } from '@/lib/site';
import { BLOG_POSTS, blogPostUrl } from '@/lib/blog';

// Карта строится по данным Firestore, а доступа к базе на сборке нет
// (креды приходят из .env на сервере), поэтому генерируем на запросе.
`;

type Sources = Map<string, string>;
type Edge = { specifier: string; actual?: boolean };
type Module = { edges: Edge[]; mocks: Set<string>; client: boolean; action: boolean };
type Original = { parameter: string; specifier: string };

function readSources(): Sources {
  const sources: Sources = new Map();
  function walk(directory: string) {
    for (const entry of readdirSync(resolve(ROOT, directory), { withFileTypes: true })) {
      const file = posix.join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.[cm]?[jt]sx?$/.test(file) && !/\.d\.[cm]?ts$/.test(file)) {
        sources.set(file, readFileSync(resolve(ROOT, file), 'utf8'));
      }
    }
  }
  walk('src');
  walk('tests');
  return sources;
}

function literal(node: ts.Node | undefined): string | undefined {
  return node && ts.isStringLiteralLike(node) ? node.text : undefined;
}

function viMethod(expression: ts.Expression): string | undefined {
  return ts.isPropertyAccessExpression(expression)
    && ts.isIdentifier(expression.expression)
    && ['vi', 'vitest'].includes(expression.expression.text)
    ? expression.name.text : undefined;
}

// The project's globs use *, ** and literal bracketed Next.js route segments.
function globPattern(pattern: string): RegExp {
  return new RegExp('^' + pattern.split(/(\*\*\/|\*\*|\*|\?)/).map((part) => {
    if (part === '**/') return '(?:.*/)?';
    if (part === '**') return '.*';
    if (part === '*') return '[^/]*';
    if (part === '?') return '[^/]';
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('') + '$');
}

function parseModule(file: string, source: string, files: string[]): Module {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const edges: Edge[] = [];
  const mocks = new Set<string>();
  const directives = new Set<string>();
  for (const statement of ast.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) break;
    directives.add(statement.expression.text);
  }
  function add(node: ts.Node | undefined, actual = false) {
    const specifier = literal(node);
    if (specifier !== undefined) edges.push({ specifier, actual });
  }
  function visit(node: ts.Node, original?: Original) {
    // Includes typeof import(...); strings/comments/fixtures are never parsed as code.
    if (ts.isTypeNode(node)) return;
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      const bindings = clause?.namedBindings;
      if (!clause || (!clause.isTypeOnly && (clause.name || !bindings
        || ts.isNamespaceImport(bindings) || bindings.elements.length === 0
        || bindings.elements.some((element) => !element.isTypeOnly)))) add(node.moduleSpecifier);
      return;
    }
    if (ts.isExportDeclaration(node)) {
      const clause = node.exportClause;
      if (!node.isTypeOnly && (!clause || ts.isNamespaceExport(clause)
        || clause.elements.length === 0 || clause.elements.some((element) => !element.isTypeOnly))) {
        add(node.moduleSpecifier);
      }
      return;
    }
    if (ts.isImportEqualsDeclaration(node)) {
      if (!node.isTypeOnly && ts.isExternalModuleReference(node.moduleReference)) {
        add(node.moduleReference.expression);
      }
      return;
    }
    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      const method = viMethod(expression);
      if (method === 'mock') {
        const argument = node.arguments[0];
        const specifier = literal(argument) ?? (argument && ts.isCallExpression(argument)
          && argument.expression.kind === ts.SyntaxKind.ImportKeyword ? literal(argument.arguments[0]) : undefined);
        if (specifier !== undefined) mocks.add(specifier);
        const factory = node.arguments[1];
        const parameter = factory && (ts.isArrowFunction(factory) || ts.isFunctionExpression(factory))
          ? factory.parameters[0]?.name : undefined;
        const context = specifier && parameter && ts.isIdentifier(parameter)
          ? { parameter: parameter.text, specifier } : undefined;
        // vi.mock(import('...'), factory) registers a mock; its argument is not a load.
        // A partial mock's importOriginal(), however, really loads the original module.
        for (const child of node.arguments.slice(1)) visit(child, context);
        return;
      }
      if (expression.kind === ts.SyntaxKind.ImportKeyword
        || (ts.isIdentifier(expression) && expression.text === 'require') || method === 'importActual') {
        add(node.arguments[0], method === 'importActual');
      }
      if (original && ts.isIdentifier(expression) && expression.text === original.parameter) {
        edges.push({ specifier: original.specifier, actual: true });
      }
      if (ts.isPropertyAccessExpression(expression) && expression.name.text === 'glob'
        && ts.isMetaProperty(expression.expression) && expression.expression.name.text === 'meta') {
        const argument = node.arguments[0];
        const patterns = (argument && ts.isArrayLiteralExpression(argument) ? argument.elements : [argument])
          .map(literal).filter((value): value is string => value !== undefined)
          .map((value) => {
            const negative = value.startsWith('!');
            const specifier = negative ? value.slice(1) : value;
            const path = specifier.startsWith('@/') ? 'src/' + specifier.slice(2)
              : posix.join(posix.dirname(file), specifier);
            return { negative, pattern: globPattern(path) };
          });
        for (const target of files) {
          if (patterns.some((p) => !p.negative && p.pattern.test(target))
            && !patterns.some((p) => p.negative && p.pattern.test(target))) {
            edges.push({ specifier: '/' + target });
          }
        }
      }
    }
    ts.forEachChild(node, (child) => visit(child, original));
  }
  visit(ast);
  return { edges, mocks, client: directives.has('use client'), action: directives.has('use server') };
}

function findViolations(sources: Sources): string[] {
  // Resolve only against the supplied source text, including virtual fixture files.
  // Read tsconfig for aliases; neither application modules nor external packages run.
  const config = ts.readConfigFile(resolve(ROOT, 'tsconfig.json'), ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  const converted = ts.convertCompilerOptionsFromJson(config.config.compilerOptions, '/');
  if (converted.errors.length) throw new Error(ts.flattenDiagnosticMessageText(converted.errors[0].messageText, '\n'));
  const options = { ...converted.options, baseUrl: '/' };
  const host: ts.ModuleResolutionHost = {
    fileExists: (file) => sources.has(posix.relative('/', file)),
    readFile: (file) => sources.get(posix.relative('/', file)),
  };
  const cache = ts.createModuleResolutionCache('/', (file) => file, options);
  function resolveImport(from: string, specifier: string): string | undefined {
    const resolved = ts.resolveModuleName(specifier, '/' + from, options, host, cache).resolvedModule;
    return resolved ? posix.relative('/', resolved.resolvedFileName) : undefined;
  }
  const files = [...sources.keys()].sort();
  const graph = new Map(files.map((file) => [file, parseModule(file, sources.get(file)!, files)]));
  const violations: string[] = [];
  for (const [root, entry] of graph) {
    const kind = root.startsWith('src/') && entry.client ? 'client'
      : /^tests\/[^/]+\.test\.tsx?$/.test(root) ? 'test' : undefined;
    if (!kind) continue;
    const mocked = new Set([...entry.mocks].map((specifier) => resolveImport(root, specifier) ?? specifier));
    if (kind === 'test' && mocked.has('server-only')) continue;
    const seen = new Set<string>();
    const queue = [[root]];
    for (let index = 0; index < queue.length; index++) {
      const chain = queue[index];
      const file = chain[chain.length - 1];
      if (seen.has(file)) continue;
      seen.add(file);
      const module = graph.get(file)!;
      // Next compiles client imports of file-level Server Actions to references.
      // Vitest does not: the same action must still be checked from a test root.
      if (kind === 'client' && module.action) continue;
      if (module.edges.some((edge) => edge.specifier === 'server-only')) {
        violations.push(`${kind}:${chain.join(' -> ')} -> server-only`);
        continue;
      }
      for (const edge of module.edges) {
        const target = resolveImport(file, edge.specifier);
        if (!target || !graph.has(target)) continue;
        if (kind === 'test' && mocked.has(target) && !edge.actual) continue;
        queue.push([...chain, target]);
      }
    }
  }
  // Unit: (root kind, root file, first server-only module); breadth-first traversal
  // gives one reproducible shortest chain and avoids multiplying server internals.
  return [...new Set(violations)].sort();
}

function sitemapFixture(fragment: string): Sources {
  return new Map([
    ['tests/sitemap-fixture.test.ts', `
      import sitemap from '@/app/sitemap';
      vi.mock('@/lib/db/courses', () => ({}));
    `],
    ['src/app/sitemap.ts', fragment],
    // Real marker modules; their implementations are read as text, never imported.
    ...['src/lib/db/courses.ts', 'src/lib/db/reels.ts'].map((file): [string, string] =>
      [file, readFileSync(resolve(ROOT, file), 'utf8')]),
  ]);
}

function example(entry: string, shared = "export { value } from './lib/secret';"): Sources {
  return new Map([
    ['tests/entry.test.ts', entry],
    ['src/shared.ts', shared],
    ['src/lib/secret.ts', "import 'server-only'; export const value = 1; export type Value = number;"],
  ]);
}

describe('server-only import boundaries #574', () => {
  it('has no violations beyond the literal narrow baseline, and no stale exceptions', () => {
    expect(findViolations(readSources())).toEqual([...EXCEPTIONS].sort());
  }, 30_000);

  it('preserves the exact SHA256 of the frozen 2b3f421 fragment', () => {
    expect(createHash('sha256').update(SITEMAP_2B3F421, 'utf8').digest('hex'))
      .toBe('e7b7584774f4f633c7f895a06b9bbc9e09a415a18757bc1b94c4044a97cd812f');
  });

  it('detects the direct db/reels regression from #556 in a test-reachable sitemap', () => {
    expect(findViolations(sitemapFixture(SITEMAP_2B3F421))).toEqual([
      'test:tests/sitemap-fixture.test.ts -> src/app/sitemap.ts -> src/lib/db/reels.ts -> server-only',
    ]);
  });

  it('accepts that sitemap fragment when the db/reels import is absent', () => {
    const clean = SITEMAP_2B3F421.replace("import { listPublishedReels } from '@/lib/db/reels';\n", '');
    expect(findViolations(sitemapFixture(clean))).toEqual([]);
  });

  it.each([
    "import { value } from './lib/secret';",
    "import {\n type Value,\n value\n} from '@/lib/secret';",
    "export * from './lib/secret';",
    "export { value } from './lib/secret';",
    "export * as secret from './lib/secret';",
    "const secret = await import('./lib/secret.js');",
    "const secret = require('./lib/secret');",
    "import secret = require('./lib/secret');",
  ])('follows runtime syntax through a shared module: %s', (shared) => {
    expect(findViolations(example("import '@/shared';", shared))).toEqual([
      'test:tests/entry.test.ts -> src/shared.ts -> src/lib/secret.ts -> server-only',
    ]);
  });

  it.each([
    "import type { Value } from './lib/secret';",
    "import { type Value } from './lib/secret';",
    "export type { Value } from './lib/secret';",
    "export { type Value } from './lib/secret';",
    "type Secret = typeof import('./lib/secret');",
    "// import './lib/secret';\nconst fixture = `import './lib/secret';`;",
  ])('ignores erased types and non-code text: %s', (shared) => {
    expect(findViolations(example("import '@/shared';", shared))).toEqual([]);
  });

  it.each(['server-only', '@/lib/secret', '../src/lib/secret', '@/shared'])(
    'cuts a mocked marker, target or intermediate module: %s', (mocked) => {
      expect(findViolations(example(`import '@/shared'; vi.mock('${mocked}', () => ({}));`))).toEqual([]);
    },
  );

  it('supports module-promise mocks without treating registration as a load', () => {
    expect(findViolations(example("import '@/shared'; vi.mock(import('@/lib/secret'), () => ({}));"))).toEqual([]);
  });

  it.each([
    "vi.mock('@/shared', () => ({})); await vi.importActual('@/shared');",
    "import '@/shared'; vi.mock('@/shared', async original => await original());",
    "import '@/shared'; // vi.mock('server-only', () => ({}));",
  ])('still checks actual loads and ignores commented-out mocks: %s', (entry) => {
    expect(findViolations(example(entry))).toHaveLength(1);
  });

  it('keeps mocks local to each test root', () => {
    const sources = example("import '@/shared'; vi.mock('server-only', () => ({}));");
    sources.set('tests/unmocked.test.tsx', "import '@/shared';");
    expect(findViolations(sources)).toEqual([
      'test:tests/unmocked.test.tsx -> src/shared.ts -> src/lib/secret.ts -> server-only',
    ]);
  });

  it('follows index barrels and terminates on import cycles', () => {
    const sources = example("import '@/shared';", "export * from './lib';");
    sources.set('src/lib/index.ts', "export * from '../shared'; export * from './secret';");
    expect(findViolations(sources)).toEqual([
      'test:tests/entry.test.ts -> src/shared.ts -> src/lib/index.ts -> src/lib/secret.ts -> server-only',
    ]);
  });

  it.each(['../src/lib/*.ts', '../src/**/secret.ts', '../src/[...path]/page.tsx'])(
    'follows literal import.meta.glob dependencies: %s', (pattern) => {
      const sources = example(`const pages = import.meta.glob('${pattern}', { eager: true });`);
      sources.set('src/[...path]/page.tsx', "import '@/lib/secret';");
      expect(findViolations(sources)).toHaveLength(1);
    },
  );

  it('checks clients transitively even when their test mocks server-only', () => {
    const sources = example("vi.mock('server-only', () => ({})); import '@/client';");
    sources.set('src/client.tsx', "'use client'; import '@/shared';");
    expect(findViolations(sources)).toEqual([
      'client:src/client.tsx -> src/shared.ts -> src/lib/secret.ts -> server-only',
    ]);
  });

  it('allows ordinary server pages and client references to Server Actions, but checks actions in tests', () => {
    const sources = example('');
    sources.set('src/page.tsx', "import '@/lib/secret';");
    sources.set('src/actions.ts', "'use server'; import '@/lib/secret';");
    sources.set('src/client.tsx', "'use client'; import '@/actions';");
    expect(findViolations(sources)).toEqual([]);
    sources.set('tests/entry.test.ts', "import '@/actions';");
    expect(findViolations(sources)).toEqual([
      'test:tests/entry.test.ts -> src/actions.ts -> src/lib/secret.ts -> server-only',
    ]);
  });
});
