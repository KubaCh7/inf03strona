import { useEffect, useState } from 'react';
import { Home, LogOut, FileCode, BookOpen, Settings, RefreshCw, Database, Table2, Plus, Minus, Server, Search, Download, Upload, Wrench, Users, Activity, Play, Pencil, Copy, Trash2, Eye, Columns3 } from 'lucide-react';
import { useOS } from '../os';
import { useServer, mysqlError } from '../../../lib/mysqlServer';
import { splitQueries } from '../../../lib/examiner';
import { base, DOWNLOADS, join } from '../../../lib/vfs';
import type { QueryResult } from '../../../lib/sql';

const SYS = ['information_schema', 'mysql', 'performance_schema', 'phpmyadmin', 'test'];
const COLLS = ['utf8mb4_general_ci', 'utf8mb4_polish_ci', 'utf8mb4_unicode_ci', 'utf8_general_ci', 'utf8_polish_ci', 'utf8_unicode_ci', 'latin2_general_ci', 'latin1_swedish_ci'];
type Out = { ok: boolean; sql: string; msg: string; res?: QueryResult }[];
const secs = () => `0,${String(Math.floor(Math.random() * 900 + 100)).padStart(4, '0')}`;

/** phpMyAdmin 5.2 (motyw pmahomme) na serwerze MySQL pulpitu. setAddr = adres w pasku przegladarki. */
export default function Pma({ setAddr }: { setAddr: (a: string) => void }) {
  const os = useOS(); const srv = useServer(os.server);
  const [db, setDb] = useState<string | null>(null);
  const [table, setTable] = useState<string | null>(null);
  const [tab, setTab] = useState('databases');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [sql, setSql] = useState('');
  const [out, setOut] = useState<Out | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [newDb, setNewDb] = useState(''); const [coll, setColl] = useState('utf8mb4_general_ci');
  const [impFile, setImpFile] = useState<string | null>(null);
  useEffect(() => {
    const route = table ? `/table/${tab}` : db ? `/database/${tab}` : `/server/${tab}`;
    setAddr(`localhost/phpmyadmin/index.php?route=${route}${db ? `&db=${db}` : ''}${table ? `&table=${table}` : ''}`);
  }, [db, table, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!srv.mysql) return (
    <div className="h-full bg-white p-6 font-[sans-serif] text-[13px]">
      <p className="mb-4 text-[28px] font-bold"><span className="text-[#6c78af]">php</span><span className="text-[#f89c0e]">MyAdmin</span></p>
      <div className="mb-3 border border-[#c00] bg-[#ffc] p-3 text-[#c00]"><b>Błąd</b><br />MySQL zwrócił komunikat: <img alt="" />#2002 - Nie można nawiązać połączenia, ponieważ komputer docelowy aktywnie go odmawia.<br /><br />— Serwer nie odpowiada (albo gniazdo lokalnego serwera MySQL nie jest poprawnie skonfigurowane).</div>
      <div className="border border-[#c00] bg-[#ffc] p-3 text-[#c00]">mysqli::real_connect(): (HY000/2002): Nie można nawiązać połączenia, ponieważ komputer docelowy aktywnie go odmawia.</div>
      <p className="mt-4 text-[#555]">Uruchom MySQL w XAMPP Control Panel i odśwież stronę.</p>
    </div>
  );

  const go = (d: string | null, t: string | null = null, tb?: string) => { setDb(d); setTable(t); setTab(tb ?? (t ? 'browse' : d ? 'structure' : 'databases')); setOut(null); setMsg(null); if (t && !tb) setSql(`SELECT * FROM \`${t}\``); };
  const tables = (d: string) => (srv.get(d)?.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")[0]?.values ?? []).map((v) => String(v[0]));
  const count = (d: string, t: string) => Number(srv.get(d)?.exec(`SELECT COUNT(*) FROM "${t}"`)[0]?.values[0][0] ?? 0);

  async function createDb(name = newDb, c = coll) {
    try { const n = await srv.create(name, c); setNewDb(''); go(n); setMsg({ ok: true, text: `Baza danych ${n} została utworzona.` }); }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  }
  function execute(text: string, inDb: string | null) {
    const res: Out = []; let cur = inDb;
    for (const q of splitQueries(text)) {
      let m: RegExpExecArray | null;
      if ((m = /^\s*CREATE\s+DATABASE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?(?:.*COLLATE\s*=?\s*(\w+))?/i.exec(q))) {
        if (srv.get(m[1])) { res.push({ ok: false, sql: q, msg: `#1007 - Nie można stworzyć bazy danych '${m[1].toLowerCase()}'; baza danych istnieje` }); break; }
        void srv.create(m[1], m[2] ?? 'utf8mb4_general_ci'); res.push({ ok: true, sql: q, msg: `Zmieniono 1 rekord. (Wykonanie zapytania trwało ${secs()} sekund(y).)` }); continue;
      }
      if ((m = /^\s*USE\s+`?(\w+)`?/i.exec(q))) { if (!srv.get(m[1])) { res.push({ ok: false, sql: q, msg: `#1049 - Nieznana baza danych '${m[1]}'` }); break; } cur = m[1].toLowerCase(); res.push({ ok: true, sql: q, msg: `MySQL zwrócił pusty wynik (zero wierszy). (Wykonanie zapytania trwało ${secs()} sekund(y).)` }); continue; }
      if ((m = /^\s*DROP\s+DATABASE\s+(?:IF\s+EXISTS\s+)?`?(\w+)`?/i.exec(q))) { srv.drop(m[1]); if (cur === m[1].toLowerCase()) cur = null; res.push({ ok: true, sql: q, msg: `Zmieniono 0 rekordów.` }); continue; }
      if (!cur) { res.push({ ok: false, sql: q, msg: '#1046 - Nie wybrano bazy danych' }); break; }
      try {
        const r = srv.query(cur, q);
        const last = r.results[r.results.length - 1];
        if (r.skipped.length) res.push({ ok: true, sql: q, msg: `MySQL zwrócił pusty wynik (zero wierszy). (Wykonanie zapytania trwało ${secs()} sekund(y).)` });
        else if (last) res.push({ ok: true, sql: q, res: last, msg: last.values.length ? `Pokazano rekordy 0 - ${last.values.length - 1} (${last.values.length} ogółem, Wykonanie zapytania trwało ${secs()} sekund(y).)` : `MySQL zwrócił pusty wynik (zero wierszy). (Wykonanie zapytania trwało ${secs()} sekund(y).)` });
        else if (/^\s*SELECT/i.test(q)) res.push({ ok: true, sql: q, msg: `MySQL zwrócił pusty wynik (zero wierszy). (Wykonanie zapytania trwało ${secs()} sekund(y).)` });
        else { const n = srv.get(cur)!.getRowsModified(); res.push({ ok: true, sql: q, msg: `${/^\s*(INSERT|UPDATE|DELETE|REPLACE)/i.test(q) ? (n === 1 ? 'Zmieniono 1 rekord.' : `Zmieniono ${n} rekordów.`) : 'Zapytanie SQL zostało wykonane pomyślnie.'} (Wykonanie zapytania trwało ${secs()} sekund(y).)` }); }
      } catch (e) { const me = mysqlError((e as Error).message, cur); res.push({ ok: false, sql: q, msg: `#${me.code} - ${me.pl}` }); break; }
    }
    if (cur !== inDb) { setDb(cur); setTable(null); }
    setOut(res);
  }
  async function doImport() {
    if (!impFile) { setMsg({ ok: false, text: 'Nie wybrano pliku do zaimportowania! Wybierz plik w polu „Przeglądaj komputer”.' }); return; }
    const text = os.vfs.read(impFile);
    try {
      let target = db;
      if (!target) { const m = /CREATE\s+DATABASE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/i.exec(text); if (!m) throw new Error('#1046 - Nie wybrano bazy danych'); target = m[1].toLowerCase(); if (!srv.get(target)) await srv.create(target); }
      const n = srv.importSql(target, text);
      setDb(target); setTable(null); setTab('import');
      setMsg({ ok: true, text: `Import zakończył się sukcesem, wykonano ${n} zapytań. (${base(impFile)})` });
    } catch (e) { const me = mysqlError((e as Error).message, db ?? ''); setMsg({ ok: false, text: /^#\d/.test(me.pl) ? me.pl : `Błąd\nMySQL zwrócił komunikat: #${me.code} - ${me.pl}` }); }
  }
  function exportDb() {
    if (!db) return;
    const d = srv.get(db)!; const lines = [`-- phpMyAdmin SQL Dump`, `-- version 5.2.1`, `-- https://www.phpmyadmin.net/`, `--`, `-- Host: 127.0.0.1`, `-- Czas generowania: ${new Date().toLocaleString('pl-PL')}`, `-- Wersja serwera: 10.4.32-MariaDB`, `-- Wersja PHP: 8.2.12`, '', `--`, `-- Baza danych: \`${db}\``, `--`, ''];
    for (const t of tables(db)) {
      const ddl = String(d.exec(`SELECT sql FROM sqlite_master WHERE name='${t}'`)[0]?.values[0][0] ?? '');
      lines.push(`-- --------------------------------------------------------`, '', `--`, `-- Struktura tabeli dla tabeli \`${t}\``, `--`, '', ddl.replace(/"/g, '`') + ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;', '');
      const r = d.exec(`SELECT * FROM "${t}"`)[0];
      if (r?.values.length) lines.push(`INSERT INTO \`${t}\` (${r.columns.map((c) => '`' + c + '`').join(', ')}) VALUES`, r.values.map((v) => `(${v.map((x) => (x === null ? 'NULL' : typeof x === 'number' ? x : `'${String(x).replace(/'/g, "''")}'`)).join(', ')})`).join(',\n') + ';', '');
    }
    const p = os.vfs.unique(DOWNLOADS, `${db}.sql`); os.vfs.write(p, lines.join('\n'));
    setMsg({ ok: true, text: `Zapisano plik ${base(p)} w folderze Pobrane.` });
  }

  const TABS: [string, string, typeof Database][] = table
    ? [['browse', 'Przeglądaj', Eye], ['structure', 'Struktura', Columns3], ['sql', 'SQL', FileCode], ['search', 'Szukaj', Search], ['insert', 'Wstaw', Plus], ['export', 'Eksport', Download], ['import', 'Import', Upload], ['operations', 'Operacje', Wrench]]
    : db ? [['structure', 'Struktura', Table2], ['sql', 'SQL', FileCode], ['search', 'Szukaj', Search], ['query', 'Kwerenda', Search], ['export', 'Eksport', Download], ['import', 'Import', Upload], ['operations', 'Operacje', Wrench], ['privileges', 'Uprawnienia', Users]]
      : [['databases', 'Bazy danych', Database], ['sql', 'SQL', FileCode], ['status', 'Status', Activity], ['users', 'Konta użytkowników', Users], ['export', 'Eksport', Download], ['import', 'Import', Upload], ['settings', 'Ustawienia', Settings], ['vars', 'Zmienne', Server]];
  const Msg = ({ ok, text }: { ok: boolean; text: string }) => <div className={`mb-3 whitespace-pre-wrap border px-3 py-2 ${ok ? 'border-[#a2d246] bg-[#ebf8a4] text-[#000]' : 'border-[#c00] bg-[#ffc] text-[#c00]'}`}>{ok ? '✔ ' : ''}{text}</div>;
  const Grid = ({ r, actions }: { r: QueryResult; actions?: boolean }) => (
    <div className="overflow-auto"><table className="border-collapse text-[12px]">
      <thead><tr>{actions && <th className="border border-white bg-[#d3dce3] px-2 py-1" />}{r.columns.map((c) => <th key={c} className="whitespace-nowrap border border-white bg-[#d3dce3] px-2 py-1 text-left text-[#235a81]">{c}</th>)}</tr></thead>
      <tbody>{r.values.slice(0, 200).map((row, i) => <tr key={i} className={i % 2 ? 'bg-[#dfdfdf]' : 'bg-white'}>
        {actions && <td className="whitespace-nowrap px-2 text-[#235a81]"><span className="mr-2 inline-flex items-center gap-0.5"><Pencil size={11} />Edytuj</span><span className="mr-2 inline-flex items-center gap-0.5"><Copy size={11} />Kopiuj</span><span className="inline-flex items-center gap-0.5 text-[#c00]"><Trash2 size={11} />Usuń</span></td>}
        {row.map((v, k) => <td key={k} className="max-w-[300px] truncate whitespace-nowrap px-2 py-1">{v === null ? <i className="text-[#888]">NULL</i> : String(v)}</td>)}</tr>)}</tbody>
    </table></div>
  );
  const SqlBox = ({ q }: { q: string }) => <div className="mb-2 border border-[#aaa] bg-white"><pre className="whitespace-pre-wrap px-3 py-2 font-[monospace] text-[12.5px] text-[#235a81]">{q}</pre><div className="border-t border-[#ddd] bg-[#f3f3f3] px-3 py-1 text-right text-[11px] text-[#235a81]">[ Edytuj w linii ] [ Edytuj ] [ Wyjaśnij SQL ] [ Utwórz kod PHP ] [ Odśwież ]</div></div>;

  const content = () => {
    if (tab === 'databases') return (<>
      <h2 className="mb-3 text-[22px] text-[#444]">Bazy danych</h2>
      <fieldset className="mb-4 border border-[#aaa] bg-[#eee] p-3"><legend className="px-1 font-bold">Utwórz bazę danych</legend>
        <div className="flex gap-2"><input value={newDb} onChange={(e) => setNewDb(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void createDb()} placeholder="Nazwa bazy danych" className="w-60 border border-[#aaa] bg-white px-2 py-1" />
          <select value={coll} onChange={(e) => setColl(e.target.value)} className="border border-[#aaa] bg-white px-1">{COLLS.map((c) => <option key={c}>{c}</option>)}</select>
          <button onClick={() => void createDb()} className="border border-[#aaa] bg-gradient-to-b from-white to-[#ddd] px-3 py-1 hover:from-[#ddd]">Utwórz</button></div>
      </fieldset>
      <table className="border-collapse text-[12.5px]"><thead><tr><th className="bg-[#d3dce3] px-2 py-1" /><th className="bg-[#d3dce3] px-3 py-1 text-left text-[#235a81]">Baza danych ▲</th><th className="bg-[#d3dce3] px-3 py-1 text-left text-[#235a81]">Metoda porównywania napisów</th><th className="bg-[#d3dce3] px-3 py-1 text-left text-[#235a81]">Akcja</th></tr></thead>
        <tbody>{[...SYS.map((n) => ({ n, sys: true })), ...srv.names().map((n) => ({ n, sys: false }))].sort((a, b) => a.n.localeCompare(b.n)).map(({ n, sys }, i) => <tr key={n} className={i % 2 ? 'bg-[#dfdfdf]' : 'bg-white'}>
          <td className="px-2"><input type="checkbox" disabled={sys} /></td><td className="px-3 py-1"><button className="text-[#235a81] hover:underline" onClick={() => !sys && go(n)}>{n}</button></td><td className="px-3">{sys ? 'utf8mb4_general_ci' : srv.meta(n)?.collation}</td>
          <td className="px-3">{!sys && <button className="text-[#c00] hover:underline" onClick={async () => { if (await os.confirm('Potwierdzenie', `Czy na pewno chcesz wykonać „DROP DATABASE \`${n}\`;”?`)) { srv.drop(n); setMsg({ ok: true, text: `Baza danych ${n} została usunięta.` }); } }}>Usuń</button>}</td></tr>)}</tbody></table>
    </>);
    if (tab === 'sql') return (<>
      <p className="mb-2">Uruchom zapytanie/zapytania SQL na {db ? <>bazie danych <b>{db}</b></> : <>serwerze „127.0.0.1”</>}: <span className="text-[#235a81]">ⓘ</span></p>
      <textarea value={sql} onChange={(e) => setSql(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) execute(sql, db); }} spellCheck={false} className="h-[180px] w-full border border-[#aaa] bg-white p-2 font-[monospace] text-[13px] outline-none" />
      <div className="my-2 flex flex-wrap gap-1">{(db ? (table ? [`SELECT * FROM \`${table}\` WHERE 1`, 'SELECT', 'INSERT', 'UPDATE', 'DELETE'] : ['SELECT *', 'SELECT', 'INSERT', 'UPDATE', 'DELETE']) : []).map((b) => <button key={b} onClick={() => setSql(b === 'SELECT *' ? 'SELECT * FROM `' + (tables(db!)[0] ?? 'tabela') + '` WHERE 1' : b)} className="border border-[#aaa] bg-gradient-to-b from-white to-[#ddd] px-2 py-0.5 text-[12px]">{b}</button>)}
        <button onClick={() => setSql('')} className="border border-[#aaa] bg-gradient-to-b from-white to-[#ddd] px-2 py-0.5 text-[12px]">Wyczyść</button><button className="border border-[#aaa] bg-gradient-to-b from-white to-[#ddd] px-2 py-0.5 text-[12px]">Formatuj</button></div>
      <div className="flex items-center justify-between border border-[#aaa] bg-[#eee] px-3 py-2"><span className="text-[12px]">Ogranicznik <input defaultValue=";" className="w-8 border border-[#aaa] bg-white px-1" /> <label className="ml-3"><input type="checkbox" defaultChecked /> Zachowaj okno zapytania SQL</label></span><button onClick={() => execute(sql, db)} className="border border-[#aaa] bg-gradient-to-b from-white to-[#ddd] px-4 py-1 font-bold">Wykonaj</button></div>
      {out && <div className="mt-4">{out.map((o, i) => <div key={i} className="mb-4">{o.ok ? <Msg ok text={o.msg} /> : <div className="mb-3 border border-[#c00] bg-[#ffc] px-3 py-2 text-[#c00]"><b>Błąd</b><p className="mt-1 text-black">Zapytanie SQL: <span className="text-[#235a81]">Kopiuj</span></p><pre className="my-1 whitespace-pre-wrap bg-white px-2 py-1 font-[monospace] text-[#235a81]">{o.sql}</pre><p>MySQL zwrócił komunikat: <b>{o.msg}</b></p></div>}{o.ok && <SqlBox q={o.sql} />}{o.res && <Grid r={o.res} />}</div>)}</div>}
    </>);
    if (tab === 'import') return (<>
      <h2 className="mb-3 text-[22px] text-[#444]">Importowanie do {db ? <>bazy danych „{db}”</> : 'aktualnego serwera'}</h2>
      <fieldset className="mb-3 border border-[#aaa] bg-[#eee] p-3"><legend className="px-1 font-bold">Plik do zaimportowania:</legend>
        <p className="mb-2 text-[12px]">Plik może być skompresowany (gzip, bzip2, zip) lub nieskompresowany. Nazwa skompresowanego pliku musi się kończyć na <b>.[format].[kompresja]</b>. Przykład: <b>.sql.zip</b></p>
        <p className="flex items-center gap-2">Przeglądaj komputer: <button onClick={async () => { const p = await os.pick({ mode: 'open', title: 'Wybierz plik do przesłania przez localhost', filters: [{ label: 'Wszystkie pliki (*.*)', exts: ['*'] }, { label: 'Pliki SQL (*.sql)', exts: ['sql'] }] }); if (p) setImpFile(p); }} className="border border-[#aaa] bg-gradient-to-b from-white to-[#ddd] px-2 py-0.5">Wybierz plik</button><span>{impFile ? base(impFile) : 'Nie wybrano pliku'}</span> <span className="text-[12px] text-[#666]">(Maksymalny rozmiar: 40MiB)</span></p>
        <p className="mt-2">Zestaw znaków pliku: <select className="border border-[#aaa] bg-white"><option>utf-8</option></select></p>
      </fieldset>
      <fieldset className="mb-3 border border-[#aaa] bg-[#eee] p-3"><legend className="px-1 font-bold">Format:</legend><select className="border border-[#aaa] bg-white"><option>SQL</option></select></fieldset>
      <div className="flex justify-end border border-[#aaa] bg-[#eee] px-3 py-2"><button onClick={() => void doImport()} className="border border-[#aaa] bg-gradient-to-b from-white to-[#ddd] px-4 py-1 font-bold">Importuj</button></div>
    </>);
    if (tab === 'structure' && db && !table) {
      const ts = tables(db);
      return ts.length ? (<table className="border-collapse text-[12.5px]"><thead><tr>{['', 'Tabela', 'Akcja', '', '', '', '', '', 'Rekordy', 'Typ', 'Metoda porównywania napisów', 'Rozmiar'].map((h, i) => <th key={i} className="bg-[#d3dce3] px-2 py-1 text-left text-[#235a81]">{h}</th>)}</tr></thead>
        <tbody>{ts.map((t, i) => <tr key={t} className={i % 2 ? 'bg-[#dfdfdf]' : 'bg-white'}><td className="px-2"><input type="checkbox" /></td><td className="px-2 py-1 font-bold"><button className="text-[#235a81] hover:underline" onClick={() => go(db, t)}>{t}</button></td>
          {[['Przeglądaj', 'browse'], ['Struktura', 'structure'], ['Szukaj', 'search'], ['Wstaw', 'insert'], ['Wyczyść', ''], ['Usuń', 'drop']].map(([l, k]) => <td key={l} className="px-1.5"><button onClick={async () => { if (k === 'drop') { if (await os.confirm('Potwierdzenie', `Czy na pewno chcesz wykonać „DROP TABLE \`${t}\`;”?`)) { srv.get(db)!.run(`DROP TABLE "${t}"`); srv.bump(); } } else if (k) go(db, t, k); }} className={`text-[12px] hover:underline ${k === 'drop' || !k ? 'text-[#c00]' : 'text-[#235a81]'}`}>{l}</button></td>)}
          <td className="px-2 text-right">{count(db, t)}</td><td className="px-2">InnoDB</td><td className="px-2">{srv.meta(db)?.collation}</td><td className="px-2 text-right">16,0 KiB</td></tr>)}
          <tr className="border-t-2 border-[#aaa] font-bold"><td /><td className="px-2">{ts.length} tabel</td><td colSpan={6} className="px-2">Suma</td><td className="px-2 text-right">{ts.reduce((s, t) => s + count(db, t), 0)}</td><td className="px-2">InnoDB</td><td className="px-2">{srv.meta(db)?.collation}</td><td /></tr></tbody></table>)
        : <><div className="mb-3 border border-[#ffe16f] bg-[#fffbd6] px-3 py-2">Nie znaleziono tabel w bazie danych.</div>
          <fieldset className="border border-[#aaa] bg-[#eee] p-3"><legend className="px-1 font-bold">Utwórz nową tabelę</legend><p>Nazwa tabeli: <input className="border border-[#aaa] bg-white px-1" /> Liczba kolumn: <input defaultValue={4} className="w-12 border border-[#aaa] bg-white px-1" /> <button onClick={() => setTab('sql')} className="border border-[#aaa] bg-gradient-to-b from-white to-[#ddd] px-2">Utwórz</button></p></fieldset></>;
    }
    if (table && db && tab === 'browse') {
      const r = srv.get(db)?.exec(`SELECT * FROM "${table}" LIMIT 25`)[0]; const n = count(db, table);
      return <><Msg ok text={`Pokazano rekordy 0 - ${Math.min(24, n - 1)} (${n} ogółem, Wykonanie zapytania trwało ${secs()} sekund(y).)`} /><SqlBox q={`SELECT * FROM \`${table}\``} />{r ? <Grid r={r} actions /> : <p>MySQL zwrócił pusty wynik (zero wierszy).</p>}</>;
    }
    if (table && db && tab === 'structure') {
      const cols = srv.get(db)?.exec(`PRAGMA table_info("${table}")`)[0]?.values ?? [];
      return <table className="border-collapse text-[12.5px]"><thead><tr>{['#', 'Nazwa', 'Typ', 'Metoda porównywania napisów', 'Atrybuty', 'Null', 'Ustawienia domyślne', 'Dodatkowo', 'Działanie'].map((h) => <th key={h} className="bg-[#d3dce3] px-2 py-1 text-left text-[#235a81]">{h}</th>)}</tr></thead>
        <tbody>{cols.map((c, i) => <tr key={i} className={i % 2 ? 'bg-[#dfdfdf]' : 'bg-white'}><td className="px-2">{i + 1}</td><td className="px-2 font-bold">{String(c[1])}{c[5] ? ' 🔑' : ''}</td><td className="px-2">{String(c[2]).toLowerCase().replace('integer', 'int(11)').replace(/^text$/, 'text') || 'text'}</td><td className="px-2">{/char|text/i.test(String(c[2])) ? srv.meta(db)?.collation : ''}</td><td /><td className="px-2">{c[3] ? 'Nie' : 'Tak'}</td><td className="px-2">{c[4] === null ? <i>Brak</i> : String(c[4])}</td><td className="px-2">{c[5] && /int/i.test(String(c[2])) ? 'AUTO_INCREMENT' : ''}</td><td className="px-2 text-[#235a81]">Zmień · <span className="text-[#c00]">Usuń</span></td></tr>)}</tbody></table>;
    }
    if (tab === 'export' && db) return (<>
      <h2 className="mb-3 text-[22px] text-[#444]">Eksportowanie tabel z bazy danych „{db}”</h2>
      <fieldset className="mb-3 border border-[#aaa] bg-[#eee] p-3"><legend className="px-1 font-bold">Metoda eksportu:</legend><label className="block"><input type="radio" defaultChecked name="m" /> Szybko - wyświetlaj tylko minimalne opcje</label><label className="block"><input type="radio" name="m" /> Własne - wyświetlaj wszystkie możliwe opcje</label></fieldset>
      <fieldset className="mb-3 border border-[#aaa] bg-[#eee] p-3"><legend className="px-1 font-bold">Format:</legend><select className="border border-[#aaa] bg-white"><option>SQL</option></select></fieldset>
      <div className="flex justify-end border border-[#aaa] bg-[#eee] px-3 py-2"><button onClick={exportDb} className="border border-[#aaa] bg-gradient-to-b from-white to-[#ddd] px-4 py-1 font-bold">Eksportuj</button></div>
    </>);
    return <div className="border border-[#ffe16f] bg-[#fffbd6] px-3 py-2">Ta zakładka nie jest potrzebna na egzaminie i w symulatorze jest niedostępna.</div>;
  };

  return (
    <div className="flex h-full bg-white font-['Segoe_UI',Tahoma,sans-serif] text-[13px] text-[#444]">
      <div className="flex w-[230px] shrink-0 flex-col border-r border-[#aaa] bg-[#f3f3f3]">
        <button onClick={() => go(null)} className="px-3 pt-3 text-left text-[26px] font-bold leading-none"><span className="text-[#6c78af]">php</span><span className="text-[#f89c0e]">MyAdmin</span></button>
        <div className="flex gap-2 px-3 py-2 text-[#235a81]"><Home size={14} onClick={() => go(null)} className="cursor-pointer" /><LogOut size={14} /><FileCode size={14} onClick={() => setTab('sql')} className="cursor-pointer" /><BookOpen size={14} /><Settings size={14} /><RefreshCw size={14} onClick={() => srv.bump(false)} className="cursor-pointer" /></div>
        <div className="flex gap-3 border-b border-[#ccc] px-3 pb-1 text-[12px]"><span className="font-bold">Ostatnie</span><span>Ulubione</span></div>
        <div className="min-h-0 flex-1 overflow-auto px-1 py-1 text-[12.5px]">
          <button onClick={() => go(null, null, 'databases')} className="flex items-center gap-1 px-1 py-0.5 text-[#235a81] hover:underline"><Database size={13} className="text-[#2a9d2a]" />Nowa</button>
          {[...SYS, ...srv.names()].sort().map((n) => { const sys = SYS.includes(n); const ex = open[n]; return (
            <div key={n}>
              <div className={`flex items-center gap-1 px-1 py-0.5 ${db === n && !table ? 'bg-[#ddd]' : ''}`}>
                <button onClick={() => setOpen((o) => ({ ...o, [n]: !o[n] }))} className="text-[#235a81]">{ex ? <Minus size={11} /> : <Plus size={11} />}</button>
                <Database size={13} className="text-[#6c78af]" /><button onClick={() => !sys && go(n)} className="truncate text-left text-[#235a81] hover:underline">{n}</button>
              </div>
              {ex && !sys && <div className="ml-6">{tables(n).length ? tables(n).map((t) => <button key={t} onClick={() => go(n, t)} className={`flex w-full items-center gap-1 px-1 py-0.5 text-left text-[#235a81] hover:underline ${table === t && db === n ? 'bg-[#ddd]' : ''}`}><Table2 size={12} />{t}</button>) : <p className="px-1 text-[#888]">Brak tabel</p>}</div>}
            </div>); })}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1 border-b border-[#aaa] bg-gradient-to-b from-white to-[#dcdcdc] px-3 py-1.5 text-[12.5px]">
          <Server size={13} /><button onClick={() => go(null)} className="text-[#235a81] hover:underline">Serwer: 127.0.0.1</button>
          {db && <> » <Database size={13} /><button onClick={() => go(db)} className="text-[#235a81] hover:underline">Baza danych: {db}</button></>}
          {table && <> » <Table2 size={13} /><span className="text-[#235a81]">Tabela: {table}</span></>}
        </div>
        <div className="flex flex-wrap border-b border-[#aaa] bg-[#eee] px-2 pt-1">{TABS.map(([k, l, I]) => <button key={k} onClick={() => { setTab(k); setOut(null); setMsg(null); if (k === 'sql' && table && !sql) setSql(`SELECT * FROM \`${table}\` WHERE 1`); }} className={`flex items-center gap-1 rounded-t border border-b-0 px-3 py-1.5 text-[12.5px] ${tab === k ? 'border-[#aaa] bg-white font-bold' : 'border-transparent text-[#235a81] hover:bg-white/70'}`}><I size={13} />{l}</button>)}</div>
        <div className="min-h-0 flex-1 overflow-auto p-4">{msg && <Msg {...msg} />}{content()}</div>
      </div>
    </div>
  );
}
export const pmaJoin = join;
