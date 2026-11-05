# easyinf.pl: funkcje, UX, konkurencja i stack dla darmowej alternatywy INF.03

Uwaga metodologiczna: w tej sesji chmurowej WebFetch nie mógł pobrać stron easyinf.pl, zawodowe.edu.pl, egzamin-informatyk.pl ani ee-informatyk.pl (ENOTFOUND, czyli domeny spoza dozwolonej sieci sesji). Ustalenia o tych serwisach pochodzą więc z fragmentów wyników wyszukiwarki (tytuły i opisy stron) oraz ze zrzutów ekranu użytkownika opisanych w zadaniu. Wersje bibliotek sprawdzono bezpośrednio w rejestrze npm (registry.npmjs.org) 2026-11-05. Żeby zweryfikować szczegóły (FAQ, Minigry, Sprint, Sztab), trzeba dodać te domeny w ustawieniach sieci sesji.

## 1. Co oferuje easyinf.pl (poza tym, co widać na zrzutach)

### Takeaway
easyinf.pl to prywatna, częściowo płatna platforma INF.03. Za darmo daje roadmapę kursu, 152 arkusze CKE z rozwiązaniami, sprawdzarkę kodu i 2701 pytań teorii. Płatne są dwa jednorazowe pakiety: "Egzamin" za 49 zł (warsztat arkusza, pełna sprawdzarka, baza SQL; dostęp do końca najbliższej sesji) i "Pewniak" za 59,99 zł (do tego próbny egzamin, ściągi, 12 miesięcy dostępu, gwarancja). Najmocniejszy wyróżnik to automatyczna sprawdzarka plików "kryterium po kryterium" względem wymagań arkusza.

