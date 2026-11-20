import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, GraduationCap, Check, SkipForward, Lightbulb, PartyPopper } from 'lucide-react';
import { useOS, type AppId } from './os';
import { useDragBox } from './ui';
import { loadReqs, type Reqs } from '../../lib/examiner';
import { fetchSolution, parseKwerendy } from '../../lib/walkthrough';
import { base, DESKTOP, HTDOCS } from '../../lib/vfs';

type Ctx = { os: ReturnType<typeof useOS>; reqs: Reqs | null; apps: AppId[]; navs: string[]; folder: string | null; sol: Record<string, string> | null; clipChanged: boolean };
/** Podkrok: co kliknac (podswietlenie) albo co wpisac. Bez `done` uznany za zrobiony, gdy widac cel nastepnego podkroku. */
type Micro = { text: string; target?: string; type?: string; done?: () => boolean };
type CStep = { title: string; text: string[]; tip?: string[]; target?: string; done: (c: Ctx) => boolean; micro?: Micro[]; code?: { label: string; value: string } };

const q = (sel: string) => document.querySelector<HTMLElement>(sel);
const vis = (sel: string) => { const e = q(sel); return !!e && e.getBoundingClientRect().width > 0; };
const val = (sel: string) => (q(sel) as HTMLInputElement | null)?.value ?? '';
const optText = (sel: string) => (q(sel) as HTMLSelectElement | null)?.selectedOptions?.[0]?.text ?? '';
export function currentMicro(ms: Micro[]): number {
  for (let i = 0; i < ms.length; i++) { const m = ms[i]; const d = m.done ? m.done() : !!ms[i + 1]?.target && vis(ms[i + 1].target!); if (!d) return i; }
  return ms.length - 1;
}
/** Zrzut ekranu krok po kroku: Zrzut ekranu → pelny ekran → Paint → Ctrl+V, Ctrl+S → folder → nazwa → typ → Zapisz. */
function shotMicros(c: Ctx, name: string, ext: string): Micro[] {
  const fold = c.folder ? base(c.folder) : '';
  const fmt = ext.toLowerCase() === 'png' ? 'PNG' : 'JPEG';
  return [
    { text: 'Kliknij „Zrzut ekranu” na pasku zadań.', target: '[data-coach="shot"]', done: () => vis('button[title="Tryb pełnoekranowy"]') || c.clipChanged },
    { text: 'Wybierz „Tryb pełnoekranowy” (ikona monitora), a potem kliknij w dowolnym miejscu ekranu.', target: 'button[title="Tryb pełnoekranowy"]', done: () => c.clipChanged },
    { text: 'Otwórz menu Start i kliknij Paint.', target: 'button[title="Start"]', done: () => c.apps.includes('paint') },
    { text: 'W Paint naciśnij Ctrl+V (wklei zrzut), a potem Ctrl+S (zapisz).', done: () => vis('[data-coach="fd-name"]') },
    { text: `W oknie zapisu kliknij dwa razy folder „${fold}”. Jeśli go nie widać, wybierz najpierw „Pulpit” po lewej.`, target: `[data-fd="${fold}"]`, done: () => vis('[data-coach="fd-name"]') && !vis(`[data-fd="${fold}"]`) },
    { text: 'W polu „Nazwa pliku” wpisz:', type: name, target: '[data-coach="fd-name"]', done: () => val('[data-coach="fd-name"]').replace(/\.\w+$/, '') === name },
    { text: `W „Zapisz jako typ” wybierz ${fmt}.`, target: '[data-coach="fd-type"]', done: () => optText('[data-coach="fd-type"]').toUpperCase().includes(fmt) },
    { text: 'Kliknij „Zapisz”.', target: '[data-coach="fd-ok"]' },
  ];
}

