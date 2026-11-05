import { Link, useParams } from 'react-router';
import { ExternalLink, ShieldCheck, FileText } from 'lucide-react';
import { useContent } from '../lib/data';
import Workshop from '../components/Workshop';
import { Loading, PageHeader } from '../components/ui';

export default function WorkshopPage() {
  const { code } = useParams();
  const c = useContent();
  if (code && !c) return <Loading />;
  const sheet = code ? c?.sheets.find((s) => s.code === code) : undefined;
  return (
    <div>
      <PageHeader eyebrow={sheet ? `Warsztat · ${sheet.code}` : 'Warsztat · wolny projekt'} title={sheet ? sheet.title : 'Warsztat'} right={sheet && (
        <div className="flex flex-wrap gap-2">
          <a className="btn btn-ghost" href={sheet.files.pdfView} target="_blank" rel="noreferrer"><FileText size={16} />Arkusz PDF <ExternalLink size={14} /></a>
          <Link className="btn btn-dark" to={`/sprawdzarka?code=${encodeURIComponent(sheet.code)}`}><ShieldCheck size={16} />Sprawdź</Link>
        </div>
      )}>
        Edytor z podglądem na żywo, konsolą i bazą SQLite w przeglądarce. Przeciągnij tu grafiki i zrzut <code className="inline-code">.sql</code> z archiwum arkusza. Wszystko zapisuje się automatycznie.
      </PageHeader>
      <Workshop storageKey={sheet ? `sheet:${sheet.code}` : 'free'} sheet={sheet} />
    </div>
  );
}
