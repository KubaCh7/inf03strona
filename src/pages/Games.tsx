import { useEffect, useMemo, useState } from 'react';
import { Crosshair, Blocks, Tags, ArrowLeft, Check, X, RotateCcw } from 'lucide-react';
import { useStore } from '../lib/store';
import { pick, shuffle } from '../lib/random';
import { freshDb, run, sameResult } from '../lib/sql';
import { mmss } from '../lib/time';
import { PageHeader } from '../components/ui';

// ---------------- Selektor ----------------
const DOM_SNIPPET = `<div id="sklep">
  <h1 class="tytul">Sklep</h1>
  <nav><a href="#">Start</a><a class="aktywny" href="#">Oferta</a></nav>
  <ul class="lista">
    <li>Kawa</li>
    <li class="promo">Herbata</li>
    <li>Kakao</li>
    <li class="promo nowy">Yerba</li>
  </ul>
  <p>Kontakt: <a href="mailto:a@b.pl">mail</a></p>
  <footer><p class="mala">© 2026</p></footer>
</div>`;
const SELECTORS = ['.promo', 'li:nth-child(odd)', 'nav a', 'a[href^="mailto"]', '#sklep > p', 'li:first-child', '.promo.nowy', 'ul li:last-child', 'h1, footer p', 'p a', 'nav > .aktywny', 'li:not(.promo)'];

function SelectorGame({ onBack }: { onBack: () => void }) {
  const addXp = useStore((s) => s.addXp);
  const doc = useMemo(() => new DOMParser().parseFromString(DOM_SNIPPET, 'text/html'), []);
  const nodes = useMemo(() => Array.from(doc.querySelectorAll('#sklep *')), [doc]);
  const [sel, setSel] = useState(() => pick(SELECTORS));
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);
  const [points, setPoints] = useState(0);
  const correct = useMemo(() => new Set(Array.from(doc.querySelectorAll(sel)).map((n) => nodes.indexOf(n))), [sel, doc, nodes]);
  const ok = checked && correct.size === picked.size && [...picked].every((i) => correct.has(i));
  const depth = (n: Element) => { let d = 0; let p = n.parentElement; while (p && p.id !== 'sklep') { d++; p = p.parentElement; } return d; };
  const label = (n: Element) => `<${n.tagName.toLowerCase()}${n.id ? ` id="${n.id}"` : ''}${n.className ? ` class="${n.className}"` : ''}${n.getAttribute('href') ? ` href="${n.getAttribute('href')}"` : ''}>${n.children.length ? '' : n.textContent}`;
  return (
    <div className="max-w-3xl">
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-sm text-muted"><ArrowLeft size={16} />Minigry</button>
      <h2 className="text-2xl font-bold">Selektor <span className="mono ml-2 text-base text-muted">pkt {points}</span></h2>
      <p className="mt-1 text-muted">Zaznacz WSZYSTKIE elementy, które wybiera selektor:</p>
      <p className="mono mt-3 inline-block rounded-xl bg-ink px-4 py-2 text-xl text-bg">{sel}</p>
      <div className="card mt-4 p-3">
        {nodes.map((n, i) => {
          const isP = picked.has(i);
          const tone = !checked ? (isP ? 'bg-accent-soft border-accent' : 'border-transparent hover:bg-surface-2') : correct.has(i) ? 'bg-success-soft border-success' : isP ? 'bg-danger-soft border-danger' : 'border-transparent';
          return (
            <button key={i} disabled={checked} onClick={() => setPicked((p) => { const s = new Set(p); if (s.has(i)) s.delete(i); else s.add(i); return s; })}
              className={`mono block w-full rounded-md border px-2 py-1 text-left text-xs md:text-sm ${tone}`} style={{ paddingLeft: 8 + depth(n) * 18 }}>{label(n)}</button>
          );
        })}
      </div>
      <div className="mt-4 flex gap-2">
        {!checked ? <button className="btn btn-primary" onClick={() => { setChecked(true); const good = correct.size === picked.size && [...picked].every((i) => correct.has(i)); if (good) { setPoints((p) => p + 1); addXp(3); } }}>Sprawdź</button>
          : <button className="btn btn-dark" onClick={() => { setSel(pick(SELECTORS.filter((s) => s !== sel))); setPicked(new Set()); setChecked(false); }}>Następny</button>}
        {checked && <p className={`self-center font-bold ${ok ? 'text-success' : 'text-danger'}`}>{ok ? 'Dokładnie! +3 XP' : `Pasuje ${correct.size} elementów (zielone).`}</p>}
      </div>
    </div>
  );
}