/** Kroki samouczka: jeden egzamin od poczatku do konca, opisy dla poczatkujacych. Postep wykrywany ze stanu maszyny. */
function makeSteps(c: Ctx): CStep[] {
  const { os, reqs } = c;
  const arch = (os.sheet.files.archiveUrl ?? 'pliki1.7z').split('/').pop() ?? 'pliki1.7z';
  const db = reqs?.dbName ?? 'baza';
  const sql = os.sheet.assets?.sql ?? 'plik .sql';
  const shots = reqs?.shots ?? [];
  const imp = shots.find((s) => s.import); const kw = shots.filter((s) => !s.import);
  const pages = (reqs?.files ?? []).filter((f) => /\.(php|html?)$/i.test(f));
  const css = (reqs?.files ?? []).find((f) => /\.css$/i.test(f));
  const inFolder = (n: string) => !!c.folder && os.vfs.tree(c.folder).some((f) => base(f.path) === n);
  const inHt = (n: string, min = 0) => os.vfs.tree(HTDOCS).some((f) => base(f.path).toLowerCase() === n.toLowerCase() && (f.node.data ?? '').length > min);
  const tables = () => { const d = os.server.get(db); if (!d) return 0; try { return Number(d.exec("SELECT count(*) FROM sqlite_master WHERE type='table'")[0]?.values[0][0] ?? 0); } catch { return 0; } };
  const st: CStep[] = [
    { title: 'Poznaj arkusz', text: ['Na egzaminie wszystko zaczyna się od arkusza. Otwórz „Arkusz egzaminacyjny.pdf” na pulpicie (dwuklik).', 'Przeczytaj go raz w całości. Nie musisz wszystkiego rozumieć, zobacz tylko, co trzeba oddać.'], tip: ['Arkusz możesz powiększać przyciskami − i + na górze albo Ctrl + kółko myszy.'], target: '[data-icon="pdf"]', done: (x) => x.apps.includes('pdf') },
    { title: 'Załóż folder z numerem', text: ['Kliknij prawym przyciskiem na pustym miejscu pulpitu → Nowy → Folder.', 'Nazwij go swoim numerem PESEL (same cyfry) i naciśnij Enter. To jedyny folder, który ocenia egzaminator.'], tip: ['W samouczku może być dowolny numer, np. 12345678901.'], done: (x) => !!x.folder },
    { title: 'Rozpakuj pliki z arkusza', text: [`Kliknij prawym przyciskiem na „${arch}” → 7-Zip → Wypakuj do "${arch.replace(/\.\w+$/, '')}\\".`, 'Archiwum jest na hasło. Hasło znajdziesz w treści arkusza.'], tip: [`Hasło do tego arkusza: ${os.sheet.files.archivePassword ?? 'brak'}. Na prawdziwym egzaminie szukasz go w PDF.`], target: `[data-icon$="${arch}"]`, done: () => { const a = (os.sheet.assets?.files ?? []).filter((f) => !f.startsWith('_')); return !a.length || a.some((f) => [...os.vfs.nodes.keys()].some((k) => k.endsWith('/' + f) && !k.includes('/AppData/'))); } },
    { title: 'Uruchom serwer XAMPP', text: ['Otwórz „XAMPP Control Panel” z pulpitu.', 'Kliknij Start przy Apache i przy MySQL. Gdy nazwy zrobią się zielone, serwer działa.'], tip: ['Apache wyświetla strony (localhost), MySQL przechowuje bazę danych. Bez nich ani phpMyAdmin, ani PHP nie zadziała.'], target: '[data-icon="xampp"]', done: () => os.server.apache && os.server.mysql },
    { title: 'Otwórz phpMyAdmin', text: ['W XAMPP kliknij Admin w wierszu MySQL. Otworzy się przeglądarka z phpMyAdmin, czyli panelem do bazy danych.'], tip: ['Ten sam panel otworzysz, wpisując w Edge adres localhost/phpmyadmin.'], done: (x) => x.navs.some((u) => /phpmyadmin/i.test(u)) || !!os.server.get(db) },
    { title: `Utwórz bazę „${db}”`, text: [`W phpMyAdmin kliknij „Nowa” po lewej, wpisz nazwę „${db}” i kliknij Utwórz.`, 'Nazwę bazy zawsze bierz dokładnie z arkusza.'], tip: ['Metoda porównywania napisów: zostaw domyślną albo wybierz utf8mb4_unicode_ci (polskie znaki).'], done: () => !!os.server.get(db) },
    { title: 'Zaimportuj dane', text: [`Kliknij bazę „${db}” po lewej → zakładka Import → Wybierz plik → ${sql} z rozpakowanego folderu → Importuj.`, 'Po imporcie po lewej pojawią się tabele.'], done: () => tables() > 0 },
    ...(imp ? [{ title: 'Zrzut ekranu importu', text: ['Arkusz wymaga dowodu, że import się udał. Gdy widać zielony komunikat, kliknij „Zrzut ekranu” na pasku zadań → tryb pełnoekranowy.', `Otwórz Paint → Ctrl+V → Plik → Zapisz jako → typ JPEG → folder z numerem → nazwa „${imp.name}”.`], tip: ['Nazwa i format pliku muszą się zgadzać z arkuszem, inaczej punkt przepada.'], target: '[data-coach="shot"]', done: () => inFolder(`${imp.name}.${imp.ext}`) }] : []),
    ...(kw.length ? [
      { title: 'Pierwsza kwerenda', text: ['W phpMyAdmin wejdź w zakładkę SQL, wpisz pierwsze zapytanie z arkusza i kliknij Wykonaj.', `Gdy widać wynik, zrób zrzut ekranu i zapisz go w folderze jako „${kw[0].name}.${kw[0].ext}”.`], tip: ['Utknąłeś? Kliknij „Asystent” na pasku zadań i wpisz „kwerenda 1”: dostaniesz wskazówkę, a kod dopiero na życzenie.'], target: '[data-coach="asst"]', done: () => inFolder(`${kw[0].name}.${kw[0].ext}`) },
      ...(kw.length > 1 ? [{ title: 'Pozostałe kwerendy', text: [`Zrób tak samo kolejne kwerendy i zrzuty: ${kw.slice(1).map((s) => `${s.name}.${s.ext}`).join(', ')}.`], done: () => kw.every((s) => inFolder(`${s.name}.${s.ext}`)) }] : []),
    ] : []),
    ...((reqs?.files ?? []).some((f) => /^kwerendy\.txt$/i.test(f)) ? [{ title: 'Zapisz treść kwerend', text: ['Otwórz Notatnik (menu Start), wklej wszystkie zapytania w kolejności z arkusza i zapisz jako „kwerendy.txt” w folderze z numerem.'], done: () => inFolder('kwerendy.txt') }] : []),
    { title: 'Otwórz edytor kodu', text: ['Uruchom Visual Studio Code (albo Notepad++) z pulpitu.', 'W VS Code: Open Folder → C:\\xampp\\htdocs. Tam zapisujesz pliki strony, żeby serwer je widział.'], target: '[data-icon="vscode"]', done: (x) => x.apps.includes('vscode') || x.apps.includes('notepadpp') },
    ...(pages.length ? [{ title: `Napisz stronę ${pages[0]}`, text: [`Utwórz w htdocs plik „${pages[0]}” i zbuduj stronę według arkusza: szkielet HTML, bloki, treści, skrypt PHP z bazą.`, 'Zapisuj często: Ctrl+S.'], tip: ['Asystent zna rozwiązanie krok po kroku: wpisz np. „szkielet”, „nagłówek”, „php” albo „co dalej?”.'], target: '[data-coach="asst"]', done: () => inHt(pages[0], 80) }] : []),
    ...(css ? [{ title: `Dodaj styl ${css}`, text: [`Utwórz „${css}” obok strony i podłącz go w <head>: <link rel="stylesheet" href="${css}">.`, 'Kolory i czcionki bierz dokładnie z arkusza.'], done: () => inHt(css, 20) }] : []),
    { title: 'Obejrzyj stronę w przeglądarce', text: [`Otwórz Microsoft Edge i wpisz adres localhost/${pages[0] ?? 'nazwa.php'} (ścieżka po htdocs).`, 'Porównaj stronę z ilustracją w arkuszu.'], tip: ['Nie otwieraj pliku podwójnym kliknięciem z dysku: wtedy PHP się nie wykona i zobaczysz sam kod.'], target: '[data-icon="browser"]', done: (x) => x.navs.some((u) => /^(https?:\/\/)?(localhost|127\.0\.0\.1)\/(?!phpmyadmin|dashboard)\S+\.(php|html?)/i.test(u)) },
    ...(pages.length ? [{ title: 'Skopiuj pliki do folderu', text: [`Na koniec skopiuj gotowe pliki z htdocs do folderu z numerem: ${[...pages, ...(css ? [css] : [])].join(', ')}.`, 'Eksplorator plików: zaznacz pliki → Ctrl+C → otwórz folder z numerem → Ctrl+V.'], done: () => [...pages, ...(css ? [css] : [])].every(inFolder) }] : []),
    ...((reqs?.files ?? []).some((f) => /^przegl/i.test(f)) ? [{ title: 'Plik przeglądarka.txt', text: ['W folderze z numerem: prawy przycisk → Nowy → Dokument tekstowy → nazwa „przeglądarka.txt”.', 'W środku wpisz nazwę przeglądarki, np. Microsoft Edge, i zapisz.'], done: () => inFolder('przeglądarka.txt') || inFolder('przegladarka.txt') }] : []),
    { title: 'Oddaj pracę', text: ['Sprawdź jeszcze raz, czy w folderze z numerem są wszystkie pliki z arkusza.', 'Kliknij „Zakończ egzamin” na pasku zadań. Sprawdzarka oceni folder tak jak egzaminator.'], target: '[data-coach="finish"]', done: () => false },
  ];
  // podkroki: gdzie kliknac i co wpisac
  const fold = c.folder ? base(c.folder) : '';
  const qs = c.sol?.['kwerendy.txt'] ? parseKwerendy(c.sol['kwerendy.txt']) : {};
  const M: Record<string, Micro[]> = {
    'Poznaj arkusz': [{ text: 'Kliknij dwa razy ikonę „Arkusz egzaminacyjny.pdf” na pulpicie.', target: '[data-icon="pdf"]' }],
    'Załóż folder z numerem': [
      { text: 'Kliknij prawym przyciskiem myszy w puste miejsce pulpitu.', done: () => vis('[data-label="Nowy"]') || vis('[data-icon] textarea') },
      { text: 'Najedź myszą na „Nowy”.', target: '[data-label="Nowy"]', done: () => vis('[data-label="Folder"]') || vis('[data-icon] textarea') },
      { text: 'Kliknij „Folder”.', target: '[data-label="Folder"]', done: () => vis('[data-icon] textarea') },
      { text: 'Wpisz nazwę folderu i naciśnij Enter:', type: '12345678901', target: '[data-icon] textarea' },
    ],
    'Rozpakuj pliki z arkusza': [
      { text: `Kliknij prawym przyciskiem na „${arch}”.`, target: `[data-icon$="${arch}"]`, done: () => vis('[data-label="7-Zip"]') || vis('[data-coach="7z-pass"]') },
      { text: 'Najedź na „7-Zip”.', target: '[data-label="7-Zip"]', done: () => vis('[data-label^="Wypakuj do"]') || vis('[data-coach="7z-pass"]') },
      { text: `Kliknij „Wypakuj do "${arch.replace(/\.\w+$/, '')}\\"”.`, target: '[data-label^="Wypakuj do"]', done: () => vis('[data-coach="7z-pass"]') },
      { text: 'Wpisz hasło i naciśnij Enter:', type: os.sheet.files.archivePassword ?? '', target: '[data-coach="7z-pass"]' },
    ],
    'Uruchom serwer XAMPP': [
      { text: 'Kliknij dwa razy „XAMPP Control Panel” na pulpicie.', target: '[data-icon="xampp"]', done: () => c.apps.includes('xampp') },
      { text: 'Kliknij „Start” w wierszu Apache.', target: '[data-coach="xampp-start-Apache"]', done: () => os.server.apache },
      { text: 'Kliknij „Start” w wierszu MySQL.', target: '[data-coach="xampp-start-MySQL"]', done: () => os.server.mysql },
    ],
    'Otwórz phpMyAdmin': [{ text: 'Kliknij „Admin” w wierszu MySQL.', target: '[data-coach="xampp-admin-MySQL"]' }],
    [`Utwórz bazę „${db}”`]: [
      { text: 'Kliknij „Nowa” w drzewie po lewej.', target: '[data-coach="pma-new"]', done: () => vis('input[placeholder="Nazwa bazy danych"]') },
      { text: 'W polu „Nazwa bazy danych” wpisz:', type: db, target: 'input[placeholder="Nazwa bazy danych"]', done: () => val('input[placeholder="Nazwa bazy danych"]') === db },
      { text: 'Kliknij „Utwórz”.', target: '[data-coach="pma-create"]' },
    ],
    'Zaimportuj dane': [
      { text: 'Kliknij zakładkę „Import” na górze.', target: '[data-coach="pma-tab-import"]', done: () => vis('[data-coach="pma-pick"]') },
      { text: 'Kliknij „Wybierz plik”.', target: '[data-coach="pma-pick"]', done: () => vis('[data-coach="fd-ok"]') || !!q('[data-coach="pma-pick"]')?.parentElement?.textContent?.includes('.sql') },
      { text: `Kliknij dwa razy folder „${arch.replace(/\.\w+$/, '')}”, potem dwa razy „${sql}”.`, target: `[data-fd="${arch.replace(/\.\w+$/, '')}"], [data-fd="${sql}"]`, done: () => !vis('[data-coach="fd-ok"]') },
      { text: 'Kliknij „Importuj” na dole strony.', target: '[data-coach="pma-import"]' },
    ],
    ...(imp ? { 'Zrzut ekranu importu': shotMicros(c, imp.name, imp.ext) } : {}),
    ...(kw.length ? { 'Pierwsza kwerenda': [
      { text: 'W phpMyAdmin kliknij bazę po lewej, a potem zakładkę „SQL”.', target: '[data-coach="pma-tab-sql"]', done: () => vis('[data-coach="pma-sql"]') },
      { text: 'Wpisz w pole zapytanie 1 z arkusza (tu gotowe, przepisz albo skopiuj):', type: qs[1] ?? '', target: '[data-coach="pma-sql"]', done: () => !!qs[1] && val('[data-coach="pma-sql"]').replace(/\s+/g, ' ').trim().toLowerCase().startsWith((qs[1] ?? '').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 20)) },
      { text: 'Kliknij „Wykonaj”. Gdy widać wynik, zrób zrzut:', target: '[data-coach="pma-run"]', done: () => c.clipChanged || vis('button[title="Tryb pełnoekranowy"]') },
      ...shotMicros(c, kw[0].name, kw[0].ext),
    ] } : {}),
    'Otwórz edytor kodu': [
      { text: 'Kliknij dwa razy „Visual Studio Code” na pulpicie.', target: '[data-icon="vscode"]', done: () => c.apps.includes('vscode') },
      { text: 'Kliknij „Open Folder”.', target: '[data-coach="vsc-open-folder"]', done: () => vis('[data-coach="fd-ok"]') },
      { text: 'W oknie przejdź do C:\\xampp\\htdocs (Dysk lokalny → xampp → htdocs) i kliknij „Wybierz folder”.', target: '[data-coach="fd-ok"]' },
    ],
    ...(pages.length ? { [`Napisz stronę ${pages[0]}`]: [
      { text: 'W VS Code najedź na nazwę folderu po lewej i kliknij ikonę „New File...”.', target: 'button[title="New File..."]', done: () => vis('[data-win] input.bg-\\[\\#313131\\]') || inHt(pages[0]) },
      { text: 'Wpisz nazwę pliku i naciśnij Enter:', type: pages[0], target: '[data-win] input.bg-\\[\\#313131\\]', done: () => inHt(pages[0]) },
      { text: 'Napisz kod strony według arkusza. Gotowy kod z rozwiązania masz niżej, przepisz go albo skopiuj i wklej, potem Ctrl+S.' },
    ] } : {}),
    ...(css ? { [`Dodaj styl ${css}`]: [
      { text: 'Kliknij „New File...” w VS Code.', target: 'button[title="New File..."]', done: () => vis('[data-win] input.bg-\\[\\#313131\\]') || inHt(css) },
      { text: 'Wpisz nazwę i Enter:', type: css, target: '[data-win] input.bg-\\[\\#313131\\]', done: () => inHt(css) },
      { text: 'Wpisz style (gotowe niżej) i zapisz Ctrl+S.' },
    ] } : {}),
    'Obejrzyj stronę w przeglądarce': [
      { text: 'Kliknij dwa razy „Microsoft Edge” na pulpicie.', target: '[data-icon="browser"]', done: () => c.apps.includes('browser') },
      { text: 'Kliknij w pasek adresu, wpisz adres i naciśnij Enter:', type: `localhost/${pages[0] ?? ''}`, target: '[data-coach="edge-addr"]' },
    ],
    'Oddaj pracę': [{ text: 'Kliknij „Zakończ egzamin” i potwierdź „Tak”.', target: '[data-coach="finish"]' }],
  };
  for (const s of st) { if (M[s.title]) s.micro = M[s.title]; }
  for (const s of st) {
    const f = pages.find((p) => s.title.endsWith(p)) ?? (css && s.title.endsWith(css) ? css : null);
    if (f && c.sol?.[f]) s.code = { label: `Pokaż gotowy kod ${f}`, value: c.sol[f] };
    if (s.title === 'Zapisz treść kwerend' && c.sol?.['kwerendy.txt']) s.code = { label: 'Pokaż treść kwerendy.txt', value: c.sol['kwerendy.txt'] };
    if (s.title === 'Pozostałe kwerendy' && Object.keys(qs).length) s.code = { label: 'Pokaż zapytania 2–4', value: Object.entries(qs).filter(([n]) => +n > 1).map(([n, t]) => `-- ${n}\n${t}`).join('\n\n') };
  }
  void fold;
  return st;
}

