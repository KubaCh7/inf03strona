import type { Database, SqlJsStatic } from 'sql.js';

let SQL: Promise<SqlJsStatic> | null = null;
export function getSql() {
  if (!SQL) SQL = import('sql.js').then((m) => m.default({ locateFile: () => '/sql-wasm.wasm' }));
  return SQL;
}

/** Zamienia wywolania funkcji name(...) z obsluga zagniezdzonych nawiasow i stringow. */
function replaceFn(sql: string, name: string, fn: (args: string[]) => string): string {
  const re = new RegExp(`\\b${name}\\s*\\(`, 'gi');
  let out = '', last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(sql))) {
    const start = m.index, open = re.lastIndex - 1;
    let depth = 0, i = open, q: string | null = null;
    const args: string[] = []; let argStart = open + 1;
    for (; i < sql.length; i++) {
      const c = sql[i];
      if (q) { if (c === q && sql[i - 1] !== '\\') q = null; continue; }
      if (c === "'" || c === '"') { q = c; continue; }
      if (c === '(') depth++;
      else if (c === ')') { depth--; if (depth === 0) { args.push(sql.slice(argStart, i)); break; } }
      else if (c === ',' && depth === 1) { args.push(sql.slice(argStart, i)); argStart = i + 1; }
    }
    if (i >= sql.length) break;
    const inner = args.map((a) => replaceAllFns(a.trim()));
    out += sql.slice(last, start) + fn(inner);
    last = i + 1;
    re.lastIndex = i + 1;
  }
  return out + sql.slice(last);
}

function replaceAllFns(s: string): string {
  s = replaceFn(s, 'DATEDIFF', ([a, b]) => `CAST(julianday(${a}) - julianday(${b}) AS INTEGER)`);
  s = replaceFn(s, 'LEFT', ([a, n]) => `substr(${a}, 1, ${n})`);
  s = replaceFn(s, 'RIGHT', ([a, n]) => `substr(${a}, -(${n}))`);
  s = replaceFn(s, 'FLOOR', ([a]) => `CAST((${a}) AS INTEGER)`);
  s = replaceFn(s, 'CEIL', ([a]) => `(CAST((${a}) AS INTEGER) + ((${a}) > CAST((${a}) AS INTEGER)))`);
  s = replaceFn(s, 'YEAR', ([a]) => `CAST(strftime('%Y', ${a}) AS INTEGER)`);
  s = replaceFn(s, 'MONTH', ([a]) => `CAST(strftime('%m', ${a}) AS INTEGER)`);
  s = replaceFn(s, 'DAY', ([a]) => `CAST(strftime('%d', ${a}) AS INTEGER)`);
  s = replaceFn(s, 'CONCAT', (args) => `(${args.join(' || ')})`);
  s = replaceFn(s, 'IF', ([c, a, b]) => `(CASE WHEN ${c} THEN ${a} ELSE ${b} END)`);
  s = replaceFn(s, 'DATE_FORMAT', ([a]) => `${a}`);
  return s;
}

