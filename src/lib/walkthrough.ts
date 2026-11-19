// Rozwiazanie arkusza krok po kroku. Kod pochodzi z rozwiazan Chr1skyy (pobierany w przegladarce),
// objasnienia sa generowane tutaj z analizy kodu (wlasne slowa, bez kopiowania cudzych opisow).
import type { Sheet } from './types';
import type { Reqs } from './examiner';
import type { QueryTask } from './queries';

const RAW = 'https://raw.githubusercontent.com/Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03/main/';
const enc = (p: string) => p.split('/').map(encodeURIComponent).join('/');

export type Stage = 'Start' | 'Baza danych' | 'Grafika' | 'Strona' | 'Style CSS' | 'Skrypt JS' | 'Oddanie';
export type Step = {
  stage: Stage; title: string; text: string[];
  file?: string; code?: string; lang?: 'html' | 'php' | 'css' | 'js' | 'sql';
  from?: number; to?: number; // zmienione linie (1-based, wlacznie)
  snapshot?: Record<string, string>; // stan wszystkich plikow po tym kroku (do podgladu)
  sql?: string; task?: string;
};

let indexP: Promise<Record<string, { path: string; files: string[] }>> | null = null;
export const loadSolutionIndex = () => (indexP ??= import('../data/solution_files.json').then((m) => m.default as Record<string, { path: string; files: string[] }>));

export async function fetchSolution(code: string): Promise<Record<string, string> | null> {
  const ix = (await loadSolutionIndex())[code];
  if (!ix) return null;
  const out: Record<string, string> = {};
  await Promise.all(ix.files.map(async (f) => {
    const r = await fetch(RAW + enc(`${ix.path}/${f}`)).catch(() => null);
    if (r?.ok) out[f.split('/').pop()!] = (await r.text()).replace(/\r\n/g, '\n');
  }));
  return Object.keys(out).length ? out : null;
}

// ---------------- SQL ----------------
const AGG: Record<string, string> = { COUNT: 'liczy wiersze', SUM: 'sumuje wartości', AVG: 'liczy średnią', MIN: 'wybiera najmniejszą wartość', MAX: 'wybiera największą wartość' };
const list = (a: string[]) => (a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' i ' + a[a.length - 1]);
const code = (s: string) => `\`${s.trim()}\``;