### Cited Findings
- Tytuł strony głównej: "Kurs INF.03 online — przygotowanie do egzaminu zawodowego". Opis: "roadmapa od zera, 152 arkusze CKE z rozwiązaniami, sprawdzarka kodu i 2701 pytań teorii za darmo" — [easyinf.pl](https://easyinf.pl/) (fragment wyszukiwarki)
- Platforma opisuje się jako "prywatna platforma edukacyjna — nie jest szkołą". Próbny egzamin "sprawdza wybrane wymagania kodu, nie wystawia oceny CKE" — [easyinf.pl](https://easyinf.pl/) (fragment wyszukiwarki)
- Pakiet Egzamin: 49,00 zł jednorazowo, dostęp do końca najbliższej sesji egzaminacyjnej. "Warsztat arkusza, pełna sprawdzarka i baza SQL są w pakiecie Egzamin" — [easyinf.pl](https://easyinf.pl/) (fragment wyszukiwarki)
- Pakiet Pewniak: 59,99 zł jednorazowo, 12 miesięcy dostępu. Do funkcji pakietu Egzamin dochodzą próbny egzamin, ściągi (PDF) i gwarancja. Sprawdzarka plików jest w obu pakietach i ocenia każdy z czterech wyników arkusza — [easyinf.pl](https://easyinf.pl/) (fragment wyszukiwarki)
- Sprawdzarka nazywa się "Audytor CKE" i "czyta pliki kryterium po kryterium". Wynik to "wynik treningowy EasyINF", a nie oficjalny wynik CKE — [easyinf.pl](https://easyinf.pl/) (fragment wyszukiwarki)
- Roadmapa: kolejny krok odblokowuje się dopiero po ukończeniu poprzedniego. Fiszki mają wersję demo, więc pełny dostęp jest prawdopodobnie płatny — [easyinf.pl](https://easyinf.pl/) (fragment wyszukiwarki)
- Osobna podstrona SEO "Arkusze INF.03 2018–2026 — lista 152 zadań z wymaganiami". Pokazuje sesje (np. "Czerwiec 2026, 12 zadań") z oceną trudności 1–10 (np. 8/10, 10/10). Wśród 152 arkuszy 148 ma gotowe rozwiązanie. Praktyka trwa 150 min — [easyinf.pl/arkusze-inf03](https://easyinf.pl/arkusze-inf03/) (fragment wyszukiwarki)
- Niespójność: według podsumowania wyszukiwarki liczby arkuszy w poszczególnych sesjach na tej podstronie sumują się do ok. 113, a nie 152. Dla czerwca 2025 egzaminyez.pl podaje 13 arkuszy, a easyinf 12 — [easyinf.pl/arkusze-inf03](https://easyinf.pl/arkusze-inf03/); [egzaminyez.pl/praktyczny/INF03](https://egzaminyez.pl/praktyczny/INF03)
- Ze zrzutów użytkownika (źródło pierwotne, nie z sieci): sidebar NAUKA (Kurs, Dziś, Fiszki, Teoria, Minigry, Arkusze, Sprint), PAKIET EGZAMIN (Sztab, Sprawdzenie pracy), PAKIET PEWNIAK (Sala egzaminacyjna, Ściągi), KONTO (Ustawienia). W kursie są levele i lekcje z blokadą. Prawy panel zawiera powtórkę fiszek na dziś, postęp w %, streak i minuty w tygodniu. Teoria ma losowanie po kategoriach (Strony 696, Bazy 697, Aplikacje 1028, Podstawy 212, BHP 23, Angielski 23, Kompetencje 22) i pełny arkusz 40 pytań / 60 min / próg 50%. Karty arkuszy mają podgląd, kod CKE, trudność x/10, badge JS/PHP, tagi, PDF w platformie, kod rozwiązania, checkbox "ukończony" i % wyniku. Do tego XP, levele i dolny pasek zakładek na mobile.

### Inferences
- Architektura informacji easyinf dzieli się na trzy warstwy: (a) codzienny nawyk (Dziś, Fiszki, Sprint, streak, XP), (b) bank treści (Teoria, Arkusze, Kurs), (c) symulację egzaminu i ocenę (Sala egzaminacyjna, Sprawdzenie pracy, Sztab). Darmowa alternatywa może dać wszystkie trzy warstwy, bo płatne funkcje easyinf (sprawdzarka, baza SQL, próbny egzamin) da się zrobić w przeglądarce bez backendu.
- "Sprawdzenie pracy" i "Audytor CKE" to najpewniej ta sama funkcja: upload plików (HTML/CSS/JS/PHP/SQL) i automatyczne sprawdzanie kryteriów z zasad oceniania CKE. "Baza SQL" to prawdopodobnie przeglądarkowa lub serwerowa baza do wykonywania zapytań z arkusza.
- "Sztab" (w pakiecie Egzamin) to prawdopodobnie plan lub dashboard przygotowań do sesji (odliczanie, plan dnia, słabe kategorie). To wniosek z nazwy i umiejscowienia w menu, niepotwierdzony.
- "Sprint" to prawdopodobnie krótka sesja na czas (np. seria pytań). Na zawodowe.edu.pl "Sprint" to hasło wiki do INF.04 (Scrum), więc to inne znaczenie — [zawodowe.edu.pl/wiki/inf-04/sprint](https://zawodowe.edu.pl/wiki/inf-04/sprint/)
- Wymóg "No copying brand/logo/text" oznacza, że nie należy przejmować nazw sekcji easyinf ("Sztab", "Pewniak", "Sala egzaminacyjna", "Audytor CKE"), tylko nadać własne.

### Gaps
- Nie udało się potwierdzić, co dokładnie robią Minigry, Sprint, Sztab ani co zawierają Ściągi. Domena easyinf.pl jest zablokowana w sieci sesji, a wyszukiwarka nie zwróciła tych treści.
- Brak FAQ, regulaminu i szczegółów "gwarancji" w pakiecie Pewniak.
- Algorytm fiszek easyinf (SM-2, FSRS czy prosty Leitner) jest nieznany.
- Metodologia oceny trudności 1–10 na easyinf nie jest opisana w dostępnych fragmentach.

## 2. Konkurencja i co robi dobrze

### Takeaway
Rynek INF.03 to głównie darmowe banki pytań z testem 40/60 (egzamin-informatyk.pl, ee-informatyk.pl, informatyk-egzamin.pl, egzamin-programista.pl), repozytoria arkuszy PDF (zawodowe.edu.pl, praktycznyegzamin.pl, arkusze.pl) oraz płatne kursy wideo (kursinf.pl, maturalnesos.pl). Najbliżej easyinf jest egzaminyez.pl: tryb nauki z natychmiastowym wyjaśnieniem, działy ze statystykami, "inteligentne powtórki" na koncie i darmowa nauka bez logowania. kursinf.pl ma tryb "Losuj pytanie" i arkusze z plikami oraz panelem "Moje zadania".

### Cited Findings
- **egzaminyez.pl**: tryb "Nauka" z wyjaśnieniem od razu po odpowiedzi i pytania podzielone na działy. Tryby nauki są darmowe i działają bez logowania, poza "inteligentnymi powtórkami", które zapisują harmonogram na koncie. Jest też egzamin próbny 40 pytań / 60 min — [egzaminyez.pl/nauka/INF03](https://egzaminyez.pl/nauka/INF03) (fragment wyszukiwarki)
- egzaminyez.pl, statystyki działów: HTML i Podstawy WWW 368 pytań (21%), Relacyjne Bazy Danych i SQL 343 (20%), Backend PHP 300 (17%), CSS 243 (14%) — [egzaminyez.pl/nauka/INF03](https://egzaminyez.pl/nauka/INF03)
- Kurs egzaminyez.pl: 9 modułów, 66 lekcji, ok. 19 h, 396 pytań sprawdzających, 123 zadania z rozwiązaniem. Ma też stronę z arkuszami praktycznymi CKE z rozwiązaniami — [egzaminyez.pl/kursy/inf03](https://egzaminyez.pl/kursy/inf03); [egzaminyez.pl/praktyczny/INF03](https://egzaminyez.pl/praktyczny/INF03)
- Format egzaminu według egzaminyez.pl: część pisemna to 40 pytań zamkniętych (4 odpowiedzi, 1 poprawna) z banku CKE, 60 min, próg 50%. Część praktyczna trwa 150 min z progiem 75% — [egzaminyez.pl/egzamin-zawodowy/inf-03](https://egzaminyez.pl/egzamin-zawodowy/inf-03)
- **kursinf.pl**: kursy INF.02/INF.03/INF.04 i matura. INF.03 obejmuje HTML, CSS, PHP, JS, SQL i zadania praktyczne z poprzednich sesji. Strona główna podaje cenę 79,99 zł (przekreślone 89,99 zł). Starsze posty TikTok podają 49,99 zł i 51 lekcji / 308 pytań, więc ceny są niespójne — [kursinf.pl](https://www.kursinf.pl/); [TikTok @kursinf.pl](https://www.tiktok.com/@kursinf.pl/video/7491298683825196310)
- kursinf.pl ma tryb "Losuj pytanie INF.03" (jedno pytanie) i arkusze "egzamin praktyczny z plikami" z panelem "Moje zadania". Trudność arkuszy jest opisana słownie ("Średni", "Trudny"), a nie w skali 1–10 — [kursinf.pl/pytania/inf03/jedno-pytanie](https://www.kursinf.pl/pytania/inf03/jedno-pytanie); [kursinf.pl/arkusze/inf03](https://www.kursinf.pl/arkusze/inf03); [kursinf.pl/arkusze/inf03/arkusz/89](https://www.kursinf.pl/arkusze/inf03/arkusz/89)
- **egzamin-informatyk.pl / egzamin-programista.pl**: test 40 pytań z przyciskiem "Losuj 40 pytań" dla INF.03/EE.09 — [egzamin-informatyk.pl](https://egzamin-informatyk.pl/testy-inf03-ee09-programowanie-bazy-danych/); [egzamin-programista.pl](https://egzamin-programista.pl/testy-inf03-tworzenie-administrowanie-stronami-aplikacjami-bazami-danych/)
- **ee-informatyk.pl**: pełny test 40 pytań oraz wybór testu — [ee-informatyk.pl/inf03-ee09/pelny-test](https://ee-informatyk.pl/inf03-ee09/pelny-test/); [ee-informatyk.pl/inf03-ee09/test-online](https://ee-informatyk.pl/inf03-ee09/test-online/)
- **informatyk-egzamin.pl**: quizy "Teoria 40P" i archiwalne egzaminy pisemne według roku (2022, 2025) — [informatyk-egzamin.pl](https://informatyk-egzamin.pl/qsm_quiz/teoria-40p-inf-03-ee-09-e-14/); [informatyk-egzamin.pl/egzamin-zawodowy-inf-03-2025](https://informatyk-egzamin.pl/egzamin-zawodowy-inf-03-2025/)
- **zawodowe.edu.pl**: arkusze praktyczne INF.03 i zasady oceniania do pobrania, plus wiki pojęć — [zawodowe.edu.pl/arkusze-praktyczne/inf-03](https://zawodowe.edu.pl/arkusze-praktyczne/inf-03/)
- **praktycznyegzamin.pl**: zbiór arkuszy praktycznych INF.03/EE.09/E.14 — [praktycznyegzamin.pl](https://www.praktycznyegzamin.pl/inf03ee09e14/praktyka/)
- Open source: repozytorium Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03 (ok. 125 arkuszy z załącznikami i zasadami oceniania) oraz wyszukiwarka arkuszy Chr1skyy/EgzaminZawodowyINF03-Wyszukiwarka. Są też odpowiedzi do arkuszy 2023 (guliveer/inf.03_2023-odpowiedzi) — [GitHub Chr1skyy](https://github.com/Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03); [GitHub wyszukiwarka](https://github.com/Chr1skyy/EgzaminZawodowyINF03-Wyszukiwarka); [awesome.ecosyste.ms guliveer](https://awesome.ecosyste.ms/projects/github.com%2Fguliveer%2Finf.03_2023-odpowiedzi)
- Oficjalne materiały: informator CKE/OKE dla technika programisty i technika informatyka z przykładowymi zadaniami INF.03 — [OKE Warszawa, technik programista 2024](https://oke.waw.pl/wp-content/uploads/OKE_WARSZAWA/EE/EE_Zawodowy/Informatory/2024/technik_programista.pdf); [OKE Warszawa, technik informatyk 2024](https://www.oke.waw.pl/wp-content/uploads/OKE_WARSZAWA/EE/EE_Zawodowy/Informatory/2024/technik_informatyk.pdf)

### Inferences
- Wzorce do przejęcia (jako mechanika, nie treść): nauka bez logowania z opcjonalnym kontem do synchronizacji (egzaminyez), natychmiastowe wyjaśnienie po odpowiedzi (egzaminyez), statystyki działów i udział procentowy (egzaminyez), "losuj 1 pytanie" i "losuj 40" (wszyscy), arkusze z plikami do pobrania i panelem "moje zadania" (kursinf).
- Luka rynkowa: żaden darmowy konkurent (w zakresie znalezionych źródeł) nie oferuje automatycznej sprawdzarki praktyki ani przeglądarkowego środowiska PHP+SQL. To główny argument dla darmowej alternatywy.
- Pytania CKE i arkusze są publikowane jako materiały egzaminacyjne. Ich licencję i zasady ponownego udostępniania trzeba sprawdzić osobno (zob. Gaps).

### Gaps
- Nie zweryfikowano bezpośrednio stron konkurentów (blokada sieci). Liczby pochodzą z fragmentów wyszukiwarki.
- Prawny status ponownego publikowania pytań i arkuszy CKE (prawo autorskie, art. 4 ustawy o prawie autorskim o materiałach urzędowych) nie został zbadany w tej sesji.

## 3. Rekomendowany stack (wersje z npm, stan na 2026-11-05)

### Takeaway
Najprostszy darmowy wariant to statyczna aplikacja SPA (Vite + React + TypeScript + Tailwind) z treścią w plikach JSON i postępem w IndexedDB (Dexie). Opcjonalnie dochodzi Supabase do logowania i synchronizacji. Edytor to CodeMirror 6 z podglądem w iframe sandbox. SQL działa w przeglądarce (sql.js, czyli SQLite WASM). PHP działa w WASM (@php-wasm/web, licencja GPL). PDF otwiera PDF.js lub react-pdf, a fiszki planuje ts-fsrs (FSRS v6). Hosting statyczny (np. GitHub Pages / Cloudflare Pages / Vercel) wystarczy, bo wszystkie "płatne" funkcje easyinf da się wykonać po stronie klienta.

### Cited Findings (wersje: najnowszy tag `latest`, data wydania i licencja z registry.npmjs.org)
- react 19.3.1; react-router 8.5.1; vite 8.3.6; next 16.4.5; tailwindcss 4.3.4; zustand 5.0.16; @tanstack/react-query 5.106.1; zod 4.6.7 — [npm registry](https://registry.npmjs.org/)
- Edytor: @codemirror/view 6.43.15; @uiw/react-codemirror 4.25.12; @codemirror/lang-html 6.4.12 (2026-08-04, MIT); @codemirror/lang-php 6.0.2 (2025-06-19, MIT); @codemirror/lang-sql 6.10.0 (2025-09-16, MIT). Alternatywa: monaco-editor 0.57.0 (2026-09-24, MIT) z @monaco-editor/react 4.7.0 — [npm: @codemirror/view](https://registry.npmjs.org/@codemirror/view); [npm: monaco-editor](https://registry.npmjs.org/monaco-editor)
- SQL w przeglądarce: sql.js 1.15.2 (2026-10-26, MIT); @sqlite.org/sqlite-wasm 3.54.1-build1; @electric-sql/pglite 0.5.15 (2026-11-03, Apache-2.0, PostgreSQL w WASM) — [npm: sql.js](https://registry.npmjs.org/sql.js); [npm: pglite](https://registry.npmjs.org/@electric-sql/pglite)
- PHP w przeglądarce: @php-wasm/web 3.1.62 (2026-11-02, GPL-2.0-or-later, projekt WordPress Playground); alternatywnie php-wasm 0.2.0 (2026-10-01, Apache-2.0 OR GPL-2.0-only) — [npm: @php-wasm/web](https://registry.npmjs.org/@php-wasm/web); [npm: php-wasm](https://registry.npmjs.org/php-wasm)
- PDF: pdfjs-dist 6.5.438 (2026-11-01, Apache-2.0); react-pdf 11.0.0 (2026-09-10, MIT) — [npm: pdfjs-dist](https://registry.npmjs.org/pdfjs-dist); [npm: react-pdf](https://registry.npmjs.org/react-pdf)
- Spaced repetition: ts-fsrs 6.0.0 (2026-10-28, MIT) — [npm: ts-fsrs](https://registry.npmjs.org/ts-fsrs)
- Przechowywanie i synchronizacja: dexie 4.4.7 (IndexedDB); @supabase/supabase-js 2.119.0 — [npm: dexie](https://registry.npmjs.org/dexie); [npm: supabase-js](https://registry.npmjs.org/@supabase/supabase-js)
- PWA i wyszukiwanie: vite-plugin-pwa 2.0.0 (2026-10-03, MIT); fuse.js 7.5.0 (2026-07-13, Apache-2.0) do wyszukiwania pytań — [npm: vite-plugin-pwa](https://registry.npmjs.org/vite-plugin-pwa); [npm: fuse.js](https://registry.npmjs.org/fuse.js)
- Alternatywa contentowa: astro 7.4.6 i @astrojs/starlight 0.42.9 (teoria i ściągi jako MDX) — [npm: astro](https://registry.npmjs.org/astro)
- FSRS kontra SM-2: otwarty benchmark srs-benchmark (ok. 10 tys. kolekcji Anki, ok. 350 mln powtórek) pokazuje, że FSRS przewiduje zapamiętanie lepiej niż SM-2. Według źródeł wtórnych FSRS jest lepszy dla 99,6% użytkowników. Autorzy zaznaczają, że SM-2 nie przewiduje prawdopodobieństw, więc porównanie nie jest w pełni symetryczne — [Expertium Benchmark](https://expertium.github.io/Benchmark.html)
- Twierdzenie o ok. 25% mniej powtórek przy FSRS-5 pochodzi z bloga komercyjnego i nie zostało zweryfikowane — [diane.app](https://www.diane.app/en/guides/fsrs-vs-sm2)

### Inferences (rekomendacje architektoniczne)
- **Vite SPA zamiast Next.js**: wszystko działa po stronie klienta (WASM, IndexedDB), a SSR nie jest potrzebny. Wyjątkiem jest SEO podstron z listą arkuszy i pytań; tę rolę u easyinf pełni /arkusze-inf03/. Jeśli SEO jest ważne, lepsze będzie Astro (statyczne podstrony) z wyspami React albo Next.js ze statycznym eksportem.
- **Pinning wersji**: część pakietów wyszła w ostatnich dniach (pglite 11-03, @php-wasm/web 11-02, pdfjs-dist 11-01, ts-fsrs 6.0.0 10-28). Warto przypiąć dokładne wersje w package.json i trzymać lockfile. ts-fsrs 6.0.0 to nowa wersja główna, więc przed użyciem trzeba sprawdzić zmiany API (ewentualnie zacząć od 5.x).
- **Dialekt SQL**: egzamin INF.03 tradycyjnie używa MySQL/MariaDB (XAMPP/phpMyAdmin). To wiedza ogólna, niezweryfikowana w tej sesji. sql.js (SQLite) obsłuży większość zapytań z arkuszy (SELECT, JOIN, GROUP BY, INSERT, UPDATE, ALTER TABLE), ale różni się przy AUTO_INCREMENT, typach, funkcjach dat i CREATE USER/GRANT. Zadania z uprawnieniami trzeba sprawdzać tekstowo (regex lub parser), a nie wykonywać. PGlite (Postgres) jest dalej od MySQL niż SQLite, więc sql.js jest lepszym wyborem. Można dodać lekką warstwę przepisującą typowe konstrukcje MySQL na SQLite.
- **PHP**: @php-wasm/web ma rozszerzenia (w tym PDO/SQLite) z ekosystemu WordPress Playground. Arkusze INF.03 używają mysqli, więc potrzebna jest warstwa shim mysqli -> SQLite albo osobny "mock" bazy. To największe ryzyko techniczne i warto je sprawdzić prototypem. Licencja GPL-2.0 dotyczy dystrybucji binariów WASM; trzeba ją uwzględnić, jeśli projekt nie jest GPL.
- **Podgląd HTML/CSS/JS**: iframe z `sandbox="allow-scripts"` i `srcdoc`, odświeżany z debounce ok. 300 ms. Pliki obrazów z arkusza jako Blob URL.
- **Sprawdzarka (własna implementacja "kryteriów")**: zasady oceniania CKE zapisane jako JSON reguł, np. `{type:"dom", selector:"table th", min:1}`, `{type:"css", selector:"header", prop:"background-color", equals:"#..."}`, `{type:"sql", query:"...", expectRows:...}`, `{type:"php-output", contains:"..."}`. Reguły HTML/CSS sprawdza DOMParser plus getComputedStyle w ukrytym iframe, SQL sprawdza porównanie wyników w sql.js, a PHP sprawdza wykonanie w php-wasm i porównanie wyjścia.
- **Model danych (JSON)**: `questions.json` (id, kategoria, treść, 4 odpowiedzi, poprawna, wyjaśnienie, obraz, źródło sesji), `sheets.json` (kod CKE, sesja, tytuł, tagi, trudność, technologie, pliki, kryteria), `course.json` (levele, lekcje, zadania z kryteriami i warunki odblokowania). Postęp w Dexie: reviewLog i karty FSRS, odpowiedzi teorii, wyniki arkuszy, XP i streak. Eksport/import JSON jako zabezpieczenie, a Supabase opcjonalnie.
- **Gamifikacja**: XP za zdarzenia (poprawna odpowiedź, ukończona lekcja, arkusz ≥75%), streak liczony z dat lokalnych (strefa Europe/Warsaw), minuty w tygodniu z timera aktywnej karty (Page Visibility API).
- **Mobile**: dolny pasek zakładek (4–5 pozycji) poniżej breakpointu `md`, sidebar powyżej. Edytor kodu na mobile w trybie zakładek kod/podgląd.

### Gaps
- Brak sprawdzonego w tej sesji testu działania mysqli w @php-wasm/web. Wymaga prototypu.
- Nie zweryfikowano zmian API w ts-fsrs 6.0.0 względem 5.x.

## 4. Ocena trudności arkuszy (skala 1–10)

### Takeaway
easyinf stosuje skalę 1–10, a kursinf skalę słowną (Średni/Trudny). Publicznie nie ma opisanej metodologii, więc trzeba zbudować własną: ważony wynik z cech arkusza (liczba i rodzaj technologii, liczba kryteriów, złożoność SQL i skryptu, długość CSS), skalibrowany później rzeczywistymi wynikami użytkowników.

### Cited Findings
- easyinf podaje trudność 1–10 dla każdego arkusza (np. 8/10, 10/10) — [easyinf.pl/arkusze-inf03](https://easyinf.pl/arkusze-inf03/) (fragment wyszukiwarki)
- kursinf.pl oznacza arkusze jako "Średni" / "Trudny" — [kursinf.pl/arkusze](https://www.kursinf.pl/arkusze)
- Próg zaliczenia praktyki to 75%, a czas 150 min — [egzaminyez.pl](https://egzaminyez.pl/egzamin-zawodowy/inf-03)

### Inferences (propozycja własnego algorytmu)
- **Cechy (każda znormalizowana do 0–1):**
  - T: technologie skryptowe — JS albo PHP = 0,5; PHP + JS = 1,0 (waga 2,0)
  - Q: liczba i złożoność zapytań SQL — JOIN, GROUP BY, podzapytanie, ALTER/UPDATE, CREATE USER/GRANT; punkty sumowane i obcinane (waga 2,0)
  - S: logika skryptu — pętle, warunki, formularz POST/GET, zapis do bazy, obsługa zdarzeń DOM, walidacja (waga 2,0)
  - L: layout CSS — liczba bloków, float/flex/grid, wymagane pseudoklasy, responsywność (waga 1,5)
  - K: liczba kryteriów w zasadach oceniania, względem mediany (waga 1,5)
  - G: grafika/edycja obrazów, np. skalowanie i kadrowanie w GIMP (waga 1,0)
- **Wynik:** `raw = Σ w_i·x_i / Σ w_i`, potem `difficulty = 1 + round(9·raw)`.
- **Kalibracja empiryczna:** gdy pojawi się N ≥ 30 prób danego arkusza, łączymy wynik ekspercki z empirycznym: `d = α·d_feat + (1−α)·d_emp`, gdzie `d_emp` to odwrócony percentyl średniego wyniku procentowego lub odsetka zdanych (≥75%). α maleje wraz z N (np. α = 30/(30+N)). Opcjonalnie później model IRT 1PL/Rasch dla kryteriów.
- **Wyświetlanie:** pasek x/10 plus etykieta słowna (1–3 łatwy, 4–6 średni, 7–8 trudny, 9–10 bardzo trudny) i rozpiska cech w tooltipie ("dlaczego 8/10"). To czytelniejsze niż samo x/10 i odróżnia projekt od easyinf.
- **Ręczna korekta:** pole `difficultyOverride` w JSON z uzasadnieniem.

### Gaps
- Metodologia easyinf jest nieznana. Brak publicznych danych o zdawalności poszczególnych arkuszy INF.03 (CKE publikuje zdawalność zbiorczą dla kwalifikacji, czego nie zweryfikowano w tej sesji).
