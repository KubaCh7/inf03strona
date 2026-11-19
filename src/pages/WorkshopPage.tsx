import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import EnvChoice from '../components/EnvChoice';
import type { Sheet } from '../lib/types';
import { ExternalLink, ShieldCheck, FileText } from 'lucide-react';
import { useContent } from '../lib/data';
import Workshop from '../components/Workshop';
import { Loading, PageHeader } from '../components/ui';

export default function WorkshopPage() {
  const { code } = useParams();
  const c = useContent();
  if (code && !c) return <Loading />;
  const sheet = code ? c?.sheets.find((s) => s.code === code) : undefined;
  return <WorkshopFor sheet={sheet} />;
}

function WorkshopFor({ sheet }: { sheet?: Sheet }) {
  const nav = useNavigate();
  const key = sheet ? `p03:env:${sheet.code}` : '';
  const [chosen, setChosen] = useState(() => { try { return !sheet || sessionStorage.getItem(key) === 'workshop'; } catch { return !sheet; } });
  if (sheet && !chosen) return <EnvChoice title={`${sheet.code} · ${sheet.title}`} onDesktop={() => nav(`/pulpit/${encodeURIComponent(sheet.code)}`)} onWorkshop={() => { try { sessionStorage.setItem(key, 'workshop'); } catch { /* */ } setChosen(true); }} />;
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
      <Workshop key={sheet ? `sheet:${sheet.code}` : 'free'} storageKey={sheet ? `sheet:${sheet.code}` : 'free'} sheet={sheet} />
    </div>
  );
}
