import { useEffect, useState } from 'react';
import type { Database } from 'sql.js';
import { supabase } from './supabase';
import { getSql, mysqlToSqlite, withMissingTables, run, sameResult, type QueryResult } from './sql';

export type QueryTask = { n: number; text: string; difficulty: number; kind: 'select' | 'modify' | 'user' | 'grant'; hasSolution: boolean };
export type SheetQueries = { code: string; db: string | null; dump: string | null; dumpName: string | null; solutionPath: string; tasks: QueryTask[] };

const RAW = 'https://raw.githubusercontent.com/Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03/main';
const enc = (p: string) => p.split('/').map(encodeURIComponent).join('/');

let cache: Promise<SheetQueries[]> | null = null;
let resolved: SheetQueries[] | null = null;
export function loadQueries(): Promise<SheetQueries[]> {
  if (!cache) {
    cache = Promise.race([
      supabase.from('sheet_queries').select('code, db, dump, dump_name, solution_path, tasks').limit(1000).then(({ data, error }) => {
        if (error || !data?.length) throw new Error('supabase');
        return data.map((r) => ({ code: r.code, db: r.db, dump: r.dump, dumpName: r.dump_name, solutionPath: r.solution_path, tasks: r.tasks as QueryTask[] }));
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 3500)),
    ])
      .catch(() => import('../data/queries.json').then((m) => m.default as SheetQueries[]))
      .then((d) => (resolved = d));
  }
  return cache;
}
export function useQueries() {
  const [q, setQ] = useState<SheetQueries[] | null>(resolved);
  useEffect(() => { if (!resolved) loadQueries().then(setQ); }, []);
  return q;
}

const dumps = new Map<string, Promise<string>>();
export function getDump(id: string) {
  if (!dumps.has(id)) dumps.set(id, fetch(`/dumps/${id}.sql`).then((r) => { if (!r.ok) throw new Error('Brak bazy'); return r.text(); }));
  return dumps.get(id)!;
}

const sols = new Map<string, Promise<Record<number, string>>>();
/** Rozwiazania pobierane w przegladarce z repozytorium zrodlowego (nie sa kopiowane do aplikacji). */
export function getSolutions(path: string) {
  if (!sols.has(path)) {
    sols.set(path, fetch(RAW + enc(path)).then((r) => (r.ok ? r.text() : '')).then((txt) => {
      const out: Record<number, string> = {};
      for (const m of txt.matchAll(/^\s*(?:Zapytanie\s*)?(\d+)\s*[.):]\s*([\s\S]+?)(?=^\s*(?:Zapytanie\s*)?\d+\s*[.):]|$(?![\s\S]))/gim)) out[+m[1]] = m[2].trim();
      return out;
    }).catch(() => ({})));
  }
  return sols.get(path)!;
}

export async function freshFromDump(dump: string): Promise<Database> {
  const S = await getSql();
  const db = new S.Database();
  db.exec(mysqlToSqlite(withMissingTables(dump)));
  return db;
}

export type Schema = { name: string; columns: { name: string; type: string; pk: boolean }[]; rows: number }[];
export function schemaOf(db: Database): Schema {
  const t = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")[0];
  if (!t) return [];
  return t.values.map(([name]) => {
    const cols = db.exec(`PRAGMA table_info("${name}")`)[0]?.values ?? [];
    const cnt = Number(db.exec(`SELECT COUNT(*) FROM "${name}"`)[0]?.values[0][0] ?? 0);
    return { name: String(name), columns: cols.map((c) => ({ name: String(c[1]), type: String(c[2] || ''), pk: Number(c[5]) > 0 })), rows: cnt };
  });
}

function snapshot(db: Database) {
  const s = schemaOf(db);
  return s.map((t) => ({ t: t.name, cols: t.columns.map((c) => c.name.toLowerCase()).join(','), data: db.exec(`SELECT * FROM "${t.name}"`)[0] as QueryResult | undefined }));
}

