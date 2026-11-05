import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, RotateCcw, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { pick, shuffle } from '../lib/random';
import { freshDb } from '../lib/sql';

function Back({ onBack }: { onBack: () => void }) {
  return <button onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-sm text-muted"><ArrowLeft size={16} />Minigry</button>;
}
function Score({ ok, total }: { ok: number; total: number }) {
  return <span className="mono rounded-full bg-surface-2 px-3 py-1 text-sm tabular">{ok}/{total}</span>;
}
function Choice({ label, state, onClick, mono }: { label: string; state: 'idle' | 'ok' | 'bad' | 'dim'; onClick: () => void; mono?: boolean }) {
  const cls = state === 'ok' ? 'border-success bg-success-soft' : state === 'bad' ? 'border-danger bg-danger-soft' : state === 'dim' ? 'border-line opacity-60' : 'border-line hover:bg-surface-2';
  return <button disabled={state !== 'idle'} onClick={onClick} className={`rounded-xl border px-4 py-3 text-left transition-colors ${cls} ${mono ? 'mono' : ''}`}>{label}</button>;
}

// =============== 1. Kolor HEX ===============
const hex2 = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
function randColor() {
  const steps = [0, 51, 102, 153, 204, 255];
  return '#' + [pick(steps), pick(steps), pick(steps)].map(hex2).join('');
}
export function HexGame({ onBack }: { onBack: () => void }) {
  const addXp = useStore((s) => s.addXp);
  const [round, setRound] = useState(0);
  const [ok, setOk] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const q = useMemo(() => {
    const c = randColor();
    const set = new Set([c]);
    while (set.size < 4) set.add(randColor());
    return { c, opts: shuffle([...set]) };
  }, [round]);
  const done = round >= 10;
  const choose = (o: string) => { setPicked(o); if (o === q.c) { setOk((x) => x + 1); addXp(1); } };
  return (
    <div className="max-w-xl">
      <Back onBack={onBack} />
      <div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Kolor HEX</h2><Score ok={ok} total={Math.min(round + (picked ? 1 : 0), 10)} /></div>
      <p className="mt-1 text-muted">Jaki kod szesnastkowy ma ten kolor? Pamiętaj: #RRGGBB, FF to pełna składowa, 00 brak.</p>
      {!done ? (
        <>
          <div className="mt-4 h-40 rounded-2xl border border-line shadow-inner" style={{ background: q.c }} />
          <div className="mt-4 grid grid-cols-2 gap-2">
            {q.opts.map((o) => <Choice key={o} mono label={o} onClick={() => choose(o)} state={!picked ? 'idle' : o === q.c ? 'ok' : o === picked ? 'bad' : 'dim'} />)}
          </div>
          {picked && <button className="btn btn-dark mt-4" onClick={() => { setPicked(null); setRound((r) => r + 1); }}>Dalej</button>}
        </>
      ) : <End ok={ok} total={10} onAgain={() => { setRound(0); setOk(0); setPicked(null); }} />}
    </div>
  );
}

function End({ ok, total, onAgain, extra }: { ok: number; total: number; onAgain: () => void; extra?: string }) {
  return (
    <div className="card pop mt-4 p-6 text-center">
      <p className="display text-5xl font-extrabold text-accent tabular">{ok}/{total}</p>
      <p className="mt-1 text-muted">{extra ?? (ok === total ? 'Perfekcyjnie!' : ok >= total * 0.7 ? 'Dobra robota.' : 'Spróbuj jeszcze raz.')}</p>
      <button className="btn btn-primary mt-4" onClick={onAgain}><RotateCcw size={16} />Jeszcze raz</button>
    </div>
  );
}

