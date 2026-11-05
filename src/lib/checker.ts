import type { Check } from '../data/lessons';
import type { Sheet } from './types';
import { freshDb, run, sameResult } from './sql';
import { buildSrcDoc } from './preview';

export type CheckResult = { label: string; ok: boolean; note?: string; points?: number; manual?: boolean };

function parse(html: string) { return new DOMParser().parseFromString(html, 'text/html'); }

/** Renderuje strone w ukrytym iframe, zeby skrypty mogly zbudowac DOM, i zwraca dokument. */
async function renderDom(files: Record<string, string>): Promise<Document> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    iframe.style.cssText = 'position:fixed;width:800px;height:600px;left:-9999px;top:0;opacity:0';
    iframe.srcdoc = buildSrcDoc(files);
    document.body.appendChild(iframe);
    iframe.onload = () => setTimeout(() => { const d = iframe.contentDocument!; const clone = parse(d.documentElement.outerHTML); iframe.remove(); resolve(clone); }, 250);
  });
}

export async function runLessonChecks(checks: Check[], files: Record<string, string>, db?: string): Promise<CheckResult[]> {
  const out: CheckResult[] = [];
  const needsRender = checks.some((c) => c.kind === 'dom');
  const doc = needsRender ? (files['index.html']?.includes('<script') ? await renderDom(files) : parse(files['index.html'] ?? '')) : null;
  for (const c of checks) {
    if (c.kind === 'dom') {
      const els = Array.from(doc!.querySelectorAll(c.selector));
      const matching = c.textIncludes ? els.filter((e) => e.textContent?.toLowerCase().includes(c.textIncludes!.toLowerCase())) : els;
      out.push({ label: c.label, ok: matching.length >= (c.min ?? 1), note: `znaleziono ${matching.length}` });
    } else if (c.kind === 'regex') {
      const ok = new RegExp(c.pattern, c.flags ?? '').test(files[c.file] ?? '');
      out.push({ label: c.label, ok });
    } else if (c.kind === 'sql') {
      const user = Object.values(files)[0] ?? '';
      try {
        const a = await freshDb(db); const b = await freshDb(db);
        const ra = run(a, user).results; const rb = run(b, c.expected).results;
        const ok = sameResult(ra[ra.length - 1], rb[rb.length - 1]);
        out.push({ label: c.label, ok, note: ok ? undefined : 'Wynik różni się od oczekiwanego (sprawdź kolumny, warunki, sortowanie).' });
      } catch (e) {
        out.push({ label: c.label, ok: false, note: 'Błąd SQL: ' + (e as Error).message });
      }
    }
  }
  return out;
}

// ---------- Sprawdzarka arkuszy (heurystyczna, treningowa) ----------
type Rule = { label: string; points: number; test: (f: Record<string, string>, d: Document) => boolean };
const all = (f: Record<string, string>, ext: string) => Object.entries(f).filter(([k]) => k.endsWith(ext)).map(([, v]) => v).join('\n');
const has = (re: RegExp) => (s: string) => re.test(s);

