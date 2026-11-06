import { useEffect, useMemo, useRef, useState } from 'react';
import { Database as DbIcon, Download, Play, Plus, Table2, Trash2, Upload } from 'lucide-react';
import type { Database } from 'sql.js';
import { run, type QueryResult } from '../lib/sql';

type Tab = 'browse' | 'structure' | 'sql' | 'insert' | 'export' | 'import';
type Col = { cid: number; name: string; type: string; notnull: number; dflt_value: unknown; pk: number };

const q = (s: string) => '`' + s.replace(/`/g, '``') + '`';
const lit = (v: unknown) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`);

function rows(db: Database, sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const st = db.prepare(sql);
  st.bind(params as never);
  const out: Record<string, unknown>[] = [];
  while (st.step()) out.push(st.getAsObject());
  st.free();
  return out;
}

/** Zrzut bazy w stylu phpMyAdmina (CREATE TABLE + INSERT INTO). */
export function dumpDb(db: Database, name: string) {
  const tables = rows(db, "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  const out = [`-- Zrzut bazy: ${name}`, `-- Wygenerowano w Pracownia.03 ${new Date().toLocaleString('pl-PL')}`, ''];
  for (const t of tables) {
    out.push(`-- Struktura tabeli ${q(String(t.name))}`, `${t.sql};`, '');
    const data = db.exec(`SELECT * FROM ${q(String(t.name))}`)[0];
    if (data?.values.length) {
      out.push(`INSERT INTO ${q(String(t.name))} (${data.columns.map(q).join(', ')}) VALUES`);
      out.push(data.values.map((r) => `(${r.map(lit).join(', ')})`).join(',\n') + ';', '');
    }
  }
  return out.join('\n');
}

function ResultTable({ r, onDelete }: { r: QueryResult; onDelete?: (i: number) => void }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="mono w-full text-xs">
        <thead className="bg-surface-2"><tr>{onDelete && <th className="w-8" />}{r.columns.map((c, i) => <th key={i} className="whitespace-nowrap px-2 py-1 text-left">{c}</th>)}</tr></thead>
        <tbody>
          {r.values.map((row, j) => (
            <tr key={j} className="border-t border-line even:bg-surface-2/40 hover:bg-accent-soft/40">
              {onDelete && <td className="px-1"><button className="rounded p-1 text-danger hover:bg-danger-soft" title="Usuń wiersz" onClick={() => onDelete(j)}><Trash2 size={12} /></button></td>}
              {row.map((v, k) => <td key={k} className="max-w-[260px] truncate whitespace-nowrap px-2 py-1">{v === null ? <i className="text-muted">NULL</i> : String(v)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Panel jak phpMyAdmin dzialajacy w przegladarce na bazie SQLite (sql.js). */
export default function PhpMyAdmin({ db, name, onChanged, onImport }: { db: Database | null; name: string; onChanged: () => void; onImport: (sql: string, file: string) => void }) {
  const [table, setTable] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('browse');
  const [page, setPage] = useState(0);
  const [sql, setSql] = useState('');
  const [out, setOut] = useState<{ results: QueryResult[]; error?: string; info?: string } | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [ver, setVer] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const PER = 25;

  const tables = useMemo(() => (db ? rows(db, "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").map((r) => String(r.name)) : []), [db, ver]);
  useEffect(() => { if (table && !tables.includes(table)) setTable(null); }, [tables, table]);
  const bump = () => { setVer((v) => v + 1); onChanged(); };

  if (!db) return (
    <div className="grid h-full place-items-center p-6 text-center text-sm text-muted">
      <div><DbIcon className="mx-auto mb-2" />Brak bazy. Zaimportuj plik .sql albo utwórz tabele w zakładce SQL.
        <div className="mt-3"><button className="btn btn-dark px-3 py-1 text-xs" onClick={() => fileRef.current?.click()}><Upload size={13} />Import</button></div>
        <input ref={fileRef} type="file" accept=".sql,.txt" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) onImport(await f.text(), f.name); }} />
      </div>
    </div>
  );

  const cols: Col[] = table ? (rows(db, `PRAGMA table_info(${q(table)})`) as unknown as Col[]) : [];
  const count = table ? Number(rows(db, `SELECT COUNT(*) AS n FROM ${q(table)}`)[0]?.n ?? 0) : 0;
  const browse = table ? (db.exec(`SELECT rowid AS __rid, * FROM ${q(table)} LIMIT ${PER} OFFSET ${page * PER}`)[0] as QueryResult | undefined) : undefined;
  const browseShown = browse ? { columns: browse.columns.slice(1), values: browse.values.map((r) => r.slice(1)) } : undefined;

  function exec(text: string) {
    try {
      const r = run(db!, text);
      setOut({ results: r.results, info: r.results.length ? undefined : `Zapytanie wykonane. Zmienionych wierszy: ${db!.getRowsModified()}.` + (r.skipped.length ? ` Pominięto (konta użytkowników nie istnieją w SQLite): ${r.skipped.length}.` : '') });
      bump();
    } catch (e) { setOut({ results: [], error: (e as Error).message }); }
  }
  function insert() {
    if (!table) return;
    const used = cols.filter((c) => form[c.name] !== undefined && form[c.name] !== '');
    exec(`INSERT INTO ${q(table)} (${used.map((c) => q(c.name)).join(', ')}) VALUES (${used.map((c) => (/INT|REAL|NUM|DEC|FLOAT|DOUB/i.test(c.type) && !isNaN(Number(form[c.name])) ? form[c.name] : lit(form[c.name]))).join(', ')})`);
    setForm({});
    setTab('browse');
  }
  function download() {
    const blob = new Blob([dumpDb(db!, name)], { type: 'application/sql' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${name || 'baza'}.sql`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  const TABS: [Tab, string][] = table
    ? [['browse', 'Przeglądaj'], ['structure', 'Struktura'], ['sql', 'SQL'], ['insert', 'Wstaw'], ['export', 'Eksport'], ['import', 'Import']]
    : [['structure', 'Struktura'], ['sql', 'SQL'], ['export', 'Eksport'], ['import', 'Import']];
  const cur = !table && (tab === 'browse' || tab === 'insert') ? 'structure' : tab;

  return (
    <div className="flex h-full min-h-0 text-sm">
      <aside className="w-44 shrink-0 overflow-auto border-r border-line bg-surface-2/60 p-2">
        <button className={`flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs font-bold ${!table ? 'bg-accent-soft text-accent' : 'hover:bg-surface'}`} onClick={() => { setTable(null); setTab('structure'); }}><DbIcon size={13} />{name || 'baza'}</button>
        <div className="ml-2 mt-1 border-l border-line pl-1.5">
          {tables.map((t) => (
            <button key={t} className={`flex w-full items-center gap-1.5 truncate rounded px-1.5 py-1 text-left text-xs ${table === t ? 'bg-accent-soft font-bold text-accent' : 'hover:bg-surface'}`} onClick={() => { setTable(t); setTab('browse'); setPage(0); setOut(null); }}>
              <Table2 size={12} className="shrink-0" /><span className="truncate">{t}</span>
            </button>
          ))}
          {tables.length === 0 && <p className="px-1.5 py-1 text-[11px] text-muted">brak tabel</p>}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap gap-0.5 border-b border-line bg-surface px-2 pt-1.5">
          <span className="mono mr-2 self-center text-[11px] text-muted">{name}{table ? ` » ${table}` : ''}</span>
          {TABS.map(([k, label]) => (
            <button key={k} className={`rounded-t-md border border-b-0 px-2.5 py-1 text-xs ${cur === k ? 'border-line bg-bg font-bold' : 'border-transparent text-muted hover:text-ink'}`} onClick={() => { setTab(k); setOut(null); }}>{label}</button>
          ))}
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
          {cur === 'browse' && table && browseShown && (
            <>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted">Wiersze {count ? page * PER + 1 : 0}–{Math.min(count, (page + 1) * PER)} z {count}</span>
                <button className="btn btn-ghost px-2 py-0.5 text-xs" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>‹</button>
                <button className="btn btn-ghost px-2 py-0.5 text-xs" disabled={(page + 1) * PER >= count} onClick={() => setPage((p) => p + 1)}>›</button>
              </div>
              <ResultTable r={browseShown} onDelete={(i) => { if (confirm('Usunąć ten wiersz?')) { db.run(`DELETE FROM ${q(table)} WHERE rowid = ?`, [browse!.values[i][0] as number]); bump(); } }} />
            </>
          )}
          {cur === 'structure' && (table ? (
            <table className="mono w-full text-xs">
              <thead className="bg-surface-2"><tr><th className="px-2 py-1 text-left">#</th><th className="px-2 py-1 text-left">Nazwa</th><th className="px-2 py-1 text-left">Typ</th><th className="px-2 py-1 text-left">Null</th><th className="px-2 py-1 text-left">Domyślnie</th><th className="px-2 py-1 text-left">Klucz</th></tr></thead>
              <tbody>{cols.map((c) => <tr key={c.cid} className="border-t border-line"><td className="px-2 py-1">{c.cid + 1}</td><td className="px-2 py-1 font-bold">{c.name}</td><td className="px-2 py-1">{c.type || '—'}</td><td className="px-2 py-1">{c.notnull ? 'Nie' : 'Tak'}</td><td className="px-2 py-1">{c.dflt_value === null ? <i className="text-muted">brak</i> : String(c.dflt_value)}</td><td className="px-2 py-1">{c.pk ? 'PRIMARY' : ''}</td></tr>)}</tbody>
            </table>
          ) : (
            <table className="mono w-full text-xs">
              <thead className="bg-surface-2"><tr><th className="px-2 py-1 text-left">Tabela</th><th className="px-2 py-1 text-left">Wiersze</th><th className="px-2 py-1 text-left">Kolumny</th><th /></tr></thead>
              <tbody>{tables.map((t) => <tr key={t} className="border-t border-line"><td className="px-2 py-1 font-bold"><button className="hover:text-accent" onClick={() => { setTable(t); setTab('browse'); }}>{t}</button></td><td className="px-2 py-1">{String(rows(db, `SELECT COUNT(*) AS n FROM ${q(t)}`)[0]?.n)}</td><td className="px-2 py-1">{rows(db, `PRAGMA table_info(${q(t)})`).length}</td><td className="px-2 py-1 text-right"><button className="text-danger hover:underline" onClick={() => { if (confirm(`Usunąć tabelę ${t}?`)) { db.run(`DROP TABLE ${q(t)}`); bump(); } }}>Usuń</button></td></tr>)}</tbody>
            </table>
          ))}
          {cur === 'sql' && (
            <>
              <p className="text-xs text-muted">Wykonaj zapytanie SQL na bazie <b>{name}</b> (Ctrl+Enter):</p>
              <textarea className="input mono h-28 w-full text-xs" spellCheck={false} value={sql} onChange={(e) => setSql(e.target.value)} placeholder={table ? `SELECT * FROM ${table} WHERE 1` : 'SELECT ...'}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); exec(sql); } }} />
              <div className="flex gap-2"><button className="btn btn-primary px-3 py-1 text-xs" onClick={() => exec(sql)}><Play size={13} />Wykonaj</button>{table && <button className="btn btn-ghost px-3 py-1 text-xs" onClick={() => setSql(`SELECT * FROM ${table} WHERE 1`)}>SELECT *</button>}</div>
            </>
          )}
          {cur === 'insert' && table && (
            <div className="space-y-2">
              {cols.map((c) => (
                <label key={c.cid} className="grid grid-cols-[140px_90px_1fr] items-center gap-2 text-xs">
                  <b className="mono truncate">{c.name}</b><span className="mono text-muted">{c.type}</span>
                  <input className="input mono py-1 text-xs" value={form[c.name] ?? ''} placeholder={c.pk ? 'auto' : ''} onChange={(e) => setForm((f) => ({ ...f, [c.name]: e.target.value }))} />
                </label>
              ))}
              <button className="btn btn-primary px-3 py-1 text-xs" onClick={insert}><Plus size={13} />Wykonaj</button>
            </div>
          )}
          {cur === 'export' && (
            <div className="space-y-2">
              <p className="text-xs text-muted">Eksport całej bazy do pliku SQL (struktura i dane).</p>
              <button className="btn btn-dark px-3 py-1 text-xs" onClick={download}><Download size={13} />Pobierz {name || 'baza'}.sql</button>
              <pre className="mono max-h-64 overflow-auto rounded-lg border border-line bg-surface-2 p-2 text-[11px]">{dumpDb(db, name).slice(0, 4000)}</pre>
            </div>
          )}
          {cur === 'import' && (
            <div className="space-y-2">
              <p className="text-xs text-muted">Zaimportuj plik .sql (np. zrzut z archiwum arkusza). Obecna baza zostanie zastąpiona.</p>
              <button className="btn btn-dark px-3 py-1 text-xs" onClick={() => fileRef.current?.click()}><Upload size={13} />Wybierz plik</button>
            </div>
          )}
          <input ref={fileRef} type="file" accept=".sql,.txt" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) onImport(await f.text(), f.name); e.target.value = ''; }} />
          {out?.error && <p className="rounded-lg bg-danger-soft p-2 text-xs text-danger">#1064 Błąd: {out.error}</p>}
          {out?.info && <p className="rounded-lg bg-success-soft p-2 text-xs text-success">{out.info}</p>}
          {out?.results.map((r, i) => <div key={i}><p className="mb-1 text-[11px] text-success">Zwrócono {r.values.length} wierszy.</p><ResultTable r={r} /></div>)}
        </div>
      </div>
    </div>
  );
}