// =============== 2. Memory ===============
const PAIRS: [string, string][] = [
  ['mysqli_connect()', 'połączenie z bazą'], ['mysqli_close()', 'zamknięcie połączenia'], ['$_POST', 'dane z formularza'], ['colspan', 'łączenie kolumn'],
  ['rowspan', 'łączenie wierszy'], ['GROUP BY', 'grupowanie'], ['innerHTML', 'treść elementu w JS'], [':hover', 'najechanie kursorem'],
  ['<ol>', 'lista numerowana'], ['padding', 'margines wewnętrzny'], ['ALTER TABLE', 'zmiana struktury tabeli'], ['GRANT', 'nadanie uprawnień'],
  ['localStorage', 'trwały zapis w przeglądarce'], ['border-radius', 'zaokrąglenie rogów'], ['alt', 'tekst alternatywny obrazu'], ['LEFT JOIN', 'złączenie z całą lewą tabelą'],
];
export function MemoryGame({ onBack }: { onBack: () => void }) {
  const addXp = useStore((s) => s.addXp);
  const make = () => shuffle(shuffle(PAIRS).slice(0, 8).flatMap(([a, b], i) => [{ id: `${i}a`, pair: i, text: a, code: true }, { id: `${i}b`, pair: i, text: b, code: false }]));
  const [cards, setCards] = useState(make);
  const [open, setOpen] = useState<string[]>([]);
  const [found, setFound] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const done = found.size === 8;
  useEffect(() => {
    if (open.length !== 2) return;
    const [a, b] = open.map((id) => cards.find((c) => c.id === id)!);
    const t = setTimeout(() => {
      if (a.pair === b.pair) setFound((f) => new Set(f).add(a.pair));
      setOpen([]);
    }, a.pair === b.pair ? 300 : 900);
    setMoves((m) => m + 1);
    return () => clearTimeout(t);
  }, [open, cards]);
  useEffect(() => { if (done) addXp(Math.max(3, 16 - Math.max(0, moves - 8))); }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="max-w-3xl">
      <Back onBack={onBack} />
      <div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Memory: pary pojęć</h2><span className="mono text-sm text-muted">ruchy: {moves}</span></div>
      <p className="mt-1 text-muted">Odkrywaj po dwie karty i łącz pojęcie z jego znaczeniem.</p>
      {done ? <End ok={8} total={8} extra={`Wszystkie pary w ${moves} ruchach.`} onAgain={() => { setCards(make()); setFound(new Set()); setMoves(0); }} /> : (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {cards.map((c) => {
            const isOpen = open.includes(c.id) || found.has(c.pair);
            return (
              <button key={c.id} onClick={() => { if (!isOpen && open.length < 2) setOpen((o) => [...o, c.id]); }}
                className={`grid h-24 place-items-center rounded-xl border p-2 text-center text-sm transition-all ${found.has(c.pair) ? 'border-success bg-success-soft' : isOpen ? 'border-accent bg-surface' : 'border-line bg-ink text-bg hover:-translate-y-0.5'}`}>
                {isOpen ? <span className={c.code ? 'mono font-semibold' : ''}>{c.text}</span> : <span className="display text-2xl font-bold opacity-40">?</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============== 3. Co wypisze? ===============
const OUTPUTS: { lang: 'JS' | 'PHP'; code: string; answer: string; wrong: string[]; why: string }[] = [
  { lang: 'JS', code: 'console.log("5" + 3);', answer: '53', wrong: ['8', 'NaN', 'błąd'], why: 'Plus z tekstem skleja napisy.' },
  { lang: 'JS', code: 'console.log("5" * 3);', answer: '15', wrong: ['53', '555', 'NaN'], why: 'Mnożenie zamienia tekst na liczbę.' },
  { lang: 'JS', code: 'let t = [4, 7, 1];\nconsole.log(t.length);', answer: '3', wrong: ['2', '7', '12'], why: 'length to liczba elementów.' },
  { lang: 'JS', code: 'let s = 0;\nfor (let i = 1; i <= 4; i++) s += i;\nconsole.log(s);', answer: '10', wrong: ['4', '6', '15'], why: '1+2+3+4 = 10.' },
  { lang: 'JS', code: 'console.log(5 === "5");', answer: 'false', wrong: ['true', '5', 'undefined'], why: '=== porównuje też typ.' },
  { lang: 'JS', code: 'console.log(parseInt("42px"));', answer: '42', wrong: ['NaN', '"42px"', '0'], why: 'parseInt czyta cyfry od początku.' },
  { lang: 'JS', code: 'let a = 10;\nif (a > 5) a = a * 2;\nconsole.log(a);', answer: '20', wrong: ['10', '5', '15'], why: 'Warunek spełniony, więc a = 20.' },
  { lang: 'JS', code: 'console.log(7 % 3);', answer: '1', wrong: ['2', '2.33', '0'], why: '% to reszta z dzielenia.' },
  { lang: 'PHP', code: '<?php\n$a = "Ala";\necho $a . " ma kota";\n?>', answer: 'Ala ma kota', wrong: ['$a ma kota', 'Ala . ma kota', 'błąd'], why: 'Kropka łączy napisy.' },
  { lang: 'PHP', code: '<?php\necho strlen("INF03");\n?>', answer: '5', wrong: ['4', '6', 'INF03'], why: 'strlen zwraca liczbę znaków.' },
  { lang: 'PHP', code: '<?php\n$t = [3, 5, 8];\necho count($t);\n?>', answer: '3', wrong: ['16', '8', '2'], why: 'count zwraca liczbę elementów.' },
  { lang: 'PHP', code: '<?php\n$x = 5;\n$x += 3;\necho $x * 2;\n?>', answer: '16', wrong: ['13', '10', '11'], why: '(5+3)*2 = 16.' },
  { lang: 'PHP', code: '<?php\necho "Wynik: " . 2 + 3;\n?>', answer: 'Wynik: 5', wrong: ['Wynik: 23', '5', 'błąd'], why: 'Od PHP 8 dodawanie ma wyższy priorytet niż kropka, więc najpierw 2 + 3 = 5. Dla czytelności i tak pisz nawiasy.' },
  { lang: 'PHP', code: '<?php\n$s = 0;\nfor ($i = 0; $i < 3; $i++) $s += $i;\necho $s;\n?>', answer: '3', wrong: ['6', '2', '0'], why: '0+1+2 = 3.' },
  { lang: 'PHP', code: '<?php\necho strtoupper("sql");\n?>', answer: 'SQL', wrong: ['sql', 'Sql', 'strtoupper'], why: 'strtoupper zamienia na wielkie litery.' },
];
export function OutputGame({ onBack }: { onBack: () => void }) {
  const addXp = useStore((s) => s.addXp);
  const [deck, setDeck] = useState(() => shuffle(OUTPUTS).slice(0, 8));
  const [i, setI] = useState(0);
  const [ok, setOk] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const q = deck[i];
  const opts = useMemo(() => (q ? shuffle([q.answer, ...q.wrong]) : []), [q]);
  if (!q) return <div className="max-w-xl"><Back onBack={onBack} /><End ok={ok} total={deck.length} onAgain={() => { setDeck(shuffle(OUTPUTS).slice(0, 8)); setI(0); setOk(0); }} /></div>;
  return (
    <div className="max-w-xl">
      <Back onBack={onBack} />
      <div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Co wypisze?</h2><Score ok={ok} total={deck.length} /></div>
      <p className="eyebrow mt-4">{q.lang} · {i + 1}/{deck.length}</p>
      <pre className="mono mt-2 overflow-x-auto rounded-xl bg-ink p-4 text-sm text-bg">{q.code}</pre>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {opts.map((o) => <Choice key={o} mono label={o} onClick={() => { setPicked(o); if (o === q.answer) { setOk((x) => x + 1); addXp(2); } }} state={!picked ? 'idle' : o === q.answer ? 'ok' : o === picked ? 'bad' : 'dim'} />)}
      </div>
      {picked && <div className="pop mt-3 rounded-xl bg-surface-2 p-3 text-sm">{q.why}</div>}
      {picked && <button className="btn btn-dark mt-3" onClick={() => { setPicked(null); setI(i + 1); }}>Dalej</button>}
    </div>
  );
}

// =============== 4. Znajdz blad ===============
const BUGS: { lang: string; lines: string[]; bad: number; fix: string }[] = [
  { lang: 'HTML', lines: ['<table>', '  <tr>', '    <td colpsan="2">Plan</td>', '  </tr>', '</table>'], bad: 2, fix: 'Literówka: colspan, nie colpsan.' },
  { lang: 'HTML', lines: ['<form action="zapis.php" method="post">', '  <label for="imie">Imię</label>', '  <input id="name" name="imie">', '  <button>Wyślij</button>', '</form>'], bad: 2, fix: 'for="imie" musi pasować do id pola: id="imie".' },
  { lang: 'HTML', lines: ['<ul>', '  <li>Kawa</li>', '  <li>Herbata<li>', '</ul>'], bad: 2, fix: 'Zamknięcie to </li>, a nie <li>.' },
  { lang: 'CSS', lines: ['#baner {', '  background-color: #C2410C', '  color: white;', '}'], bad: 1, fix: 'Brak średnika po wartości.' },
  { lang: 'CSS', lines: ['.karta {', '  padding: 10px;', '  border: 1px solid;', '  text-color: #333;', '}'], bad: 3, fix: 'Nie ma właściwości text-color. Kolor tekstu to color.' },
  { lang: 'CSS', lines: ['a:hover {', '  color: red;', '}', 'p::first-leter {', '  font-size: 150%;', '}'], bad: 3, fix: 'Literówka: ::first-letter.' },
  { lang: 'JS', lines: ['function oblicz() {', '  let a = document.getElementById("a").value;', '  let b = document.getElementById("b").value;', '  document.getElementById("w").innerHTML = a + b;', '}'], bad: 3, fix: 'value to tekst, więc a + b skleja napisy. Użyj Number(a) + Number(b).' },
  { lang: 'JS', lines: ['let el = document.getElementByID("menu");', 'el.style.display = "none";'], bad: 0, fix: 'Metoda nazywa się getElementById (małe „d”).' },
  { lang: 'JS', lines: ['const kolory = ["red", "green"];', 'for (let i = 0; i <= kolory.length; i++) {', '  console.log(kolory[i]);', '}'], bad: 1, fix: 'Warunek ma być i < kolory.length, inaczej ostatni obieg daje undefined.' },
  { lang: 'PHP', lines: ['<?php', '$pol = mysqli_connect("localhost", "root", "", "sklep");', '$wynik = mysqli_query("SELECT * FROM produkty");', 'mysqli_close($pol);', '?>'], bad: 2, fix: 'mysqli_query potrzebuje połączenia jako pierwszego argumentu: mysqli_query($pol, …).' },
  { lang: 'PHP', lines: ['<?php', 'if (isset($_POST["login"])) {', '  echo "Witaj " + $_POST["login"];', '}', '?>'], bad: 2, fix: 'W PHP napisy łączy się kropką, nie plusem.' },
  { lang: 'PHP', lines: ['<?php', 'while ($w = mysqli_fetch_row($wynik)) {', '  echo "<p>$w[nazwa]</p>";', '}', '?>'], bad: 2, fix: 'fetch_row zwraca tablicę numeryczną: $w[0]. Klucze nazw daje fetch_assoc.' },
  { lang: 'SQL', lines: ['SELECT nazwa, COUNT(*)', 'FROM produkty', 'WHERE COUNT(*) > 2', 'GROUP BY nazwa;'], bad: 2, fix: 'Warunek na funkcji agregującej idzie do HAVING, po GROUP BY.' },
  { lang: 'SQL', lines: ['UPDATE produkty', 'cena = cena * 1.1', "WHERE kategoria = 'audio';"], bad: 1, fix: 'Brakuje słowa SET: SET cena = cena * 1.1.' },
  { lang: 'SQL', lines: ["SELECT imie, nazwisko", "FROM uczniowie", "WHERE nazwisko LIKE 'K*';"], bad: 2, fix: 'W LIKE dowolny ciąg to %, nie *: LIKE \'K%\'.' },
];
export function BugGame({ onBack }: { onBack: () => void }) {
  const addXp = useStore((s) => s.addXp);
  const [deck, setDeck] = useState(() => shuffle(BUGS).slice(0, 8));
  const [i, setI] = useState(0);
  const [ok, setOk] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const q = deck[i];
  if (!q) return <div className="max-w-2xl"><Back onBack={onBack} /><End ok={ok} total={deck.length} onAgain={() => { setDeck(shuffle(BUGS).slice(0, 8)); setI(0); setOk(0); }} /></div>;
  return (
    <div className="max-w-2xl">
      <Back onBack={onBack} />
      <div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Znajdź błąd</h2><Score ok={ok} total={deck.length} /></div>
      <p className="mt-1 text-muted">Kliknij linię, w której jest błąd.</p>
      <p className="eyebrow mt-4">{q.lang} · {i + 1}/{deck.length}</p>
      <div className="mono mt-2 overflow-hidden rounded-xl border border-line bg-ink text-sm text-bg">
        {q.lines.map((l, k) => {
          const st = picked === null ? '' : k === q.bad ? 'bg-success/40' : k === picked ? 'bg-danger/50' : 'opacity-60';
          return (
            <button key={k} disabled={picked !== null} onClick={() => { setPicked(k); if (k === q.bad) { setOk((x) => x + 1); addXp(2); } }}
              className={`flex w-full gap-3 px-3 py-1.5 text-left hover:bg-white/10 ${st}`}>
              <span className="w-5 shrink-0 text-right opacity-50">{k + 1}</span><span className="whitespace-pre">{l}</span>
            </button>
          );
        })}
      </div>
      {picked !== null && <div className="pop mt-3 flex items-start gap-2 rounded-xl bg-surface-2 p-3 text-sm">{picked === q.bad ? <Check size={18} className="shrink-0 text-success" /> : <X size={18} className="shrink-0 text-danger" />}<span>{q.fix}</span></div>}
      {picked !== null && <button className="btn btn-dark mt-3" onClick={() => { setPicked(null); setI(i + 1); }}>Dalej</button>}
    </div>
  );
}

// =============== 5. Model pudelkowy ===============
function boxTask() {
  const w = pick([100, 150, 200, 250, 300]);
  const p = pick([5, 10, 15, 20]);
  const b = pick([1, 2, 3, 5]);
  const m = pick([0, 5, 10, 20]);
  const sizing = pick(['content-box', 'content-box', 'border-box'] as const);
  const ask = pick(['visible', 'space'] as const);
  const visible = sizing === 'border-box' ? w : w + 2 * p + 2 * b;
  const answer = ask === 'visible' ? visible : visible + 2 * m;
  return { w, p, b, m, sizing, ask, answer };
}
export function BoxGame({ onBack }: { onBack: () => void }) {
  const addXp = useStore((s) => s.addXp);
  const [t, setT] = useState(boxTask);
  const [val, setVal] = useState('');
  const [res, setRes] = useState<null | boolean>(null);
  const [ok, setOk] = useState(0);
  const [n, setN] = useState(0);
  const check = () => { const good = Number(val) === t.answer; setRes(good); setN((x) => x + 1); if (good) { setOk((x) => x + 1); addXp(2); } };
  const next = () => { setT(boxTask()); setVal(''); setRes(null); };
  return (
    <div className="max-w-2xl">
      <Back onBack={onBack} />
      <div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Model pudełkowy</h2><Score ok={ok} total={n} /></div>
      <p className="mt-1 text-muted">Policz szerokość w pikselach. Przy content-box padding i border dodają się do width. Przy border-box width obejmuje już padding i border.</p>
      <pre className="mono mt-4 rounded-xl bg-ink p-4 text-sm text-bg">{`.pudelko {\n  box-sizing: ${t.sizing};\n  width: ${t.w}px;\n  padding: ${t.p}px;\n  border: ${t.b}px solid black;\n  margin: ${t.m}px;\n}`}</pre>
      <div className="mt-4 flex justify-center">
        <div className="rounded-sm border-2 border-dashed border-js/60 p-2 text-[10px] text-js" title="margin">margin {t.m}
          <div className="relative border-4 border-ink p-0">{t.sizing === 'border-box' && <span className="absolute -top-4 left-0 right-0 text-center text-[10px] text-ink">width {t.w} (z paddingiem i ramką)</span>}<div className="bg-css/20 p-3 text-css">padding {t.p}<div className="mt-1 bg-accent/20 px-6 py-3 text-center text-accent">{t.sizing === 'border-box' ? 'treść' : `width ${t.w}`}</div></div></div>
        </div>
      </div>
      <p className="mt-4 font-bold">{t.ask === 'visible' ? 'Jaka jest widoczna szerokość elementu (od ramki do ramki)?' : 'Ile miejsca w poziomie zajmuje element razem z marginesami?'}</p>
      <div className="mt-2 flex gap-2">
        <input className="input mono w-40" inputMode="numeric" value={val} onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && (res === null ? check() : next())} placeholder="px" disabled={res !== null} />
        {res === null ? <button className="btn btn-primary" onClick={check} disabled={!val}>Sprawdź</button> : <button className="btn btn-dark" onClick={next}>Następne</button>}
      </div>
      {res !== null && (
        <p className={`pop mt-3 rounded-xl p-3 text-sm ${res ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
          {res ? 'Dobrze! ' : `Poprawnie: ${t.answer}px. `}
          {t.sizing === 'border-box' ? `border-box: widoczne = width = ${t.w}` : `content-box: ${t.w} + 2·${t.p} + 2·${t.b} = ${t.w + 2 * t.p + 2 * t.b}`}{t.ask === 'space' ? `, plus marginesy 2·${t.m}` : ''}.
        </p>
      )}
    </div>
  );
}

// =============== 6. Wynik kwerendy ===============
const TBL = `CREATE TABLE gry (id INTEGER PRIMARY KEY, tytul TEXT, gatunek TEXT, rok INTEGER, cena REAL, ocena INTEGER);
INSERT INTO gry VALUES (1,'Wiedźmin 3','RPG',2015,59,10),(2,'Cyberpunk 2077','RPG',2020,129,8),(3,'FIFA 24','sport',2023,199,6),(4,'Minecraft','sandbox',2011,99,9),(5,'Tetris','logiczna',1984,10,7),(6,'Portal 2','logiczna',2011,39,10),(7,'NBA 2K24','sport',2023,149,5),(8,'Terraria','sandbox',2011,35,9);`;
const TEMPLATES = [
  () => { const r = pick([2011, 2015, 2020]); return { sql: `SELECT tytul FROM gry WHERE rok > ${r};`, ask: 'Ile wierszy zwróci?', mode: 'rows' as const }; },
  () => { const c = pick([40, 60, 100, 150]); return { sql: `SELECT tytul, cena FROM gry WHERE cena < ${c};`, ask: 'Ile wierszy zwróci?', mode: 'rows' as const }; },
  () => { const g = pick(['RPG', 'sport', 'sandbox', 'logiczna']); return { sql: `SELECT COUNT(*) FROM gry WHERE gatunek = '${g}';`, ask: 'Jaką liczbę zwróci?', mode: 'value' as const }; },
  () => ({ sql: 'SELECT MAX(ocena) FROM gry;', ask: 'Jaką liczbę zwróci?', mode: 'value' as const }),
  () => ({ sql: 'SELECT gatunek, COUNT(*) FROM gry GROUP BY gatunek;', ask: 'Ile wierszy zwróci?', mode: 'rows' as const }),
  () => { const r = pick([2011, 2023]); return { sql: `SELECT COUNT(*) FROM gry WHERE rok = ${r};`, ask: 'Jaką liczbę zwróci?', mode: 'value' as const }; },
  () => ({ sql: 'SELECT DISTINCT rok FROM gry;', ask: 'Ile wierszy zwróci?', mode: 'rows' as const }),
  () => ({ sql: "SELECT tytul FROM gry WHERE ocena >= 9 AND cena < 50;", ask: 'Ile wierszy zwróci?', mode: 'rows' as const }),
  () => ({ sql: 'SELECT MIN(cena) FROM gry WHERE gatunek = \'sport\';', ask: 'Jaką liczbę zwróci?', mode: 'value' as const }),
  () => ({ sql: 'SELECT gatunek FROM gry GROUP BY gatunek HAVING COUNT(*) > 1;', ask: 'Ile wierszy zwróci?', mode: 'rows' as const }),
  () => ({ sql: "SELECT tytul FROM gry WHERE tytul LIKE '%a%';", ask: 'Ile wierszy zwróci?', mode: 'rows' as const }),
  () => ({ sql: 'SELECT SUM(cena) FROM gry WHERE gatunek = \'logiczna\';', ask: 'Jaką liczbę zwróci?', mode: 'value' as const }),
];
export function QueryResultGame({ onBack }: { onBack: () => void }) {
  const addXp = useStore((s) => s.addXp);
  const [q, setQ] = useState(() => pick(TEMPLATES)());
  const [answer, setAnswer] = useState<number | null>(null);
  const [val, setVal] = useState('');
  const [res, setRes] = useState<null | boolean>(null);
  const [rows, setRows] = useState<{ columns: string[]; values: unknown[][] } | null>(null);
  const [ok, setOk] = useState(0);
  const [n, setN] = useState(0);
  const [showTable, setShowTable] = useState(true);
  const [table, setTable] = useState<{ columns: string[]; values: unknown[][] } | null>(null);
  useEffect(() => { freshDb(TBL).then((db) => setTable(db.exec('SELECT * FROM gry')[0] as never)); }, []);
  useEffect(() => {
    let on = true;
    freshDb(TBL).then((db) => { const r = db.exec(q.sql)[0] as { columns: string[]; values: unknown[][] } | undefined; if (!on) return; setRows(r ?? { columns: [], values: [] }); setAnswer(q.mode === 'rows' ? (r?.values.length ?? 0) : Number(r?.values[0][0] ?? 0)); });
    return () => { on = false; };
  }, [q]);
  const check = () => { const good = Number(val.replace(',', '.')) === answer; setRes(good); setN((x) => x + 1); if (good) { setOk((x) => x + 1); addXp(3); } };
  const next = () => { setQ(pick(TEMPLATES.filter((t) => t().sql !== q.sql))()); setVal(''); setRes(null); };
  return (
    <div className="max-w-3xl">
      <Back onBack={onBack} />
      <div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Wynik kwerendy</h2><Score ok={ok} total={n} /></div>
      <p className="mt-1 text-muted">Przeczytaj tabelę i kwerendę. Odpowiedź policz w głowie, a my sprawdzimy ją w prawdziwym SQLite.</p>
      <button className="mt-3 text-sm text-info underline" onClick={() => setShowTable((x) => !x)}>{showTable ? 'Ukryj tabelę' : 'Pokaż tabelę gry'}</button>
      {showTable && table && (
        <div className="mt-2 overflow-x-auto rounded-xl border border-line">
          <table className="mono w-full text-xs"><thead className="bg-surface-2"><tr>{table.columns.map((c) => <th key={c} className="px-2 py-1 text-left">{c}</th>)}</tr></thead>
            <tbody>{table.values.map((r, i) => <tr key={i} className="border-t border-line">{r.map((v, k) => <td key={k} className="px-2 py-1">{String(v)}</td>)}</tr>)}</tbody></table>
        </div>
      )}
      <pre className="mono mt-4 overflow-x-auto rounded-xl bg-ink p-4 text-sm text-bg">{q.sql}</pre>
      <p className="mt-3 font-bold">{q.ask}</p>
      <div className="mt-2 flex gap-2">
        <input className="input mono w-40" inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (res === null ? check() : next())} disabled={res !== null} placeholder="wynik" />
        {res === null ? <button className="btn btn-primary" onClick={check} disabled={!val || answer === null}>Sprawdź</button> : <button className="btn btn-dark" onClick={next}>Następna</button>}
      </div>
      {res !== null && rows && (
        <div className="pop mt-3">
          <p className={`rounded-xl p-3 text-sm ${res ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>{res ? 'Dobrze!' : `Poprawnie: ${answer}.`}</p>
          <div className="mt-2 overflow-x-auto rounded-xl border border-line">
            <table className="mono w-full text-xs"><thead className="bg-surface-2"><tr>{rows.columns.map((c) => <th key={c} className="px-2 py-1 text-left">{c}</th>)}</tr></thead>
              <tbody>{rows.values.map((r, i) => <tr key={i} className="border-t border-line">{r.map((v, k) => <td key={k} className="px-2 py-1">{String(v)}</td>)}</tr>)}</tbody></table>
          </div>
        </div>
      )}
    </div>
  );
}
