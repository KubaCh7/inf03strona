export type Check =
  | { kind: 'dom'; selector: string; min?: number; textIncludes?: string; label: string }
  | { kind: 'regex'; file: string; pattern: string; flags?: string; label: string }
  | { kind: 'sql'; expected: string; label: string };

export type Lesson = {
  id: string;
  level: number;
  title: string;
  goal: string;
  minutes: number;
  body: string[]; // akapity; `code` w backtickach renderujemy jako kod
  example?: string;
  task: {
    prompt: string;
    mode: 'web' | 'sql' | 'php';
    starter: Record<string, string>;
    checks: Check[];
    db?: string; // schemat + dane dla zadan SQL
  };
  xp: number;
};

export const LEVELS = [
  { n: 1, name: 'Szkielet HTML', color: 'html' },
  { n: 2, name: 'CSS i układ strony', color: 'css' },
  { n: 3, name: 'SQL: pierwsze kwerendy', color: 'sql' },
  { n: 4, name: 'SQL: grupy, złączenia, uprawnienia', color: 'sql' },
  { n: 5, name: 'JavaScript i DOM', color: 'js' },
  { n: 6, name: 'PHP + MySQL', color: 'php' },
  { n: 7, name: 'Pełny arkusz', color: 'accent' },
] as const;

const SKLEP_DB = `CREATE TABLE produkty (id INTEGER PRIMARY KEY, nazwa TEXT, kategoria TEXT, cena REAL, ilosc INTEGER);
INSERT INTO produkty VALUES (1,'Klawiatura','peryferia',89.99,12),(2,'Mysz','peryferia',39.5,30),(3,'Monitor 24','ekrany',649,5),(4,'Monitor 27','ekrany',999,2),(5,'Pendrive 64GB','pamięci',35,50),(6,'Dysk SSD 1TB','pamięci',299,8),(7,'Słuchawki','audio',149,0),(8,'Głośniki','audio',119,7);`;

const SZKOLA_DB = `CREATE TABLE klasy (id INTEGER PRIMARY KEY, nazwa TEXT, wychowawca TEXT);
CREATE TABLE uczniowie (id INTEGER PRIMARY KEY, imie TEXT, nazwisko TEXT, klasa_id INTEGER, srednia REAL);
INSERT INTO klasy VALUES (1,'3A','Nowak'),(2,'3B','Kowalska'),(3,'4C','Wiśniewski');
INSERT INTO uczniowie VALUES (1,'Ola','Mazur',1,4.8),(2,'Kuba','Zieliński',1,3.9),(3,'Ewa','Lis',2,5.1),(4,'Adam','Kruk',2,3.2),(5,'Maja','Sowa',2,4.4),(6,'Piotr','Wilk',3,4.0),(7,'Zosia','Bąk',NULL,4.6);`;

