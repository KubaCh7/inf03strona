import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Minus, Plus, Maximize2, MoveHorizontal, RotateCw, Search, Printer, Save, Columns2, Highlighter, PenLine } from 'lucide-react';
import { Loading } from './ui';
import ErrorBoundary from './ErrorBoundary';

type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPage> };
type LoadingTask = { promise: Promise<unknown>; destroy?: () => unknown };
type RenderTask = { promise: Promise<void>; cancel: () => void };
type PdfPage = { getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown; canvas?: HTMLCanvasElement }) => RenderTask };

// Wersja "legacy" pdf.js: przetlumaczona dla starszych przegladarek (Safari na iPadzie/iPhonie).
let lib: Promise<typeof import('pdfjs-dist')> | null = null;
function pdfjs() {
  if (!lib) {
    lib = import('../lib/polyfills').then(() => import('pdfjs-dist/legacy/build/pdf.mjs')).then((m) => {
      m.GlobalWorkerOptions.workerPort = new Worker(new URL('../lib/pdf-worker.ts', import.meta.url), { type: 'module' });
      return m as unknown as typeof import('pdfjs-dist');
    });
    lib.catch(() => { lib = null; });
  }
  return lib;
}

/** Zaczyna ladowac pdf.js w tle (np. przy wejsciu do warsztatu), zeby arkusz pokazal sie od razu. */
export function preloadPdf() { pdfjs().catch(() => {}); }

/** Kopia pliku z GitHuba przez CDN jsDelivr (szybsza, gdy raw.githubusercontent muli). */
function mirror(url: string) {
  const m = url.match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
  return m ? `https://cdn.jsdelivr.net/gh/${m[1]}/${m[2]}@${m[3]}/${m[4]}` : null;
}

/** Ostra strona PDF: renderowana w rozdzielczosci ekranu (devicePixelRatio), dopiero gdy jest widoczna. */
function Page({ doc, n, width, zoom, rot = 0 }: { doc: PdfDoc; n: number; width: number; zoom: number; rot?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const task = useRef<RenderTask | null>(null);
  const [visible, setVisible] = useState(n <= 2);
  const [ratio, setRatio] = useState(1.414);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!visible || !width) return;
    let cancelled = false;
    const t = setTimeout(() => doc.getPage(n).then(async (page) => {
      if (cancelled || !ref.current) return;
      // pdf.js nie pozwala rysowac na tym samym canvasie dwa razy naraz
      if (task.current) { task.current.cancel(); await task.current.promise.catch(() => {}); task.current = null; }
      if (cancelled || !ref.current) return;
      const base = page.getViewport({ scale: 1 });
      setRatio(base.height / base.width);
      const cssW = width * zoom;
      const dpr = Math.min(3, (window.devicePixelRatio || 1) * 1.25);
      const vp = page.getViewport({ scale: (cssW / base.width) * dpr });
      const c = ref.current;
      c.width = Math.floor(vp.width);
      c.height = Math.floor(vp.height);
      c.style.width = `${cssW}px`;
      c.style.height = `${(cssW * base.height) / base.width}px`;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      const rt = page.render({ canvasContext: ctx, viewport: vp, canvas: c });
      task.current = rt;
      await rt.promise.catch(() => {});
      if (task.current === rt) task.current = null;
    }).catch(() => {}), 60);
    return () => { cancelled = true; clearTimeout(t); task.current?.cancel(); };
  }, [doc, n, width, zoom, visible]);
  const w = width * zoom, h = w * ratio;
  // obrot jak w Edge: strona obraca sie, a miejsce dopasowuje do nowych wymiarow
  return <div data-page={n} className="mx-auto grid place-items-center" style={rot % 180 ? { width: h, height: w } : { width: w, height: h }}>
    <canvas ref={ref} className="block rounded-md bg-white shadow-sm" style={{ width: w, height: h, transform: rot ? `rotate(${rot}deg)` : undefined }} aria-label={`Strona ${n}`} />
  </div>;
}