// ---------------- Kwerenda z klockow ----------------
const DB = `CREATE TABLE filmy (id INTEGER PRIMARY KEY, tytul TEXT, gatunek TEXT, rok INTEGER, ocena REAL);
INSERT INTO filmy VALUES (1,'Rejs','komedia',1970,8.1),(2,'Seksmisja','komedia',1983,7.9),(3,'Pianista','dramat',2002,8.5),(4,'Ida','dramat',2013,7.2),(5,'Boże Ciało','dramat',2019,7.6),(6,'Miś','komedia',1980,8.0),(7,'Vabank','kryminał',1981,7.7);`;
const PUZZLES = [
  { task: 'Tytuły filmów z oceną powyżej 8, od najwyższej oceny', sql: 'SELECT tytul FROM filmy WHERE ocena > 8 ORDER BY ocena DESC ;' },
  { task: 'Liczba filmów w każdym gatunku', sql: 'SELECT gatunek , COUNT(*) FROM filmy GROUP BY gatunek ;' },
  { task: 'Tytuł i rok filmów z lat 80. (1980–1989)', sql: 'SELECT tytul , rok FROM filmy WHERE rok BETWEEN 1980 AND 1989 ;' },
  { task: 'Średnia ocena dramatów', sql: "SELECT AVG(ocena) FROM filmy WHERE gatunek = 'dramat' ;" },
  { task: 'Trzy najstarsze filmy (tytuły)', sql: 'SELECT tytul FROM filmy ORDER BY rok ASC LIMIT 3 ;' },
  { task: 'Gatunki, w których jest więcej niż 2 filmy', sql: 'SELECT gatunek FROM filmy GROUP BY gatunek HAVING COUNT(*) > 2 ;' },
];

function BlocksGame({ onBack }: { onBack: () => void }) {
  const addXp = useStore((s) => s.addXp);
  const [p, setP] = useState(() => pick(PUZZLES));
  const tokens = useMemo(() => p.sql.split(' '), [p]);
  const [pool, setPool] = useState(() => shuffle(tokens.map((t, i) => ({ t, i }))));
  const [built, setBuilt] = useState<{ t: string; i: number }[]>([]);
  const [verdict, setVerdict] = useState<null | boolean>(null);
  useEffect(() => { setPool(shuffle(tokens.map((t, i) => ({ t, i })))); setBuilt([]); setVerdict(null); }, [tokens]);
  async function check() {
    const user = built.map((b) => b.t).join(' ');
    try {
      const a = await freshDb(DB), b = await freshDb(DB);
      const ra = run(a, user).results, rb = run(b, p.sql).results;
      const ok = sameResult(ra[0], rb[0]) && (!/ORDER BY/i.test(p.sql) || JSON.stringify(ra[0]?.values) === JSON.stringify(rb[0]?.values));
      setVerdict(ok); if (ok) addXp(5);
    } catch { setVerdict(false); }
  }
  return (
    <div className="max-w-3xl">
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-sm text-muted"><ArrowLeft size={16} />Minigry</button>
      <h2 className="text-2xl font-bold">Kwerenda z klocków</h2>
      <p className="mono mt-1 text-xs text-muted">filmy(id, tytul, gatunek, rok, ocena)</p>
      <p className="mt-3 text-lg font-bold">{p.task}</p>
      <div className="card mt-3 flex min-h-16 flex-wrap gap-1.5 p-3">
        {built.length === 0 && <span className="text-sm text-muted">Klikaj klocki poniżej w dobrej kolejności…</span>}
        {built.map((b, k) => <button key={b.i} className="mono rounded-md bg-ink px-2 py-1 text-sm text-bg" onClick={() => { setBuilt(built.filter((_, j) => j !== k)); setPool([...pool, b]); setVerdict(null); }}>{b.t}</button>)}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {pool.map((b) => <button key={b.i} className="mono rounded-md border border-line bg-surface px-2 py-1 text-sm hover:bg-surface-2" onClick={() => { setBuilt([...built, b]); setPool(pool.filter((x) => x.i !== b.i)); setVerdict(null); }}>{b.t}</button>)}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button className="btn btn-primary" disabled={pool.length > 0} onClick={check}>Wykonaj w SQLite</button>
        <button className="btn btn-ghost" onClick={() => { setPool(shuffle(tokens.map((t, i) => ({ t, i })))); setBuilt([]); setVerdict(null); }}><RotateCcw size={15} /></button>
        {verdict !== null && <span className={`font-bold ${verdict ? 'text-success' : 'text-danger'}`}>{verdict ? 'Wynik się zgadza! +5 XP' : 'Wynik inny niż oczekiwany.'}</span>}
        {verdict && <button className="btn btn-dark" onClick={() => setP(pick(PUZZLES.filter((x) => x !== p)))}>Następna</button>}
      </div>
    </div>
  );
}

