import type { Database, SqlJsStatic } from 'sql.js';

let SQL: Promise<SqlJsStatic> | null = null;
export function getSql() {
  if (!SQL) SQL = import('sql.js').then((m) => m.default({ locateFile: () => '/sql-wasm.wasm' }));
  return SQL;
}

/** Przepisuje typowe konstrukcje MySQL na SQLite (zrzuty z phpMyAdmin). */
export function mysqlToSqlite(sql: string): string {
  let s = sql;
  s = s.replace(/\/\*![\s\S]*?\*\/;?/g, '');
  s = s.replace(/^\s*(SET|LOCK|UNLOCK|START TRANSACTION|COMMIT)\b[^;]*;/gim, '');
  s = s.replace(/^\s*(CREATE|DROP)\s+DATABASE\b[^;]*;/gim, '');
  s = s.replace(/^\s*USE\s+[^;]*;/gim, '');
  s = s.replace(/\)\s*ENGINE\s*=[^;]*;/gi, ');');
  s = s.replace(/\bAUTO_INCREMENT\s*=\s*\d+/gi, '');
  s = s.replace(/\b(int|integer|tinyint|smallint|mediumint|bigint)\s*\(\s*\d+\s*\)(\s+unsigned)?/gi, 'INTEGER');
  s = s.replace(/\bunsigned\b/gi, '');
  s = s.replace(/\bCHARACTER SET\s+\w+/gi, '').replace(/\bCOLLATE\s+\w+/gi, '');
  s = s.replace(/\bCOMMENT\s+'[^']*'/gi, '');
  s = s.replace(/\bON UPDATE CURRENT_TIMESTAMP(\(\))?/gi, '');
  s = s.replace(/\benum\s*\([^)]*\)/gi, 'TEXT');
  s = s.replace(/`/g, '"');
  s = s.replace(/\\'/g, "''");
  // ALTER TABLE ... ADD PRIMARY KEY / KEY / MODIFY / CONSTRAINT -> pomijamy (SQLite tego nie umie)
  s = s.replace(/^\s*ALTER\s+TABLE\s+[^;]*\b(ADD\s+(PRIMARY\s+KEY|KEY|UNIQUE\s+KEY|INDEX|CONSTRAINT)|MODIFY)\b[^;]*;/gim, '');
  // NOW()/CURDATE()/RAND()
  s = s.replace(/\bCURDATE\s*\(\s*\)/gi, "date('now')").replace(/\bNOW\s*\(\s*\)/gi, "datetime('now')").replace(/\bRAND\s*\(\s*\)/gi, 'RANDOM()');
  s = s.replace(/\bYEAR\s*\(([^)]+)\)/gi, "CAST(strftime('%Y', $1) AS INTEGER)").replace(/\bMONTH\s*\(([^)]+)\)/gi, "CAST(strftime('%m', $1) AS INTEGER)");
  s = s.replace(/\bCONCAT\s*\(([^()]*)\)/gi, (_m, a: string) => a.split(',').map((x) => x.trim()).join(' || '));
  s = s.replace(/\bLCASE\s*\(/gi, 'LOWER(').replace(/\bUCASE\s*\(/gi, 'UPPER(');
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
