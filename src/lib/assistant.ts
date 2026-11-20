// Asystent egzaminacyjny w maszynie: bez AI z zewnatrz. Zna arkusz, stan pulpitu i rozwiazanie krok po kroku.
import type { Sheet } from './types';
import type { Reqs } from './examiner';
import type { Step } from './walkthrough';
import type { Vfs } from './vfs';
import type { MysqlServer } from './mysqlServer';
import { base, DESKTOP, HTDOCS } from './vfs';

export type Answer = {
  text: string[];            // akapity / kroki
  list?: { ok: boolean; label: string }[]; // lista postepu
  code?: { code: string; lang?: string; label: string }; // kod do odsloniecia
  reveal?: { label: string; value: string }; // np. haslo (odsloniecie liczy sie jako podpowiedz)
  step?: number;             // indeks kroku z rozwiazania (do "Nastepny krok")
  chips?: string[];          // proponowane pytania
};

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l');

// ---------- postep ----------
export type Ctx = { vfs: Vfs; server: MysqlServer; sheet: Sheet; reqs: Reqs | null; candidate: string };
type Check = { ok: boolean; label: string; how: string[] };

export function checkProgress({ vfs, server, sheet, reqs }: Ctx): Check[] {
  const desk = vfs.list(DESKTOP).filter((p) => vfs.isDir(p));
  const folder = desk.find((p) => /^\d+$/.test(base(p).trim())) ?? null;
  const arch = (sheet.files.archiveUrl ?? 'pliki1.7z').split('/').pop() ?? 'pliki1.7z';
  const assets = (sheet.assets?.files ?? []).filter((f) => !f.startsWith('_'));
  const all = [...vfs.nodes.keys()];
  const extracted = !assets.length || assets.some((f) => all.some((k) => k.endsWith('/' + f) && !k.includes('/AppData/')));
  const db = reqs?.dbName ?? null;
  const dbOk = !db || (!!server.get(db) && (() => { try { return (server.get(db)!.exec("SELECT count(*) FROM sqlite_master WHERE type='table'")[0]?.values[0][0] as number) > 0; } catch { return false; } })());
  const inFolder = (n: string) => !!folder && vfs.tree(folder).some((f) => base(f.path).toLowerCase() === n.toLowerCase());
  const exact = (n: string) => !!folder && vfs.tree(folder).some((f) => base(f.path) === n);
  const shots = reqs?.shots ?? [];
  const missingShots = shots.filter((s) => !exact(`${s.name}.${s.ext}`)).map((s) => `${s.name}.${s.ext}`);
  const pages = (reqs?.files ?? []).filter((f) => /\.(php|html?|css|js)$/i.test(f));
  const missingHt = pages.filter((f) => !vfs.tree(HTDOCS).some((x) => base(x.path).toLowerCase() === f.toLowerCase()));
  const missingFolder = pages.filter((f) => !inFolder(f));
  const kw = (reqs?.files ?? []).some((f) => /^kwerendy\.txt$/i.test(f));
  const br = (reqs?.files ?? []).some((f) => /^przegl/i.test(f));
  return [
    { ok: !!folder, label: 'Folder z numerem na pulpicie', how: ['Prawy przycisk na pulpicie → Nowy → Folder.', 'Nazwij go swoim numerem PESEL (same cyfry). Tylko ten folder ocenia egzaminator.'] },
    { ok: extracted, label: `Rozpakowane ${arch}`, how: [`Prawy przycisk na „${arch}” → 7-Zip → Wypakuj do "${arch.replace(/\.\w+$/, '')}\\".`, 'Hasło jest w treści arkusza (zapytaj „pokaż hasło”, jeśli nie możesz znaleźć).'] },
    { ok: server.apache && server.mysql, label: 'XAMPP: Apache i MySQL działają', how: ['Otwórz XAMPP Control Panel z pulpitu.', 'Kliknij Start przy Apache i przy MySQL; nazwy zrobią się zielone.'] },
    ...(db ? [{ ok: dbOk, label: `Baza „${db}” z danymi`, how: [`W XAMPP przy MySQL kliknij Admin (phpMyAdmin).`, `Nowa → nazwa „${db}” → Utwórz.`, `Wejdź w bazę → Import → Wybierz plik → ${sheet.assets?.sql ?? 'plik .sql'} z rozpakowanego folderu → Importuj.`] }] : []),
    ...(shots.length ? [{ ok: !missingShots.length, label: `Zrzuty ekranu (${shots.length - missingShots.length}/${shots.length})`, how: [missingShots.length ? `Brakuje w folderze: ${missingShots.join(', ')}.` : '', 'Zrzut: przycisk „Zrzut ekranu” na pasku zadań → Paint → Ctrl+V → Plik → Zapisz jako (PNG albo JPEG) w folderze z numerem.'].filter(Boolean) }] : []),
    ...(kw ? [{ ok: inFolder('kwerendy.txt'), label: 'kwerendy.txt w folderze', how: ['Otwórz Notatnik, wklej treść wszystkich kwerend w kolejności z arkusza i zapisz jako kwerendy.txt w folderze z numerem.'] }] : []),
    ...(pages.length ? [{ ok: !missingHt.length, label: `Pliki strony w htdocs (${pages.length - missingHt.length}/${pages.length})`, how: [missingHt.length ? `Brakuje: ${missingHt.join(', ')}.` : '', 'Pisz je w VS Code albo Notepad++ i zapisuj w C:\\xampp\\htdocs (możesz w podfolderze). Sprawdzaj w Edge przez localhost/...'].filter(Boolean) },
      { ok: !missingFolder.length, label: `Pliki strony w folderze z numerem (${pages.length - missingFolder.length}/${pages.length})`, how: ['Na koniec skopiuj gotowe pliki z htdocs do folderu z numerem.', missingFolder.length ? `Brakuje: ${missingFolder.join(', ')}.` : ''].filter(Boolean) }] : []),
    ...(br ? [{ ok: inFolder('przeglądarka.txt') || inFolder('przegladarka.txt'), label: 'przeglądarka.txt', how: ['Utwórz w folderze z numerem plik przeglądarka.txt i wpisz nazwę przeglądarki, np. Microsoft Edge.'] }] : []),
  ];
}