// ---------------- Znacznik czy atrybut ----------------
const ITEMS: [string, 'znacznik' | 'atrybut' | 'wlasciwosc'][] = [
  ['table', 'znacznik'], ['colspan', 'atrybut'], ['href', 'atrybut'], ['section', 'znacznik'], ['alt', 'atrybut'], ['padding', 'wlasciwosc'], ['label', 'znacznik'],
  ['for', 'atrybut'], ['margin', 'wlasciwosc'], ['textarea', 'znacznik'], ['target', 'atrybut'], ['border-radius', 'wlasciwosc'], ['option', 'znacznik'], ['method', 'atrybut'],
  ['float', 'wlasciwosc'], ['footer', 'znacznik'], ['rowspan', 'atrybut'], ['font-family', 'wlasciwosc'], ['src', 'atrybut'], ['nav', 'znacznik'], ['color', 'wlasciwosc'],
  ['action', 'atrybut'], ['aside', 'znacznik'], ['text-align', 'wlasciwosc'], ['placeholder', 'atrybut'], ['fieldset', 'znacznik'], ['box-shadow', 'wlasciwosc'], ['charset', 'atrybut'],
  ['ol', 'znacznik'], ['list-style-type', 'wlasciwosc'], ['required', 'atrybut'], ['video', 'znacznik'], ['transition', 'wlasciwosc'], ['name', 'atrybut'], ['display', 'wlasciwosc'],
];
const LBL = { znacznik: 'Znacznik HTML', atrybut: 'Atrybut HTML', wlasciwosc: 'Właściwość CSS' } as const;

function SortGame({ onBack }: { onBack: () => void }) {
  const addXp = useStore((s) => s.addXp);
  const [deck, setDeck] = useState(() => shuffle(ITEMS));
  const [i, setI] = useState(0);
  const [ok, setOk] = useState(0);
  const [bad, setBad] = useState<string[]>([]);
  const [end, setEnd] = useState(Date.now() + 60_000);
  const [now, setNow] = useState(Date.now());
  const over = now >= end || i >= deck.length;
  useEffect(() => { if (over) return; const t = setInterval(() => setNow(Date.now()), 200); return () => clearInterval(t); }, [over]);
  useEffect(() => { if (over && ok) addXp(Math.round(ok / 2)); }, [over]); // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (k: keyof typeof LBL) => { if (over) return; const [w, t] = deck[i]; if (t === k) setOk((x) => x + 1); else setBad((b) => [...b, `${w} → ${LBL[t]}`]); setI((x) => x + 1); };
  return (
    <div className="max-w-2xl">
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-sm text-muted"><ArrowLeft size={16} />Minigry</button>
      <div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Znacznik, atrybut czy CSS?</h2><span className="mono text-2xl tabular">{mmss(Math.max(0, end - now))}</span></div>
      {!over ? (
        <>
          <div className="card mt-4 p-10 text-center"><p className="mono text-4xl font-semibold">{deck[i][0]}</p></div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(Object.keys(LBL) as (keyof typeof LBL)[]).map((k) => <button key={k} className="btn btn-ghost py-4" onClick={() => choose(k)}>{LBL[k]}</button>)}
          </div>
          <p className="mt-3 text-sm text-muted">Dobrze: {ok} · Błędy: {bad.length}</p>
        </>
      ) : (
        <div className="card pop mt-4 p-6">
          <p className="display text-4xl font-bold">{ok} <span className="text-base font-normal text-muted">poprawnych · +{Math.round(ok / 2)} XP</span></p>
          {bad.length > 0 && <ul className="mt-3 space-y-1 text-sm">{bad.map((b) => <li key={b} className="flex items-center gap-2"><X size={14} className="text-danger" />{b}</li>)}</ul>}
          <button className="btn btn-primary mt-4" onClick={() => { setDeck(shuffle(ITEMS)); setI(0); setOk(0); setBad([]); setEnd(Date.now() + 60_000); setNow(Date.now()); }}>Jeszcze raz</button>
        </div>
      )}
    </div>
  );
}

export default function Games() {
  const [g, setG] = useState<null | 'sel' | 'sql' | 'sort'>(null);
  if (g === 'sel') return <SelectorGame onBack={() => setG(null)} />;
  if (g === 'sql') return <BlocksGame onBack={() => setG(null)} />;
  if (g === 'sort') return <SortGame onBack={() => setG(null)} />;
  const GAMES = [
    { k: 'sel' as const, icon: Crosshair, t: 'Selektor', d: 'Dostajesz selektor CSS i drzewo HTML. Zaznacz wszystko, co trafia.', c: 'text-css' },
    { k: 'sql' as const, icon: Blocks, t: 'Kwerenda z klocków', d: 'Ułóż zapytanie z rozsypanych słów. Sprawdzamy wynik w prawdziwym SQLite.', c: 'text-sql' },
    { k: 'sort' as const, icon: Tags, t: 'Znacznik, atrybut czy CSS?', d: '60 sekund szybkiego sortowania pojęć. Najczęstsza pułapka w pytaniach.', c: 'text-js' },
  ];
  return (
    <div>
      <PageHeader eyebrow="Nauka przez zabawę" title="Minigry">Krótkie gry na rzeczy, które najczęściej mylą się na egzaminie.</PageHeader>
      <div className="grid gap-4 md:grid-cols-3">
        {GAMES.map(({ k, icon: I, t, d, c }) => (
          <button key={k} className="card card-hover p-6 text-left" onClick={() => setG(k)}>
            <I size={36} className={c} strokeWidth={1.7} />
            <h2 className="mt-4 text-xl font-bold">{t}</h2>
            <p className="mt-1 text-sm text-muted">{d}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-accent"><Check size={14} />Graj</span>
          </button>
        ))}
      </div>
    </div>
  );
}