function splitTop(s: string, sep = ',') {
  const out: string[] = []; let depth = 0, cur = '', q: string | null = null;
  for (const ch of s) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; cur += ch; continue; }
    if (ch === '(') depth++; if (ch === ')') depth--;
    if (ch === sep && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
function clause(sql: string, kw: string, next: string[]) {
  const re = new RegExp(`\\b${kw}\\b([\\s\\S]*?)(?=\\b(?:${next.join('|')})\\b|;|$)`, 'i');
  return re.exec(sql)?.[1]?.trim();
}
function explainWhere(w: string) {
  const parts: string[] = [];
  if (/\bLIKE\b/i.test(w)) {
    for (const m of w.matchAll(/(\w+(?:\.\w+)?)\s+LIKE\s+(['"])(.*?)\2/gi)) {
      const p = m[3];
      const how = /^%.*%$/.test(p) ? `zawiera „${p.slice(1, -1)}”` : p.endsWith('%') ? `zaczyna się od „${p.slice(0, -1)}”` : p.startsWith('%') ? `kończy się na „${p.slice(1)}”` : /_/.test(p) ? `pasuje do wzorca „${p}” (_ to dokładnie jeden znak)` : `jest równe „${p}”`;
      parts.push(`${code(m[1])} ${how} (LIKE, znak % oznacza dowolny ciąg znaków)`);
    }
  }
  if (/\bBETWEEN\b/i.test(w)) parts.push('BETWEEN a AND b bierze wartości z przedziału razem z końcami');
  if (/\bIN\s*\(/i.test(w)) parts.push('IN (...) sprawdza, czy wartość jest na podanej liście');
  if (/\bIS\s+NOT\s+NULL\b/i.test(w)) parts.push('IS NOT NULL zostawia tylko wiersze, w których pole jest wypełnione');
  else if (/\bIS\s+NULL\b/i.test(w)) parts.push('IS NULL wybiera wiersze z pustym polem (NULL nie porównuje się znakiem =)');
  if (/\w+\.\w+\s*=\s*\w+\.\w+/.test(w)) parts.push('warunek typu tabela1.klucz = tabela2.klucz łączy tabele (relacja zapisana w WHERE)');
  if (/\bAND\b/i.test(w)) parts.push('AND: wszystkie warunki muszą być spełnione naraz');
  if (/\bOR\b/i.test(w)) parts.push('OR: wystarczy, że spełniony jest jeden z warunków');
  if (/[<>]=?|!=|<>/.test(w.replace(/<>|!=/g, ' ne ')) || /<>|!=/.test(w)) parts.push('operatory <, >, <=, >=, <> porównują liczby, daty i teksty');
  return parts;
}
export function explainSql(sql: string): string[] {
  const s = sql.replace(/\s+/g, ' ').trim();
  const out: string[] = [];
  const up = s.toUpperCase();
  if (up.startsWith('SELECT')) {
    const cols = clause(s, 'SELECT', ['FROM']) ?? '';
    const distinct = /^DISTINCT\b/i.test(cols);
    const colList = splitTop(cols.replace(/^DISTINCT\s+/i, ''));
    if (cols.trim() === '*') out.push('`SELECT *` pobiera wszystkie kolumny tabeli. Na egzaminie zwykle trzeba wypisać tylko pola z polecenia, więc gwiazdki używaj tylko wtedy, gdy polecenie mówi „wszystkie pola”.');
    else out.push(`Najpierw wypisujemy pola, które ma zwrócić zapytanie: ${list(colList.map((c) => code(c)))}. Kolejność kolumn w wyniku jest taka, jak tutaj.`);
    if (distinct) out.push('`DISTINCT` usuwa powtórzenia: każdy wiersz wyniku pojawi się tylko raz.');
    const aggs = [...new Set([...s.matchAll(/\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/gi)].map((m) => m[1].toUpperCase()))];
    if (aggs.length) out.push(`Funkcja agregująca ${list(aggs.map((a) => `${a}() ${AGG[a]}`))}. Bez GROUP BY daje jeden wiersz dla całej tabeli.`);
    const aliases = [...s.matchAll(/\bAS\s+(['"`]?)([^'"`,]+?)\1(?=\s*(?:,|FROM\b|$))/gi)].map((m) => m[2]);
    if (aliases.length) out.push(`\`AS\` nadaje kolumnie nazwę (alias): ${list(aliases.map((a) => `„${a}”`))}. Alias ze spacją lub polskimi znakami bierzemy w cudzysłów.`);
    const from = clause(s, 'FROM', ['WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT']) ?? '';
    const joins = [...from.matchAll(/\bJOIN\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?\s+(ON\s+[^]+?|USING\s*\([^)]*\))(?=\s+(?:INNER |LEFT |RIGHT )?JOIN\b|$)/gi)];
    const firstTable = /^\s*`?(\w+)/.exec(from)?.[1];
    if (joins.length) {
      out.push(`Dane są w kilku tabelach, więc łączymy je relacją: zaczynamy od ${code(firstTable ?? '')} i dołączamy ${list(joins.map((j) => code(j[1])))} przez \`JOIN\`. ${/USING/i.test(from) ? '`USING(kolumna)` działa, gdy klucz ma w obu tabelach tę samą nazwę.' : 'Po `ON` piszemy, które kolumny mają sobie odpowiadać (klucz obcy = klucz główny).'}`);
      if (/\bLEFT\s+JOIN/i.test(from)) out.push('`LEFT JOIN` zostawia wszystkie wiersze z lewej tabeli, nawet jeśli nie mają pary (wtedy pola z prawej będą NULL).');
    } else if (from.includes(',')) out.push(`W \`FROM\` są dwie tabele po przecinku (${code(from)}): wtedy warunek łączący je trzeba dopisać w WHERE.`);
    else out.push(`\`FROM ${firstTable}\`: tabela, z której czytamy.`);
    const where = clause(s, 'WHERE', ['GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT']);
    if (where) { const w = explainWhere(where); out.push(`\`WHERE ${where}\` filtruje wiersze.${w.length ? ' ' + w.map((x) => x[0].toUpperCase() + x.slice(1)).join('. ') + '.' : ''}`); }
    const group = clause(s, 'GROUP BY', ['ORDER BY', 'HAVING', 'LIMIT']);
    if (group) out.push(`\`GROUP BY ${group}\` dzieli wiersze na grupy o tej samej wartości; funkcja agregująca liczy się osobno dla każdej grupy.`);
    const having = clause(s, 'HAVING', ['ORDER BY', 'LIMIT']);
    if (having) out.push(`\`HAVING ${having}\` filtruje całe grupy (po policzeniu). WHERE działa przed grupowaniem, HAVING po nim.`);
    const order = clause(s, 'ORDER BY', ['LIMIT']);
    if (order) out.push(`\`ORDER BY ${order}\` sortuje wynik ${/DESC/i.test(order) ? 'malejąco (DESC)' : 'rosnąco (ASC jest domyślne)'}.`);
    const limit = clause(s, 'LIMIT', []);
    if (limit) out.push(`\`LIMIT ${limit}\` ogranicza wynik do podanej liczby wierszy.`);
  } else if (up.startsWith('UPDATE')) {
    const t = /^UPDATE\s+`?(\w+)/i.exec(s)?.[1];
    const set = clause(s, 'SET', ['WHERE']);
    out.push(`\`UPDATE ${t}\` zmienia istniejące wiersze. Po \`SET\` podajemy nowe wartości: ${code(set ?? '')}.`);
    const where = clause(s, 'WHERE', []);
    out.push(where ? `\`WHERE ${where}\` mówi, których wierszy dotyczy zmiana. Bez WHERE zmieniłyby się wszystkie wiersze tabeli.` : 'Brak WHERE: zmiana dotyczy wszystkich wierszy, tak każe polecenie.');
  } else if (up.startsWith('INSERT')) {
    const t = /INTO\s+`?(\w+)/i.exec(s)?.[1];
    out.push(`\`INSERT INTO ${t}\` dodaje nowy wiersz. ${/\)\s*VALUES/i.test(s) ? 'W nawiasie po nazwie tabeli wypisujemy kolumny, a po VALUES wartości w tej samej kolejności.' : 'Wartości po VALUES muszą być w kolejności kolumn tabeli.'} Teksty i daty bierzemy w apostrofy, liczby piszemy bez nich.`);
    if (/NULL/i.test(s)) out.push('NULL w miejscu klucza z AUTO_INCREMENT pozwala bazie samej nadać numer.');
  } else if (up.startsWith('DELETE')) {
    out.push(`\`DELETE FROM\` usuwa wiersze spełniające warunek ${code(clause(s, 'WHERE', []) ?? '')}. Bez WHERE usunęłoby całą zawartość tabeli.`);
  } else if (up.startsWith('ALTER')) {
    const t = /ALTER\s+TABLE\s+`?(\w+)/i.exec(s)?.[1];
    if (/\bADD\b/i.test(s)) out.push(`\`ALTER TABLE ${t} ADD\` dodaje nową kolumnę: po nazwie podajemy typ (np. VARCHAR(50) to tekst do 50 znaków, INT liczba całkowita).`);
    if (/\bDROP\b/i.test(s)) out.push('`DROP COLUMN` usuwa kolumnę razem z danymi.');
    if (/\b(MODIFY|CHANGE)\b/i.test(s)) out.push('`MODIFY` / `CHANGE` zmienia typ (CHANGE pozwala też zmienić nazwę) istniejącej kolumny.');
  } else if (up.startsWith('CREATE USER')) {
    out.push('`CREATE USER \'nazwa\'@\'localhost\' IDENTIFIED BY \'hasło\'` tworzy konto, które może logować się tylko z tego komputera (localhost).');
  } else if (up.startsWith('GRANT')) {
    out.push(`\`GRANT\` nadaje uprawnienia: przed ON lista operacji (${code(/GRANT\s+(.+?)\s+ON/i.exec(s)?.[1] ?? '')}), po ON baza.tabela (gwiazdka = wszystkie), po TO użytkownik.`);
  } else if (up.startsWith('CREATE VIEW')) {
    out.push('`CREATE VIEW nazwa AS SELECT ...` zapisuje zapytanie jako widok, który potem czyta się jak zwykłą tabelę.');
  } else if (up.startsWith('CREATE TABLE')) {
    out.push('`CREATE TABLE` tworzy tabelę: w nawiasie kolumny z typami, klucz główny (PRIMARY KEY) i ewentualnie AUTO_INCREMENT.');
  }
  return out;
}

/** kwerendy.txt z rozwiazania -> { nr: sql } */
export function parseKwerendy(txt: string): Record<number, string> {
  const out: Record<number, string> = {};
  for (const m of txt.matchAll(/^\s*(?:--\s*)?(?:Zapytanie\s*|Kwerenda\s*)?(\d+)\s*[.):]\s*([\s\S]+?)(?=^\s*(?:--\s*)?(?:Zapytanie\s*|Kwerenda\s*)?\d+\s*[.):]|$(?![\s\S]))/gim)) out[+m[1]] = m[2].trim();
  return out;
}

// ---------------- HTML ----------------
const TAGS: Record<string, string> = {
  header: 'blok nagłówkowy `<header>`', nav: 'blok nawigacji `<nav>`', main: 'blok główny `<main>`', aside: 'blok boczny `<aside>`', footer: 'blok stopki `<footer>`',
  section: 'blok sekcji `<section>`', article: 'blok `<article>`', div: 'blok `<div>`', form: 'formularz `<form>`', table: 'tabela `<table>`', ul: 'lista punktowana `<ul>`',
  ol: 'lista numerowana `<ol>`', h1: 'nagłówek 1. stopnia', h2: 'nagłówek 2. stopnia', h3: 'nagłówek 3. stopnia', h4: 'nagłówek 4. stopnia', h5: 'nagłówek 5. stopnia', h6: 'nagłówek 6. stopnia', p: 'akapit `<p>`',
  img: 'obraz `<img>`', a: 'odnośnik `<a>`', hr: 'linia pozioma `<hr>`', video: 'wideo `<video>`', audio: 'dźwięk `<audio>`', script: 'skrypt `<script>`', button: 'przycisk', select: 'lista rozwijana `<select>`',
  textarea: 'pole tekstowe wielowierszowe', input: 'pole formularza', label: 'etykieta `<label>`', blockquote: 'cytat `<blockquote>`', details: 'rozwijany blok `<details>`', iframe: 'ramka `<iframe>`', span: 'element `<span>`',
};
const tagName = (t: string) => TAGS[t] ?? `element \`<${t}>\``;

function describeElement(html: string): string[] {
  const clean = html.replace(/<\?(?:php|=)[\s\S]*?(\?>|$)/g, '<span data-php="1"></span>');
  const d = new DOMParser().parseFromString(`<body>${clean}</body>`, 'text/html');
  const root = d.body.firstElementChild;
  if (!root) return [];
  const out: string[] = [];
  const t = root.tagName.toLowerCase();
  const attrs = [root.id && `id="${root.id}"`, root.className && typeof root.className === 'string' && `class="${root.className}"`].filter(Boolean);
  out.push(`Dodajemy ${tagName(t)}${attrs.length ? ` z atrybutem ${attrs.join(' i ')}` : ''}.`);
  const parts: string[] = [];
  for (const h of Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6'))) if (h.textContent?.trim()) parts.push(`${tagName(h.tagName.toLowerCase())} „${h.textContent.trim().slice(0, 60)}”`);
  const imgs = Array.from(root.querySelectorAll('img')).filter((i) => i.getAttribute('src'));
  if (imgs.length) parts.push(`${imgs.length > 1 ? `${imgs.length} obrazy` : 'obraz'} ${list(imgs.slice(0, 3).map((i) => `\`${i.getAttribute('src')}\`${i.getAttribute('alt') ? ` (alt „${i.getAttribute('alt')}”)` : ''}`))}`);
  const links = Array.from(root.querySelectorAll('a[href]'));
  if (links.length) parts.push(`odnośniki do ${list([...new Set(links.map((a) => `\`${a.getAttribute('href')}\``))].slice(0, 4))}`);
  for (const l of Array.from(root.querySelectorAll('ul,ol')).slice(0, 2)) { const n = l.querySelectorAll(':scope > li').length; if (n) parts.push(`${tagName(l.tagName.toLowerCase())} z ${n} elementami \`<li>\``); }
  const tbl = root.querySelector('table');
  if (tbl) { const rows = tbl.querySelectorAll('tr').length; parts.push(`tabelę (${rows} wierszy \`<tr>\`, komórki nagłówka \`<th>\`, zwykłe \`<td>\`${tbl.querySelector('[rowspan],[colspan]') ? ', łączenie komórek rowspan/colspan' : ''})`); }
  const inputs = Array.from(root.querySelectorAll('input'));
  if (inputs.length) parts.push(`pola formularza: ${list([...new Set(inputs.map((i) => `\`type="${i.getAttribute('type') ?? 'text'}"\`${i.getAttribute('name') ? ` (name="${i.getAttribute('name')}")` : ''}`))].slice(0, 5))}`);
  const form = root.tagName === 'FORM' ? root : root.querySelector('form');
  if (form) parts.push(`formularz wysyła dane metodą ${(form.getAttribute('method') ?? 'GET').toUpperCase()} do \`${form.getAttribute('action') || 'tej samej strony'}\``);
  if (root.querySelector('button')) parts.push('przycisk `<button>`');
  if (root.querySelector('select')) parts.push('listę rozwijaną `<select>` z opcjami `<option>`');
  if (root.querySelector('video,audio')) parts.push('odtwarzacz multimediów (atrybut controls pokazuje przyciski)');
  if (root.querySelector('hr')) parts.push('linię poziomą `<hr>`');
  const ps = Array.from(root.querySelectorAll('p')).filter((p) => p.textContent?.trim());
  if (ps.length) parts.push(`${ps.length > 1 ? `${ps.length} akapity` : 'akapit'} (np. „${ps[0].textContent!.trim().slice(0, 50)}”)`);
  if (parts.length) out.push(`W środku: ${list(parts)}.`);
  if (root.querySelector('[data-php]')) out.push('Część treści generuje skrypt PHP (opis niżej).');
  return out;
}

