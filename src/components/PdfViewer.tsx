import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Loading } from './ui';

/** Pobiera PDF (CORS ok na raw.githubusercontent.com) i pokazuje we wbudowanej przegladarce PDF. */
export default function PdfViewer({ url, fallback, className = '' }: { url: string; fallback: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let revoked: string | null = null;
    let on = true;
    setSrc(null); setErr(false);
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.arrayBuffer(); })
      .then((b) => { if (!on) return; const u = URL.createObjectURL(new Blob([b], { type: 'application/pdf' })); revoked = u; setSrc(u); })
      .catch(() => on && setErr(true));
    return () => { on = false; if (revoked) URL.revokeObjectURL(revoked); };
  }, [url]);
  if (err) return (
    <div className={`card grid place-items-center p-8 text-center ${className}`}>
      <div><p className="font-bold">Nie udało się osadzić PDF.</p><a className="btn btn-dark mt-3" href={fallback} target="_blank" rel="noreferrer">Otwórz PDF w nowej karcie <ExternalLink size={15} /></a></div>
    </div>
  );
  if (!src) return <div className={`card ${className}`}><Loading label="Pobieram arkusz PDF…" /></div>;
  return (
    <div className={`card overflow-hidden ${className}`}>
      <object data={src} type="application/pdf" className="h-full w-full">
        <div className="p-6 text-center"><p>Twoja przeglądarka nie pokazuje PDF w stronie.</p><a className="btn btn-dark mt-3" href={fallback} target="_blank" rel="noreferrer">Otwórz PDF <ExternalLink size={15} /></a></div>
      </object>
    </div>
  );
}
