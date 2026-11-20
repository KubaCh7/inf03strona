import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { GraduationCap, Play, RotateCcw, MousePointerClick, CheckCircle2, Lightbulb, Monitor } from 'lucide-react';
import { useContent } from '../lib/data';
import { Loading } from '../components/ui';
import Login from '../components/desktop/Login';
import Desktop from '../components/desktop/Desktop';
import { dropAttempt } from '../lib/vfs';

/** Jeden arkusz do nauki obslugi stanowiska. Ma gotowe rozwiazanie, wiec asystent podpowie kazdy krok. */
export const TUTORIAL_SHEET = 'INF.03-01-26.06-SG';
const ATTEMPT = 'samouczek';

/** Samouczek dla poczatkujacych: caly egzamin na pulpicie, trener prowadzi krok po kroku. */
export default function Tutorial() {
  const c = useContent();
  const nav = useNavigate();
  const [run, setRun] = useState<'intro' | 'login' | 'desk'>(() => { try { return sessionStorage.getItem('p03:tut-cand') ? 'desk' : 'intro'; } catch { return 'intro'; } });
  const [cand, setCand] = useState(() => { try { return sessionStorage.getItem('p03:tut-cand') ?? ''; } catch { return ''; } });
  const endsAt = useMemo(() => Date.now() + 150 * 60000, []);
  const started = (() => { try { return !!localStorage.getItem(`p03:coach:${ATTEMPT}`); } catch { return false; } })();
  if (!c) return <Loading />;
  const sheet = c.sheets.find((s) => s.code === TUTORIAL_SHEET);
  if (!sheet) return <div className="card p-8">Brak arkusza samouczka.</div>;

  if (run === 'login') return <Login onLogin={(n) => { try { sessionStorage.setItem('p03:tut-cand', n); } catch { /* */ } setCand(n); setRun('desk'); }} />;
  if (run === 'desk') return <Desktop sheet={sheet} attempt={ATTEMPT} candidate={cand || '12345678901'} endsAt={endsAt} coach
    onFinish={() => { try { sessionStorage.removeItem('p03:tut-cand'); } catch { /* */ } nav(`/sprawdzarka?code=${encodeURIComponent(sheet.code)}&pulpit=1&attempt=${ATTEMPT}`); }}
    onAbort={() => { try { sessionStorage.removeItem('p03:tut-cand'); } catch { /* */ } setRun('intro'); }}
    onRestart={() => void dropAttempt(ATTEMPT).then(() => { try { sessionStorage.removeItem('p03:tut-cand'); } catch { /* */ } window.location.reload(); })} />;

  const restart = async () => {
    await dropAttempt(ATTEMPT);
    try { for (const k of Object.keys(localStorage)) if (k.startsWith(`p03:coach:${ATTEMPT}`) || k.includes(`:${ATTEMPT}`)) localStorage.removeItem(k); } catch { /* */ }
    setRun('login');
  };
  return (
    <div className="mx-auto max-w-4xl">
      <div className="overflow-hidden rounded-2xl border border-[#16a34a]/30 bg-gradient-to-br from-[#f0fdf4] to-[#dcfce7] p-8 dark:from-[#0f2a1a] dark:to-[#123821]">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#15803d] dark:text-[#4ade80]"><GraduationCap size={18} />Samouczek dla początkujących</p>
        <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">Twój pierwszy egzamin INF.03, krok po kroku</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">Przejdziesz cały egzamin na symulowanym stanowisku z Windows 11: od pierwszego kliknięcia do oddania pracy. Trener w rogu ekranu mówi, co zrobić, podświetla, gdzie kliknąć, i sam zalicza krok, kiedy go wykonasz. Nic nie musisz umieć wcześniej.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={() => setRun(started ? 'desk' : 'login')} className="btn btn-primary !bg-[#16a34a] !text-white hover:!bg-[#15803d]"><Play size={16} />{started ? 'Kontynuuj samouczek' : 'Zacznij samouczek'}</button>
          {started && <button onClick={() => void restart()} className="btn btn-ghost"><RotateCcw size={16} />Zacznij od nowa</button>}
        </div>
        <p className="mt-3 text-xs text-muted">Arkusz: {sheet.code} „{sheet.title}”. Na ekranie logowania wpisz dowolny numer, np. 12345678901.</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[[MousePointerClick, 'Prowadzi za rękę', 'Każdy krok ma krótką instrukcję i zielone podświetlenie miejsca, które trzeba kliknąć.'],
          [CheckCircle2, 'Sam sprawdza', 'Nie klikasz „dalej”: gdy utworzysz folder, uruchomisz XAMPP albo zapiszesz plik, krok zalicza się sam.'],
          [Lightbulb, 'Pomaga, gdy utkniesz', 'Wskazówki przy krokach i asystent z gotowym rozwiązaniem tego arkusza (najpierw podpowiedź, kod na życzenie).']].map(([I, t, d]) => {
          const Ic = I as typeof Play;
          return <div key={t as string} className="card p-5"><Ic size={22} className="text-[#16a34a]" /><p className="mt-2 font-bold">{t as string}</p><p className="mt-1 text-sm text-muted">{d as string}</p></div>;
        })}
      </div>

      <div className="card mt-6 p-6">
        <p className="eyebrow mb-3">Czego się nauczysz</p>
        <ol className="grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
          {['Czytanie arkusza i plan pracy', 'Folder z numerem PESEL', 'Rozpakowanie archiwum z hasłem (7-Zip)', 'Uruchomienie XAMPP: Apache i MySQL', 'Baza danych i import w phpMyAdmin', 'Kwerendy SQL i zrzuty ekranu w Paint', 'Plik kwerendy.txt', 'Strona w VS Code w folderze htdocs', 'Styl CSS według arkusza', 'Sprawdzenie strony przez localhost', 'Kopiowanie plików do folderu i przeglądarka.txt', 'Oddanie pracy i wynik jak u egzaminatora'].map((t, i) => (
            <li key={t} className="flex items-center gap-2"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#dcfce7] text-xs font-bold text-[#15803d]">{i + 1}</span>{t}</li>))}
        </ol>
        <p className="mt-4 flex items-center gap-2 text-sm text-muted"><Monitor size={15} />Najlepiej na komputerze z dużym ekranem. Samouczek zapisuje postęp, możesz wrócić później.</p>
      </div>
    </div>
  );
}