function PdfViewerInner({ url, fallback, className = '', edge }: { url: string; fallback: string; className?: string; edge?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [err, setErr] = useState(false);
  const [width, setWidth] = useState(0);
  const [zoom, setZoomRaw] = useState(1);
  const [fit, setFit] = useState<'width' | 'page' | null>('width');
  const [rot, setRot] = useState(0);
  const [page, setPage] = useState(1);
  const [pageIn, setPageIn] = useState('1');
  const [ratio, setRatio] = useState(1.414);
  const anchor = useRef<number | null>(null);
  // zmiana powiekszenia z zachowaniem miejsca w dokumencie
  const setZoom = (f: (z: number) => number, keepFit = false) => {
    const el = box.current; if (el) anchor.current = el.scrollTop / Math.max(1, el.scrollHeight);
    setZoomRaw((z) => Math.min(5, Math.max(0.25, +f(z).toFixed(2)))); if (!keepFit) setFit(null);
  };
  const STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];
  const zin = () => setZoom((z) => STEPS.find((x) => x > z + 0.001) ?? 5);
  const zout = () => setZoom((z) => [...STEPS].reverse().find((x) => x < z - 0.001) ?? 0.25);
  const fitPage = () => { const el = box.current; if (!el || !width) return; const r = rot % 180 ? 1 / ratio : ratio; setZoom(() => Math.min(1, (el.clientHeight - 24) / (width * r)), true); setFit('page'); };
  const fitWidth = () => { setZoom(() => 1, true); setFit('width'); };
  useEffect(() => { const el = box.current; if (el && anchor.current !== null) { el.scrollTop = anchor.current * el.scrollHeight; anchor.current = null; } }, [zoom]);
  useEffect(() => { void doc?.getPage(1).then((p) => { const v = p.getViewport({ scale: 1 }); setRatio(v.height / v.width); }); }, [doc]);
  useEffect(() => { if (fit === 'page') fitPage(); }, [width, rot]); // eslint-disable-line react-hooks/exhaustive-deps
  // Ctrl + kolko oraz Ctrl + / - / 0 jak w przegladarce
  useEffect(() => {
    const el = box.current; if (!el) return;
    const wheel = (e: WheelEvent) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); if (e.deltaY < 0) zin(); else zout(); };
    const key = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !el.closest('[data-pdf]')?.contains(document.activeElement ?? null) && !el.matches(':hover')) return;
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zin(); } else if (e.key === '-') { e.preventDefault(); zout(); } else if (e.key === '0') { e.preventDefault(); fitWidth(); }
      else if (e.key === '\\') { e.preventDefault(); if (fit === 'page') fitWidth(); else fitPage(); }
      else if (e.key === ']') { e.preventDefault(); setRot((r) => (r + 90) % 360); } else if (e.key === '[') { e.preventDefault(); setRot((r) => (r + 270) % 360); }
    };
    el.addEventListener('wheel', wheel, { passive: false }); window.addEventListener('keydown', key);
    return () => { el.removeEventListener('wheel', wheel); window.removeEventListener('keydown', key); };
  });
  const onScroll = () => {
    const el = box.current; if (!el) return;
    const mid = el.getBoundingClientRect().top + el.clientHeight / 3;
    let n = 1; el.querySelectorAll<HTMLElement>('[data-page]').forEach((p) => { if (p.getBoundingClientRect().top <= mid) n = Number(p.dataset.page); });
    if (n !== page) { setPage(n); setPageIn(String(n)); }
  };
  const goPage = (n: number) => { const t = box.current?.querySelector<HTMLElement>(`[data-page="${n}"]`); if (t && box.current) box.current.scrollTop = t.offsetTop - 12; };

  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let on = true;
    let task: LoadingTask | null = null;
    setDoc(null); setErr(false);
    // proba 0: GitHub, proba 1: mirror jsDelivr, dalej znowu GitHub
    const alt = mirror(url);
    const src = attempt % 2 === 1 && alt ? alt : url;
    // jesli plik nie przyjdzie w 8 s, przelacz zrodlo zamiast wisiec na "Wczytuje"
    const stall = setTimeout(() => { if (on && attempt < 2) setAttempt((a) => a + 1); }, 8000);
    pdfjs()
      .then((m) => { task = m.getDocument({ url: src }) as unknown as LoadingTask; return task.promise; })
      .then((d) => { clearTimeout(stall); if (on) setDoc(d as PdfDoc); })
      .catch((e) => { clearTimeout(stall); console.warn('PDF:', e); if (!on) return; if (attempt < 2) setAttempt((a) => a + 1); else setErr(true); });
    return () => {
      on = false;
      clearTimeout(stall);
      // zwolnij pamiec dokumentu; nigdy nie rzucaj bledu przy zamykaniu
      try { const r = (task as LoadingTask | null)?.destroy?.(); if (r instanceof Promise) r.catch(() => {}); } catch { /* ignore */ }
    };
  }, [url, attempt]);
  useEffect(() => { setAttempt(0); }, [url]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.max(200, el.clientWidth - 24)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (err) return (
    <div className={`card grid place-items-center p-8 text-center ${className}`}>
      <div><p className="font-bold">Nie udało się wczytać arkusza.</p><button className="btn btn-ghost mt-3 mr-2" onClick={() => setAttempt(0)}>Spróbuj ponownie</button><a className="btn btn-dark mt-3" href={fallback} target="_blank" rel="noreferrer">Otwórz PDF w nowej karcie <ExternalLink size={15} /></a></div>
    </div>
  );
  const pages = doc ? Array.from({ length: doc.numPages }, (_, i) => <Page key={i} doc={doc} n={i + 1} width={width} zoom={zoom} rot={rot} />) : null;
  if (edge) {
    // pasek jak w czytniku PDF w Microsoft Edge
    const ib = 'grid h-8 w-8 place-items-center rounded-[4px] text-[#1a1a1a] hover:bg-black/[.06] disabled:opacity-40';
    return (
      <div data-pdf className={`relative flex flex-col overflow-hidden bg-[#f7f7f7] text-[12px] text-[#1a1a1a] ${className}`}>
        <div className="flex h-10 shrink-0 items-center gap-0.5 border-b border-black/10 bg-[#f7f7f7] px-2">
          <button className={ib} title="Spis treści" disabled><Columns2 size={16} /></button>
          <span className="mx-1 h-5 w-px bg-black/15" />
          <input value={pageIn} onChange={(e) => setPageIn(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => { if (e.key === 'Enter' && doc) { const n = Math.min(doc.numPages, Math.max(1, Number(pageIn) || 1)); setPageIn(String(n)); goPage(n); } }} onBlur={() => setPageIn(String(page))}
            className="h-6 w-9 rounded-[4px] border border-black/15 bg-white text-center outline-none focus:border-[#0067c0]" aria-label="Numer strony" />
          <span className="mx-1 whitespace-nowrap">z {doc?.numPages ?? '…'}</span>
          <span className="mx-1 h-5 w-px bg-black/15" />
          <button className={ib} onClick={zout} title="Pomniejsz (Ctrl+-)"><Minus size={16} /></button>
          <span className="w-11 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <button className={ib} onClick={zin} title="Powiększ (Ctrl++)"><Plus size={16} /></button>
          <span className="mx-1 h-5 w-px bg-black/15" />
          {fit === 'page' ? <button className={ib} onClick={fitWidth} title="Dopasuj do szerokości"><MoveHorizontal size={16} /></button> : <button className={ib} onClick={fitPage} title="Dopasuj do strony (Ctrl+\)"><Maximize2 size={15} /></button>}
          <button className={ib} onClick={() => setRot((r) => (r + 90) % 360)} title="Obróć w prawo (Ctrl+])"><RotateCw size={16} /></button>
          <span className="flex-1" />
          <button className={ib} title="Wyróżnij" disabled><Highlighter size={16} /></button>
          <button className={ib} title="Rysuj" disabled><PenLine size={16} /></button>
          <span className="mx-1 h-5 w-px bg-black/15" />
          <button className={ib} title="Znajdź (Ctrl+F)" disabled><Search size={16} /></button>
          <button className={ib} title="Drukuj (Ctrl+P)" disabled><Printer size={16} /></button>
          <button className={ib} title="Zapisz (Ctrl+S)" disabled><Save size={16} /></button>
        </div>
        <div ref={box} onScroll={onScroll} className="min-h-0 flex-1 overflow-auto bg-[#e6e6e6] p-3">
          {!pages ? <div className="grid h-full place-items-center text-[#555]">Ładowanie…</div> : <div className="w-max min-w-full space-y-3">{pages}</div>}
        </div>
      </div>
    );
  }
  return (
    <div data-pdf className={`card relative flex flex-col overflow-hidden ${className}`}>
      <div className="flex items-center gap-1 border-b border-line bg-surface px-2 py-1.5">
        <span className="mono flex-1 truncate px-1 text-xs text-muted">{doc ? `${page} / ${doc.numPages}` : 'arkusz'}</span>
        <button className="rounded p-1 hover:bg-surface-2" onClick={zout} aria-label="Pomniejsz" title="Pomniejsz (Ctrl+kółko)"><Minus size={15} /></button>
        <span className="mono w-11 text-center text-xs tabular">{Math.round(zoom * 100)}%</span>
        <button className="rounded p-1 hover:bg-surface-2" onClick={zin} aria-label="Powiększ" title="Powiększ (Ctrl+kółko)"><Plus size={15} /></button>
        <button className="rounded p-1 hover:bg-surface-2" onClick={fit === 'page' ? fitWidth : fitPage} aria-label={fit === 'page' ? 'Dopasuj do szerokości' : 'Dopasuj do strony'} title={fit === 'page' ? 'Dopasuj do szerokości' : 'Dopasuj do strony'}>{fit === 'page' ? <MoveHorizontal size={15} /> : <Maximize2 size={14} />}</button>
        <a className="rounded p-1 hover:bg-surface-2" href={fallback} target="_blank" rel="noreferrer" aria-label="Otwórz w nowej karcie"><ExternalLink size={15} /></a>
      </div>
      <div ref={box} onScroll={onScroll} className="min-h-0 flex-1 overflow-auto bg-surface-2 p-3">
        {!pages ? <Loading label="Wczytuję arkusz…" /> : <div className="w-max min-w-full space-y-3">{pages}</div>}
      </div>
    </div>
  );
}

export default function PdfViewer(props: { url: string; fallback: string; className?: string; edge?: boolean }) {
  return (
    <ErrorBoundary resetKey={props.url} fallback={
      <div className={`card grid place-items-center p-8 text-center ${props.className ?? ''}`}>
        <div><p className="font-bold">Ta przeglądarka nie pokazała arkusza w stronie.</p><a className="btn btn-dark mt-3" href={props.fallback} target="_blank" rel="noreferrer">Otwórz PDF w nowej karcie <ExternalLink size={15} /></a></div>
      </div>
    }>
      <PdfViewerInner {...props} />
    </ErrorBoundary>
  );
}