export const LESSONS: Lesson[] = [
  // ---------- POZIOM 1 ----------
  {
    id: 'html-szkielet', level: 1, title: 'Szkielet dokumentu HTML5', minutes: 15, xp: 20,
    goal: 'Strona ma deklarację, kodowanie UTF-8, tytuł i treść.',
    body: [
      'Każdy arkusz INF.03 zaczyna się tak samo: poprawny szkielet. Za brak `<!DOCTYPE html>`, `lang="pl"` czy `<meta charset="UTF-8">` lecą punkty, a polskie znaki zamieniają się w krzaczki.',
      'Sekcja `<head>` trzyma metadane (tytuł karty, kodowanie, link do CSS). Sekcja `<body>` to wszystko, co widać.',
    ],
    example: '<!DOCTYPE html>\n<html lang="pl">\n<head>\n  <meta charset="UTF-8">\n  <title>Mój sklep</title>\n</head>\n<body>\n  ...\n</body>\n</html>',
    task: {
      prompt: 'Uzupełnij dokument: dodaj meta charset UTF-8, tytuł „Warsztat 03” i w treści nagłówek h1 z dowolnym tekstem.',
      mode: 'web',
      starter: { 'index.html': '<!DOCTYPE html>\n<html lang="pl">\n<head>\n\n</head>\n<body>\n\n</body>\n</html>' },
      checks: [
        { kind: 'dom', selector: 'meta[charset]', label: 'Jest <meta charset>' },
        { kind: 'dom', selector: 'title', textIncludes: 'Warsztat 03', label: 'Tytuł „Warsztat 03”' },
        { kind: 'dom', selector: 'body h1', label: 'W treści jest <h1>' },
      ],
    },
  },
  {
    id: 'html-naglowki', level: 1, title: 'Nagłówki, akapity, wyróżnienia', minutes: 15, xp: 20,
    goal: 'Hierarchia h1 → h2 → h3 bez przeskakiwania poziomów.',
    body: [
      'Nagłówki budują spis treści strony. Po `<h1>` idzie `<h2>`, po nim `<h3>`. Nie wybieraj nagłówka „bo ma ładny rozmiar”, od tego jest CSS.',
      'Tekst dzielimy na akapity `<p>`. Pogrubienie znaczeniowe to `<strong>`, pochylenie `<em>`. Na egzaminie często wymagane są też `<b>` i `<i>`, więc czytaj polecenie dokładnie.',
    ],
    task: {
      prompt: 'Zbuduj: h1 „Kawiarnia”, pod nim h2 „Menu” z akapitem, w którym słowo „espresso” jest pogrubione znacznikiem <strong>.',
      mode: 'web',
      starter: { 'index.html': '<h1></h1>\n' },
      checks: [
        { kind: 'dom', selector: 'h1', textIncludes: 'Kawiarnia', label: 'h1 „Kawiarnia”' },
        { kind: 'dom', selector: 'h2', textIncludes: 'Menu', label: 'h2 „Menu”' },
        { kind: 'dom', selector: 'p strong', textIncludes: 'espresso', label: '„espresso” w <strong> w akapicie' },
      ],
    },
  },
  {
    id: 'html-listy', level: 1, title: 'Listy numerowane i punktowane', minutes: 15, xp: 20,
    goal: 'Lista zagnieżdżona z innym typem numeracji.',
    body: [
      '`<ol>` numeruje, `<ul>` stawia punktory, każdy element to `<li>`. Atrybut `type` w `<ol>` zmienia numerację: `1`, `A`, `a`, `I`, `i`.',
      'Lista zagnieżdżona siedzi WEWNĄTRZ elementu `<li>`, nie obok niego. To częsty błąd na egzaminie.',
    ],
    example: '<ol type="I">\n  <li>Napoje\n    <ul><li>kawa</li><li>herbata</li></ul>\n  </li>\n</ol>',
    task: {
      prompt: 'Utwórz listę numerowaną cyframi rzymskimi z co najmniej 2 elementami; w pierwszym zagnieźdź listę punktowaną z 2 elementami.',
      mode: 'web',
      starter: { 'index.html': '' },
      checks: [
        { kind: 'dom', selector: 'ol[type="I"] > li', min: 2, label: 'ol type="I" z ≥ 2 elementami' },
        { kind: 'dom', selector: 'ol > li > ul > li', min: 2, label: 'Zagnieżdżona ul wewnątrz li' },
      ],
    },
  },
  {
    id: 'html-linki', level: 1, title: 'Cztery rodzaje linków', minutes: 20, xp: 20,
    goal: 'Podstrona, link zewnętrzny w nowej karcie, kotwica, mailto.',
    body: [
      'Link do podstrony: `href="kontakt.html"`. Link zewnętrzny w nowej karcie: dodaj `target="_blank"`.',
      'Kotwica przenosi do elementu o danym `id` na tej samej stronie: `href="#cennik"`. Link pocztowy: `href="mailto:adres@example.com"`.',
    ],
    task: {
      prompt: 'Dodaj: link do „galeria.html”, link do https://cke.gov.pl otwierany w nowej karcie, link do sekcji o id „stopka” i link mailto. Utwórz też element o id „stopka”.',
      mode: 'web',
      starter: { 'index.html': '<nav>\n\n</nav>\n\n<footer id="">Stopka</footer>' },
      checks: [
        { kind: 'dom', selector: 'a[href="galeria.html"]', label: 'Link do galeria.html' },
        { kind: 'dom', selector: 'a[href^="http"][target="_blank"]', label: 'Zewnętrzny link w nowej karcie' },
        { kind: 'dom', selector: 'a[href="#stopka"]', label: 'Kotwica #stopka' },
        { kind: 'dom', selector: '#stopka', label: 'Element o id="stopka"' },
        { kind: 'dom', selector: 'a[href^="mailto:"]', label: 'Link mailto' },
      ],
    },
  },
  {
    id: 'html-obrazy', level: 1, title: 'Obrazy z tekstem alternatywnym', minutes: 15, xp: 20,
    goal: 'Każdy obraz ma alt, a wymiary nie rozciągają grafiki.',
    body: [
      'Znacznik `<img>` jest pusty (bez zamknięcia). `src` to plik, `alt` to opis dla czytników ekranu i tekst, gdy grafika się nie wczyta. Na egzaminie alt jest prawie zawsze w kryteriach.',
      'Podanie tylko `height` (albo tylko `width`) zachowuje proporcje. Podanie obu różnych od oryginału zniekształca obraz.',
    ],
    task: {
      prompt: 'Wstaw trzy obrazy (dowolne nazwy plików), każdy z atrybutem alt i wysokością 150.',
      mode: 'web',
      starter: { 'index.html': '<section class="galeria">\n\n</section>' },
      checks: [
        { kind: 'dom', selector: 'img[alt]:not([alt=""])', min: 3, label: '3 obrazy z niepustym alt' },
        { kind: 'dom', selector: 'img[height="150"]', min: 3, label: 'Wysokość 150 przy każdym' },
      ],
    },
  },
  {
    id: 'html-tabela', level: 1, title: 'Tabela z nagłówkiem i łączeniem komórek', minutes: 25, xp: 25,
    goal: 'Tabela z th, rowspan i colspan, siatka się nie rozjeżdża.',
    body: [
      '`<tr>` to wiersz, `<th>` komórka nagłówkowa, `<td>` zwykła. `colspan="2"` łączy dwie kolumny, `rowspan="2"` dwa wiersze.',
      'Pułapka: komórka z rowspan „zabiera” miejsce w następnym wierszu, więc ten wiersz ma o jedną komórkę `<td>` mniej. Policz komórki w każdym wierszu, zanim zapiszesz.',
    ],
    example: '<table>\n  <tr><th colspan="2">Plan</th></tr>\n  <tr><td rowspan="2">Pn</td><td>HTML</td></tr>\n  <tr><td>CSS</td></tr>\n</table>',
    task: {
      prompt: 'Zbuduj tabelę z wierszem nagłówkowym (th), w której jedna komórka ma colspan="2", a inna rowspan="2".',
      mode: 'web',
      starter: { 'index.html': '<table>\n\n</table>' },
      checks: [
        { kind: 'dom', selector: 'table th', label: 'Jest komórka th' },
        { kind: 'dom', selector: 'table [colspan="2"]', label: 'colspan="2"' },
        { kind: 'dom', selector: 'table [rowspan="2"]', label: 'rowspan="2"' },
      ],
    },
  },
  {
    id: 'html-formularz', level: 1, title: 'Formularz z etykietami', minutes: 25, xp: 25,
    goal: 'Kliknięcie etykiety ustawia fokus we właściwym polu.',
    body: [
      'Formularz ma `action` (gdzie wysłać) i `method` (`get` albo `post`). Każde pole potrzebuje `name`, bo pod tą nazwą PHP odbierze dane w `$_POST`.',
      'Etykieta `<label for="email">` łączy się z polem `id="email"`. Przyciski radio z jednej grupy mają wspólne `name`.',
    ],
    task: {
      prompt: 'Zbuduj formularz POST do „zapis.php”: pole tekstowe „imie” z etykietą (for/id), pole email, lista select z ≥ 2 opcjami, 2 przyciski radio z tym samym name i przycisk wysyłania.',
      mode: 'web',
      starter: { 'index.html': '<form>\n\n</form>' },
      checks: [
        { kind: 'dom', selector: 'form[method="post" i][action="zapis.php"]', label: 'form method=post action=zapis.php' },
        { kind: 'dom', selector: 'label[for="imie"]', label: 'label for="imie"' },
        { kind: 'dom', selector: 'input#imie[name="imie"]', label: 'input id="imie" name="imie"' },
        { kind: 'dom', selector: 'input[type="email"]', label: 'Pole email' },
        { kind: 'dom', selector: 'select option', min: 2, label: 'select z ≥ 2 opcjami' },
        { kind: 'dom', selector: 'input[type="radio"][name]', min: 2, label: '2 przyciski radio' },
        { kind: 'dom', selector: 'button, input[type="submit"]', label: 'Przycisk wysyłania' },
      ],
    },
  },
  // ---------- POZIOM 2 ----------
  {
    id: 'css-selektory', level: 2, title: 'Selektory i zewnętrzny arkusz', minutes: 20, xp: 20,
    goal: 'Style w osobnym pliku, selektory id, klasy i znacznika.',
    body: [
      'Arkusz dołączasz w `<head>`: `<link rel="stylesheet" href="styl.css">`. Selektor `#baner` to id, `.karta` to klasa, `p` to znacznik.',
      'Selektor potomka `nav a` wybiera linki wewnątrz nav. Selektor dziecka `ul > li` tylko bezpośrednie dzieci.',
    ],
    task: {
      prompt: 'W styl.css: dla #baner ustaw tło #C2410C, dla klasy .karta padding 20px, dla akapitów kolor tekstu #333.',
      mode: 'web',
      starter: {
        'index.html': '<link rel="stylesheet" href="styl.css">\n<header id="baner">Baner</header>\n<div class="karta"><p>Treść karty</p></div>',
        'styl.css': '/* Twoje style */\n',
      },
      checks: [
        { kind: 'regex', file: 'styl.css', pattern: '#baner\\s*\\{[^}]*background(-color)?\\s*:\\s*#c2410c', flags: 'i', label: '#baner ma tło #C2410C' },
        { kind: 'regex', file: 'styl.css', pattern: '\\.karta\\s*\\{[^}]*padding\\s*:\\s*20px', flags: 'i', label: '.karta padding 20px' },
        { kind: 'regex', file: 'styl.css', pattern: '(^|[}\\s,])p\\s*\\{[^}]*color\\s*:\\s*#333', flags: 'i', label: 'p kolor #333' },
      ],
    },
  },
  {
    id: 'css-uklad', level: 2, title: 'Klasyczny układ egzaminacyjny (float)', minutes: 30, xp: 30,
    goal: 'Baner, dwa panele obok siebie, stopka pod spodem.',
    body: [
      'Większość arkuszy ma ten sam szkielet: baner na całą szerokość, panel lewy i prawy (czasem trzy) obok siebie, stopka na dole.',
      'Klasyczne rozwiązanie: panele z `float: left` i szerokościami w procentach (np. 30% i 70%), stopka z `clear: both`. Możesz też użyć flexboxa, ale zasady oceniania zwykle sprawdzają wygląd, nie technikę.',
    ],
    example: '#lewy { float: left; width: 30%; }\n#prawy { float: left; width: 70%; }\nfooter { clear: both; }',
    task: {
      prompt: 'Ustaw #lewy (float left, width 30%), #prawy (float left, width 70%) i stopkę footer z clear: both.',
      mode: 'web',
      starter: {
        'index.html': '<link rel="stylesheet" href="styl.css">\n<header>Baner</header>\n<section id="lewy">Lewy</section>\n<section id="prawy">Prawy</section>\n<footer>Stopka</footer>',
        'styl.css': 'header { background: #eee; padding: 10px; }\n',
      },
      checks: [
        { kind: 'regex', file: 'styl.css', pattern: '#lewy\\s*\\{(?=[^}]*float\\s*:\\s*left)(?=[^}]*width\\s*:\\s*30%)', flags: 'i', label: '#lewy: float left, 30%' },
        { kind: 'regex', file: 'styl.css', pattern: '#prawy\\s*\\{(?=[^}]*float\\s*:\\s*left)(?=[^}]*width\\s*:\\s*70%)', flags: 'i', label: '#prawy: float left, 70%' },
        { kind: 'regex', file: 'styl.css', pattern: 'footer\\s*\\{[^}]*clear\\s*:\\s*both', flags: 'i', label: 'footer: clear both' },
      ],
    },
  },
  {
    id: 'css-pseudoklasy', level: 2, title: 'Pseudoklasy i paski w tabeli', minutes: 20, xp: 20,
    goal: ':hover na linkach, :nth-child na wierszach.',
    body: [
      'Pseudoklasy to najczęstszy tag w arkuszach (występuje w ok. 90 ze 152). `a:hover` zmienia wygląd po najechaniu, `tr:nth-child(even)` koloruje parzyste wiersze.',
      'Kolejność dla linków to LVHA: `:link`, `:visited`, `:hover`, `:active`.',
    ],
    task: {
      prompt: 'Linki po najechaniu mają kolor #C2410C, parzyste wiersze tabeli tło #F1ECE3, a pierwsza litera akapitów ma rozmiar 150%.',
      mode: 'web',
      starter: {
        'index.html': '<link rel="stylesheet" href="styl.css">\n<a href="#">Link</a>\n<p>Ala ma kota.</p>\n<table><tr><td>1</td></tr><tr><td>2</td></tr><tr><td>3</td></tr></table>',
        'styl.css': '',
      },
      checks: [
        { kind: 'regex', file: 'styl.css', pattern: 'a:hover\\s*\\{[^}]*color\\s*:\\s*#c2410c', flags: 'i', label: 'a:hover kolor' },
        { kind: 'regex', file: 'styl.css', pattern: 'tr:nth-child\\((even|2n)\\)\\s*\\{[^}]*background', flags: 'i', label: 'tr:nth-child(even) tło' },
        { kind: 'regex', file: 'styl.css', pattern: 'p::?first-letter\\s*\\{[^}]*font-size\\s*:\\s*150%', flags: 'i', label: 'p::first-letter 150%' },
      ],
    },
  },
  {
    id: 'css-efekty', level: 2, title: 'Zaokrąglenia, cienie, przejścia', minutes: 20, xp: 20,
    goal: 'Obraz z cieniem, który płynnie się powiększa po najechaniu.',
    body: [
      '`border-radius` zaokrągla, `box-shadow` dodaje cień, `transition` animuje zmianę. Na :hover możesz zmienić np. `transform: scale(1.1)` albo `opacity`.',
    ],
    task: {
      prompt: 'Obrazy .foto: border-radius 10px, box-shadow, transition 0.5s, a na :hover przezroczystość 0.7.',
      mode: 'web',
      starter: { 'index.html': '<link rel="stylesheet" href="styl.css">\n<img class="foto" src="https://picsum.photos/200" alt="Zdjęcie">', 'styl.css': '' },
      checks: [
        { kind: 'regex', file: 'styl.css', pattern: '\\.foto\\s*\\{[^}]*border-radius\\s*:\\s*10px', flags: 'i', label: 'border-radius 10px' },
        { kind: 'regex', file: 'styl.css', pattern: '\\.foto\\s*\\{[^}]*box-shadow', flags: 'i', label: 'box-shadow' },
        { kind: 'regex', file: 'styl.css', pattern: '\\.foto\\s*\\{[^}]*transition\\s*:[^;]*0?\\.5s', flags: 'i', label: 'transition 0.5s' },
        { kind: 'regex', file: 'styl.css', pattern: '\\.foto:hover\\s*\\{[^}]*opacity\\s*:\\s*0?\\.7', flags: 'i', label: ':hover opacity 0.7' },
      ],
    },
  },
  // ---------- POZIOM 3 ----------
  {
    id: 'sql-select', level: 3, title: 'SELECT, WHERE, ORDER BY', minutes: 20, xp: 20,
    goal: 'Wybierasz kolumny, filtrujesz i sortujesz.',
    body: [
      'Kwerenda wybierająca: `SELECT kolumny FROM tabela WHERE warunek ORDER BY kolumna DESC;`. Na egzaminie kwerendy zapisujesz do pliku `kwerendy.txt` i robisz zrzuty wyników.',
      'Tabela `produkty` ma kolumny: id, nazwa, kategoria, cena, ilosc.',
    ],
    task: {
      prompt: 'Wyświetl nazwę i cenę produktów droższych niż 100 zł, posortowane od najdroższego.',
      mode: 'sql', db: SKLEP_DB,
      starter: { 'kwerenda.sql': 'SELECT ' },
      checks: [{ kind: 'sql', expected: 'SELECT nazwa, cena FROM produkty WHERE cena > 100 ORDER BY cena DESC;', label: 'Wynik zgodny z oczekiwanym' }],
    },
  },
  {
    id: 'sql-like', level: 3, title: 'LIKE, BETWEEN, IS NULL', minutes: 15, xp: 20,
    goal: 'Filtry tekstowe i zakresy.',
    body: ['`LIKE "M%"` = zaczyna się na M. `BETWEEN 30 AND 100` obejmuje obie granice. Brak wartości sprawdzasz przez `IS NULL`.'],
    task: {
      prompt: 'Wyświetl wszystkie kolumny produktów, których nazwa zaczyna się na „Monitor” albo cena jest między 30 a 40 zł.',
      mode: 'sql', db: SKLEP_DB,
      starter: { 'kwerenda.sql': '' },
      checks: [{ kind: 'sql', expected: "SELECT * FROM produkty WHERE nazwa LIKE 'Monitor%' OR cena BETWEEN 30 AND 40;", label: 'Wynik zgodny z oczekiwanym' }],
    },
  },
  {
    id: 'sql-dml', level: 3, title: 'INSERT, UPDATE, DELETE', minutes: 20, xp: 25,
    goal: 'Zmieniasz dane i sprawdzasz efekt.',
    body: ['Zawsze pisz `WHERE` w UPDATE i DELETE. Bez niego zmienisz albo skasujesz całą tabelę.', 'W tym zadaniu sprawdzarka porównuje stan tabeli po Twoich poleceniach.'],
    task: {
      prompt: 'Dodaj produkt (9, \'Kamera\', \'peryferia\', 199, 4), podnieś cenę Myszy do 45 i usuń produkty z ilością 0. Na końcu: SELECT * FROM produkty;',
      mode: 'sql', db: SKLEP_DB,
      starter: { 'kwerenda.sql': '' },
      checks: [{ kind: 'sql', expected: "INSERT INTO produkty VALUES (9,'Kamera','peryferia',199,4); UPDATE produkty SET cena = 45 WHERE nazwa = 'Mysz'; DELETE FROM produkty WHERE ilosc = 0; SELECT * FROM produkty;", label: 'Stan tabeli zgodny' }],
    },
  },
  {
    id: 'sql-alter', level: 3, title: 'ALTER TABLE', minutes: 15, xp: 20,
    goal: 'Dodajesz kolumnę do istniejącej tabeli.',
    body: ['`ALTER TABLE produkty ADD COLUMN opis TEXT;` dodaje kolumnę. W MySQL usuniesz ją przez `DROP COLUMN`. Na egzaminie ALTER pojawia się w co piątym arkuszu.'],
    task: {
      prompt: 'Dodaj do tabeli produkty kolumnę promocja typu INTEGER, a potem wyświetl SELECT nazwa, promocja FROM produkty;',
      mode: 'sql', db: SKLEP_DB,
      starter: { 'kwerenda.sql': '' },
      checks: [{ kind: 'sql', expected: 'ALTER TABLE produkty ADD COLUMN promocja INTEGER; SELECT nazwa, promocja FROM produkty;', label: 'Kolumna dodana' }],
    },
  },
  // ---------- POZIOM 4 ----------
  {
    id: 'sql-group', level: 4, title: 'Funkcje agregujące i GROUP BY', minutes: 25, xp: 25,
    goal: 'Liczysz, sumujesz i grupujesz.',
    body: ['`COUNT`, `SUM`, `AVG`, `MIN`, `MAX` liczą po grupach z `GROUP BY`. Filtr na wyniku agregacji to `HAVING`, nie `WHERE`.', 'Nadawaj aliasy: `COUNT(*) AS liczba`.'],
    task: {
      prompt: 'Dla każdej kategorii wyświetl kategorię i liczbę produktów (alias liczba), tylko kategorie z co najmniej 2 produktami.',
      mode: 'sql', db: SKLEP_DB,
      starter: { 'kwerenda.sql': '' },
      checks: [{ kind: 'sql', expected: 'SELECT kategoria, COUNT(*) AS liczba FROM produkty GROUP BY kategoria HAVING COUNT(*) >= 2;', label: 'Wynik zgodny' }],
    },
  },
  {
    id: 'sql-join', level: 4, title: 'Złączenia JOIN', minutes: 25, xp: 30,
    goal: 'Łączysz dwie tabele relacją.',
    body: ['Tabela `uczniowie` ma `klasa_id` wskazujące `klasy.id`. `INNER JOIN … ON` zwraca tylko dopasowane pary; `LEFT JOIN` zostawi też ucznia bez klasy.'],
    task: {
      prompt: 'Wyświetl imię, nazwisko ucznia i nazwę klasy, tylko dla uczniów przypisanych do klasy, posortowane po nazwisku.',
      mode: 'sql', db: SZKOLA_DB,
      starter: { 'kwerenda.sql': '' },
      checks: [{ kind: 'sql', expected: 'SELECT u.imie, u.nazwisko, k.nazwa FROM uczniowie u JOIN klasy k ON u.klasa_id = k.id ORDER BY u.nazwisko;', label: 'Wynik zgodny' }],
    },
  },
  {
    id: 'sql-avg-join', level: 4, title: 'JOIN + GROUP BY', minutes: 25, xp: 30,
    goal: 'Średnia ocen w każdej klasie.',
    body: ['Najpierw złącz, potem grupuj. To typowy wzór kwerendy nr 3 lub 4 w arkuszach.'],
    task: {
      prompt: 'Wyświetl nazwę klasy i średnią ocen uczniów (alias srednia_klasy) dla każdej klasy.',
      mode: 'sql', db: SZKOLA_DB,
      starter: { 'kwerenda.sql': '' },
      checks: [{ kind: 'sql', expected: 'SELECT k.nazwa, AVG(u.srednia) AS srednia_klasy FROM klasy k JOIN uczniowie u ON u.klasa_id = k.id GROUP BY k.nazwa;', label: 'Wynik zgodny' }],
    },
  },
  {
    id: 'sql-uzytkownicy', level: 4, title: 'CREATE USER i GRANT', minutes: 15, xp: 20,
    goal: 'Tworzysz konto i nadajesz uprawnienia (składnia MySQL).',
    body: ['SQLite w przeglądarce nie ma użytkowników, więc tu sprawdzamy składnię tekstowo. Na egzaminie wykonujesz to w phpMyAdmin.', "`CREATE USER 'anna'@'localhost' IDENTIFIED BY 'Ann@1';` potem `GRANT SELECT, INSERT ON sklep.produkty TO 'anna'@'localhost';`"],
    task: {
      prompt: "Utwórz użytkownika 'kasjer'@'localhost' z hasłem 'K@sa3' i nadaj mu SELECT oraz UPDATE na tabeli sklep.produkty.",
      mode: 'php',
      starter: { 'kwerenda.sql': '' },
      checks: [
        { kind: 'regex', file: 'kwerenda.sql', pattern: "CREATE\\s+USER\\s+'kasjer'@'localhost'\\s+IDENTIFIED\\s+BY\\s+'K@sa3'", flags: 'i', label: 'CREATE USER poprawny' },
        { kind: 'regex', file: 'kwerenda.sql', pattern: "GRANT\\s+(SELECT\\s*,\\s*UPDATE|UPDATE\\s*,\\s*SELECT)\\s+ON\\s+sklep\\.produkty\\s+TO\\s+'kasjer'@'localhost'", flags: 'i', label: 'GRANT SELECT, UPDATE' },
      ],
    },
  },
  // ---------- POZIOM 5 ----------
  {
    id: 'js-pobierz', level: 5, title: 'Pobierz wartość i wypisz wynik', minutes: 25, xp: 25,
    goal: 'Przycisk liczy wynik z pól formularza.',
    body: ['`document.getElementById("a").value` daje tekst. Zamień go na liczbę przez `Number()`. Wynik wpisz do elementu przez `innerHTML`.', 'Funkcję podpinasz w HTML: `onclick="oblicz()"`.'],
    task: {
      prompt: 'Napisz funkcję oblicz(), która mnoży wartości pól #cena i #ilosc i wpisuje „Do zapłaty: X zł” do elementu #wynik.',
      mode: 'web',
      starter: {
        'index.html': '<input id="cena" type="number" value="12">\n<input id="ilosc" type="number" value="3">\n<button onclick="oblicz()">Oblicz</button>\n<p id="wynik"></p>\n<script src="skrypt.js"></script>',
        'skrypt.js': 'function oblicz() {\n\n}\n',
      },
      checks: [
        { kind: 'regex', file: 'skrypt.js', pattern: 'getElementById\\(\\s*["\']cena["\']\\s*\\)\\.value', label: 'Odczyt #cena.value' },
        { kind: 'regex', file: 'skrypt.js', pattern: 'getElementById\\(\\s*["\']wynik["\']\\s*\\)\\.(innerHTML|textContent|innerText)\\s*=', label: 'Zapis do #wynik' },
        { kind: 'regex', file: 'skrypt.js', pattern: 'Do zapłaty', label: 'Tekst „Do zapłaty”' },
      ],
    },
  },
  {
    id: 'js-style', level: 5, title: 'Zmiana stylów i ukrywanie', minutes: 20, xp: 25,
    goal: 'Przełączasz widoczność bloku przyciskiem.',
    body: ['`el.style.display = "none"` ukrywa, `"block"` pokazuje. Stan sprawdzisz warunkiem `if (el.style.display == "none")`.'],
    task: {
      prompt: 'Funkcja przelacz() ukrywa lub pokazuje element #szczegoly.',
      mode: 'web',
      starter: {
        'index.html': '<button onclick="przelacz()">Szczegóły</button>\n<div id="szczegoly">Opis produktu…</div>\n<script src="skrypt.js"></script>',
        'skrypt.js': 'function przelacz() {\n\n}\n',
      },
      checks: [
        { kind: 'regex', file: 'skrypt.js', pattern: 'style\\.display\\s*=\\s*["\']none["\']', label: 'Ukrywanie display none' },
        { kind: 'regex', file: 'skrypt.js', pattern: 'style\\.display\\s*=\\s*["\'](block|flex|inline|)["\']', label: 'Pokazywanie' },
        { kind: 'regex', file: 'skrypt.js', pattern: 'if\\s*\\(', label: 'Warunek przełączania' },
      ],
    },
  },
  {
    id: 'js-galeria', level: 5, title: 'Prosta galeria (zamiana obrazu)', minutes: 25, xp: 30,
    goal: 'Kliknięcie miniatury zmienia duże zdjęcie.',
    body: ['Galeria pojawia się w kilku arkuszach. Wystarczy zmienić `src` dużego obrazu: `document.getElementById("duze").src = plik;`.'],
    task: {
      prompt: 'Napisz funkcję pokaz(plik), która ustawia src obrazu #duze na podany plik.',
      mode: 'web',
      starter: {
        'index.html': '<img id="duze" src="https://picsum.photos/id/10/300/200" alt="Duże">\n<img src="https://picsum.photos/id/20/80/60" alt="1" onclick="pokaz(\'https://picsum.photos/id/20/300/200\')">\n<img src="https://picsum.photos/id/30/80/60" alt="2" onclick="pokaz(\'https://picsum.photos/id/30/300/200\')">\n<script src="skrypt.js"></script>',
        'skrypt.js': 'function pokaz(plik) {\n\n}\n',
      },
      checks: [{ kind: 'regex', file: 'skrypt.js', pattern: 'getElementById\\(\\s*["\']duze["\']\\s*\\)\\.src\\s*=\\s*plik', label: 'Zmiana src na plik' }],
    },
  },
  {
    id: 'js-create', level: 5, title: 'Tworzenie elementów i pętla', minutes: 25, xp: 30,
    goal: 'Generujesz listę z tablicy.',
    body: ['`document.createElement("li")` tworzy element, `lista.appendChild(li)` dołącza go. Pętla `for` przechodzi po tablicy.'],
    task: {
      prompt: 'Dla każdego elementu tablicy owoce dodaj <li> do listy #lista (użyj createElement i appendChild).',
      mode: 'web',
      starter: {
        'index.html': '<ul id="lista"></ul>\n<script src="skrypt.js"></script>',
        'skrypt.js': 'const owoce = ["jabłko", "gruszka", "śliwka"];\n',
      },
      checks: [
        { kind: 'regex', file: 'skrypt.js', pattern: 'createElement\\(\\s*["\']li["\']\\s*\\)', label: 'createElement("li")' },
        { kind: 'regex', file: 'skrypt.js', pattern: 'appendChild\\(|\\.append\\(', label: 'appendChild' },
        { kind: 'dom', selector: '#lista li', min: 3, label: 'Lista ma 3 elementy (po uruchomieniu)' },
      ],
    },
  },
  // ---------- POZIOM 6 ----------
  {
    id: 'php-formularz', level: 6, title: 'Odbieranie danych z formularza', minutes: 25, xp: 25,
    goal: 'Skrypt sprawdza, czy formularz wysłano, i wypisuje dane.',
    body: [
      'PHP działa na serwerze, więc tu nie uruchamiamy go w przeglądarce. Sprawdzarka czyta Twój kod i szuka wymaganych konstrukcji. Na egzaminie uruchomisz go w XAMPP.',
      'Wzór: `if (isset($_POST["imie"])) { $imie = $_POST["imie"]; echo "Witaj " . $imie; }`',
    ],
    task: {
      prompt: 'W wynik.php: jeśli przesłano pole „imie” metodą POST, zapisz je do $imie i wypisz „Witaj, <imie>”.',
      mode: 'php',
      starter: { 'wynik.php': '<?php\n\n?>' },
      checks: [
        { kind: 'regex', file: 'wynik.php', pattern: 'isset\\(\\s*\\$_POST\\[\\s*["\']imie["\']\\s*\\]\\s*\\)', label: 'isset($_POST["imie"])' },
        { kind: 'regex', file: 'wynik.php', pattern: '\\$imie\\s*=\\s*\\$_POST\\[\\s*["\']imie["\']\\s*\\]', label: 'Przypisanie do $imie' },
        { kind: 'regex', file: 'wynik.php', pattern: '(echo|print)[^;]*Witaj', label: 'Wypisanie powitania' },
      ],
    },
  },
  {
    id: 'php-mysqli', level: 6, title: 'mysqli: połącz, zapytaj, wypisz, zamknij', minutes: 30, xp: 35,
    goal: 'Pełny cykl pracy z bazą w PHP, jak w każdym arkuszu.',
    body: [
      'Ten schemat powtarza się w ~100 arkuszach PHP: `mysqli_connect` → `mysqli_query` → pętla `while` z `mysqli_fetch_assoc` (albo `_row`/`_array`) → `mysqli_close`.',
      'Zamknięcie połączenia to zwykle osobny punkt w zasadach oceniania. Nie zapominaj o nim.',
    ],
    example: '$pol = mysqli_connect("localhost", "root", "", "sklep");\n$wynik = mysqli_query($pol, "SELECT nazwa, cena FROM produkty;");\nwhile ($w = mysqli_fetch_assoc($wynik)) {\n  echo "<p>" . $w["nazwa"] . " " . $w["cena"] . "</p>";\n}\nmysqli_close($pol);',
    task: {
      prompt: 'Połącz się z bazą „szkola” (localhost, root, bez hasła), pobierz imię i nazwisko uczniów, wypisz każdego w <li> i zamknij połączenie.',
      mode: 'php',
      starter: { 'uczniowie.php': '<ul>\n<?php\n\n?>\n</ul>' },
      checks: [
        { kind: 'regex', file: 'uczniowie.php', pattern: 'mysqli_connect\\(\\s*["\']localhost["\']\\s*,\\s*["\']root["\']\\s*,\\s*["\']["\']\\s*,\\s*["\']szkola["\']\\s*\\)', label: 'mysqli_connect do bazy szkola' },
        { kind: 'regex', file: 'uczniowie.php', pattern: 'mysqli_query\\([^)]*SELECT[^)]*imie[^)]*nazwisko', flags: 'is', label: 'Zapytanie SELECT imie, nazwisko' },
        { kind: 'regex', file: 'uczniowie.php', pattern: 'while\\s*\\(\\s*\\$\\w+\\s*=\\s*mysqli_fetch_(assoc|row|array)', label: 'Pętla while z fetch' },
        { kind: 'regex', file: 'uczniowie.php', pattern: '<li>', label: 'Wypisanie w <li>' },
        { kind: 'regex', file: 'uczniowie.php', pattern: 'mysqli_close\\(', label: 'mysqli_close' },
      ],
    },
  },
  {
    id: 'php-insert', level: 6, title: 'Zapis danych z formularza do bazy', minutes: 30, xp: 35,
    goal: 'INSERT z wartościami z $_POST.',
    body: ['Sklejasz zapytanie z danymi z formularza. Na egzaminie wystarcza konkatenacja, ale w prawdziwych projektach używa się zapytań przygotowanych (ochrona przed SQL Injection).'],
    task: {
      prompt: 'Po wysłaniu formularza (pola „nazwa” i „cena”) dodaj rekord do tabeli produkty w bazie „sklep” i zamknij połączenie.',
      mode: 'php',
      starter: { 'dodaj.php': '<?php\n\n?>' },
      checks: [
        { kind: 'regex', file: 'dodaj.php', pattern: '\\$_POST\\[\\s*["\']nazwa["\']\\s*\\]', label: 'Odczyt nazwa' },
        { kind: 'regex', file: 'dodaj.php', pattern: '\\$_POST\\[\\s*["\']cena["\']\\s*\\]', label: 'Odczyt cena' },
        { kind: 'regex', file: 'dodaj.php', pattern: 'INSERT\\s+INTO\\s+produkty', flags: 'i', label: 'INSERT INTO produkty' },
        { kind: 'regex', file: 'dodaj.php', pattern: 'mysqli_query\\(', label: 'mysqli_query' },
        { kind: 'regex', file: 'dodaj.php', pattern: 'mysqli_close\\(', label: 'mysqli_close' },
      ],
    },
  },
  // ---------- POZIOM 7 ----------
  {
    id: 'arkusz-pierwszy', level: 7, title: 'Twój pierwszy pełny arkusz', minutes: 150, xp: 50,
    goal: 'Rozwiąż łatwy arkusz INF.03 w 150 minut.',
    body: [
      'Czas na prawdziwy arkusz. Otwórz katalog, ustaw filtr trudności 2–4 i kwalifikację INF.03. Przeczytaj CAŁE polecenie, zanim zaczniesz pisać.',
      'Kolejność, która działa: baza i kwerendy (zrzuty!), grafika, HTML, CSS, skrypt. Zostaw 10 minut na sprawdzenie nazw plików i folderu z numerem PESEL.',
    ],
    task: {
      prompt: 'Zaznacz „Ukończony” przy dowolnym arkuszu INF.03 z katalogu i wpisz wynik samooceny, potem wróć tu i oznacz lekcję jako zrobioną.',
      mode: 'web', starter: { 'index.html': '<!-- otwórz katalog arkuszy -->' }, checks: [],
    },
  },
];
