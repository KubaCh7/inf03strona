import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Home, Plus, X, Lock, Info, Star, MoreHorizontal, Globe, Search, FileWarning } from 'lucide-react';
import { useOS, useVmBack, type Win } from '../os';
import { useVfs, HTDOCS, join, parent, isImage, isText, ext, base, dataUrlToText } from '../../../lib/vfs';
import { useServer } from '../../../lib/mysqlServer';
import { buildSrcDoc } from '../../../lib/preview';
import { inlineAssets } from '../../../lib/assetsStore';
import Pma from './Pma';

type Page = { kind: 'html' | 'pma' | 'error' | 'newtab' | 'text' | 'pdf'; doc?: string; title: string; err?: { head: string; text: string; code: string }; hint?: string };
type Tab = { id: number; url: string; hist: string[]; idx: number; page: Page | null; post?: { method: 'GET' | 'POST'; data: string } };
let tid = 1;

const DASH = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Welcome to XAMPP</title><style>body{margin:0;font-family:Helvetica,Arial,sans-serif;background:#fff;color:#333}header{background:#fb7a24;color:#fff;padding:14px 40px;display:flex;align-items:center;gap:30px}header b{font-size:22px}nav a{color:#fff;margin-right:18px;text-decoration:none;font-size:14px}.hero{background:#f3f3f3;padding:40px;text-align:center}h1{font-weight:300;font-size:34px;margin:0 0 6px}main{max-width:900px;margin:30px auto;line-height:1.6;font-size:15px}</style></head><body><header><b>XAMPP</b> Apache + MariaDB + PHP + Perl<nav><a href="#">Applications</a><a href="#">FAQs</a><a href="#">HOW-TO Guides</a><a href="/phpmyadmin/">phpMyAdmin</a></nav></header><div class="hero"><h1>Welcome to XAMPP for Windows 8.2.12</h1></div><main><p>You have successfully installed XAMPP on this system! Now you can start using Apache, MariaDB, PHP and other components. You can find more info in the FAQs section or check the HOW-TO Guides for getting started with PHP applications.</p><p>Start the XAMPP Control Panel to check the server status.</p></main></body></html>`;

export default function Browser({ win }: { win: Win }) {
  const os = useOS(); const vfs = useVfs(os.vfs); const srv = useServer(os.server);
  const first = String(win.args.url ?? (win.args.path ? 'file:///' + String(win.args.path) : ''));
  const [tabs, setTabs] = useState<Tab[]>(() => [{ id: tid++, url: first, hist: [first], idx: 0, page: null }]);
  const [cur, setCur] = useState(0);
  const [addr, setAddr] = useState(first);
  const [busy, setBusy] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const t = tabs[Math.min(cur, tabs.length - 1)];

  const load = useCallback(async (url: string, post?: Tab['post']): Promise<Page> => {
    let u = url.trim().replace(/^https?:\/\//i, '');
    if (!u) return { kind: 'newtab', title: 'Nowa karta' };
    // sciezka z dysku wpisana w pasek adresu (C:\xampp\...) otwiera sie jak plik, tak jak w Edge
    if (/^[a-z]:[\\/]/i.test(u)) { u = 'file:///' + u.replace(/\\/g, '/'); setTabUrl(u); }
    if (/^file:\/\/\//i.test(u)) {
      const p = decodeURI(u.slice(8)).replace(/\\/g, '/').split('?')[0];
      if (!vfs.exists(p)) return { kind: 'error', title: base(p), err: { head: 'Nie można uzyskać dostępu do tego pliku', text: `Ten plik może być przeniesiony, edytowany lub usunięty.`, code: 'ERR_FILE_NOT_FOUND' } };
      if (ext(p) === 'pdf') return { kind: 'pdf', title: base(p) };
      if (isImage(p)) return { kind: 'html', title: base(p), doc: `<body style="margin:0;background:#0e0e0e;display:grid;place-items:center;height:100vh"><img src="${vfs.read(p)}" style="max-width:100%"></body>` };
      if (/^html?$/.test(ext(p))) return { kind: 'html', title: base(p), doc: render(p, vfs.read(p)) };
      // PHP z dysku sie nie wykona (tak jest tez naprawde): podpowiedz adres przez serwer
      const hint = /^php$/i.test(ext(p)) ? (p.startsWith(HTDOCS + '/') ? 'localhost/' + p.slice(HTDOCS.length + 1) : '') : undefined;
      return { kind: 'text', title: base(p), doc: vfs.get(p)?.bin ? dataUrlToText(vfs.read(p)) : vfs.read(p), hint };
    }
    const m = /^(localhost|127\.0\.0\.1)(?::(\d+))?(\/[^?#]*)?(\?[^#]*)?/i.exec(u);
    if (!m) {
      if (!/[./]/.test(u) || /\s/.test(u)) return { kind: 'error', title: u, err: { head: 'Brak połączenia z Internetem', text: 'Na stanowisku egzaminacyjnym nie ma dostępu do Internetu. Działa tylko localhost.', code: 'ERR_INTERNET_DISCONNECTED' } };
      return { kind: 'error', title: u, err: { head: 'Brak połączenia z Internetem', text: `Nie można połączyć się z ${u.split('/')[0]}. Na egzaminie działa tylko serwer lokalny (localhost).`, code: 'ERR_INTERNET_DISCONNECTED' } };
    }
    if (!srv.apache) return { kind: 'error', title: 'localhost', err: { head: 'Nie można uzyskać dostępu do tej strony', text: 'Serwer localhost odrzucił połączenie.\nSpróbuj:\n• Sprawdzić połączenie\n• Sprawdzić serwer proxy i zaporę\n\n(Uruchom Apache w XAMPP Control Panel.)', code: 'ERR_CONNECTION_REFUSED' } };
    let path = decodeURIComponent((m[3] ?? '/').replace(/^\/+/, ''));
    const query = (m[4] ?? '').replace(/^\?/, '');
    if (/^phpmyadmin(\/|$)/i.test(path)) return { kind: 'pma', title: 'localhost / 127.0.0.1 | phpMyAdmin 5.2.1' };
    if (path === '' || /^dashboard\/?/.test(path) || path === 'index.php') { if (path === '' || path === 'index.php') { setTabUrl('localhost/dashboard/'); } return { kind: 'html', title: 'Welcome to XAMPP', doc: DASH }; }
    let p = join(HTDOCS, path);
    if (vfs.isDir(p)) {
      const idx = ['index.php', 'index.html', 'index.htm'].map((n) => join(p, n)).find((x) => vfs.exists(x));
      if (!idx) {
        const items = vfs.list(p);
        return { kind: 'html', title: `Index of /${path}`, doc: `<!DOCTYPE html><html><head><title>Index of /${path}</title></head><body><h1>Index of /${path.replace(/\/$/, '')}</h1><table><tr><th>Name</th><th>Last modified</th><th>Size</th></tr><tr><th colspan="3"><hr></th></tr><tr><td><a href="../">Parent Directory</a></td><td></td><td>-</td></tr>${items.map((x) => `<tr><td><a href="${base(x)}${vfs.isDir(x) ? '/' : ''}">${base(x)}${vfs.isDir(x) ? '/' : ''}</a></td><td>${new Date(vfs.get(x)!.mtime).toISOString().slice(0, 16).replace('T', ' ')}</td><td align="right">${vfs.isDir(x) ? '-' : Math.ceil(vfs.size(x) / 1024) + 'K'}</td></tr>`).join('')}<tr><th colspan="3"><hr></th></tr></table><address>Apache/2.4.58 (Win64) OpenSSL/3.1.3 PHP/8.2.12 Server at localhost Port 80</address></body></html>` };
      }
      p = idx;
    }
    if (!vfs.exists(p)) return { kind: 'html', title: 'Object not found!', doc: `<!DOCTYPE html><html><head><title>Object not found!</title></head><body style="font-family:sans-serif"><h1>Object not found!</h1><p>The requested URL was not found on this server. If you entered the URL manually please check your spelling and try again.</p><p>If you think this is a server error, please contact the <a href="mailto:postmaster@localhost">webmaster</a>.</p><h2>Error 404</h2><address><a href="/">localhost</a><br><span>Apache/2.4.58 (Win64) OpenSSL/3.1.3 PHP/8.2.12</span></address></body></html>` };
    if (isImage(p)) return { kind: 'html', title: base(p), doc: `<body style="margin:0;background:#0e0e0e;display:grid;place-items:center;height:100vh"><img src="${vfs.read(p)}"></body>` };
    if (ext(p) === 'php') {
      const { runPhp } = await import('../../../lib/php/runtime');
      const files: Record<string, string> = {};
      for (const f of vfs.tree(HTDOCS)) if (isText(f.rel) && !f.node.bin) files[f.rel] = f.node.data ?? '';
      const r = await runPhp({ files, entry: p.slice(HTDOCS.length + 1), db: null, query, method: post?.method ?? 'GET', post: post?.method === 'POST' ? post.data : undefined, server: { mysql: srv.mysql, get: (n) => srv.get(n), onChange: () => srv.bump() } });
      return { kind: 'html', title: /<title>([^<]*)<\/title>/i.exec(r.html)?.[1] ?? base(p), doc: render(p, r.html) };
    }
    if (/^html?$/.test(ext(p))) return { kind: 'html', title: /<title>([^<]*)<\/title>/i.exec(vfs.read(p))?.[1] ?? base(p), doc: render(p, vfs.read(p)) };
    return { kind: 'text', title: base(p), doc: vfs.read(p) };
  }, [vfs, srv]); // eslint-disable-line react-hooks/exhaustive-deps

  /** HTML strony + style/skrypty/grafiki z jej folderu (sciezki wzgledne). */
  function render(p: string, html: string) {
    const dir = parent(p);
    const files: Record<string, string> = {}; const imgs: Record<string, string> = {};
    for (const f of vfs.tree(dir)) { if (f.node.bin) imgs[f.rel] = f.node.data ?? ''; else files[f.rel] = f.node.data ?? ''; }
    return inlineAssets(buildSrcDoc({ ...files, [base(p)]: html }, base(p)), imgs);
  }
  function setTabUrl(u: string) { setTabs((ts) => ts.map((x, i) => (i === cur ? { ...x, url: u, hist: x.hist.map((h, k) => (k === x.idx ? u : h)) } : x))); setAddr(u); }

  async function navigate(url: string, opts: { push?: boolean; post?: Tab['post'] } = {}) {
    const u = url.trim();
    setBusy(true); setAddr(u);
    const page = await load(u, opts.post).catch((e) => ({ kind: 'error', title: 'Błąd', err: { head: 'Wystąpił błąd', text: String((e as Error).message), code: 'ERR_FAILED' } }) as Page);
    setTabs((ts) => ts.map((x, i) => (i !== cur ? x : opts.push === false ? { ...x, url: u, page } : { ...x, url: u, page, hist: [...x.hist.slice(0, x.idx + 1), u], idx: x.idx + 1, post: opts.post })));
    setBusy(false);
  }
  useEffect(() => { if (!t.page) void navigate(t.url, { push: false }); }, [t.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setAddr(t.url); }, [t.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { os.setTitle(win.id, `${t.page?.title ?? 'Nowa karta'} — Microsoft Edge`); }, [t.page, win.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // linki i formularze ze strony w ramce
  useEffect(() => {
    const h = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || !e.data?.__p03) return;
      const [a, b, c] = e.data.args ?? [];
      const curUrl = t.url.replace(/^https?:\/\//, '');
      if (/^file:\/\/\//.test(curUrl)) { if (e.data.type === 'nav' && !/^(https?:|\/\/)/.test(a)) void navigate('file:///' + join(parent(curUrl.slice(8)), String(a).split('?')[0])); return; }
      const baseUrl = new URL('http://' + (curUrl.startsWith('localhost') || curUrl.startsWith('127.') ? curUrl : 'localhost/'));
      if (e.data.type === 'nav') { const nu = new URL(String(a), baseUrl); void navigate('localhost' + nu.pathname + nu.search); }
      if (e.data.type === 'form') {
        const nu = new URL(String(a) || baseUrl.pathname, baseUrl);
        if (b === 'POST') void navigate('localhost' + nu.pathname + nu.search, { post: { method: 'POST', data: String(c) } });
        else void navigate('localhost' + nu.pathname + '?' + String(c));
      }
    };
    window.addEventListener('message', h); return () => window.removeEventListener('message', h);
  });

  const go = (d: -1 | 1) => { const i = t.idx + d; if (i < 0 || i >= t.hist.length) return; setTabs((ts) => ts.map((x, k) => (k === cur ? { ...x, idx: i } : x))); void navigate(t.hist[i], { push: false }); };
  const rootRef = useRef<HTMLDivElement>(null);
  useVmBack(rootRef, () => go(-1));
  const secure = /^(localhost|127\.)/.test(t.url.replace(/^https?:\/\//, ''));

  return (
    <div ref={rootRef} className="flex h-full flex-col bg-[#f7f7f7] text-[12.5px] text-[#1a1a1a]">
      <div className="flex items-end gap-1 bg-[#e8ebee] px-2 pt-1.5">
        {tabs.map((x, i) => (
          <div key={x.id} onClick={() => setCur(i)} className={`group flex h-[32px] w-[220px] items-center gap-2 rounded-t-[8px] px-3 ${i === cur ? 'bg-[#f7f7f7] shadow-[0_-1px_2px_rgba(0,0,0,.06)]' : 'hover:bg-white/50'}`}>
            {x.page?.kind === 'pma' ? <span className="text-[10px] font-bold text-[#f89c0e]">pMA</span> : x.page?.kind === 'error' ? <FileWarning size={13} className="text-[#888]" /> : <Globe size={13} className="text-[#666]" />}
            <span className="flex-1 truncate">{x.page?.title ?? 'Nowa karta'}</span>
            <button onClick={(e) => { e.stopPropagation(); if (tabs.length === 1) os.close(win.id); else { setTabs(tabs.filter((_, k) => k !== i)); setCur(Math.max(0, cur - (i <= cur ? 1 : 0))); } }} className="rounded p-0.5 opacity-60 hover:bg-black/10"><X size={12} /></button>
          </div>
        ))}
        <button onClick={() => { setTabs([...tabs, { id: tid++, url: '', hist: [''], idx: 0, page: null }]); setCur(tabs.length); }} className="mb-1 rounded p-1.5 hover:bg-black/[.06]"><Plus size={15} /></button>
      </div>
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button disabled={t.idx <= 0} onClick={() => go(-1)} className="rounded p-1.5 hover:bg-black/[.06] disabled:opacity-30"><ArrowLeft size={16} /></button>
        <button disabled={t.idx >= t.hist.length - 1} onClick={() => go(1)} className="rounded p-1.5 hover:bg-black/[.06] disabled:opacity-30"><ArrowRight size={16} /></button>
        <button onClick={() => void navigate(t.url, { push: false, post: t.post })} className="rounded p-1.5 hover:bg-black/[.06]" title="Odśwież (F5)"><RotateCw size={15} className={busy ? 'animate-spin' : ''} /></button>
        <button onClick={() => void navigate('')} className="rounded p-1.5 hover:bg-black/[.06]"><Home size={15} /></button>
        <div className="flex flex-1 items-center gap-2 rounded-full border border-transparent bg-white px-3 py-1.5 focus-within:border-[#0067c0]">
          {secure ? <Info size={13} className="text-[#666]" /> : <Lock size={13} className="text-[#666]" />}
          <input value={addr} onChange={(e) => setAddr(e.target.value)} onFocus={(e) => e.target.select()} onKeyDown={(e) => e.key === 'Enter' && void navigate(addr)} placeholder="Wyszukaj lub wprowadź adres internetowy" className="flex-1 bg-transparent outline-none" spellCheck={false} />
          <Star size={14} className="text-[#666]" />
        </div>
        <button className="rounded p-1.5 hover:bg-black/[.06]"><MoreHorizontal size={16} /></button>
      </div>
      <div className="relative min-h-0 flex-1 border-t border-black/[.06] bg-white" onKeyDown={(e) => { if (e.key === 'F5') { e.preventDefault(); void navigate(t.url, { push: false, post: t.post }); } }}>
        {t.page?.kind === 'pma' && <Pma setAddr={(a) => { if (a !== addr) { setAddr(a); setTabs((ts) => ts.map((x, i) => (i === cur ? { ...x, url: a } : x))); } }} />}
        {t.page?.kind === 'html' && <iframe ref={frame} title="Strona" sandbox="allow-scripts allow-forms allow-modals" srcDoc={t.page.doc} className="h-full w-full bg-white" />}
        {t.page?.kind === 'text' && <div className="flex h-full flex-col">
          {t.page.hint !== undefined && <div className="flex shrink-0 items-start gap-3 border-b border-[#f0d27a] bg-[#fff8e1] px-4 py-2.5 text-[13px] text-[#1a1a1a]">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#d39d00] text-[12px] font-bold text-white">!</span>
            <div className="flex-1">Ten plik PHP otworzył się bezpośrednio z dysku, więc przeglądarka pokazuje sam kod. PHP działa tylko przez serwer: w XAMPP uruchom <b>Apache</b> (i MySQL, jeśli strona łączy się z bazą), a potem wpisz adres <b>{t.page.hint || 'localhost/…'}</b>.{!t.page.hint && ' Plik musi leżeć w C:\\xampp\\htdocs.'}</div>
            {t.page.hint && <button onClick={() => void navigate(t.page!.hint!)} className="shrink-0 rounded-[4px] bg-[#0067c0] px-3 py-1 text-white hover:bg-[#005ba1]">Otwórz {t.page.hint}</button>}
          </div>}
          <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-3 font-[monospace] text-[13px]">{t.page.doc}</pre></div>}
        {t.page?.kind === 'error' && t.page.err && (
          <div className="mx-auto max-w-[600px] pt-[12vh] text-[#333]">
            <FileWarning size={60} className="mb-6 text-[#999]" strokeWidth={1} />
            <h1 className="mb-3 text-[24px] font-semibold">{t.page.err.head}</h1>
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[#555]">{t.page.err.text}</p>
            <p className="mt-4 text-[12px] text-[#777]">{t.page.err.code}</p>
            <button onClick={() => void navigate(t.url, { push: false })} className="mt-6 rounded-[4px] bg-[#0067c0] px-5 py-1.5 text-white">Odśwież</button>
          </div>
        )}
        {t.page?.kind === 'newtab' && (
          <div className="flex h-full flex-col items-center bg-gradient-to-b from-[#dbe7f5] to-[#f5f7fa] pt-[14vh]">
            <div className="flex w-[560px] items-center gap-2 rounded-full bg-white px-5 py-3 shadow"><Search size={16} className="text-[#666]" /><input onKeyDown={(e) => e.key === 'Enter' && void navigate((e.target as HTMLInputElement).value)} placeholder="Wyszukaj w Internecie" className="flex-1 outline-none" /></div>
            <div className="mt-8 flex gap-4">{[['localhost/', 'localhost'], ['localhost/phpmyadmin/', 'phpMyAdmin'], ...vfs.tree(HTDOCS).filter((f) => /\.(php|html?)$/i.test(f.rel) && !/^(dashboard|img|webalizer|xampp)\//.test(f.rel) && !/^(index\.php|applications\.html)$/.test(f.rel)).slice(0, 4).map((f) => ['localhost/' + f.rel, f.rel])].map(([u, l]) => <button key={u} onClick={() => void navigate(u)} className="flex w-28 flex-col items-center gap-1 rounded-[8px] bg-white/70 p-3 text-[12px] hover:bg-white" title={u}><Globe size={22} className="text-[#0067c0]" /><span className="w-full truncate text-center">{l}</span></button>)}</div>
          </div>
        )}
        {t.page?.kind === 'pdf' && <div className="grid h-full place-items-center text-[#666]">Otwórz arkusz ze skrótu na pulpicie.</div>}
        {busy && <div className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-[#0067c0]" />}
      </div>
    </div>
  );
}
