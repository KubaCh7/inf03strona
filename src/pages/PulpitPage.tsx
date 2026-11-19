import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useContent } from '../lib/data';
import { Loading } from '../components/ui';
import Desktop from '../components/desktop/Desktop';

/** Pulpit egzaminacyjny do cwiczen (bez zegara egzaminu). */
export default function PulpitPage() {
  const { code = '' } = useParams();
  const c = useContent();
  const nav = useNavigate();
  const endsAt = useMemo(() => { const k = `p03:pulpit:${code}`; let v = 0; try { v = Number(localStorage.getItem(k)) || 0; if (!v || v < Date.now()) { v = Date.now() + 150 * 60000; localStorage.setItem(k, String(v)); } } catch { v = Date.now() + 150 * 60000; } return v; }, [code]);
  if (!c) return <Loading />;
  const sheet = c.sheets.find((s) => s.code === code);
  if (!sheet) return <div className="card p-8">Nie ma arkusza {code}.</div>;
  let cand = '00000000000'; try { cand = localStorage.getItem('p03:candidate') || cand; } catch { /* */ }
  return <Desktop sheet={sheet} attempt={`pulpit:${code}`} candidate={cand} endsAt={endsAt} onFinish={() => nav(`/sprawdzarka?code=${encodeURIComponent(code)}&pulpit=1`)} onAbort={() => nav(`/arkusze/${encodeURIComponent(code)}`)} />;
}
