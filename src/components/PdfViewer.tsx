import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Minus, Plus } from 'lucide-react';
import { Loading } from './ui';

type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPage>; destroy: () => void };
type PdfPage = { getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown; canvas?: HTMLCanvasElement }) => { promise: Promise<void> } };

let lib: Promise<typeof import('pdfjs-dist')> | null = null;
function pdfjs() {
  if (!lib) {
    lib = Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(([m, w]) => {
      m.GlobalWorkerOptions.workerSrc = w.default;
      return m;
    });
  }
  return lib;
}

/** Ostra strona PDF: renderowana w rozdzielczosci ekranu (devicePixelRatio), dopiero gdy jest widoczna. */
function Page({ doc, n, width, zoom }: { doc: PdfDoc; n: number; width: number; zoom: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
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
    doc.getPage(n).then((page) => {
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
      const ctx = c.getContext('2d')!;
      page.render({ canvasContext: ctx, viewport: vp, canvas: c });
    });
    return () => { cancelled = true; };
  }, [doc, n, width, zoom, visible]);
  return <canvas ref={ref} className="mx-auto block rounded-md bg-white shadow-sm" style={{ width: width * zoom, height: width * zoom * ratio }} aria-label={`Strona ${n}`} />;
}

export default function PdfViewer({ url, fallback, className = '' }: { url: string; fallback: string; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [err, setErr] = useState(false);
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let on = true;
    let loaded: PdfDoc | null = null;
    setDoc(null); setErr(false);
    pdfjs()
      .then((m) => m.getDocument({ url }).promise)
      .then((d) => { loaded = d as unknown as PdfDoc; if (on) setDoc(loaded); })
      .catch(() => on && setErr(true));
    return () => { on = false; loaded?.destroy(); };
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
