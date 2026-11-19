// PHP 8.2 w przegladarce (php-wasm). Ladowane leniwie przy pierwszym pliku .php.
import type { Database } from 'sql.js';
import { run as runSql } from '../sql';
import { MYSQLI_SHIM } from './shim.php';
import { mysqlError } from '../mysqlServer';

type PHPInstance = {
  writeFile(p: string, d: string | Uint8Array): void; mkdir(p: string): void; fileExists(p: string): boolean;
  run(o: Record<string, unknown>): Promise<{ text: string; errors: string; httpStatusCode: number; exitCode: number }>;
  onMessage(l: (d: string) => Promise<string> | string): unknown;
};

let phpP: Promise<PHPInstance> | null = null;
let currentDb: Database | null = null;
/** Serwer MySQL pulpitu egzaminacyjnego: wiele baz, moze byc wylaczony. */
export type PhpServer = { mysql: boolean; get(name: string): Database | null; onChange?: () => void };
let currentServer: PhpServer | null = null;
let currentPhpErrors: string[] = [];

async function boot(): Promise<PHPInstance> {
  const [{ PHP, setPhpIniEntries }, { loadWebRuntime }] = await Promise.all([import('@php-wasm/universal'), import('@php-wasm/web')]);
  const php = new PHP(await loadWebRuntime('8.2')) as unknown as PHPInstance;
  php.mkdir('/p03');
  php.writeFile('/p03/shim.php', MYSQLI_SHIM);
  await setPhpIniEntries(php as never, { auto_prepend_file: '/p03/shim.php', display_errors: '1', error_reporting: String(32767), html_errors: '0', 'date.timezone': 'Europe/Warsaw' });
  // zapytania z mysqli_* -> baza warsztatu (sql.js), ta sama co w phpMyAdmin i kwerendach
  php.onMessage((raw) => {
    try {
      const m = JSON.parse(raw) as { op: string; sql: string; db?: string };
      if (m.op === 'connect') {
        if (!currentServer) return JSON.stringify({ ok: true });
        if (!currentServer.mysql) return JSON.stringify({ error: 'No connection could be made because the target machine actively refused it', errno: 2002, strict: true });
        if (m.db && !currentServer.get(m.db)) return JSON.stringify({ error: `Unknown database '${m.db}'`, errno: 1049, strict: true });
        return JSON.stringify({ ok: true, strict: true });
      }
      const target = currentServer ? (m.db ? currentServer.get(m.db) : null) : currentDb;
      if (currentServer && !currentServer.mysql) return JSON.stringify({ error: 'MySQL server has gone away', errno: 2006 });
      if (!target) return JSON.stringify({ error: currentServer ? 'No database selected' : 'Brak bazy danych w warsztacie', errno: 1046 });
      const currentDb2 = target;
      const r = runSql(currentDb2, m.sql);
      const last = r.results[r.results.length - 1];
      const changes = currentDb2.getRowsModified();
      const lastId = Number(currentDb2.exec('SELECT last_insert_rowid()')[0]?.values[0][0] ?? 0);
      if (!/^\s*(SELECT|SHOW|DESCRIBE|EXPLAIN|WITH)/i.test(m.sql)) currentServer?.onChange?.();
      if (last && /^\s*(SELECT|SHOW|DESCRIBE|EXPLAIN|WITH)/i.test(m.sql)) return JSON.stringify({ cols: last.columns, rows: last.values.map((row) => row.map((v) => (v === null ? null : String(v)))) });
      if (/^\s*(SELECT|SHOW|WITH)/i.test(m.sql)) return JSON.stringify({ cols: [], rows: [] });
      return JSON.stringify({ changes, lastId });
    } catch (e) {
      const me = mysqlError(String((e as Error).message));
      if (!currentServer) currentPhpErrors.push(String((e as Error).message));
      return JSON.stringify({ error: currentServer ? me.en : String((e as Error).message), errno: me.code });
    }
  });
  return php;
}
export const loadPhp = () => (phpP ??= boot().catch((e) => { phpP = null; throw e; }));

export type PhpRun = { html: string; errors: string[] };

/** Wykonuje plik PHP z projektu. files: wszystkie pliki warsztatu (include/require dzialaja). */
export async function runPhp(o: { files: Record<string, string>; entry: string; db: Database | null; method?: 'GET' | 'POST'; query?: string; post?: string; server?: PhpServer }): Promise<PhpRun> {
  const php = await loadPhp();
  if (!php.fileExists('/www')) php.mkdir('/www');
  for (const [name, text] of Object.entries(o.files)) {
    const dir = name.includes('/') ? '/www/' + name.slice(0, name.lastIndexOf('/')) : null;
    if (dir && !php.fileExists(dir)) php.mkdir(dir);
    php.writeFile('/www/' + name, text);
  }
  currentDb = o.db; currentServer = o.server ?? null; currentPhpErrors = [];
  const qs = o.query ? (o.query.startsWith('?') ? o.query : '?' + o.query) : '';
  const res = await php.run({
    scriptPath: '/www/' + o.entry,
    relativeUri: '/' + o.entry + qs,
    method: o.method ?? 'GET',
    body: o.post ?? undefined,
    headers: o.post ? { 'content-type': 'application/x-www-form-urlencoded' } : {},
    $_SERVER: { DOCUMENT_ROOT: '/www', SCRIPT_NAME: '/' + o.entry, PHP_SELF: '/' + o.entry, QUERY_STRING: qs.slice(1), REQUEST_METHOD: o.method ?? 'GET', SERVER_NAME: 'localhost', HTTP_HOST: 'localhost' },
  });
  const errs = [...currentPhpErrors];
  if (res.errors) errs.push(...res.errors.split('\n').filter(Boolean));
  // ostrzezenia PHP w HTML (display_errors) tez do konsoli
  for (const m of res.text.matchAll(/(?:^|\n)\s*(?:<br \/>\s*)?((?:PHP )?(?:Warning|Notice|Fatal error|Parse error|Deprecated)[^\n<]*)/g)) errs.push(m[1].replace(/<\/?b>/g, '').trim());
  // ten sam komunikat przychodzi ze stderr i z HTML: zostaw jeden
  const norm = (e: string) => e.replace(/^PHP\s+/, '').replace(/\s+/g, ' ').trim();
  return { html: res.text, errors: [...new Set(errs.map(norm))] };
}
