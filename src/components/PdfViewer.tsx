import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Minus, Plus } from 'lucide-react';
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

/** Ostra strona PDF: renderowana w rozdzielczosci ekranu (devicePixelRatio), dopiero gdy jest widoczna. */
function Page({ doc, n, width, zoom }: { doc: PdfDoc; n: number; width: number; zoom: number }) {
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
  return <canvas ref={ref} className="mx-auto block rounded-md bg-white shadow-sm" style={{ width: width * zoom, height: width * zoom * ratio }} aria-label={`Strona ${n}`} />;
}

function PdfViewerInner({ url, fallback, className = '' }: { url: string; fallback: string; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [err, setErr] = useState(false);
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let on = true;
    let task: LoadingTask | null = null;
    setDoc(null); setErr(false);
    pdfjs()
      .then((m) => { task = m.getDocument({ url }) as unknown as LoadingTask; return task.promise; })
      .then((d) => { if (on) setDoc(d as PdfDoc); })
      .catch((e) => { console.warn('PDF:', e); if (on) setErr(true); });
    return () => {
      on = false;
      // zwolnij pamiec dokumentu; nigdy nie rzucaj bledu przy zamykaniu
      try { const r = (task as LoadingTask | null)?.destroy?.(); if (r instanceof Promise) r.catch(() => {}); } catch { /* ignore */ }
    };
  }, [url]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.max(200, el.clientWidth - 24)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (err) return (
    <div className={`card grid place-items-center p-8 text-center ${className}`}>
      <div><p className="font-bold">Nie udało się wczytać arkusza.</p><a className="btn btn-dark mt-3" href={fallback} target="_blank" rel="noreferrer">Otwórz PDF w nowej karcie <ExternalLink size={15} /></a></div>
    </div>
  );
  return (
    <div className={`card relative flex flex-col overflow-hidden ${className}`}>
      <div className="flex items-center gap-1 border-b border-line bg-surface px-2 py-1.5">
        <span className="mono flex-1 truncate px-1 text-xs text-muted">{doc ? `${doc.numPages} stron` : 'arkusz'}</span>
        <button className="rounded p-1 hover:bg-surface-2" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))} aria-label="Pomniejsz"><Minus size={15} /></button>
        <span className="mono w-11 text-center text-xs tabular">{Math.round(zoom * 100)}%</span>
        <button className="rounded p-1 hover:bg-surface-2" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)))} aria-label="Powiększ"><Plus size={15} /></button>
        <a className="rounded p-1 hover:bg-surface-2" href={fallback} target="_blank" rel="noreferrer" aria-label="Otwórz w nowej karcie"><ExternalLink size={15} /></a>
      </div>
      <div ref={box} className="min-h-0 flex-1 overflow-auto bg-surface-2 p-3">
        {!doc ? <Loading label="Wczytuję arkusz…" /> : (
          <div className="space-y-3">{Array.from({ length: doc.numPages }, (_, i) => <Page key={i} doc={doc} n={i + 1} width={width} zoom={zoom} />)}</div>
        )}
      </div>
    </div>
  );
}

export default function PdfViewer(props: { url: string; fallback: string; className?: string }) {
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