const norm = (s: string) => s.toLowerCase().replace(/[`"']/g, '').replace(/\s+/g, ' ').replace(/\s*([,;()=@])\s*/g, '$1').replace(/;+$/, '').trim();

export type CheckOutcome = { ok: boolean; message: string; user?: QueryResult; expected?: QueryResult; skipped?: string[] };

export async function checkQuery(dump: string, task: QueryTask, userSql: string, solution: string | undefined): Promise<CheckOutcome> {
  if (!userSql.trim()) return { ok: false, message: 'Napisz najpierw kwerendę.' };
  if (task.kind === 'user' || task.kind === 'grant' || /^\s*(CREATE\s+USER|GRANT|REVOKE)/i.test(userSql)) {
    if (!solution) return { ok: false, message: 'Brak rozwiązania do porównania. Sprawdź składnię z treścią zadania.' };
    const a = norm(userSql), b = norm(solution);
    const ok = a === b || a.split(';').filter(Boolean).every((x) => b.includes(x));
    return { ok, message: ok ? 'Składnia zgodna z rozwiązaniem.' : 'Polecenie różni się od rozwiązania. SQLite nie ma użytkowników, więc porównujemy tekst (bez spacji, wielkości liter i cudzysłowów).' };
  }
  let userRes: QueryResult | undefined, userSnap, skipped: string[] = [];
  try {
    const db = await freshFromDump(dump);
    const r = run(db, userSql);
    skipped = r.skipped;
    userRes = r.results[r.results.length - 1];
    userSnap = snapshot(db);
  } catch (e) {
    return { ok: false, message: 'Błąd SQL: ' + (e as Error).message };
  }
  if (!solution) return { ok: false, message: 'Kwerenda działa, ale do tego zadania nie ma rozwiązania do porównania. Oceń wynik sam.', user: userRes, skipped };
  const db2 = await freshFromDump(dump);
  let expected: QueryResult | undefined;
  try { const r2 = run(db2, solution); expected = r2.results[r2.results.length - 1]; } catch { return { ok: false, message: 'Nie udało się uruchomić rozwiązania wzorcowego w SQLite. Oceń wynik sam.', user: userRes }; }
  if (task.kind === 'modify' && !/^\s*SELECT/i.test(solution)) {
    const expSnap = snapshot(db2);
    const same = JSON.stringify(expSnap.map((x) => [x.t, x.cols, x.data?.values])) === JSON.stringify(userSnap!.map((x) => [x.t, x.cols, x.data?.values]));
    let changed: QueryResult | undefined;
    const tbl = /(?:UPDATE|INTO|FROM|TABLE)\s+[`"]?(\w+)/i.exec(solution)?.[1];
    if (tbl) changed = userSnap!.find((x) => x.t.toLowerCase() === tbl.toLowerCase())?.data;
    return { ok: same, message: same ? 'Baza po Twojej kwerendzie wygląda tak samo jak po rozwiązaniu.' : 'Stan bazy po kwerendzie różni się od oczekiwanego.', user: changed ?? userRes, expected: tbl ? expSnap.find((x) => x.t.toLowerCase() === tbl.toLowerCase())?.data : undefined, skipped };
  }
  if (!userRes) return { ok: false, message: 'Kwerenda nic nie zwróciła. To zadanie wymaga SELECT.', expected };
  const ordered = /ORDER\s+BY/i.test(solution);
  let ok = sameResult(userRes, expected);
  if (ok && ordered) ok = JSON.stringify(userRes.values) === JSON.stringify(expected?.values);
  let message = ok ? 'Wynik zgodny z oczekiwanym.' : 'Wynik różni się od oczekiwanego.';
  if (ok && expected && userRes.columns.join() !== expected.columns.join()) message += ' Uwaga: nazwy kolumn (aliasy) są inne niż w rozwiązaniu: ' + expected.columns.join(', ') + '.';
  if (!ok && expected && userRes.columns.length !== expected.columns.length) message += ` Masz ${userRes.columns.length} kolumn, powinno być ${expected.columns.length}.`;
  else if (!ok && expected && userRes.values.length !== expected.values.length) message += ` Masz ${userRes.values.length} wierszy, powinno być ${expected.values.length}.`;
  else if (!ok && ordered) message += ' Sprawdź też sortowanie.';
  return { ok, message, user: userRes, expected, skipped };
}

export const DIFF_LABEL = (d: number) => (d <= 2 ? 'rozgrzewka' : d <= 4 ? 'łatwe' : d <= 6 ? 'średnie' : d <= 8 ? 'trudne' : 'bardzo trudne');
export const KIND_LABEL: Record<QueryTask['kind'], string> = { select: 'SELECT', modify: 'zmiana danych', user: 'użytkownik', grant: 'uprawnienia' };
