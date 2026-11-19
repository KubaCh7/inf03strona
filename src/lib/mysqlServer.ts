// Symulowany serwer MySQL z XAMPP: wiele baz (sql.js), start/stop, zapis stanu w IndexedDB.
import { useSyncExternalStore } from 'react';
import type { Database } from 'sql.js';
import { getSql, mysqlToSqlite, withMissingTables, run } from './sql';
import { kvGet, kvSet } from './vfs';

export type DbMeta = { collation: string };
type Saved = { apache: boolean; mysql: boolean; dbs: { name: string; meta: DbMeta; data: Uint8Array }[]; log: string[] };

export class MysqlServer {
  apache = false; mysql = false;
  dbs = new Map<string, { db: Database; meta: DbMeta }>();
  log: string[] = [];
  ver = 0;
  private subs = new Set<() => void>();
  private t: number | undefined;
  constructor(public key: string) {}
  subscribe = (f: () => void) => { this.subs.add(f); return () => { this.subs.delete(f); }; };
  bump(save = true) { this.ver++; this.subs.forEach((f) => f()); if (save) { clearTimeout(this.t); this.t = window.setTimeout(() => void this.save(), 500); } }
  async save() {
    const s: Saved = { apache: this.apache, mysql: this.mysql, log: this.log.slice(-200), dbs: [...this.dbs].map(([name, v]) => ({ name, meta: v.meta, data: v.db.export() })) };
    await kvSet(this.key, s);
  }
  async load() {
    const s = await kvGet<Saved>(this.key);
    if (!s) return;
    const S = await getSql();
    this.apache = s.apache; this.mysql = s.mysql; this.log = s.log ?? [];
    for (const d of s.dbs) this.dbs.set(d.name, { db: new S.Database(d.data), meta: d.meta });
    this.bump(false);
  }
  async reset() { this.dbs.forEach((v) => v.db.close()); this.dbs.clear(); this.apache = this.mysql = false; this.log = []; await kvSet(this.key, undefined); this.bump(false); }

  names() { return [...this.dbs.keys()].sort(); }
  get(name: string) { return this.dbs.get(name.toLowerCase())?.db ?? null; }
  meta(name: string) { return this.dbs.get(name.toLowerCase())?.meta; }
  async create(name: string, collation = 'utf8mb4_general_ci') {
    const n = name.trim().toLowerCase();
    if (!/^[\w$]+$/.test(n)) throw new Error(`#1102 - Niepoprawna nazwa bazy danych '${name}'`);
    if (this.dbs.has(n)) throw new Error(`#1007 - Nie można stworzyć bazy danych '${n}'; baza danych istnieje`);
    const S = await getSql();
    this.dbs.set(n, { db: new S.Database(), meta: { collation } });
    this.bump();
    return n;
  }
  drop(name: string) { const n = name.toLowerCase(); this.dbs.get(n)?.db.close(); this.dbs.delete(n); this.bump(); }
  /** Import pliku .sql do bazy (jak zakladka Import w phpMyAdmin). Zwraca liczbe zapytan. */
  importSql(name: string, sql: string) {
    const db = this.get(name);
    if (!db) throw new Error('Nie wybrano bazy danych.');
    // CREATE DATABASE / USE z pliku pomijamy (import idzie do wybranej bazy)
    const body = sql.replace(/^\s*(CREATE\s+DATABASE|USE)\b[^;]*;/gim, '');
    db.exec(mysqlToSqlite(withMissingTables(body)));
    this.bump();
    return (body.match(/;\s*(\r?\n|$)/g) ?? []).length;
  }
  query(name: string, sql: string) { const db = this.get(name); if (!db) throw new Error(`#1046 - Nie wybrano bazy danych`); const r = run(db, sql); this.bump(); return r; }
  addLog(mod: string, msg: string) { const t = new Date(); this.log.push(`${t.toLocaleTimeString('pl-PL')}  [${mod.padEnd(6)}]  ${msg}`); this.bump(); }
}
export function useServer(s: MysqlServer) { useSyncExternalStore(s.subscribe, () => s.ver); return s; }