// ---------- pytania o obsluge ----------
type Faq = { keys: RegExp; text: (c: Ctx) => string[] };
const FAQ: Faq[] = [
  { keys: /import|zaimport|wgra.*baz|plik sql|\.sql/, text: (c) => [`W XAMPP uruchom MySQL i kliknij Admin.`, `Utwórz bazę${c.reqs?.dbName ? ` „${c.reqs.dbName}”` : ''} (Nowa → nazwa → Utwórz).`, `Wejdź w nią po lewej → zakładka Import → Wybierz plik → ${c.sheet.assets?.sql ?? 'plik .sql'} z rozpakowanego folderu → Importuj.`, 'Jeśli arkusz wymaga zrzutu importu, zrób go teraz, gdy widać komunikat o sukcesie.'] },
  { keys: /utworz.*baz|nowa baz|stworz.*baz|kodowan|collation|utf/, text: (c) => [`phpMyAdmin → Nowa → nazwa${c.reqs?.dbName ? ` „${c.reqs.dbName}”` : ''}.`, 'Metoda porównywania napisów: utf8mb4_unicode_ci (albo ta z arkusza), potem Utwórz.', 'Polskie znaki na stronie: w PHP po połączeniu dodaj mysqli_set_charset($conn, "utf8"); a w HTML <meta charset="UTF-8">.'] },
  { keys: /localhost|podglad|preview|zobaczyc stron|otworzyc stron|uruchom.*php|php.*nie dziala|wyswietl.*php/, text: () => ['PHP działa tylko przez serwer, nie z pliku na dysku.', 'XAMPP → Start przy Apache (i MySQL, jeśli strona łączy się z bazą).', 'W Edge wpisz localhost/ i ścieżkę po htdocs, np. localhost/pliki1/index.php (ukośniki /).'] },
  { keys: /mysqli|polacz|connect|unknown database|no connection|odmowa/, text: (c) => ['Połączenie: $conn = mysqli_connect("localhost", "root", "", "' + (c.reqs?.dbName ?? 'nazwa_bazy') + '");', '„No connection could be made” → MySQL w XAMPP nie działa.', '„Unknown database” → baza nie istnieje albo ma inną nazwę.', 'Na końcu: mysqli_close($conn);'] },
  { keys: /zrzut|screen|prtsc|print|paint|jpg|png/, text: () => ['Ustaw na ekranie to, co ma być na zrzucie (np. wynik kwerendy).', 'Kliknij „Zrzut ekranu” na pasku zadań (albo PrtSc), potem tryb pełnoekranowy.', 'Otwórz Paint → Ctrl+V → Plik → Zapisz jako → wybierz PNG albo JPEG → folder z numerem → nazwa z arkusza.'] },
  { keys: /przezroczy|transparen|gif|animac|rozmiar obraz|zmien.*rozmiar|grafik|gimp|photoshop/, text: () => ['GIMP: Obraz → Skaluj obraz (rozmiar), Warstwa → Przezroczystość → Kanał alfa, potem Kolory → Kolor na alfę. Eksport: Plik → Eksportuj jako (.png zachowuje przezroczystość).', 'Photoshop: Obraz → Rozmiar obrazu; przezroczystość przez usunięcie tła na warstwie; Plik → Eksportuj → Eksportuj jako PNG.', 'GIF z klatkami: każda klatka jako warstwa, eksport jako GIF z zaznaczoną animacją, ustaw opóźnienie i pętlę jak w arkuszu.'] },
  { keys: /rozpak|wypak|wyodreb|7z|archiw|7-zip/, text: (c) => [`Prawy przycisk na archiwum → 7-Zip → Wypakuj do "${((c.sheet.files.archiveUrl ?? 'pliki1.7z').split('/').pop() ?? 'pliki1.7z').replace(/\.\w+$/, '')}\\".`, 'Wpisz hasło z arkusza (wielkość liter ma znaczenie).'] },
  { keys: /folder|numer|pesel/, text: () => ['Na pulpicie: prawy przycisk → Nowy → Folder, nazwa = Twój numer (same cyfry).', 'Do tego folderu kopiujesz wszystko, co oddajesz: strony, zrzuty, kwerendy.txt, przeglądarka.txt.'] },
  { keys: /przegladarka\.txt|przegladark/, text: () => ['W folderze z numerem: prawy przycisk → Nowy → Dokument tekstowy → nazwa przeglądarka.txt.', 'W środku wpisz nazwę przeglądarki, w której sprawdzałeś stronę, np. Microsoft Edge.'] },
  { keys: /kwerendy\.txt|gdzie.*kwerend|zapisac kwerend/, text: () => ['Otwórz Notatnik, wpisz wszystkie kwerendy w kolejności z arkusza (każdą w osobnej linii albo z numerem), zapisz jako kwerendy.txt w folderze z numerem.'] },
  { keys: /ctrl\+?w|skrot|pelny ekran|fullscreen|zamyka/, text: () => ['Przeglądarka przejmuje część skrótów (Ctrl+W, Win+Shift+S).', 'Włącz pełny ekran przyciskiem obok „Zrzut ekranu” (albo F11): wtedy skróty działają w maszynie. Wyjście: przytrzymaj Esc.'] },
  { keys: /formularz|\$_post|\$_get|post|get\b|isset/, text: () => ['Formularz: <form method="post" action="plik.php"> z polami mającymi atrybut name.', 'W PHP: if (isset($_POST["pole"])) { $x = $_POST["pole"]; ... }', 'Dane do zapytania SQL wstawiaj w cudzysłowach: "... WHERE nazwa = \'$x\'"'] },
  { keys: /zapis|save|zapisz/, text: () => ['Ctrl+S zapisuje plik w edytorze. Nowy plik zapytaj o lokalizację: wybierz C:\\xampp\\htdocs (strona) albo folder z numerem (oddanie).'] },
];

