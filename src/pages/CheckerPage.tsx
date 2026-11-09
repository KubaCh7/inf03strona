import { useSearchParams, Link } from 'react-router';
import { useContent } from '../lib/data';
import { useStore } from '../lib/store';
import { Loading, PageHeader } from '../components/ui';
import SheetChecker from '../components/SheetChecker';

export default function CheckerPage() {
  const c = useContent();
  const [sp, setSp] = useSearchParams();
  const setSheet = useStore((s) => s.setSheet);
  const addXp = useStore((s) => s.addXp);
  if (!c) return <Loading />;
  const code = sp.get('code') ?? '';
  const sheet = c.sheets.find((s) => s.code === code);
  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow="Egzamin · trening" title="Sprawdzarka">
        Wybierz arkusz. Sprawdzarka bierze pliki z warsztatu (albo wgrane przez Ciebie), szuka elementów, których wymaga zadanie, i liczy wynik treningowy z progiem 75%.
      </PageHeader>
      <div className="card mb-4 p-4">
        <label className="eyebrow mb-2 block" htmlFor="sheet-sel">Arkusz</label>
        <select id="sheet-sel" className="input" value={code} onChange={(e) => setSp({ code: e.target.value })}>
          <option value="">Wybierz…</option>
          <optgroup label="INF.03">{c.sheets.filter((s) => s.qualification === 'INF.03').map((s) => <option key={s.code} value={s.code}>{s.code} · {s.title}</option>)}</optgroup>
          <optgroup label="Starsze: EE.09 i E.14">{c.sheets.filter((s) => s.qualification !== 'INF.03').map((s) => <option key={s.code} value={s.code}>{s.code} · {s.title}</option>)}</optgroup>
        </select>
        {sheet && <p className="mt-2 text-sm"><Link className="text-accent underline" to={`/arkusze/${encodeURIComponent(sheet.code)}`}>Otwórz arkusz</Link> · <Link className="text-accent underline" to={`/warsztat/${encodeURIComponent(sheet.code)}`}>Warsztat</Link></p>}
      </div>
      {sheet && <SheetChecker sheet={sheet} onScore={(pct) => { setSheet(sheet.code, { status: 'done', score: pct }); if (pct >= 75) addXp(50); alert(`Zapisano wynik ${pct}%.`); }} />}
    </div>
  );
}
