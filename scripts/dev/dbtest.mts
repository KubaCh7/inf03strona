import initSqlJs from 'sql.js';
import { readFileSync } from 'node:fs';
import { mysqlToSqlite, withMissingTables } from '../../src/lib/sql.ts';
const SQL = await initSqlJs();
const sheets = JSON.parse(readFileSync('/home/user/inf03strona/src/data/sheets.json', 'utf8'));
let ok = 0, bad = 0, none = 0;
for (const s of sheets) {
  const a = s.assets;
  if (!a?.sql) { none++; continue; }
  const text = readFileSync(`/home/user/inf03strona/public${a.dir}/${a.sql}`, 'utf8');
  const db = new SQL.Database();
  try { db.exec(mysqlToSqlite(withMissingTables(text))); const t = db.exec("SELECT name FROM sqlite_master WHERE type='table'")[0]; const n = t?.values.length ?? 0;
    let rows = 0; for (const [name] of t?.values ?? []) rows += Number(db.exec(`SELECT COUNT(*) FROM "${name}"`)[0].values[0][0]);
    if (!n || !rows) { bad++; console.log('EMPTY', s.code, a.sql, n, rows); } else ok++;
  } catch (e) { bad++; console.log('FAIL', s.code, a.sql, String(e).slice(0, 150)); }
}
console.log({ ok, bad, none });