// ---------------- PHP ----------------
function explainPhp(src: string): string[] {
  const out: string[] = [];
  const conn = /mysqli_connect\s*\(([^)]*)\)|new\s+mysqli\s*\(([^)]*)\)/i.exec(src);
  if (conn) out.push(`\`${conn[1] !== undefined ? 'mysqli_connect' : 'new mysqli'}(${(conn[1] ?? conn[2]).trim()})\` łączy z serwerem MySQL: host, użytkownik, hasło (puste) i nazwa bazy. Wynik zapisujemy w zmiennej, bo potrzebują go kolejne funkcje.`);
  if (/\$_GET\s*\[/.test(src)) out.push('`$_GET[\'nazwa\']` odczytuje parametr z adresu strony (np. `strona.php?id=5`). Najpierw warto sprawdzić `isset(...)`, żeby nie było ostrzeżenia przy pierwszym wejściu.');
  if (/\$_POST\s*\[/.test(src)) out.push('`$_POST[\'nazwa\']` odczytuje pole wysłane formularzem metodą POST (nazwa = atrybut name w `<input>`).');
  if (/\bisset\s*\(|\bempty\s*\(/.test(src)) out.push('`isset()` / `empty()` sprawdzają, czy dane w ogóle przyszły, zanim ich użyjemy.');
  const q = /\$(\w+)\s*=\s*["']\s*((?:SELECT|INSERT|UPDATE|DELETE)[^"']*)/i.exec(src);
  if (q) out.push(`W zmiennej \`$${q[1]}\` zapisujemy treść zapytania SQL (to samo co w kwerendy.txt, czasem z wartością wstawioną ze zmiennej).`);
  if (/mysqli_query|->query\s*\(/.test(src)) out.push('`mysqli_query($polaczenie, $zapytanie)` wysyła zapytanie do bazy i zwraca wynik (dla SELECT zbiór wierszy).');
  const f = /mysqli_fetch_(assoc|row|array|all)|->fetch_(assoc|row|array|all)/.exec(src);
  if (f) {
    const kind = f[1] ?? f[2];
    out.push(kind === 'all' ? '`fetch_all` pobiera od razu wszystkie wiersze do tablicy, którą przechodzimy pętlą foreach.' : `Pętla \`while ($wiersz = mysqli_fetch_${kind}($wynik))\` pobiera po jednym wierszu, aż się skończą. ${kind === 'assoc' ? '`fetch_assoc` daje tablicę z nazwami kolumn: `$wiersz[\'nazwa\']`.' : kind === 'row' ? '`fetch_row` daje tablicę numerowaną: `$wiersz[0]` to pierwsza kolumna z SELECT.' : '`fetch_array` pozwala używać i nazw kolumn, i numerów.'}`);
  }
  if (/mysqli_num_rows|->num_rows/.test(src)) out.push('`mysqli_num_rows` mówi, ile wierszy zwróciło zapytanie (np. żeby wypisać komunikat, gdy nic nie znaleziono).');
  if (/\becho\b|\bprint\b|<\?=/.test(src)) out.push('`echo` wypisuje HTML do strony. Wartości z bazy wstawiamy w tekst, np. `echo "<li>{$wiersz[\'nazwa\']}</li>";`.');
  if (/\bforeach\b/.test(src)) out.push('`foreach` przechodzi po elementach tablicy.');
  if (/\bfor\s*\(/.test(src)) out.push('Pętla `for` powtarza kod określoną liczbę razy.');
  if (/\bif\s*\(/.test(src)) out.push('Instrukcja `if` wykonuje kod tylko, gdy warunek jest spełniony.');
  if (/\bdate\s*\(/.test(src)) out.push('`date()` zwraca datę/czas w podanym formacie (np. `date("Y-m-d")`).');
  if (/setcookie|\$_COOKIE/.test(src)) out.push('`setcookie()` zapisuje ciasteczko w przeglądarce, `$_COOKIE` je odczytuje (dopiero przy następnym wczytaniu strony).');
  if (/session_start|\$_SESSION/.test(src)) out.push('`session_start()` uruchamia sesję, a `$_SESSION` przechowuje dane między podstronami.');
  if (/mysqli_close|->close\s*\(/.test(src)) out.push('Na końcu `mysqli_close($polaczenie)` zamyka połączenie z bazą (arkusz zwykle tego wymaga).');
  return out;
}

// ---------------- CSS ----------------
const PROPS: Record<string, string> = {
  'background-color': 'kolor tła', background: 'tło', 'background-image': 'obraz tła', color: 'kolor tekstu', 'font-family': 'krój czcionki', 'font-size': 'rozmiar czcionki',
  'font-weight': 'grubość czcionki', 'font-style': 'styl czcionki (np. kursywa)', 'text-align': 'wyrównanie tekstu', 'text-decoration': 'dekoracja tekstu (np. podkreślenie)',
  'text-transform': 'wielkość liter', 'letter-spacing': 'odstępy między literami', 'line-height': 'wysokość linii (interlinia)', 'text-shadow': 'cień tekstu', width: 'szerokość',
  height: 'wysokość', 'min-height': 'minimalna wysokość', 'max-width': 'maksymalna szerokość', margin: 'marginesy zewnętrzne', padding: 'marginesy wewnętrzne', border: 'obramowanie',
  'border-radius': 'zaokrąglenie rogów', float: 'opływanie (ustawienie bloku obok innego)', clear: 'wyłączenie opływania', display: 'sposób wyświetlania', overflow: 'paski przewijania / przycinanie',
  position: 'pozycjonowanie', top: 'odległość od góry', left: 'odległość od lewej', right: 'odległość od prawej', bottom: 'odległość od dołu', opacity: 'przezroczystość',
  transition: 'płynne przejście (animacja zmiany)', 'box-shadow': 'cień bloku', 'list-style-type': 'rodzaj punktora listy', 'list-style-image': 'obrazek jako punktor', cursor: 'wygląd kursora',
  'flex-direction': 'kierunek układu flex', 'justify-content': 'rozmieszczenie w poziomie (flex)', 'align-items': 'wyrównanie w pionie (flex)', 'vertical-align': 'wyrównanie w pionie', transform: 'przekształcenie (np. obrót, skala)',
  animation: 'animacja', 'border-collapse': 'łączenie obramowań komórek tabeli', 'z-index': 'kolejność warstw', 'font-variant': 'wariant czcionki (np. kapitaliki)', 'word-spacing': 'odstępy między wyrazami', 'text-indent': 'wcięcie pierwszego wiersza',
  'margin-top': 'margines zewnętrzny górny', 'margin-bottom': 'margines zewnętrzny dolny', 'margin-left': 'margines zewnętrzny lewy', 'margin-right': 'margines zewnętrzny prawy',
  'padding-top': 'margines wewnętrzny górny', 'padding-bottom': 'margines wewnętrzny dolny', 'padding-left': 'margines wewnętrzny lewy', 'padding-right': 'margines wewnętrzny prawy',
  'border-bottom': 'dolne obramowanie', 'border-top': 'górne obramowanie', 'border-left': 'lewe obramowanie', 'border-right': 'prawe obramowanie', 'grid-template-columns': 'kolumny siatki (grid)', gap: 'odstęp między elementami',
};
function describeSelector(sel: string): string {
  return splitTop(sel).map((x) => {
    let s = x.trim(); const extra: string[] = [];
    const pseudo = /:(hover|active|focus|visited|first-child|last-child|nth-child\([^)]*\)|first-letter|first-line|before|after)/.exec(s);
    if (pseudo) { extra.push({ hover: 'po najechaniu kursorem', active: 'w chwili kliknięcia', focus: 'gdy pole jest aktywne', visited: 'dla odwiedzonych linków', 'first-child': 'tylko pierwszy element', 'last-child': 'tylko ostatni element', 'first-letter': 'pierwsza litera', 'first-line': 'pierwsza linia', before: 'treść wstawiona przed', after: 'treść wstawiona po' }[pseudo[1].replace(/\(.*/, '')] ?? (pseudo[1].startsWith('nth') ? `co n-ty element (${pseudo[1]})` : pseudo[1])); s = s.replace(/::?[\w-]+(\([^)]*\))?/g, ''); }
    const partsDesc = s.split(/\s+/).filter(Boolean).map((p) => p === '*' ? 'wszystkie elementy' : p.startsWith('#') ? `element o id \`${p.slice(1)}\`` : p.startsWith('.') ? `elementy z klasą \`${p.slice(1)}\`` : /\./.test(p) ? `\`<${p.split('.')[0]}>\` z klasą \`${p.split('.')[1]}\`` : `\`<${p}>\``);
    const base = partsDesc.length > 1 ? `${partsDesc[partsDesc.length - 1]} wewnątrz ${partsDesc.slice(0, -1).join(' → ')}` : partsDesc[0] ?? '';
    return extra.length ? `${base} (${extra.join(', ')})` : base;
  }).join('; ');
}
function explainCssRule(sel: string, body: string): string {
  const decl = body.split(';').map((d) => d.trim()).filter(Boolean).map((d) => { const [p, ...v] = d.split(':'); return [p.trim().toLowerCase(), v.join(':').trim()] as const; });
  const ds = decl.map(([p, v]) => `${PROPS[p] ?? p} \`${v}\``);
  return `**${describeSelector(sel)}**: ${list(ds)}.`;
}

// ---------------- JS ----------------
function explainJs(src: string): string[] {
  const out: string[] = [];
  const fn = /function\s+(\w+)\s*\(([^)]*)\)/.exec(src) ?? /(?:const|let|var)\s+(\w+)\s*=\s*(?:function\s*)?\(([^)]*)\)\s*=>?/.exec(src);
  if (fn) out.push(`Funkcja \`${fn[1]}(${fn[2]})\`: kod w środku wykona się dopiero, gdy ktoś ją wywoła (np. kliknięciem przycisku z \`onclick="${fn[1]}()"\`).`);
  const ids = [...new Set([...src.matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]))];
  if (ids.length) out.push(`\`document.getElementById(...)\` znajduje elementy strony po id: ${list(ids.map((i) => `\`${i}\``))}.`);
  if (/querySelector/.test(src)) out.push('`querySelector` / `querySelectorAll` szukają elementów po selektorze CSS.');
  if (/\.value\b/.test(src)) out.push('`.value` odczytuje to, co użytkownik wpisał/wybrał w polu formularza (zawsze jako tekst).');
  if (/\.checked\b/.test(src)) out.push('`.checked` mówi, czy pole wyboru / przycisk radiowy jest zaznaczony.');
  if (/parseInt|parseFloat|Number\(/.test(src)) out.push('`parseInt` / `parseFloat` / `Number` zamieniają tekst na liczbę, żeby dało się liczyć.');
  if (/innerHTML|textContent|innerText/.test(src)) out.push('`innerHTML` / `textContent` wpisują wynik do elementu strony.');
  if (/\.style\./.test(src)) out.push('`element.style.właściwość = ...` zmienia styl elementu z poziomu skryptu.');
  if (/classList/.test(src)) out.push('`classList.add/remove/toggle` dodaje lub zdejmuje klasę CSS.');
  if (/addEventListener|onclick|onchange|oninput/.test(src)) out.push('Zdarzenie (kliknięcie, zmiana pola) uruchamia funkcję.');
  if (/\bfor\s*\(|\bwhile\s*\(|forEach/.test(src)) out.push('Pętla powtarza instrukcje dla kolejnych elementów lub liczb.');
  if (/\bif\s*\(/.test(src)) out.push('`if / else` wybiera, co zrobić w zależności od warunku.');
  if (/Math\.\w+/.test(src)) out.push(`Funkcje \`Math\` (${[...new Set([...src.matchAll(/Math\.(\w+)/g)].map((m) => m[1]))].join(', ')}) liczą zaokrąglenia, losowanie itp.`);
  if (/alert\(/.test(src)) out.push('`alert()` pokazuje okienko z komunikatem.');
  if (/createElement|appendChild/.test(src)) out.push('`createElement` + `appendChild` tworzą nowe elementy i dokładają je do strony.');
  if (/setInterval|setTimeout/.test(src)) out.push('`setInterval` / `setTimeout` uruchamiają kod co pewien czas / po opóźnieniu.');
  if (/localStorage/.test(src)) out.push('`localStorage` zapamiętuje dane w przeglądarce na stałe.');
  return out;
}

