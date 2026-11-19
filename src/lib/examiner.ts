// Sprawdzarka „jak egzaminator”: pliki i folder, kwerendy (wynik vs rozwiazanie), zrzuty ekranu,
// grafika/GIF (wymiary, przezroczystosc, klatki, czas), strona (wykonany PHP, tresci z arkusza, kolory),
// wyglad porownany z ilustracja z arkusza. Wymagania: src/data/sheet_reqs.json (scripts/extract_reqs.py).
import type { Sheet } from './types';
import type { QueryResult } from './sql';
import { TAG_RULES, PHP_RULES } from './checker';
import { buildSrcDoc } from './preview';
import { inlineAssets } from './assetsStore';
import { loadQueries, checkQuery, getSolutions, freshFromDump } from './queries';

export type Group = 'Pliki i folder' | 'Kwerendy' | 'Zrzuty ekranu' | 'Grafika' | 'Strona' | 'Wygląd';
export type Item = {
  group: Group; label: string; points: number;
  ok: boolean | null; // null = do sprawdzenia recznie
  note?: string; thumb?: string; user?: QueryResult; expected?: QueryResult;
  compare?: { mine: string; sheet: string; pct: number; caption: string };
};
type Shot = { name: string; ext: string; whole: boolean; import: boolean };
type Gfx = { text: string; names: string[]; out: string | null; w: number | null; h: number | null; ratio: boolean; transparent: boolean; gif: boolean; delay: number | null; loop: boolean };
export type Reqs = { shots: Shot[]; files: string[]; graphicsCount: number; graphics: Gfx[]; colors: string[]; quotes: string[]; author: boolean; looks: { file: string; caption: string }[] };

let reqsP: Promise<Record<string, Reqs>> | null = null;
export const loadReqs = () => (reqsP ??= import('../data/sheet_reqs.json').then((m) => m.default as unknown as Record<string, Reqs>));

const IMG_EXT = /\.(png|jpe?g|gif|bmp|webp|svg|ico)$/i;
const lower = (s: string) => s.toLowerCase();

