import { useMemo, useState } from 'react';
import Login from '../components/desktop/Login';
import { useNavigate, useParams } from 'react-router';
import { useContent } from '../lib/data';
import { Loading } from '../components/ui';
import Desktop from '../components/desktop/Desktop';
import { dropAttempt } from '../lib/vfs';

/** Pulpit egzaminacyjny do cwiczen (bez zegara egzaminu). */
export default function PulpitPage() {
  const { code = '' } = useParams();
  const c = useContent();
  const nav = useNavigate();
  const [cand, setCand] = useState<string | null>(() => { try { return sessionStorage.getItem(`p03:pulpit-login:${code}`); } catch { return null; } });
  const endsAt = useMemo(() => { const k = `p03:pulpit:${code}`; let v = 0; try { v = Number(localStorage.getItem(k)) || 0; if (!v || v < Date.now()) { v = Date.now() + 150 * 60000; localStorage.setItem(k, String(v)); } } catch { v = Date.now() + 150 * 60000; } return v; }, [code]);
  if (!c) return <Loading />;
  const sheet = c.sheets.find((s) => s.code === code);
  if (!sheet) return <div className="card p-8">Nie ma arkusza {code}.</div>;
  if (!cand) return <Login onLogin={(n) => { try { sessionStorage.setItem(`p03:pulpit-login:${code}`, n); } catch { /* */ } setCand(n); }} />;
  return <Desktop sheet={sheet} attempt={`pulpit:${code}`} candidate={cand} endsAt={endsAt} onFinish={() => nav(`/sprawdzarka?code=${encodeURIComponent(code)}&pulpit=1`)} onAbort={() => nav(`/arkusze/${encodeURIComponent(code)}`)}
    onRestart={() => void dropAttempt(`pulpit:${code}`).then(() => { try { localStorage.removeItem(`p03:pulpit:${code}`); sessionStorage.removeItem(`p03:pulpit-login:${code}`); } catch { /* */ } window.location.reload(); })} />;
}