// ---------------- dzielenie plikow na bloki ----------------
type Block = { from: number; to: number; wrap?: boolean };
const ind = (l: string) => l.length - l.trimStart().length;
/** HTML/PHP: [glowa do <body>], potem bloki najwyzszego poziomu w <body>, na koncu zamkniecie. */
function htmlBlocks(lines: string[]): { head: Block; blocks: Block[]; tail: Block } | null {
  const b = lines.findIndex((l) => /<body\b/i.test(l));
  const e = lines.findIndex((l, i) => i > b && /<\/body>/i.test(l));
  if (b < 0 || e < 0) return null;
  const inner = lines.slice(b + 1, e).map((l, i) => ({ l, i: b + 1 + i })).filter((x) => x.l.trim());
  if (!inner.length) return { head: { from: 0, to: b }, blocks: [], tail: { from: e, to: lines.length - 1 } };
  const base = Math.min(...inner.map((x) => ind(x.l)));
  const starts = inner.filter((x) => ind(x.l) === base && !/^\s*<\//.test(x.l) && !/^\s*\?>/.test(x.l) && !/^\s*}/.test(x.l)).map((x) => x.i);
  const top: Block[] = starts.map((s, k) => ({ from: s, to: (starts[k + 1] ?? e) - 1 }));
  for (const bl of top) while (bl.to > bl.from && !lines[bl.to].trim()) bl.to--;
  // duze bloki-opakowania (np. <div id="kontener"> z calym ukladem) dzielimy na dzieci
  const split = (bl: Block, depth: number): Block[] => {
    if (depth > 3 || bl.to - bl.from < 16 || !/^\s*<[a-z]/i.test(lines[bl.from]) || /<\?php/.test(lines[bl.from])) return [bl];
    const inner = [] as { l: string; i: number }[];
    for (let i = bl.from + 1; i < bl.to; i++) if (lines[i].trim()) inner.push({ l: lines[i], i });
    if (!inner.length || !/^\s*<\//.test(lines[bl.to])) return [bl];
    const mi = Math.min(...inner.map((x) => ind(x.l)));
    const st = inner.filter((x) => ind(x.l) === mi && !/^\s*<\//.test(x.l)).map((x) => x.i);
    if (st.length < 2 || st.some((i) => !/^\s*<[a-z!]/i.test(lines[i]))) return [bl];
    const kids: Block[] = st.map((s0, k) => ({ from: s0, to: (st[k + 1] ?? bl.to) - 1 }));
    for (const k of kids) while (k.to > k.from && !lines[k.to].trim()) k.to--;
    kids[kids.length - 1].to = bl.to; // zamkniecie opakowania razem z ostatnim dzieckiem
    return [{ from: bl.from, to: st[0] - 1, wrap: true }, ...kids.flatMap((k) => split(k, depth + 1))];
  };
  const blocks = top.flatMap((bl) => split(bl, 0));
  return { head: { from: 0, to: b }, blocks, tail: { from: e, to: lines.length - 1 } };
}
function cssRules(src: string): { sel: string; body: string; from: number; to: number }[] {
  const out: { sel: string; body: string; from: number; to: number }[] = [];
  let depth = 0, start = 0, buf = '', line = 1, startLine = 1;
  const clean = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '\n') line++;
    if (depth === 0 && !buf.trim() && ch.trim()) { startLine = line; start = i; }
    buf += ch;
    if (ch === '{') depth++;
    if (ch === '}') { depth--; if (depth === 0) { const t = clean.slice(start, i + 1); const m = /^([^{]+)\{([\s\S]*)\}$/.exec(t.trim()); if (m) out.push({ sel: m[1].trim(), body: m[2].trim(), from: startLine, to: line }); buf = ''; } }
  }
  return out;
}
function jsBlocks(lines: string[]): Block[] {
  const out: Block[] = []; let depth = 0, cur: number | null = null;
  lines.forEach((l, i) => {
    if (cur === null && l.trim() && !/^\s*\/\//.test(l)) cur = i;
    for (const ch of l.replace(/(['"`]).*?\1/g, '')) { if (ch === '{') depth++; if (ch === '}') depth--; }
    if (cur !== null && depth === 0 && (/[};]\s*$/.test(l) || !l.trim())) { out.push({ from: cur, to: i }); cur = null; }
  });
  if (cur !== null) out.push({ from: cur, to: lines.length - 1 });
  // laczymy drobne linie (deklaracje zmiennych) z nastepnym blokiem
  const merged: Block[] = [];
  for (const b of out) { const last = merged[merged.length - 1]; if (last && last.to - last.from < 2 && b.from - last.to <= 2) last.to = b.to; else merged.push({ ...b }); }
  return merged;
}

// ---------------- budowa krokow ----------------
export type BuildIn = { sheet: Sheet; reqs: Reqs | null; tasks: QueryTask[]; sol: Record<string, string>; dbName: string | null };

export function buildSteps({ sheet, reqs, tasks, sol, dbName }: BuildIn): Step[] {
  const steps: Step[] = [];
  const files = Object.keys(sol);
  const order = (reqs?.files ?? []).filter((f) => files.includes(f));
  const pages = [...order.filter((f) => /\.(html?|php)$/i.test(f)), ...files.filter((f) => /\.(html?|php)$/i.test(f) && !order.includes(f))];
  const cssFiles = files.filter((f) => f.endsWith('.css'));
  const jsFiles = files.filter((f) => f.endsWith('.js'));
  const snap: Record<string, string> = {};
  const push = (s: Step) => steps.push({ ...s, snapshot: { ...snap } });

  // START
  const pw = sheet.files.archivePassword;
  push({ stage: 'Start', title: 'Folder i pliki z archiwum', text: [
    'Na pulpicie tworzymy folder nazwany **numerem zdającego** (PESEL). Wszystko, co powstanie w trakcie egzaminu, zapisujemy właśnie tam: strony, style, zrzuty, kwerendy.txt, grafiki.',
    pw ? `Rozpakowujemy archiwum z pulpitu (hasło: \`${pw}\`, uwaga na wielkość liter i znaki specjalne). Pliki graficzne i ewentualne pliki tekstowe z archiwum kopiujemy do swojego folderu.` : 'Rozpakowujemy archiwum z pulpitu do swojego folderu.',
    reqs?.files.length ? `Na końcu w folderze ma być: ${list(reqs.files.map((f) => `\`${f}\``))}${reqs.graphicsCount ? ` oraz ${reqs.graphicsCount} plików graficznych z archiwum` : ''}. Warto mieć tę listę przed oczami od początku.` : '',
  ].filter(Boolean) });

  // BAZA
  const imp = reqs?.shots.find((s) => s.import);
  const kw = Object.keys(sol).find((f) => /^kwerendy\.txt$/i.test(f));
  if (dbName || tasks.length) {
    push({ stage: 'Baza danych', title: 'Utworzenie bazy i import', text: [
      `W phpMyAdmin (localhost/phpmyadmin) klikamy „Nowa”, wpisujemy nazwę bazy${dbName ? ` (w arkuszu: \`${dbName}\`)` : ''} i wybieramy kodowanie z polecenia (np. utf8_polish_ci / utf8_unicode_ci).`,
      `Wchodzimy w nową bazę → zakładka „Import” → „Wybierz plik” → plik .sql z archiwum → „Wykonaj”. Po imporcie po lewej widać tabele${sheet.assets?.sql ? ` z pliku \`${sheet.assets.sql}\`` : ''}.`,
      imp ? `Robimy zrzut **całego ekranu** z paskiem zadań (klawisz PrtSc, wklejamy w Paint) i zapisujemy jako \`${imp.name}.${imp.ext}\` (format ${imp.ext.toUpperCase()}: wybierz go w „Zapisz jako”, sama zmiana nazwy nie wystarczy).` : 'Jeśli arkusz tego wymaga, robimy zrzut ekranu po imporcie (cały ekran, z paskiem zadań).',
    ] });
  }
  const sols = kw ? parseKwerendy(sol[kw]) : {};
  const shotName = (n: number) => reqs?.shots.find((s) => new RegExp(`^(kw|kwerenda)${n}$`, 'i').test(s.name));
  let kwTxt = '';
  for (const t of tasks) {
    const q = sols[t.n];
    if (!q) continue;
    kwTxt += `${t.n}. ${q}\n`;
    snap['kwerendy.txt'] = kwTxt;
    const sh = shotName(t.n);
    push({ stage: 'Baza danych', title: `Zapytanie ${t.n}`, task: t.text, sql: q, file: 'kwerendy.txt', lang: 'sql', code: kwTxt.trimEnd(), from: kwTxt.trimEnd().split('\n').length - q.split('\n').length + 1, to: kwTxt.trimEnd().split('\n').length,
      text: [...explainSql(q), `Kwerendę wykonujemy w zakładce SQL w phpMyAdmin, sprawdzamy wynik, a potem dopisujemy ją do \`kwerendy.txt\`${sh ? ` i robimy zrzut ekranu z wynikiem jako \`${sh.name}.${sh.ext}\`` : ''}.`] });
  }

  // GRAFIKA
  for (const g of reqs?.graphics ?? []) {
    const txt: string[] = [];
    const src = g.names.find((n) => sheet.assets?.files.includes(n) && n !== g.out);
    txt.push(`Otwieramy ${src ? `\`${src}\`` : 'plik z archiwum'} w programie graficznym (na egzaminie zwykle GIMP).`);
    if (/wykadr|kadr/i.test(g.text)) txt.push('Kadrowanie: narzędzie „Kadrowanie” (Shift+C), zaznaczamy obszar i w opcjach narzędzia wpisujemy dokładny rozmiar.');
    if (/lustr|odbic|przerzu/i.test(g.text)) txt.push('Odbicie lustrzane: Obraz → Przekształcenie → Odbij poziomo (względem osi pionowej) albo pionowo.');
    if (/obr[oó]ć|obrot/i.test(g.text)) txt.push('Obrót: Obraz → Przekształcenie → Obróć o 90° (w odpowiednią stronę).');
    if (g.w || g.h) txt.push(`Skalowanie: Obraz → Skaluj obraz. ${g.ratio ? 'Łańcuszek przy wymiarach zostaje zamknięty (zachowanie proporcji), ' : 'Odpinamy łańcuszek, '}wpisujemy ${[g.w && `szerokość ${g.w} px`, g.h && `wysokość ${g.h} px`].filter(Boolean).join(' i ')}${g.ratio ? ', drugi wymiar przeliczy się sam' : ''}.`);
    if (g.transparent) txt.push('Przezroczystość: Warstwa → Przezroczystość → Dodaj kanał alfa, potem Kolory → Kolor na alfa (wybieramy kolor tła, np. biały). JPG nie obsługuje przezroczystości, więc zapisujemy PNG albo GIF.');
    if (g.gif) txt.push(`Animacja GIF: każda klatka to osobna warstwa (Plik → Otwórz jako warstwy). Plik → Eksportuj jako → nazwa \`${g.out ?? 'animacja.gif'}\` → zaznaczamy „Jako animację”${g.loop ? ' i „Pętla nieskończona”' : ''}${g.delay ? `, opóźnienie między klatkami ${g.delay} ms` : ''}${/jedna klatka na warstwę/i.test(g.text) ? ', tryb „jedna klatka na warstwę (zastąpienie)”' : ''}.`);
    if (/zrzut/i.test(g.text)) { const sh = reqs?.shots.find((s) => !s.import && !/^kw/i.test(s.name)); if (sh) txt.push(`Okno z ustawieniami eksportu fotografujemy (cały ekran) i zapisujemy jako \`${sh.name}.${sh.ext}\`.`); }
    if (!g.gif) txt.push(`Plik → Eksportuj jako → \`${g.out ?? 'nazwa z arkusza'}\` do swojego folderu (rozszerzenie decyduje o formacie).`);
    push({ stage: 'Grafika', title: `Grafika ${g.out ?? ''}`.trim(), text: [...txt, `Pełne wymagania z arkusza: ${g.text.slice(0, 500)}`] });
  }

  // STRONY
  for (const p of pages) {
    const lines = sol[p].split('\n');
    const bl = htmlBlocks(lines);
    const isPhp = p.endsWith('.php');
    if (!bl) { snap[p] = sol[p]; push({ stage: 'Strona', title: p, file: p, lang: isPhp ? 'php' : 'html', code: sol[p], from: 1, to: lines.length, text: isPhp ? explainPhp(sol[p]) : [`Plik ${p}.`] }); continue; }
    const tail = lines.slice(bl.tail.from).join('\n');
    const upTo = (to: number) => lines.slice(0, to + 1).join('\n') + '\n' + tail;
    const head = lines.slice(0, bl.head.to + 1).join('\n');
    const d = new DOMParser().parseFromString(sol[p].replace(/<\?(?:php|=)[\s\S]*?(\?>|$)/g, ''), 'text/html');
    const css = Array.from(d.querySelectorAll('link[rel="stylesheet"]')).map((l) => l.getAttribute('href'));
    const preHead = /^\s*<\?php/.test(sol[p]) ? ['Na samej górze pliku jest kod PHP, który wykona się przed wysłaniem HTML (np. obsługa formularza lub ciasteczek).', ...explainPhp(head.split(/<!doctype/i)[0])] : [];
    snap[p] = upTo(bl.head.to);
    push({ stage: 'Strona', title: `${p}: szkielet i nagłówek dokumentu`, file: p, lang: isPhp ? 'php' : 'html', code: snap[p], from: 1, to: bl.head.to + 1, text: [
      `Tworzymy plik \`${p}\` w swoim folderze${isPhp ? ' (rozszerzenie .php, bo strona ma skrypt PHP)' : ''}. W edytorze wystarczy wpisać \`!\` i Tab, żeby dostać szablon HTML5.`,
      `\`<!DOCTYPE html>\` oznacza HTML5. \`<html lang="${d.documentElement.getAttribute('lang') ?? 'pl'}">\` deklaruje język polski, \`<meta charset="UTF-8">\` kodowanie polskich znaków.`,
      d.title ? `\`<title>${d.title}</title>\` to tytuł na karcie przeglądarki: musi być dokładnie taki jak w arkuszu.` : '',
      css.length ? `\`<link rel="stylesheet" href="${css[0]}">\` podłącza zewnętrzny arkusz stylów.` : '',
      ...preHead,
    ].filter(Boolean) });
    for (const b of bl.blocks) {
      const chunk = lines.slice(b.from, b.to + 1).join('\n');
      snap[p] = upTo(b.to);
      const hasPhp = /<\?(php|=)/.test(chunk);
      const desc = /^\s*<\?php/.test(lines[b.from]) ? ['Blok kodu PHP:'] : b.wrap ? [`Otwieramy ${tagName(/^\s*<(\w+)/.exec(lines[b.from])?.[1]?.toLowerCase() ?? 'div')}${/id=["']([^"']+)/.exec(lines[b.from]) ? ` o id \`${/id=["']([^"']+)/.exec(lines[b.from])![1]}\`` : /class=["']([^"']+)/.exec(lines[b.from]) ? ` z klasą \`${/class=["']([^"']+)/.exec(lines[b.from])![1]}\`` : ''}: to opakowanie, w którym ułożymy kolejne bloki (dzięki niemu CSS może ustawić je obok siebie). W kolejnych krokach wypełniamy je po kolei.`] : describeElement(chunk);
      const tag = /^\s*<(\w+)/.exec(lines[b.from])?.[1]?.toLowerCase();
      push({ stage: 'Strona', title: `${p}: ${b.wrap ? 'opakowanie ' : ''}${tag ? tagName(tag).replace(/`/g, '') : 'skrypt PHP'}`, file: p, lang: isPhp ? 'php' : 'html', code: snap[p], from: b.from + 1, to: b.to + 1,
        text: [...desc, ...(hasPhp ? explainPhp(chunk) : []), ...(/<script/i.test(chunk) ? explainJs(chunk) : [])] });
    }
    snap[p] = sol[p];
  }

  // CSS
  for (const c of cssFiles) {
    const rules = cssRules(sol[c]);
    const lines = sol[c].split('\n');
    for (let i = 0; i < rules.length; i += 3) {
      const grp = rules.slice(i, i + 3);
      const to = grp[grp.length - 1].to;
      snap[c] = lines.slice(0, to).join('\n');
      push({ stage: 'Style CSS', title: `${c}: ${grp.map((r) => r.sel.replace(/\s+/g, ' ')).join(', ').slice(0, 60)}`, file: c, lang: 'css', code: snap[c], from: grp[0].from, to,
        text: [...(i === 0 ? [`Tworzymy plik \`${c}\` (ta sama nazwa co w \`<link>\`). Reguła = selektor + właściwości w klamrach.`] : []), ...grp.map((r) => explainCssRule(r.sel, r.body))] });
    }
    snap[c] = sol[c];
  }

  // JS
  for (const j of jsFiles) {
    const lines = sol[j].split('\n');
    const bls = jsBlocks(lines);
    bls.forEach((b, k) => {
      snap[j] = lines.slice(0, b.to + 1).join('\n');
      const ex = explainJs(lines.slice(b.from, b.to + 1).join('\n'));
      push({ stage: 'Skrypt JS', title: `${j}: część ${k + 1}`, file: j, lang: 'js', code: snap[j], from: b.from + 1, to: b.to + 1, text: [...(k === 0 ? [`Plik \`${j}\` podłączamy w HTML przez \`<script src="${j}"></script>\` (najlepiej na końcu body, żeby elementy strony już istniały).`] : []), ...(ex.length ? ex : ['Zmienne i instrukcje pomocnicze.'])] });
    });
    snap[j] = sol[j];
  }

  // ODDANIE
  push({ stage: 'Oddanie', title: 'Sprawdzenie i oddanie pracy', text: [
    'Otwieramy każdą stronę w przeglądarce (dla PHP przez localhost, nie przez dwuklik w pliku) i porównujemy z ilustracjami z arkusza: układ, kolory, teksty, działanie skryptów.',
    reqs?.files.some((f) => /^przegl/i.test(f)) ? 'Tworzymy plik `przeglądarka.txt` z nazwą przeglądarki, w której sprawdzaliśmy stronę.' : '',
    reqs?.files.length ? `Sprawdzamy, czy w folderze są wszystkie pliki: ${list(reqs.files.map((f) => `\`${f}\``))}.` : '',
    'Na koniec możesz to samo zrobić tutaj: „Rozwiązuję samodzielnie” → warsztat, a potem sprawdzarka jak egzaminator.',
  ].filter(Boolean) });
  return steps;
}