/** Przepisuje typowe konstrukcje MySQL (zrzuty phpMyAdmin i kwerendy z arkuszy) na SQLite. */
export function mysqlToSqlite(sql: string): string {
  let s = sql.replace(/\r\n/g, '\n');
  s = s.replace(/\/\*![\s\S]*?\*\/;?/g, '');
  s = s.replace(/^\s*(SET|LOCK|UNLOCK|START TRANSACTION|COMMIT|BEGIN)\b[^;]*;/gim, '');
  s = s.replace(/^\s*(CREATE|DROP)\s+(DATABASE|SCHEMA)\b[^;]*;/gim, '');
  s = s.replace(/^\s*USE\s+[^;]*;/gim, '');
  s = s.replace(/`/g, '"');

  // Kolumny autonumerowane / klucze z ALTER TABLE (phpMyAdmin dodaje je na koncu zrzutu)
  const auto = new Map<string, string>(); // tabela -> kolumna
  for (const m of s.matchAll(/ALTER\s+TABLE\s+"?(\w+)"?([^;]*);/gi)) {
    const body = m[2];
    const ai = body.match(/MODIFY\s+"?(\w+)"?[^,;]*AUTO_INCREMENT/i);
    const pk = body.match(/ADD\s+PRIMARY\s+KEY\s*\(\s*"?(\w+)"?\s*\)/i);
    const col = ai?.[1] ?? pk?.[1];
    if (col) auto.set(m[1].toLowerCase(), col);
  }
  s = s.replace(/CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?\s*\(([\s\S]*?)\)\s*(ENGINE[^;]*)?;/gi, (_m, ine, table: string, body: string) => {
    const col = auto.get(table.toLowerCase());
    let b = body;
    if (col && !/PRIMARY\s+KEY/i.test(b)) {
      b = b.replace(new RegExp(`(^|,)\\s*"?${col}"?\\s+(int|integer|tinyint|smallint|mediumint|bigint)\\b[^,]*`, 'i'), `$1\n  "${col}" INTEGER PRIMARY KEY AUTOINCREMENT`);
    }
    return `CREATE TABLE ${ine ?? ''}"${table}" (${b});`;
  });
  // ALTER TABLE ... ADD PRIMARY KEY / KEY / MODIFY / CONSTRAINT -> pomijamy (juz uwzglednione wyzej)
  s = s.replace(/^\s*ALTER\s+TABLE\s+[^;]*\b(ADD\s+(PRIMARY\s+KEY|KEY|UNIQUE\s+KEY|UNIQUE|INDEX|FULLTEXT|CONSTRAINT|FOREIGN\s+KEY)|MODIFY)\b[^;]*;/gim, '');
  // ALTER TABLE t CHANGE [COLUMN] a b typ -> RENAME COLUMN
  s = s.replace(/ALTER\s+TABLE\s+("?\w+"?)\s+CHANGE\s+(?:COLUMN\s+)?("?\w+"?)\s+("?\w+"?)[^;]*;/gi, 'ALTER TABLE $1 RENAME COLUMN $2 TO $3;');
  s = s.replace(/\bTRUNCATE\s+(TABLE\s+)?("?\w+"?)/gi, 'DELETE FROM $2');

  // typy i atrybuty kolumn
  s = s.replace(/\b(int|integer|tinyint|smallint|mediumint|bigint)\s*(\(\s*\d+\s*\))?\s+(unsigned\s+)?(NOT\s+NULL\s+)?PRIMARY\s+KEY(\s+NOT\s+NULL)?\s+AUTO_INCREMENT(\s+NOT\s+NULL)?/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
  s = s.replace(/\b(int|integer|tinyint|smallint|mediumint|bigint)\s*(\(\s*\d+\s*\))?\s+(unsigned\s+)?(NOT\s+NULL\s+)?AUTO_INCREMENT(\s+NOT\s+NULL)?\s+PRIMARY\s+KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
  s = s.replace(/\bAUTO_INCREMENT\s*=\s*\d+/gi, '').replace(/\bAUTO_INCREMENT\b/gi, '');
  s = s.replace(/\byear\s*\(\s*4\s*\)/gi, 'INTEGER');
  s = s.replace(/\b(int|integer|tinyint|smallint|mediumint|bigint)\s*\(\s*\d+\s*\)/gi, 'INTEGER');
  s = s.replace(/\bunsigned\b/gi, '').replace(/\bzerofill\b/gi, '');
  s = s.replace(/\b(CHARACTER SET|CHARSET)\s*=?\s*\w+/gi, '').replace(/\bCOLLATE\s*=?\s*\w+/gi, '');
  s = s.replace(/\bCOMMENT\s+'(?:[^']|'')*'/gi, '');
  s = s.replace(/\bON UPDATE CURRENT_TIMESTAMP(\(\))?/gi, '');
  s = s.replace(/\b(enum|set)\s*\((?:[^()']|'(?:[^']|'')*')*\)/gi, 'TEXT');
  s = s.replace(/\)\s*ENGINE\s*=[^;]*;/gi, ');');
  s = s.replace(/\\'/g, "''");

  // funkcje
  s = s.replace(/\bDEFAULT\s+(current_timestamp|now)\s*(\(\s*\))?/gi, 'DEFAULT CURRENT_TIMESTAMP').replace(/\bDEFAULT\s+curdate\s*\(\s*\)/gi, 'DEFAULT CURRENT_DATE');
  s = s.replace(/\bCURDATE\s*\(\s*\)|\bCURRENT_DATE\s*\(\s*\)/gi, "date('now')").replace(/\b(NOW|CURRENT_TIMESTAMP|SYSDATE)\s*\(\s*\)/gi, "datetime('now')");
  s = s.replace(/\bCURTIME\s*\(\s*\)/gi, "time('now')").replace(/\bRAND\s*\(\s*\)/gi, '(ABS(RANDOM()) / 9223372036854775807.0)');
  s = s.replace(/\bLCASE\s*\(/gi, 'LOWER(').replace(/\bUCASE\s*\(/gi, 'UPPER(').replace(/\bCHAR_LENGTH\s*\(/gi, 'LENGTH(').replace(/\bSUBSTRING\s*\(/gi, 'substr(');
  s = s.replace(/ORDER\s+BY\s+\(ABS\(RANDOM\(\)\) \/ 9223372036854775807\.0\)/gi, 'ORDER BY RANDOM()');
  s = replaceAllFns(s);
  return s;
}

export type QueryResult = { columns: string[]; values: unknown[][] };

export async function freshDb(seed?: string): Promise<Database> {
  const S = await getSql();
  const db = new S.Database();
  if (seed) db.exec(mysqlToSqlite(seed));
  return db;
}

/** Wykonuje wiele instrukcji; zwraca wynik ostatniego SELECT-a i ewentualne pominiete polecenia. */
export function run(db: Database, sql: string): { results: QueryResult[]; skipped: string[] } {
  const skipped: string[] = [];
  const cleaned = sql.replace(/^\s*(CREATE\s+USER|GRANT|REVOKE|DROP\s+USER|FLUSH)\b[^;]*;?/gim, (m) => { skipped.push(m.trim()); return ''; });
  const results = db.exec(mysqlToSqlite(cleaned)) as QueryResult[];
  return { results, skipped };
}

export function sameResult(a: QueryResult | undefined, b: QueryResult | undefined) {
  if (!a || !b) return false;
  if (a.values.length !== b.values.length || a.columns.length !== b.columns.length) return false;
  const norm = (r: QueryResult) => r.values.map((row) => row.map((v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v)).join('\u0001'));
  const x = norm(a), y = norm(b);
  return x.every((row, i) => row === y[i]) || x.slice().sort().join('\n') === y.slice().sort().join('\n');
}