// ---------- obrazy ----------
const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('nie da się otworzyć obrazu')); i.src = src; });
const mimeOf = (dataUrl: string) => /^data:([^;,]+)/.exec(dataUrl)?.[1] ?? '';
function bytesOf(dataUrl: string) {
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bin = atob(b64); const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}
function realFormat(u: Uint8Array) {
  if (u[0] === 0x89 && u[1] === 0x50) return 'png';
  if (u[0] === 0xff && u[1] === 0xd8) return 'jpg';
  if (u[0] === 0x47 && u[1] === 0x49) return 'gif';
  if (u[0] === 0x42 && u[1] === 0x4d) return 'bmp';
  if (u[8] === 0x57 && u[9] === 0x45) return 'webp';
  return '?';
}
function hasAlpha(img: HTMLImageElement) {
  const c = document.createElement('canvas'); const w = Math.min(img.naturalWidth, 400), h = Math.min(img.naturalHeight, 400);
  c.width = w; c.height = h; const x = c.getContext('2d')!; x.drawImage(img, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return true;
  return false;
}
/** Naglowki GIF: liczba klatek, opoznienia (ms), zapetlenie (NETSCAPE2.0), wymiary. */
export function gifInfo(u: Uint8Array) {
  const w = u[6] | (u[7] << 8), h = u[8] | (u[9] << 8);
  let p = 13; if (u[10] & 0x80) p += 3 * (1 << ((u[10] & 7) + 1));
  const delays: number[] = []; let frames = 0, loop = false, transparent = false;
  const skipSub = () => { while (p < u.length && u[p] !== 0) p += u[p] + 1; p++; };
  while (p < u.length) {
    const b = u[p++];
    if (b === 0x21) {
      const label = u[p++];
      if (label === 0xf9) { delays.push((u[p + 2] | (u[p + 3] << 8)) * 10); if (u[p + 1] & 1) transparent = true; p += u[p] + 1; skipSub(); }
      else if (label === 0xff) { const id = String.fromCharCode(...u.slice(p + 1, p + 12)); if (/NETSCAPE2\.0|ANIMEXTS1\.0/.test(id)) loop = true; p += u[p] + 1; skipSub(); }
      else { skipSub(); }
    } else if (b === 0x2c) {
      frames++; const packed = u[p + 8]; p += 9; if (packed & 0x80) p += 3 * (1 << ((packed & 7) + 1)); p++; skipSub();
    } else if (b === 0x3b) break; else break;
  }
  return { w, h, frames, delays, loop, transparent };
}

// ---------- kolory ----------
let ctx2: CanvasRenderingContext2D | null = null;
function normColor(c: string): string | null {
  ctx2 ??= document.createElement('canvas').getContext('2d');
  if (!ctx2) return null;
  ctx2.fillStyle = '#010203'; ctx2.fillStyle = c.trim();
  const v = String(ctx2.fillStyle).toLowerCase();
  if (v === '#010203' && !/^#?010203$/i.test(c.trim())) return null;
  return v;
}
function cssColors(css: string) {
  const out = new Set<string>();
  for (const m of css.matchAll(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b[a-z]{3,22}\b/gi)) { const n = normColor(m[0]); if (n) out.add(n); }
  return out;
}

// ---------- kwerendy z pliku ----------
export function splitQueries(txt: string): string[] {
  const clean = txt.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/^\s*(--|#).*$/, '').replace(/^\s*(?:zapytanie|kwerenda)\s*\d+\s*[:.)-]?\s*/i, '').replace(/^\s*\d+\s*[.)]\s+/, '')).join('\n');
  const out: string[] = []; let cur = '', q: string | null = null;
  for (const ch of clean) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; cur += ch; continue; }
    if (ch === ';') { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// ---------- render stron ----------
type Page = { name: string; query: string; html: string; errors: string[] };
async function renderPages(files: Record<string, string>, dump: string | null): Promise<Page[]> {
  const pages: Page[] = [];
  const names = Object.keys(files).filter((n) => /\.(html?|php)$/i.test(n));
  const runOne = async (name: string, query = ''): Promise<Page> => {
    if (!name.endsWith('.php')) return { name, query, html: files[name], errors: [] };
    try {
      const { runPhp } = await import('./php/runtime');
      const db = dump ? await freshFromDump(dump) : null;
      const r = await runPhp({ files, entry: name, db, query });
      db?.close();
      return { name, query, html: r.html, errors: r.errors };
    } catch (e) { return { name, query, html: files[name].replace(/<\?php[\s\S]*?(\?>|$)/g, ''), errors: ['PHP: ' + (e as Error).message] }; }
  };
  for (const n of names) pages.push(await runOne(n));
  // linki z parametrem (np. obiekty.php?id=46) – egzaminator klika pierwszy z nich
  const seen = new Set<string>();
  for (const p of [...pages]) {
    for (const m of p.html.matchAll(/href\s*=\s*["']?([\w\-]+\.php)\?([^"'\s>]+)/gi)) {
      const target = names.find((n) => lower(n) === lower(m[1]));
      if (!target || seen.has(target)) continue;
      seen.add(target);
      pages.push(await runOne(target, m[2].replace(/&amp;/g, '&')));
    }
  }
  return pages;
}
const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');
const textOf = (d: Document) => [d.title, d.body?.textContent ?? '', ...Array.from(d.querySelectorAll('[alt],[title],[placeholder],[value]')).flatMap((e) => ['alt', 'title', 'placeholder', 'value'].map((a) => e.getAttribute(a) ?? ''))].join(' ');
const squash = (s: string) => s.replace(/\s+/g, ' ').replace(/\s*([:,.;!?])/g, '$1').trim().toLowerCase();

// ---------- wyglad ----------
async function snapshot(files: Record<string, string>, entryHtml: string, entry: string, base: string | undefined, images: Record<string, string>, w: number, h: number): Promise<string | null> {
  const html2canvas = (await import('html2canvas')).default;
  const iframe = document.createElement('iframe');
  iframe.setAttribute('sandbox', 'allow-same-origin');
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${w}px;height:${h}px;border:0;background:#fff`;
  iframe.srcdoc = inlineAssets(buildSrcDoc({ ...files, [entry]: entryHtml }, entry, base), images);
  document.body.appendChild(iframe);
  try {
    await new Promise<void>((res) => { iframe.onload = () => res(); setTimeout(res, 4000); });
    await new Promise((r) => setTimeout(r, 400));
    const doc = iframe.contentDocument!;
    const canvas = await html2canvas(doc.documentElement, { width: w, height: h, windowWidth: w, windowHeight: h, backgroundColor: '#ffffff', logging: false, useCORS: true, scale: 1 });
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch { return null; } finally { iframe.remove(); }
}
/** Podobienstwo obrazow (0–100): korelacja ukladu (male kopie, jasnosc i kolor) + histogram kolorow.
 *  Biale tlo nic nie daje (korelacja liczy sie z odchylen), wiec pusta strona wypada nisko. */
async function similarity(a: string, b: string) {
  const [ia, ib] = await Promise.all([loadImg(a), loadImg(b)]);
  const W = 32, H = Math.max(8, Math.round((32 * ib.naturalHeight) / ib.naturalWidth));
  const px = (img: HTMLImageElement) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d')!; x.drawImage(img, 0, 0, W, H); return x.getImageData(0, 0, W, H).data; };
  const A = px(ia), B = px(ib);
  const corr = (ch: number) => {
    let sa = 0, sb = 0; const n = W * H;
    for (let i = 0; i < n; i++) { sa += A[i * 4 + ch]; sb += B[i * 4 + ch]; }
    const ma = sa / n, mb = sb / n; let num = 0, da = 0, db = 0;
    for (let i = 0; i < n; i++) { const x = A[i * 4 + ch] - ma, y = B[i * 4 + ch] - mb; num += x * y; da += x * x; db += y * y; }
    return da && db ? num / Math.sqrt(da * db) : 0;
  };
  const r = Math.max(0, (corr(0) + corr(1) + corr(2)) / 3);
  const hist = (d: Uint8ClampedArray) => { const h = new Float64Array(64); for (let i = 0; i < d.length; i += 4) h[(d[i] >> 6) * 16 + (d[i + 1] >> 6) * 4 + (d[i + 2] >> 6)]++; return h; };
  const ha = hist(A), hb = hist(B); let inter = 0;
  for (let i = 0; i < 64; i++) inter += Math.min(ha[i], hb[i]);
  return Math.round(100 * (0.7 * r + 0.3 * (inter / (W * H))));
}

// ---------- glowna funkcja ----------
export type ExamInput = { sheet: Sheet; files: Record<string, string>; images: Record<string, string>; candidate: string; folder?: string | null; onStep?: (s: string) => void };

export async function examine({ sheet, files, images, candidate, folder, onStep }: ExamInput): Promise<{ items: Item[]; reqs: Reqs | null }> {
  const reqs = (await loadReqs())[sheet.code] ?? null;
  const items: Item[] = [];
  const archive = sheet.assets?.files ?? [];
  const have = new Map<string, string>(); // lower -> prawdziwa nazwa
  for (const n of [...Object.keys(files), ...Object.keys(images)]) have.set(lower(n), n);
  const step = (s: string) => onStep?.(s);

  // --- baza z arkusza ---
  let dump: string | null = null;
  if (sheet.assets?.sql) dump = await fetch(`${sheet.assets.dir}/${sheet.assets.sql}`).then((r) => (r.ok ? r.text() : null)).catch(() => null);

  // --- PLIKI I FOLDER ---
  step('Pliki i folder');
  if (reqs?.files.length) {
    const missing: string[] = [], wrongCase: string[] = [];
    for (const f of reqs.files) {
      if (files[f] !== undefined || images[f] !== undefined) continue;
      if (archive.includes(f) && IMG_EXT.test(f)) continue; // grafika z archiwum: jest w folderze warsztatu
      const other = have.get(lower(f));
      if (other) wrongCase.push(`${other} → ${f}`); else missing.push(f);
    }
    const ok = !missing.length && !wrongCase.length;
    items.push({ group: 'Pliki i folder', label: `Wszystkie pliki z listy arkusza (${reqs.files.length - missing.length - wrongCase.length}/${reqs.files.length})`, points: 2, ok,
      note: ok ? undefined : [missing.length && `Brakuje: ${missing.join(', ')}`, wrongCase.length && `Zła nazwa (wielkość liter): ${wrongCase.join(', ')}`].filter(Boolean).join('. ') });
    const txt = Object.keys(files).find((n) => /^przegl[aą]darka\.txt$/i.test(n));
    if (reqs.files.some((f) => /^przegl/i.test(f))) items.push({ group: 'Pliki i folder', label: 'przeglądarka.txt z nazwą przeglądarki', points: 1, ok: !!txt && files[txt].trim().length > 2, note: txt ? undefined : 'Utwórz plik przeglądarka.txt i wpisz nazwę przeglądarki (np. Google Chrome).' });
  }
  const cand = candidate.trim();
  const folderOk = folder != null ? !!cand && folder === cand : !!cand;
  items.push({ group: 'Pliki i folder', label: 'Folder nazwany numerem zdającego', points: 1, ok: folderOk,
    note: !cand ? 'Wpisz numer zdającego (PESEL) powyżej: pod tą nazwą pobierzesz folder ZIP.' : folder != null && folder !== cand ? `Wgrany folder nazywa się „${folder}”, a numer zdającego to „${cand}”.` : undefined });

  // --- KWERENDY ---
  step('Kwerendy');
  const sq = (await loadQueries()).find((q) => q.code === sheet.code);
  const kw = Object.keys(files).find((n) => /^kwerendy\.txt$/i.test(n));
  const results: (QueryResult | undefined)[] = [];
  if (sq?.tasks.length && dump) {
    const userQs = kw ? splitQueries(files[kw]) : [];
    const sols = await getSolutions(sq.solutionPath);
    for (const t of sq.tasks) {
      const mine = userQs[t.n - 1] ?? '';
      if (!mine) { items.push({ group: 'Kwerendy', label: `Zapytanie ${t.n}`, points: 1, ok: false, note: kw ? 'Brak tej kwerendy w kwerendy.txt.' : 'Brak pliku kwerendy.txt.' }); continue; }
      const r = await checkQuery(dump, t, mine, sols[t.n]);
      results[t.n] = r.expected;
      const noSol = !sols[t.n] && !r.ok && !/Błąd/.test(r.message);
      items.push({ group: 'Kwerendy', label: `Zapytanie ${t.n}`, points: 1, ok: noSol ? null : r.ok, note: noSol ? 'Brak rozwiązania wzorcowego: porównaj wynik z treścią zadania.' : r.ok ? undefined : r.message, user: r.user, expected: r.expected });
    }
  }

  // --- ZRZUTY ---
  step('Zrzuty ekranu');
  for (const s of reqs?.shots ?? []) {
    const want = `${s.name}.${s.ext}`;
    const alt = s.ext === 'jpg' ? `${s.name}.jpeg` : null;
    const hit = images[want] ? want : alt && images[alt] ? alt : null;
    const label = s.import ? `Zrzut importu ${want}` : `Zrzut ${want}`;
    const kwN = /(?:kw|kwerenda)(\d+)/i.exec(s.name)?.[1];
    const exp = kwN ? results[+kwN] : undefined;
    if (!hit) {
      const sameBase = Object.keys(images).find((n) => lower(n.replace(/\.\w+$/, '')) === lower(s.name));
      items.push({ group: 'Zrzuty ekranu', label, points: 1, ok: false, note: sameBase ? `Jest ${sameBase}, a ma być ${want} (nazwa/format jak w arkuszu).` : `Brak pliku ${want}. Dodaj zrzut w „Grafiki / pliki”.`, thumb: sameBase ? images[sameBase] : undefined, expected: exp });
      continue;
    }
    const data = images[hit]
    const fmt = realFormat(bytesOf(data))
    const notes: string[] = [];
    let ok = true;
    if (fmt !== s.ext && !(fmt === 'jpg' && s.ext === 'jpg')) { ok = false; notes.push(`Plik ma rozszerzenie .${s.ext}, ale w środku to ${fmt.toUpperCase()} (zmiana nazwy nie zmienia formatu, zapisz jako ${s.ext.toUpperCase()}).`); }
    try {
      const img = await loadImg(data);
      if (s.whole && (img.naturalWidth < 1000 || img.naturalHeight < 560)) { ok = false; notes.push(`Ma ${img.naturalWidth}×${img.naturalHeight} px: wygląda na wykadrowany. Arkusz każe zrobić zrzut całego ekranu z paskiem zadań.`); }
    } catch { ok = false; notes.push('Nie da się otworzyć obrazu.'); }
    items.push({ group: 'Zrzuty ekranu', label, points: 1, ok, note: notes.join(' ') || undefined, thumb: data, expected: exp });
  }
  if (reqs?.shots.some((s) => !s.import)) items.push({ group: 'Zrzuty ekranu', label: 'Na zrzutach widać wyniki kwerend (porównaj z oczekiwanym wynikiem obok)', points: 1, ok: null });

  // --- GRAFIKA ---
  step('Grafika');
  for (const g of reqs?.graphics ?? []) {
    const cands = [...new Set([g.out, ...g.names].filter((x): x is string => !!x))];
    const name = cands.find((c) => images[c]) ?? Object.keys(images).find((n) => cands.some((c) => lower(c) === lower(n)));
    const label = `Grafika ${g.out ?? cands[0] ?? ''}`.trim();
    if (!name) { items.push({ group: 'Grafika', label, points: 2, ok: false, note: `Nie dodano przygotowanej grafiki (${cands.join(' / ') || 'patrz arkusz'}). Wymagania: ${g.text.slice(0, 300)}` }); continue; }
    const data = images[name];
    const u = bytesOf(data);
    const fmt = realFormat(u);
    const notes: string[] = []; let ok = true;
    const ext = (/\.(\w+)$/.exec(g.out ?? name)?.[1] ?? '').toLowerCase().replace('jpeg', 'jpg');
    if (ext && fmt !== ext) { ok = false; notes.push(`Format pliku to ${fmt.toUpperCase()}, wymagany ${ext.toUpperCase()}.`); }
    try {
      const img = await loadImg(data);
      const W = img.naturalWidth, H = img.naturalHeight;
      if (g.w && Math.abs(W - g.w) > 1) { ok = false; notes.push(`Szerokość ${W} px, ma być ${g.w} px.`); }
      if (g.h && Math.abs(H - g.h) > 1) { ok = false; notes.push(`Wysokość ${H} px, ma być ${g.h} px.`); }
      if (!g.w && !g.h) notes.push(`Wymiary ${W}×${H} px.`);
      if (g.transparent && fmt !== 'jpg') { const a = fmt === 'gif' ? gifInfo(u).transparent : hasAlpha(img); if (!a) { ok = false; notes.push('Brak przezroczystości.'); } }
      if (g.transparent && fmt === 'jpg') { ok = false; notes.push('JPG nie ma przezroczystości: zapisz jako PNG/GIF.'); }
    } catch { ok = false; notes.push('Nie da się otworzyć obrazu.'); }
    if (g.gif) {
      if (fmt !== 'gif') { ok = false; notes.push('Animacja musi być plikiem GIF.'); }
      else {
        const gi = gifInfo(u);
        if (gi.frames < 2) { ok = false; notes.push(`GIF ma ${gi.frames} klatkę: to nie animacja.`); } else notes.push(`Klatki: ${gi.frames}.`);
        if (g.delay && gi.delays.length && gi.delays.some((d) => Math.abs(d - g.delay!) > 10)) { ok = false; notes.push(`Czas klatek ${[...new Set(gi.delays)].join('/')} ms, ma być ${g.delay} ms.`); }
        if (g.loop && !gi.loop) { ok = false; notes.push('Animacja nie jest zapętlona.'); }
      }
    }
    items.push({ group: 'Grafika', label, points: 2, ok, note: notes.join(' '), thumb: data });
  }
  if (reqs?.graphics.length) items.push({ group: 'Grafika', label: 'Grafika zgodna z opisem w arkuszu (kadr, treść)', points: 1, ok: null, note: reqs.graphics.map((g) => g.text).join(' ').slice(0, 400) });

  // --- STRONA ---
  step('Strona (wykonanie PHP)');
  const pages = await renderPages(files, dump);
  if (pages.length) {
    const docs = pages.map((p) => ({ p, d: parse(p.html) }));
    const main = docs.filter((x) => !x.p.query);
    const each = (label: string, pts: number, test: (d: Document, p: Page) => boolean) => {
      const bad = main.filter(({ d, p }) => { try { return !test(d, p); } catch { return true; } }).map(({ p }) => p.name);
      items.push({ group: 'Strona', label, points: pts, ok: !bad.length, note: bad.length ? `Nie spełnia: ${bad.join(', ')}` : undefined });
    };
    each('<!DOCTYPE html> na każdej stronie', 1, (_d, p) => /^\s*<!doctype html>/i.test(p.html.replace(/^\s*(<br \/>|Warning|Notice)[^\n]*\n/gm, '')));
    each('lang="pl"', 1, (d) => d.documentElement.getAttribute('lang') === 'pl');
    each('Kodowanie UTF-8 (meta charset)', 1, (d) => /utf-?8/i.test(d.querySelector('meta[charset]')?.getAttribute('charset') ?? d.querySelector('meta[http-equiv]')?.getAttribute('content') ?? ''));
    each('Tytuł strony', 1, (d) => !!d.title.trim());
    const cssFile = reqs?.files.find((f) => f.endsWith('.css'));
    each(cssFile ? `Arkusz ${cssFile} podłączony (link)` : 'Zewnętrzny arkusz CSS podłączony', 1, (d) => Array.from(d.querySelectorAll('link[rel="stylesheet"]')).some((l) => !cssFile || (l.getAttribute('href') ?? '').split('/').pop() === cssFile));
    each('Obrazy mają tekst alternatywny (alt)', 1, (d) => Array.from(d.querySelectorAll('img')).every((i) => i.hasAttribute('alt')));
    const phpErr = pages.flatMap((p) => p.errors.map((e) => `${p.name}${p.query ? '?' + p.query : ''}: ${e}`));
    if (pages.some((p) => p.name.endsWith('.php'))) items.push({ group: 'Strona', label: 'Strony PHP działają bez błędów i ostrzeżeń', points: 2, ok: !phpErr.length, note: phpErr.slice(0, 4).join(' | ') || undefined });

    const all = squash(docs.map(({ d }) => textOf(d)).join(' '));
    if (reqs?.quotes.length) {
      const miss = reqs.quotes.filter((q) => !all.includes(squash(q)));
      const got = reqs.quotes.length - miss.length;
      items.push({ group: 'Strona', label: `Treści z arkusza na stronie (${got}/${reqs.quotes.length})`, points: 3, ok: got / reqs.quotes.length >= 0.9, note: miss.length ? `Nie znaleziono: ${miss.slice(0, 10).map((q) => `„${q}”`).join(', ')}${miss.length > 10 ? '…' : ''}` : undefined });
    }
    if (reqs?.author) items.push({ group: 'Strona', label: 'Numer zdającego na stronie (autor)', points: 1, ok: cand ? all.includes(lower(cand)) : null, note: cand ? (all.includes(lower(cand)) ? undefined : `Nie ma „${cand}” w treści strony.`) : 'Wpisz numer zdającego, żeby to sprawdzić.' });

    // reguly z tagow arkusza (formularz, $_GET, transition…) na wykonanym HTML
    const merged = parse(docs.map(({ p }) => p.html).join('\n'));
    const seen = new Set<string>();
    for (const t of sheet.tags) for (const r of TAG_RULES) {
      if (!r.match.test(`${t.group}: ${t.label}`) || seen.has(r.rule.label) || /^Kwerenda|GROUP BY|JOIN|Funkcja agreg|CREATE|GRANT/.test(r.rule.label)) continue;
      seen.add(r.rule.label);
      let ok = false; try { ok = r.rule.test(files, merged); } catch { /* */ }
      items.push({ group: 'Strona', label: r.rule.label, points: r.rule.points, ok });
    }
    if (sheet.language.includes('PHP')) for (const r of PHP_RULES) { let ok = false; try { ok = r.test(files, merged); } catch { /* */ } items.push({ group: 'Strona', label: r.label, points: r.points, ok }); }

    // kolory z arkusza w CSS
    if (reqs?.colors.length) {
      const css = Object.entries(files).filter(([k]) => k.endsWith('.css')).map(([, v]) => v).join('\n') + docs.map(({ d }) => Array.from(d.querySelectorAll('style')).map((s) => s.textContent).join('\n') + Array.from(d.querySelectorAll('[style]')).map((e) => e.getAttribute('style')).join(';')).join('\n');
      const mine = cssColors(css);
      const miss = reqs.colors.filter((c) => { const n = normColor(c); return n && !mine.has(n); });
      items.push({ group: 'Strona', label: `Kolory z arkusza w CSS (${reqs.colors.length - miss.length}/${reqs.colors.length})`, points: 2, ok: !miss.length, note: miss.length ? `Brakuje: ${miss.join(', ')}` : undefined });
    }
  }

  // --- WYGLAD ---
  step('Wygląd');
  const look = reqs?.looks[0];
  const entryPage = pages.find((p) => !p.query && reqs?.files.includes(p.name) && /\.(html|php)$/.test(p.name)) ?? pages.find((p) => !p.query);
  if (look && sheet.assets && entryPage) {
    const sheetImg = `${sheet.assets.dir}/${look.file}`;
    try {
      const ref = await loadImg(sheetImg);
      const W = 1280, H = Math.round((W * ref.naturalHeight) / ref.naturalWidth);
      const mine = await snapshot(files, entryPage.html, entryPage.name, sheet.assets.dir + '/', images, W, H);
      if (mine) {
        const pct = await similarity(mine, sheetImg);
        items.push({ group: 'Wygląd', label: `Wygląd ${entryPage.name} zgodny z ilustracją z arkusza`, points: 4, ok: null, note: `Podobieństwo do ilustracji ${pct}%: ${pct >= 50 ? 'układ i kolory wyglądają podobnie' : pct >= 30 ? 'częściowo podobne, sprawdź bloki i kolory' : 'wygląda inaczej niż w arkuszu'}. Liczone z układu i kolorów (np. poprawne rozwiązanie ~55–70%, strona bez CSS ~20%). Porównaj sam i zaznacz.`, compare: { mine, sheet: sheetImg, pct, caption: look.caption } });
      }
    } catch { /* brak ilustracji */ }
  }
  if (!items.some((i) => i.group === 'Wygląd')) items.push({ group: 'Wygląd', label: 'Wygląd zgodny z ilustracją w arkuszu (kolory, układ, rozmiary)', points: 4, ok: null });
  step('');
  return { items, reqs };
}

export function scoreItems(items: Item[], manual: Record<string, boolean>) {
  let got = 0, total = 0;
  for (const i of items) { total += i.points; const ok = i.ok ?? manual[i.label] ?? false; if (ok) got += i.points; }
  return { got, total, pct: total ? Math.round((got / total) * 100) : 0 };
}

/** ZIP folderu do oddania: <numer>/<pliki>. */
export async function zipFolder(folder: string, files: Record<string, string>, images: Record<string, string>, archive?: { dir: string; files: string[] }) {
  const { zipSync, strToU8 } = await import('fflate');
  const tree: Record<string, Uint8Array> = {};
  // grafiki z archiwum arkusza (uzyte na stronie) tez leza w folderze zdajacego
  for (const n of archive?.files ?? []) {
    if (!IMG_EXT.test(n) || images[n] || n.startsWith('_')) continue;
    const r = await fetch(`${archive!.dir}/${n}`).catch(() => null);
    if (r?.ok) tree[`${folder}/${n}`] = new Uint8Array(await r.arrayBuffer());
  }
  for (const [n, t] of Object.entries(files)) tree[`${folder}/${n}`] = strToU8(t);
  for (const [n, d] of Object.entries(images)) tree[`${folder}/${n}`] = bytesOf(d);
  const blob = new Blob([zipSync(tree, { level: 6 }) as Uint8Array<ArrayBuffer>], { type: 'application/zip' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${folder}.zip`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