/** Trener samouczka: panel z krokami, podswietlenie miejsca do klikniecia, automatyczne przechodzenie dalej. */
export default function Coach({ attempt, apps, root, onFinish }: { attempt: string; apps: AppId[]; root: React.RefObject<HTMLDivElement | null>; onFinish: () => void }) {
  const os = useOS();
  const KEY = `p03:coach:${attempt}`;
  const [reqs, setReqs] = useState<Reqs | null>(null);
  const [navs, setNavs] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(KEY + ':nav') ?? '[]'); } catch { return []; } });
  const [skipped, setSkipped] = useState<number[]>(() => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; } });
  const [min, setMin] = useState(false);
  const [tip, setTip] = useState(false);
  const [, tick] = useState(0);
  const [cheer, setCheer] = useState<string | null>(null);
  const [ring, setRing] = useState<DOMRect | null>(null);
  const prev = useRef(-1);
  const drag = useDragBox();
  const [sol, setSol] = useState<Record<string, string> | null>(null);
  const [showCode, setShowCode] = useState(false);
  useEffect(() => { void loadReqs().then((r) => setReqs(r[os.sheet.code] ?? null)); void fetchSolution(os.sheet.code).then(setSol).catch(() => null); }, [os.sheet.code]);
  useEffect(() => { const h = (e: Event) => setNavs((n) => { const v = [...n.slice(-20), String((e as CustomEvent).detail)]; try { localStorage.setItem(KEY + ':nav', JSON.stringify(v)); } catch { /* */ } return v; }); window.addEventListener('p03-nav', h); return () => window.removeEventListener('p03-nav', h); }, [KEY]);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(skipped)); } catch { /* */ } }, [KEY, skipped]);
  // stan serwera i dysku zmienia sie poza Reactem: sprawdzamy co chwile
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 700); return () => clearInterval(t); }, []);

  const folder = os.vfs.list(DESKTOP).find((p) => os.vfs.isDir(p) && /^\d+$/.test(base(p).trim())) ?? null;
  // schowek przy wejsciu w krok: nowy zrzut = inny obraz niz wtedy
  const base0 = makeSteps({ os, reqs, apps, navs, folder, sol, clipChanged: false });
  const live0 = base0.map((s, i) => skipped.includes(i) || (() => { try { return s.done({ os, reqs, apps, navs, folder, sol, clipChanged: false }); } catch { return false; } })());
  const cur0 = live0.findIndex((d) => !d);
  const clipBase = useRef<Record<number, string | undefined>>({});
  if (cur0 >= 0 && !(cur0 in clipBase.current)) clipBase.current[cur0] = os.clip.image;
  const ctx: Ctx = { os, reqs, apps, navs, folder, sol, clipChanged: cur0 >= 0 && !!os.clip.image && os.clip.image !== clipBase.current[cur0] };
  const steps = makeSteps(ctx);
  // krok raz zaliczony zostaje zaliczony (np. arkusz potem zminimalizowany)
  const live = steps.map((s) => { try { return s.done(ctx); } catch { return false; } });
  const doneArr = steps.map((_, i) => skipped.includes(i) || live[i]);
  useEffect(() => { const add = live.map((d, i) => (d && !skipped.includes(i) ? i : -1)).filter((i) => i >= 0 && i < steps.length - 1); if (add.length) setSkipped((sk) => [...new Set([...sk, ...add])]); });
  const cur = doneArr.findIndex((d) => !d);
  const step = steps[cur === -1 ? steps.length - 1 : cur];
  const doneCount = doneArr.filter(Boolean).length;
  const micro = step?.micro; const mi = micro ? currentMicro(micro) : -1;

  // pochwala po wykonaniu kroku
  useEffect(() => {
    if (prev.current >= 0 && cur > prev.current) { setCheer(steps[prev.current]?.title ?? null); setTip(false); setShowCode(false); const t = setTimeout(() => setCheer(null), 2200); prev.current = cur; return () => clearTimeout(t); }
    prev.current = cur;
  }, [cur]); // eslint-disable-line react-hooks/exhaustive-deps
  // podswietlenie elementu, ktory trzeba kliknac
  useEffect(() => {
    const mt = micro && micro[mi]?.target; const tsel = mt && vis(mt) ? mt : step?.target;
    const el = tsel ? root.current?.querySelector<HTMLElement>(tsel) : null;
    const r = el && !min ? el.getBoundingClientRect() : null; const rr = root.current?.getBoundingClientRect();
    const next = r && rr && r.width ? new DOMRect(r.left - rr.left, r.top - rr.top, r.width, r.height) : null;
    // tylko gdy pozycja sie zmienila (inaczej petla renderow blokuje nawigacje strony)
    setRing((old) => (!old && !next) || (old && next && old.x === next.x && old.y === next.y && old.width === next.width && old.height === next.height) ? old : next);
  });

  return (
    <>
      {ring && <div data-noshot="1" className="pointer-events-none absolute z-[275] rounded-[8px] border-[3px] border-[#22c55e] shadow-[0_0_0_4px_rgba(34,197,94,.25),0_0_24px_rgba(34,197,94,.6)] animate-pulse" style={{ left: ring.x - 5, top: ring.y - 5, width: ring.width + 10, height: ring.height + 10 }} />}
      <div data-noshot="1" onPointerDown={(e) => e.stopPropagation()} style={drag.style} className="p03-start absolute bottom-[58px] left-[110px] z-[270] w-[370px] overflow-hidden rounded-[10px] border border-[#15803d]/30 bg-white text-[13px] text-[#1a1a1a] shadow-[0_16px_40px_rgba(0,0,0,.35)]">
        <div onPointerDown={drag.onTitleDown} title="Przeciągnij, żeby przesunąć" className="flex cursor-move items-center gap-2 bg-gradient-to-r from-[#15803d] to-[#16a34a] px-3 py-2 text-white">
          <GraduationCap size={18} />
          <span className="flex-1 font-semibold">Samouczek · krok {Math.min(cur === -1 ? steps.length : cur + 1, steps.length)} z {steps.length}</span>
          <button onClick={() => setMin((v) => !v)} title={min ? 'Rozwiń' : 'Zwiń'} className="grid h-7 w-7 place-items-center rounded hover:bg-white/15">{min ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</button>
        </div>
        <div className="h-1.5 bg-[#dcfce7]"><div className="h-full bg-[#16a34a] transition-all duration-500" style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div>
        {!min && <div className="max-h-[calc(100vh-190px)] space-y-2 overflow-auto p-3.5">
          {cheer && <p className="flex items-center gap-2 rounded-[6px] bg-[#dcfce7] px-2.5 py-1.5 font-semibold text-[#166534]"><PartyPopper size={15} />Świetnie! Zrobione: {cheer}</p>}
          <p className="text-[16px] font-bold">{step.title}</p>
          {step.text.map((t, i) => <p key={i} className="leading-relaxed">{t}</p>)}
          {micro && <ol className="space-y-1 rounded-[8px] bg-[#f0fdf4] p-2">{micro.map((m, i) => (
            <li key={i} className={`flex gap-2 rounded-[6px] px-1.5 py-1 ${i === mi ? 'bg-white font-semibold shadow-[0_0_0_2px_#22c55e]' : i < mi ? 'text-[#777] line-through decoration-[#16a34a]/50' : 'text-[#555]'}`}>
              <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] ${i < mi ? 'bg-[#16a34a] text-white' : i === mi ? 'bg-[#22c55e] text-white' : 'border border-[#bbb]'}`}>{i < mi ? <Check size={10} strokeWidth={3} /> : i + 1}</span>
              <span className="min-w-0 flex-1">{m.text}{m.type && i === mi && <span className="mt-1 flex items-center gap-1.5 font-normal"><code className="max-h-24 min-w-0 flex-1 overflow-auto whitespace-pre-wrap break-all rounded bg-[#1f2937] px-2 py-1 font-mono text-[12px] text-[#a7f3d0]">{m.type}</code><button onClick={() => void navigator.clipboard?.writeText(m.type!)} title="Kopiuj" className="shrink-0 rounded border border-black/10 bg-white px-1.5 py-0.5 text-[11px] hover:bg-[#f3f3f3]">Kopiuj</button></span>}</span>
            </li>))}</ol>}
          {step.code && (showCode ? <div className="relative"><pre className="max-h-48 overflow-auto rounded-[6px] bg-[#1f2937] p-2 font-mono text-[11px] leading-snug text-[#e5e7eb]">{step.code.value}</pre><button onClick={() => void navigator.clipboard?.writeText(step.code!.value)} className="absolute right-1.5 top-1.5 rounded bg-white/15 px-1.5 py-0.5 text-[11px] text-white hover:bg-white/25">Kopiuj</button></div>
            : <button onClick={() => setShowCode(true)} className="text-[#15803d] underline">{step.code.label}</button>)}
          {step.tip && (tip ? <div className="rounded-[6px] border border-[#fde68a] bg-[#fffbeb] px-2.5 py-2 leading-relaxed">{step.tip.map((t, i) => <p key={i}>{t}</p>)}</div>
            : <button onClick={() => setTip(true)} className="flex items-center gap-1.5 text-[#b45309] hover:underline"><Lightbulb size={14} />Pokaż wskazówkę</button>)}
          <div className="flex items-center gap-2 pt-1">
            {cur === steps.length - 1
              ? <button onClick={onFinish} className="rounded-[6px] bg-[#16a34a] px-3 py-1.5 font-semibold text-white hover:bg-[#15803d]">Zakończ i sprawdź</button>
              : <button onClick={() => setSkipped((s) => [...s, cur])} className="flex items-center gap-1 rounded-[6px] border border-black/10 px-2.5 py-1 text-[#555] hover:bg-black/[.04]"><SkipForward size={13} />Pomiń krok</button>}
            <span className="flex-1" />
            <span className="text-[11.5px] text-[#777]">Krok zalicza się sam, gdy go wykonasz.</span>
          </div>
          <details className="pt-1 text-[12px]">
            <summary className="cursor-pointer text-[#555]">Wszystkie kroki</summary>
            <ol className="mt-1.5 space-y-0.5">{steps.map((s, i) => <li key={i} className={`flex items-center gap-1.5 ${i === cur ? 'font-semibold' : doneArr[i] ? 'text-[#777]' : ''}`}><span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] ${doneArr[i] ? 'bg-[#16a34a] text-white' : 'border border-[#bbb]'}`}>{doneArr[i] ? <Check size={10} strokeWidth={3} /> : i + 1}</span>{s.title}</li>)}</ol>
          </details>
        </div>}
      </div>
    </>
  );
}
