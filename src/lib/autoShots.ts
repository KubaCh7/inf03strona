// Zrzuty ekranu robione automatycznie (jak PrtSc na egzaminie): ekran 1920×1080 z paskiem przegladarki,
// phpMyAdmin z wynikiem kwerendy / importu i paskiem zadan. Zapis do grafik warsztatu (IndexedDB).
import type { QueryResult } from './sql';
import { run } from './sql';
import { freshFromDump } from './queries';
import { loadAssets, saveAssets } from './assetsStore';
import { loadReqs, splitQueries } from './examiner';

const W = 1920, H = 1080;
const esc = (s: unknown) => String(s ?? 'NULL').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

function frame(title: string, url: string, body: string) {
  const now = new Date();
  const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const date = now.toLocaleDateString('pl-PL');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{width:${W}px;height:${H}px;font:14px Arial,Helvetica,sans-serif;background:#fff;color:#222;position:relative;overflow:hidden}
.tabs{height:38px;background:#dee1e6;display:flex;align-items:flex-end;padding-left:8px}.tab{background:#fff;height:32px;width:260px;border-radius:8px 8px 0 0;padding:8px 12px;font-size:13px;white-space:nowrap;overflow:hidden}
.bar{height:40px;background:#fff;border-bottom:1px solid #ccc;display:flex;align-items:center;padding:0 12px;gap:12px}.url{flex:1;height:28px;border-radius:14px;background:#f1f3f4;padding:6px 16px;font-size:13px;color:#333}
.task{position:absolute;left:0;right:0;bottom:0;height:48px;background:#1f2937;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 16px;font-size:13px}
.start{width:24px;height:24px;display:grid;grid-template-columns:1fr 1fr;gap:2px}.start i{background:#60a5fa}
.app{position:absolute;top:78px;bottom:48px;left:0;right:0;display:flex}.side{width:260px;background:#f3f3f3;border-right:1px solid #ccc;padding:10px;font-size:13px}
.side b{display:block;margin:6px 0}.side div{padding:3px 0 3px 14px}.main{flex:1;padding:12px 18px;overflow:hidden}
.crumb{background:#e9ecef;border:1px solid #ccc;padding:6px 10px;font-size:13px;margin-bottom:8px}.menu{display:flex;gap:2px;margin-bottom:12px}.menu span{background:#eee;border:1px solid #ccc;padding:6px 12px;font-size:13px}.menu .on{background:#fff;border-bottom-color:#fff;font-weight:bold}
.ok{background:#ebf8a4;border:1px solid #a2d246;padding:8px 12px;margin-bottom:10px}.err{background:#ffc;border:1px solid #c00;color:#c00;padding:8px 12px;margin-bottom:10px}
pre{background:#f8f8f8;border:1px solid #ddd;padding:8px 10px;margin-bottom:10px;font:13px monospace;white-space:pre-wrap}
table{border-collapse:collapse;font-size:13px}th{background:#d3dce3;text-align:left;padding:5px 8px;border:1px solid #fff}td{padding:4px 8px;border:1px solid #fff;background:#e5e5e5}tr:nth-child(odd) td{background:#fff}
</style></head><body>
<div class="tabs"><div class="tab">${esc(title)}</div></div><div class="bar"><span>&#8592; &#8594; &#8635;</span><div class="url">${esc(url)}</div></div>
${body}
<div class="task"><div style="display:flex;gap:16px;align-items:center"><div class="start"><i></i><i></i><i></i><i></i></div><span>Przeglądarka</span><span>Notatnik</span><span>Eksplorator plików</span></div><div style="text-align:right;line-height:1.3">${clock}<br>${date}</div></div>
</body></html>`;
}

function pma(db: string, tables: string[], tab: string, main: string) {
  return `<div class="app"><div class="side"><b>phpMyAdmin</b><div>Nowa</div><b>&#9662; ${esc(db)}</b>${tables.map((t) => `<div>&#9638; ${esc(t)}</div>`).join('')}<b>information_schema</b><b>mysql</b></div>
<div class="main"><div class="crumb">Serwer: 127.0.0.1 &raquo; Baza danych: ${esc(db)}</div><div class="menu">${['Struktura', 'SQL', 'Szukaj', 'Zapytanie', 'Eksport', 'Import', 'Operacje'].map((m) => `<span class="${m === tab ? 'on' : ''}">${m}</span>`).join('')}</div>${main}</div></div>`;
}

export async function renderShot(html: string, ext: string): Promise<string> {
  const html2canvas = (await import('html2canvas')).default;
  const iframe = document.createElement('iframe');
  iframe.setAttribute('sandbox', 'allow-same-origin');
  iframe.style.cssText = `position:fixed;left:-${W + 100}px;top:0;width:${W}px;height:${H}px;border:0`;
  iframe.srcdoc = html;
  document.body.appendChild(iframe);
  try {
    await new Promise<void>((r) => { iframe.onload = () => r(); setTimeout(r, 3000); });
    const c = await html2canvas(iframe.contentDocument!.documentElement, { width: W, height: H, windowWidth: W, windowHeight: H, backgroundColor: '#ffffff', logging: false, scale: 1 });
    return c.toDataURL(ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png', 0.9);
  } finally { iframe.remove(); }
}

export function queryScreen(o: { db: string; tables: string[]; sql: string; result?: QueryResult; changes?: number; error?: string }) {
  const r = o.result;
  const body = o.error
    ? `<div class="err">#1064 - ${esc(o.error)}</div>`
    : r
      ? `<div class="ok">&#10004; Pokazano rekordy 0 - ${Math.max(0, r.values.length - 1)} (${r.values.length} łącznie)</div><table><tr>${r.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${r.values.slice(0, 30).map((row) => `<tr>${row.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</table>`
      : `<div class="ok">&#10004; Zmienionych rekordów: ${o.changes ?? 0}.</div>`;
  return frame('localhost / 127.0.0.1 / phpMyAdmin', `localhost/phpmyadmin/index.php?route=/database/sql&db=${o.db}`, pma(o.db, o.tables, 'SQL', `<pre>${esc(o.sql)}</pre>${body}`));
}
export function importScreen(o: { db: string; tables: string[]; file: string; count: number }) {
  return frame('localhost / 127.0.0.1 / phpMyAdmin', `localhost/phpmyadmin/index.php?route=/database/import&db=${o.db}`,
    pma(o.db, o.tables, 'Import', `<div class="ok">&#10004; Import zakończył się sukcesem, wykonano ${o.count} zapytań. (${esc(o.file)})</div><table><tr><th>Tabela</th><th>Działanie</th><th>Typ</th><th>Metoda porównywania napisów</th></tr>${o.tables.map((t) => `<tr><td>${esc(t)}</td><td>Przeglądaj · Struktura · Szukaj</td><td>InnoDB</td><td>utf8_polish_ci</td></tr>`).join('')}</table>`));
}
/** Okno programu graficznego (np. parametry eksportu animacji) na tle pulpitu. */
export function windowScreen(title: string, inner: string) {
  return frame(title, 'Pulpit', `<div class="app" style="background:#3b5b7a;align-items:center;justify-content:center"><div style="width:720px;background:#f2f2f2;border:1px solid #888;box-shadow:0 10px 40px #0008"><div style="background:#2b2b2b;color:#fff;padding:8px 12px;font-weight:bold">${esc(title)}</div><div style="padding:18px;line-height:2">${inner}</div></div></div>`);
}

const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return String(h); };

/** Dorabia / odswieza zrzuty kwN i import dla arkusza. Zwraca aktualne grafiki warsztatu. */
export async function ensureShots(o: { code: string; storageKey: string; files: Record<string, string>; dump: string | null; dumpFile?: string | null; images?: Record<string, string> }): Promise<Record<string, string>> {
  const reqs = (await loadReqs())[o.code];
  const images = { ...(o.images ?? (await loadAssets(o.storageKey))) };
  if (!reqs?.shots.length || !o.dump) return images;
  const meta = await loadAssets(o.storageKey + '::shots');
  const kwFile = Object.keys(o.files).find((n) => /^kwerendy\.txt$/i.test(n));
  const qs = kwFile ? splitQueries(o.files[kwFile]) : [];
  let changed = false;
  let tables: string[] | null = null;
  const dbName = reqs.dbName ?? (o.dumpFile ?? 'baza').replace(/\.sql$/i, '');
  const getTables = async () => {
    if (tables) return tables;
    const d = await freshFromDump(o.dump!);
    tables = (d.exec("SELECT name FROM sqlite_master WHERE type='table' AND name<>'sqlite_sequence' ORDER BY name")[0]?.values ?? []).map((v) => String(v[0]));
    d.close();
    return tables;
  };
  for (const s of reqs.shots) {
    const name = `${s.name}.${s.ext}`;
    let src: string | null = null, html: (() => Promise<string>) | null = null;
    if (s.import) {
      src = 'import:' + (o.dumpFile ?? '');
      html = async () => importScreen({ db: dbName, tables: await getTables(), file: o.dumpFile ?? 'baza.sql', count: (o.dump!.match(/;\s*$/gm) ?? []).length });
    } else {
      const n = /^(?:kw|kwerenda)(\d+)$/i.exec(s.name)?.[1];
      const sql = n ? qs[+n - 1] : undefined;
      if (!n || !sql) continue;
      src = 'q:' + sql;
      html = async () => {
        const d = await freshFromDump(o.dump!);
        try {
          const r = run(d, sql);
          return queryScreen({ db: dbName, tables: await getTables(), sql, result: r.results[r.results.length - 1], changes: d.getRowsModified() });
        } catch (e) { return queryScreen({ db: dbName, tables: await getTables(), sql, error: (e as Error).message }); } finally { d.close(); }
      };
    }
    const h = hash(src);
    if (images[name] && meta[name] === h) continue;
    if (images[name] && !meta[name]) continue; // zrzut dodany recznie: nie nadpisujemy
    images[name] = await renderShot(await html(), s.ext);
    meta[name] = h; changed = true;
  }
  if (changed) { await saveAssets(o.storageKey, images); await saveAssets(o.storageKey + '::shots', meta); }
  return images;
}
