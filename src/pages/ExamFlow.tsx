import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Check, Clock, Copy, Eye, EyeOff, FileText, ListOrdered, Monitor } from 'lucide-react';
import { useContent } from '../lib/data';
import { loadReqs, type Reqs } from '../lib/examiner';
import { Loading } from '../components/ui';

/** `kod` w opisach */
function T({ s }: { s: string }) {
  return <>{s.split(/(`[^`]+`)/g).map((p, i) => p.startsWith('`') && p.length > 2 ? <code key={i} className="mono rounded bg-surface-2 px-1 py-0.5 text-[0.85em]">{p.slice(1, -1)}</code> : p)}</>;
}

type Step = { title: string; time: string; items: string[]; extra?: React.ReactNode };

export default function ExamFlow({ code: fixed, embedded }: { code?: string; embedded?: boolean } = {}) {
  const params = useParams();
  const code = fixed ?? params.code ?? '';
  const c = useContent();
  const [reqs, setReqs] = useState<Reqs | null | undefined>(undefined);
  const [showPass, setShowPass] = useState(false);
  const key = `p03:flow:${code}`;
  const [done, setDone] = useState<number[]>(() => { try { return JSON.parse(localStorage.getItem(key) ?? '[]'); } catch { return []; } });
  useEffect(() => { void loadReqs().then((r) => setReqs(r[code] ?? null)).catch(() => setReqs(null)); }, [code]);
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(done)); } catch { /* */ } }, [key, done]);
  if (!c || reqs === undefined) return <Loading />;
  const sheet = c.sheets.find((s) => s.code === code);
  if (!sheet) return <div className="card p-8">Nie ma arkusza {code}. <Link to="/arkusze" className="underline">Wróć do katalogu</Link></div>;

  const f = sheet.files;
  const arch = f.archiveUrl?.split('/').pop() ?? 'pliki1.7z';
  const unpacked = arch.replace(/\.\w+$/, '');
  const db = reqs?.dbName;
  const sql = sheet.assets?.sql;
  const shots = reqs?.shots ?? [];
  const imp = shots.find((s) => s.import);
  const kw = shots.filter((s) => !s.import);
  const files = reqs?.files ?? [];
  const pages = files.filter((n) => /\.(php|html?)$/i.test(n));
  const gfx = reqs?.graphics ?? [];
  const gfxCount = reqs?.graphicsCount ?? sheet.assets?.files.length ?? 0;
  const hasGfx = gfx.length > 0;
  const list = (xs: string[]) => xs.map((x) => `\`${x}\``).join(', ');

  const steps: Step[] = [
    { title: 'Przeczytaj arkusz od początku do końca', time: '5–10 min', items: [
      'Zanim cokolwiek klikniesz, przeczytaj całe zadanie. Zaznacz nazwy plików, nazwy bazy, kolory i teksty, które trzeba przepisać dokładnie.',
      files.length ? `Na koniec w folderze mają być: ${list(files)}.` : 'Wypisz sobie na kartce wszystkie pliki, które masz oddać.',
      'Zaplanuj kolejność: najpierw baza i kwerendy (łatwe punkty), potem grafika, na końcu strona i skrypt.',
    ] },
    { title: 'Załóż folder z numerem na pulpicie', time: '1 min', items: [
      'Prawy przycisk na pulpicie → Nowy → Folder. Nazwa to Twój numer PESEL (albo inny numer z arkusza).',
      'Do tego folderu trafi wszystko, co oddajesz. Egzaminator ocenia tylko jego zawartość.',
    ] },
    { title: `Rozpakuj ${arch}`, time: '2 min', items: [
      `Prawy przycisk na \`${arch}\` → 7-Zip → Wypakuj do "${unpacked}\\" (albo Wyodrębnij wszystko...).`,
      f.archivePassword ? 'Archiwum jest na hasło, podane w arkuszu. Wielkość liter ma znaczenie.' : 'Archiwum nie ma hasła.',
      sheet.assets?.files.length ? `W środku: ${list([...sheet.assets.files.filter((x) => !x.startsWith('_')), ...(sql ? [sql] : [])])}.` : 'W środku są grafiki i plik bazy.',
    ], extra: f.archivePassword && (
      <div className="mt-2 flex items-center gap-2 rounded-lg bg-surface-2 p-2 text-sm">
        <span className="text-muted">Hasło:</span><code className="mono flex-1 truncate font-semibold">{showPass ? f.archivePassword : '••••••••'}</code>
        <button className="rounded p-1 hover:bg-surface" onClick={() => setShowPass((x) => !x)} aria-label={showPass ? 'Ukryj hasło' : 'Pokaż hasło'}>{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>
        {showPass && <button className="rounded p-1 hover:bg-surface" onClick={() => navigator.clipboard?.writeText(f.archivePassword!)} aria-label="Kopiuj hasło"><Copy size={16} /></button>}
      </div>
    ) },
    { title: 'Uruchom XAMPP', time: '1 min', items: [
      'Otwórz XAMPP Control Panel i kliknij Start przy Apache i MySQL. Oba wiersze mają się zrobić zielone.',
      'Przy MySQL kliknij Admin, otworzy się phpMyAdmin (`localhost/phpmyadmin`).',
      'Bez Apache nie zadziała żadna strona z `localhost`, bez MySQL połączenie z bazą w PHP zwróci błąd.',
    ] },
    { title: db ? `Utwórz bazę ${db} i zaimportuj dane` : 'Utwórz bazę i zaimportuj dane', time: '3–5 min', items: [
      `W phpMyAdmin: Nowa → nazwa ${db ? `\`${db}\`` : 'z arkusza'} → kodowanie \`utf8mb4_unicode_ci\` (albo to z arkusza) → Utwórz.`,
      `Wejdź w nową bazę → Import → wybierz ${sql ? `\`${sql}\`` : 'plik .sql'} z rozpakowanego folderu → Importuj.`,
      imp ? `Zrób zrzut całego ekranu z komunikatem o udanym imporcie i zapisz go jako \`${imp.name}.${imp.ext}\` w folderze z numerem.` : 'Sprawdź, czy tabele pojawiły się w drzewku po lewej.',
    ] },
    { title: kw.length ? `Kwerendy (${kw.length}) i zrzuty` : 'Kwerendy', time: '15–25 min', items: [
      'Zakładka SQL w bazie. Każdą kwerendę uruchom i sprawdź wynik, zanim przejdziesz dalej.',
      kw.length ? `Po każdej kwerendzie zrzut całego ekranu z wynikiem: ${list(kw.map((s) => `${s.name}.${s.ext}`))}. Zrzut → Paint (Ctrl+V) → Zapisz jako w odpowiednim formacie.` : 'Zrób zrzuty wyników, jeśli arkusz ich wymaga.',
      'Treść wszystkich kwerend wklej do `kwerendy.txt` w kolejności z arkusza (Notatnik).',
    ] },
    ...(hasGfx || gfxCount ? [{ title: 'Grafika', time: '10–15 min', items: [
      ...(hasGfx ? gfx.map((g) => g.text.length > 220 ? g.text.slice(0, 220) + '…' : g.text) : [`Arkusz ma ${gfxCount} plików graficznych. Sprawdź, czy któryś trzeba przerobić (wymiary, przezroczystość, GIF).`]),
      'Otwórz plik w GIMP albo Photoshopie, zrób to, co każe arkusz, i wyeksportuj pod dokładną nazwą z arkusza do folderu z numerem.',
    ] }] : []),
    { title: 'Strona internetowa', time: '60–80 min', items: [
      pages.length ? `Pliki strony: ${list(pages)}. Pisz je w Notepad++ albo VS Code i zapisuj w \`C:\\xampp\\htdocs\`.` : 'Pliki strony zapisuj w `C:\\xampp\\htdocs`.',
      'Grafiki potrzebne stronie skopiuj obok plików strony, żeby ścieżki się zgadzały.',
      'Sprawdzaj w przeglądarce przez `localhost/nazwa.php`, nie przez otwarcie pliku z dysku (wtedy PHP się nie wykona).',
      'Skrypt PHP: `mysqli_connect`, `mysqli_query`, pętla po wynikach, `mysqli_close` na końcu.',
      ...(reqs?.author ? ['W stopce wpisz autora strony tak, jak każe arkusz.'] : []),
    ] },
    { title: 'Oddanie pracy', time: '5 min', items: [
      'Skopiuj gotowe pliki strony z `htdocs` do folderu z numerem.',
      'Utwórz `przeglądarka.txt` z nazwą przeglądarki, w której sprawdzałeś stronę (np. Microsoft Edge).',
      files.length ? `Porównaj zawartość folderu z listą: ${list(files)}. Nazwy i rozszerzenia muszą się zgadzać co do litery.` : 'Porównaj zawartość folderu z listą z arkusza.',
    ] },
  ];
  const toggle = (i: number) => setDone((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));

  return (
    <div className={embedded ? '' : 'mx-auto max-w-3xl'}>
      {!embedded && <Link to={`/arkusze/${encodeURIComponent(code)}`} className="inline-flex items-center gap-1 text-sm text-muted hover:underline"><ArrowLeft size={14} />{code}</Link>}
      <p className="eyebrow mt-3">{embedded ? `${code} · krok po kroku` : 'Jak rozwiązać egzamin krok po kroku'}</p>
      <h1 className="display text-2xl font-extrabold md:text-3xl">{sheet.title}</h1>
      <p className="mt-1 text-muted">Kolejność pracy na stanowisku egzaminacyjnym dla tego arkusza. Odhaczaj kroki, zapamiętujemy postęp.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to={`/pulpit/${encodeURIComponent(code)}`} className="btn btn-primary"><Monitor size={16} />Ćwicz na pulpicie</Link>
        {f.solutionUrl && <Link to={`/arkusze/${encodeURIComponent(code)}/rozwiazanie`} className="btn btn-ghost"><ListOrdered size={16} />Rozwiązanie zadania</Link>}
        <a href={f.pdfView} target="_blank" rel="noreferrer" className="btn btn-ghost"><FileText size={16} />Arkusz PDF</a>
      </div>
      <p className="mt-4 text-sm text-muted">Zrobione: <b className="text-ink">{done.length}/{steps.length}</b></p>
      <ol className="mt-3 space-y-3">
        {steps.map((s, i) => {
          const ok = done.includes(i);
          return (
            <li key={i} className={`card p-5 ${ok ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <button onClick={() => toggle(i)} aria-pressed={ok} aria-label={ok ? 'Odznacz krok' : 'Oznacz jako zrobione'} className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-sm font-bold ${ok ? 'border-success bg-success text-white' : 'border-line'}`}>{ok ? <Check size={15} /> : i + 1}</button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-lg font-bold">{s.title}</h2><span className="inline-flex items-center gap-1 text-xs text-muted"><Clock size={12} />{s.time}</span></div>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">{s.items.map((t, k) => <li key={k}><T s={t} /></li>)}</ul>
                  {s.extra}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