// ---------- podpowiedzi z rozwiazania ----------
const STAGE_OF: [RegExp, Step['stage']][] = [[/\bbaz|sql|tabel/, 'Baza danych'], [/\bcss|styl/, 'Style CSS'], [/\bjs\b|javascript|skrypt/, 'Skrypt JS'], [/grafik|obraz|zdjec/, 'Grafika'], [/strona|html|php|sekcj|blok|naglow|stopk|formularz/, 'Strona'], [/oddan|konc/, 'Oddanie']];

export function findStep(q: string, steps: Step[]): number | null {
  const n = norm(q);
  const kw = /(?:kwerend\w*|kw|zapytani\w*)\s*(?:nr\.?\s*)?(\d)/.exec(n);
  if (kw) {
    const i = steps.findIndex((s) => s.sql && (new RegExp(`\\b${kw[1]}\\b`).test(norm(s.title)) || new RegExp(`^${kw[1]}\\b|kwerend\\w* ${kw[1]}\\b`).test(norm(s.task ?? ''))));
    if (i >= 0) return i;
    const sqls = steps.map((s, i) => (s.sql ? i : -1)).filter((i) => i >= 0);
    return sqls[Number(kw[1]) - 1] ?? null;
  }
  // dopasowanie po slowach z tytulu
  const words = n.split(/[^a-z0-9.#]+/).filter((w) => w.length > 3);
  let best = -1, score = 0;
  steps.forEach((s, i) => { const t = norm(`${s.title} ${s.file ?? ''}`); const sc = words.filter((w) => t.includes(w)).length; if (sc > score) { score = sc; best = i; } });
  if (score > 0) return best;
  for (const [re, st] of STAGE_OF) if (re.test(n)) { const i = steps.findIndex((s) => s.stage === st); if (i >= 0) return i; }
  return null;
}

export function stepAnswer(steps: Step[], i: number): Answer {
  const s = steps[i];
  const code = s.sql ?? s.code;
  return { step: i, text: [`**${s.stage}: ${s.title}**`, ...s.text], code: code ? { code, lang: s.sql ? 'sql' : s.lang, label: s.sql ? 'Pokaż kwerendę' : `Pokaż kod${s.file ? ` (${s.file})` : ''}` } : undefined };
}

// ---------- glowna funkcja ----------
export function answer(q: string, c: Ctx, steps: Step[] | null): Answer {
  const n = norm(q).trim();
  if (/co dalej|co teraz|nastepn|postep|sprawdz|gdzie jestem|co mi brakuje|czego brakuje/.test(n)) {
    const list = checkProgress(c); const next = list.find((x) => !x.ok);
    return { list: list.map(({ ok, label }) => ({ ok, label })), text: next ? [`Następny krok: **${next.label}**`, ...next.how] : ['Wszystko z listy jest zrobione. Sprawdź jeszcze wygląd strony z ilustracją w arkuszu i kliknij „Zakończ egzamin”.'], chips: ['Pokaż podpowiedź do zadania', 'Jak zrobić zrzut?'] };
  }
  if (/hasl/.test(n)) {
    const pw = c.sheet.files.archivePassword;
    if (!pw) return { text: ['To archiwum nie ma hasła.'] };
    return { text: ['Hasło do archiwum jest w treści arkusza, zwykle na pierwszej stronie zadania, przy opisie pliku z materiałami. Otwórz „Arkusz egzaminacyjny.pdf” z pulpitu.'], reveal: { label: 'Pokaż hasło', value: pw } };
  }
  if (steps && /podpowiedz do zadania|pomoz z zadaniem|jak zaczac zadanie/.test(n)) {
    const list = checkProgress(c); const next = list.find((x) => !x.ok);
    const st = next && /baz|zrzut|kwerend/i.test(next.label) ? steps.findIndex((s) => s.stage === 'Baza danych') : steps.findIndex((s) => s.stage === 'Strona');
    if (st >= 0) return stepAnswer(steps, st);
  }
  if (steps && /kwerend|zapytani|\bkw\s*\d/.test(n)) { const i = findStep(q, steps); if (i !== null) return stepAnswer(steps, i); }
  const f = FAQ.find((x) => x.keys.test(n));
  if (f) return { text: f.text(c) };
  if (steps) { const i = findStep(q, steps); if (i !== null) return stepAnswer(steps, i); }
  return {
    text: ['Nie wiem, o co dokładnie pytasz. Spróbuj krócej, np. „kwerenda 2”, „jak zaimportować bazę”, „css nagłówka”.'],
    chips: ['Co dalej?', ...(steps ? steps.filter((s, i, a) => a.findIndex((x) => x.stage === s.stage) === i).slice(1, 4).map((s) => s.title) : [])],
  };
}

export const hintKey = (attempt: string) => `p03:hints:${attempt}`;
export function addHint(attempt: string) { try { const k = hintKey(attempt); localStorage.setItem(k, String(Number(localStorage.getItem(k) ?? 0) + 1)); } catch { /* */ } }
export function hintCount(attempt: string) { try { return Number(localStorage.getItem(hintKey(attempt)) ?? 0); } catch { return 0; } }