const TAG_RULES: { match: RegExp; rule: Rule }[] = [
  { match: /HTML: formularz/, rule: { label: 'Jest formularz z polami', points: 2, test: (_f, d) => !!d.querySelector('form') && d.querySelectorAll('input, select, textarea').length > 0 } },
  { match: /rowspan|colspan/, rule: { label: 'Tabela z łączeniem komórek', points: 1, test: (_f, d) => !!d.querySelector('[rowspan],[colspan]') } },
  { match: /favicon/, rule: { label: 'Favicon dołączony', points: 1, test: (_f, d) => !!d.querySelector('link[rel~="icon"]') } },
  { match: /odtwarzacz wideo/, rule: { label: 'Osadzone wideo', points: 1, test: (_f, d) => !!d.querySelector('video') } },
  { match: /CSS: pseudoklasy/, rule: { label: 'Pseudoklasy w CSS', points: 1, test: (f) => has(/:(hover|active|focus|visited|nth-child|first-child|last-child)/)(all(f, '.css')) } },
  { match: /CSS: pseudoelementy/, rule: { label: 'Pseudoelementy w CSS', points: 1, test: (f) => has(/::?(first-letter|first-line|before|after)/)(all(f, '.css')) } },
  { match: /transition/, rule: { label: 'transition w CSS', points: 1, test: (f) => has(/transition\s*:/)(all(f, '.css')) } },
  { match: /@keyframes/, rule: { label: 'Animacja @keyframes', points: 1, test: (f) => has(/@keyframes/)(all(f, '.css')) } },
  { match: /@media/, rule: { label: 'Reguła @media', points: 1, test: (f) => has(/@media/)(all(f, '.css')) } },
  { match: /position/, rule: { label: 'Pozycjonowanie position', points: 1, test: (f) => has(/position\s*:\s*(absolute|relative|fixed|sticky)/)(all(f, '.css')) } },
  { match: /@font-face/, rule: { label: '@font-face', points: 1, test: (f) => has(/@font-face/)(all(f, '.css')) } },
  { match: /JS: modyfikacja danych|JS: algorytmy|JS: operacje/, rule: { label: 'Skrypt JS odczytuje i zmienia treść', points: 2, test: (f, d) => has(/getElementById|querySelector/)(all(f, '.js') + Array.from(d.querySelectorAll('script')).map((s) => s.textContent).join('')) } },
  { match: /JS: modyfikacja stylów/, rule: { label: 'JS zmienia style', points: 1, test: (f) => has(/\.style\./)(all(f, '.js') + all(f, '.html')) } },
  { match: /JS: pokazywanie/, rule: { label: 'JS ukrywa/pokazuje elementy', points: 1, test: (f) => has(/display\s*=|classList\.toggle|hidden/)(all(f, '.js') + all(f, '.html')) } },
  { match: /createElement/, rule: { label: 'createElement / appendChild', points: 1, test: (f) => has(/createElement|appendChild|\.append\(/)(all(f, '.js') + all(f, '.html')) } },
  { match: /localStorage/, rule: { label: 'localStorage', points: 1, test: (f) => has(/localStorage/)(all(f, '.js') + all(f, '.html')) } },
  { match: /PHP: odbieranie danych formularza \(POST\)/, rule: { label: 'PHP odbiera $_POST', points: 2, test: (f) => has(/\$_POST\s*\[/)(all(f, '.php')) } },
  { match: /PHP: odbieranie danych z paska/, rule: { label: 'PHP odbiera $_GET', points: 1, test: (f) => has(/\$_GET\s*\[/)(all(f, '.php')) } },
  { match: /PHP: obsługa ciasteczek/, rule: { label: 'Ciasteczka (setcookie/$_COOKIE)', points: 1, test: (f) => has(/setcookie|\$_COOKIE/)(all(f, '.php')) } },
  { match: /PHP: obsługa sesji/, rule: { label: 'Sesja $_SESSION', points: 1, test: (f) => has(/session_start/)(all(f, '.php')) } },
  { match: /PHP: funkcje daty/, rule: { label: 'Funkcja date() w PHP', points: 1, test: (f) => has(/\bdate\s*\(/)(all(f, '.php')) } },
  { match: /SQL: wyświetlanie/, rule: { label: 'Kwerenda SELECT w kwerendy.txt', points: 2, test: (f) => has(/\bSELECT\b/i)(f['kwerendy.txt'] ?? '') } },
  { match: /SQL: wstawianie/, rule: { label: 'Kwerenda INSERT', points: 1, test: (f) => has(/\bINSERT\s+INTO\b/i)(f['kwerendy.txt'] ?? '') } },
  { match: /SQL: modyfikacja danych/, rule: { label: 'Kwerenda UPDATE', points: 1, test: (f) => has(/\bUPDATE\b[\s\S]*\bSET\b/i)(f['kwerendy.txt'] ?? '') } },
  { match: /SQL: usuwanie danych/, rule: { label: 'Kwerenda DELETE', points: 1, test: (f) => has(/\bDELETE\s+FROM\b/i)(f['kwerendy.txt'] ?? '') } },
  { match: /SQL: modyfikacja struktury/, rule: { label: 'Kwerenda ALTER TABLE', points: 1, test: (f) => has(/\bALTER\s+TABLE\b/i)(f['kwerendy.txt'] ?? '') } },
  { match: /SQL: funkcje agregujące/, rule: { label: 'Funkcja agregująca', points: 1, test: (f) => has(/\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i)(f['kwerendy.txt'] ?? '') } },
  { match: /SQL: grupowanie/, rule: { label: 'GROUP BY', points: 1, test: (f) => has(/\bGROUP\s+BY\b/i)(f['kwerendy.txt'] ?? '') } },
  { match: /SQL: relacja/, rule: { label: 'Złączenie JOIN', points: 1, test: (f) => has(/\bJOIN\b|WHERE[^;]*\w+\.\w+\s*=\s*\w+\.\w+/i)(f['kwerendy.txt'] ?? '') } },
  { match: /SQL: tworzenie użytkownika/, rule: { label: 'CREATE USER', points: 1, test: (f) => has(/\bCREATE\s+USER\b/i)(f['kwerendy.txt'] ?? '') } },
  { match: /SQL: nadawanie uprawnień/, rule: { label: 'GRANT', points: 1, test: (f) => has(/\bGRANT\b/i)(f['kwerendy.txt'] ?? '') } },
  { match: /SQL: tworzenie tabeli/, rule: { label: 'CREATE TABLE', points: 1, test: (f) => has(/\bCREATE\s+TABLE\b/i)(f['kwerendy.txt'] ?? '') } },
];

const BASE_RULES: Rule[] = [
  { label: 'Deklaracja <!DOCTYPE html>', points: 1, test: (f) => /<!doctype html>/i.test(f['index.html'] ?? '') },
  { label: 'Język strony lang="pl"', points: 1, test: (_f, d) => d.documentElement.getAttribute('lang') === 'pl' },
  { label: 'Kodowanie UTF-8', points: 1, test: (_f, d) => /utf-8/i.test(d.querySelector('meta[charset]')?.getAttribute('charset') ?? '') },
  { label: 'Tytuł strony <title>', points: 1, test: (_f, d) => !!d.querySelector('title')?.textContent?.trim() },
  { label: 'Zewnętrzny arkusz CSS podłączony', points: 1, test: (_f, d) => !!d.querySelector('link[rel="stylesheet"]') },
  { label: 'Wszystkie obrazy mają alt', points: 1, test: (_f, d) => Array.from(d.querySelectorAll('img')).every((i) => i.hasAttribute('alt')) },
];

const PHP_RULES: Rule[] = [
  { label: 'Połączenie mysqli_connect', points: 1, test: (f) => /mysqli_connect\s*\(|new\s+mysqli\s*\(/.test(all(f, '.php')) },
  { label: 'Zapytanie mysqli_query', points: 1, test: (f) => /mysqli_query\s*\(|->query\s*\(/.test(all(f, '.php')) },
  { label: 'Pobieranie wierszy (fetch)', points: 1, test: (f) => /mysqli_fetch_(assoc|row|array)|->fetch_/.test(all(f, '.php')) },
  { label: 'Zamknięcie połączenia', points: 1, test: (f) => /mysqli_close\s*\(|->close\s*\(/.test(all(f, '.php')) },
];

export async function checkSheet(sheet: Sheet, files: Record<string, string>): Promise<{ results: CheckResult[]; manual: CheckResult[] }> {
  const htmlEntry = files['index.html'] ?? Object.entries(files).find(([k]) => k.endsWith('.html') || k.endsWith('.php'))?.[1] ?? '';
  const doc = parse(htmlEntry.replace(/<\?php[\s\S]*?\?>/g, ''));
  const rules: Rule[] = [...BASE_RULES];
  const seen = new Set<string>();
  for (const t of sheet.tags) {
    const full = `${t.group}: ${t.label}`;
    for (const r of TAG_RULES) if (r.match.test(full) && !seen.has(r.rule.label)) { rules.push(r.rule); seen.add(r.rule.label); }
  }
  if (sheet.language.includes('PHP')) rules.push(...PHP_RULES);
  const results = rules.map((r) => { let ok = false; try { ok = r.test(files, doc); } catch { ok = false; } return { label: r.label, ok, points: r.points }; });
  const manual: CheckResult[] = [
    ...sheet.tags.filter((t) => t.group === 'Grafika').map((t) => ({ label: `Grafika: ${t.label}`, ok: false, points: 1, manual: true })),
    { label: 'Wygląd zgodny z obrazem w arkuszu (kolory, układ, rozmiary)', ok: false, points: 3, manual: true },
    { label: 'Zrzuty ekranu kwerend zapisane i podpisane', ok: false, points: 1, manual: true },
    { label: 'Pliki nazwane i zapisane w folderze zgodnie z poleceniem', ok: false, points: 1, manual: true },
  ];
  return { results, manual };
}
