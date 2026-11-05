# Zbuduj darmową pracownię INF.03 bez paywalla

Darmową alternatywę dla easyinf.pl da się zbudować jako statyczną aplikację SPA (Vite + React + TypeScript). Treść trzymamy w plikach JSON, postęp w IndexedDB, a SQL, PHP i podgląd kodu działają w przeglądarce. Dzięki temu funkcje, za które easyinf bierze pieniądze (pełna sprawdzarka, baza SQL, próbny egzamin), mogą być darmowe i nie potrzebują backendu. **Wszystkie 152 arkusze da się pozyskać od razu.** Liczba 152 to dokładnie liczba rekordów w otwartym indeksie `data.json` repozytorium Chr1skyy (INF.03 = 80, EE.09 = 40, E.14 = 32). Pliki (PDF arkusza, zasady oceniania, załączniki, rozwiązanie) leżą pod przewidywalnymi ścieżkami w drugim repo tego autora ([Chr1skyy/EgzaminZawodowyINF03-Wyszukiwarka](https://github.com/Chr1skyy/EgzaminZawodowyINF03-Wyszukiwarka/blob/main/src/data.json)). Z bazą pytań teoretycznych jest gorzej: **nie istnieje otwarty zbiór ok. 2700 pytań INF.03**. CKE nie publikuje bazy pytań części pisemnej. Największe serwisy deklarują od 842 do 1276 pytań i żaden nie udostępnia ich do pobrania. Bazę trzeba więc odbudować z oficjalnie opublikowanych arkuszy pisemnych E.14/EE.09 i przykładów z informatorów. Realny wynik to ok. 1000–1300 unikalnych pytań. Rdzeniem tego raportu jest gotowy do wklejenia prompt dla Claude Code (sekcja niżej). Kilka ustaleń poniżej to zastrzeżenia, które ten prompt uwzględnia.

## 152 arkusze to kompletny indeks Chr1skyy, a nie cała historia

Indeks zawiera 152 unikalne kody CKE z sesji od 2018.06 do 2026.06. Od sesji 2024.06 każda sesja INF.03 ma komplet 12 wariantów, czyli 24 nowe arkusze rocznie. Każdy rekord ma tytuł, język (**PHP 99, JS 51, JS+PHP 2**), tagi (68 unikalnych, w grupach SQL/Grafika/CSS/PHP/JS/HTML), trudność słowną (**Easy 92, Medium 54, Hard 6**), hasło do archiwum i ścieżki plików ([data.json](https://github.com/Chr1skyy/EgzaminZawodowyINF03-Wyszukiwarka/blob/main/src/data.json)). Repo z materiałami ma dokładnie 152 foldery arkuszy, choć jego README wciąż podaje nieaktualne „125” ([Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03](https://github.com/Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03)). Przy budowie katalogu trzeba uwzględnić trzy rzeczy.

- **Powtórzenia zadań.** 152 kody mają tylko **142 unikalne tytuły**, bo CKE używa tych samych zadań pod nowymi kodami. Przykład: „Restauracja Wszystkie Smaki” to jednocześnie E.14-01-18.06, INF.03-01-21.06-SG i INF.03-01-22.01-SG. Katalog powinien łączyć takie wpisy polem `sameAs`.
- **Luki w numeracji.** Brakuje części wariantów z sesji 2023.06 i 2024.01.
- **Starsze arkusze E.14.** Arkusze z lat 2014–2017 są w repo [PumaYT22/EgzaminyZawodoweINF](https://github.com/PumaYT22/EgzaminyZawodoweINF) na licencji MIT. Dodanie ich podnosi liczbę dostępnych arkuszy do ok. 170+.

Easyinf sam też jest niespójny. Na stronie z listą arkuszy suma zadań w poszczególnych sesjach wynosi ok. 113, a nie 152. Według tej samej strony 148 arkuszy ma rozwiązanie ([easyinf.pl/arkusze-inf03](https://easyinf.pl/arkusze-inf03/), fragment wyszukiwarki).

## Liczba 2701 pytań easyinf to suma kategorii, nie otwarty zbiór

Easyinf reklamuje „2701 pytań teorii za darmo” ([easyinf.pl](https://easyinf.pl/)). Na zrzutach ekranu użytkownika liczby kategorii (Strony 696, Bazy 697, Aplikacje 1028, Podstawy 212, BHP 23, Angielski 23, Kompetencje 22) dają w sumie dokładnie 2701. To jednak prywatna baza serwisu i najpewniej zawiera duplikaty między E.14, EE.09 i INF.03. Publicznie deklarowane bazy są mniejsze:

| Serwis | Liczba pytań |
|---|---|
| [egzamin-informatyk.pl](https://egzamin-informatyk.pl/testy-inf03-ee09-programowanie-bazy-danych/) | 1045 |
| [egzamin-programista.pl](https://egzamin-programista.pl/testy-inf03-tworzenie-administrowanie-stronami-aplikacjami-bazami-danych/) | 842 |
| [praktycznyegzamin.pl](https://www.praktycznyegzamin.pl/inf03ee09e14/teoria/) | 1276 |

Odpowiedź MEN na interpelację potwierdza, że **baza zadań części pisemnej i algorytm losowania „nie będą upubliczniane”** ([Sejm, interpelacja 17677](https://api.sejm.gov.pl/sejm/term10/interpellations/17677/reply/DVRCQF/body)). Znalezione na GitHubie pliki JSON się nie nadają:

- [Streax0/zsem-egzamin](https://github.com/Streax0/zsem-egzamin) ma 344 pytania słabej jakości i zastrzeżoną licencję.
- [bewertowski81-code/portal-egzaminy](https://github.com/bewertowski81-code/portal-egzaminy) ma 240 pytań EE.09 i nie ma licencji.

Zostaje własny pipeline: PDF arkuszy pisemnych CKE/OKE → parsowanie → ręczna korekta → deduplikacja → własne wyjaśnienia. Format egzaminu jest potwierdzony: **40 pytań, 60 minut, próg 50%; praktyka 150 minut, próg 75%** ([Informator OKE Warszawa](https://www.oke.waw.pl/wp-content/uploads/OKE_WARSZAWA/EE/EE_Zawodowy/Informatory/2024/technik_informatyk.pdf); [ZPE](https://zpe.gov.pl/a/egzamin-zawodowy/DUfMI8i89)).

## Linkować zamiast rehostować i nie scrapować quizów

Arkusze CKE są powszechnie uznawane za materiały urzędowe wyłączone spod prawa autorskiego na mocy **art. 4 pkt 2 ustawy o prawie autorskim** ([art. 4](https://standardyprawa.pl/akt/19/art/3587); [infor.pl](https://www.infor.pl/prawo/pomoc-prawna/urzedy/321819,Dokumenty-urzedowe-a-prawa-autorskie.html)). Nie znaleziono jednak oficjalnego stanowiska CKE w tej sprawie. Z tego wynikają cztery zasady.

- **Opracowania serwisów quizowych.** Wyjaśnienia, obrazki i układ bazy mogą być chronione, także przez prawo do baz danych. Scrapowanie odpada.
- **Repozytoria Chr1skyy** nie mają pliku LICENSE, czyli domyślnie obowiązuje „all rights reserved”. Rozwiązania są autorskie. Dlatego z `data.json` bierzemy tylko fakty (kody, tytuły, ścieżki) jako seed metadanych z atrybucją. Do PDF-ów i rozwiązań **linkujemy** i nie kopiujemy ich. Najlepiej dodatkowo poprosić autora o zgodę.
- **Repo PumaYT22** jest na licencji MIT, więc można z niego korzystać z atrybucją ([LICENSE](https://github.com/PumaYT22/EgzaminyZawodoweINF/blob/main/LICENSE)).
- **@php-wasm/web** jest na licencji GPL-2.0-or-later, co trzeba uwzględnić przy dystrybucji.

To nie jest porada prawna.

## Czego nie dało się sprawdzić bezpośrednio

W sesji badawczej sieć blokowała domeny easyinf.pl, cke.gov.pl, arkusze.pl, egzamin-informatyk.pl i praktycznyegzamin.pl (ENOTFOUND lub 403). Dane o tych serwisach pochodzą więc z fragmentów wyników wyszukiwarki. Pliki z GitHuba pobrano i przeanalizowano lokalnie. Niezweryfikowane zostały:

- działanie modułów easyinf Minigry, Sprint i Sztab (znamy tylko nazwy),
- metodologia skali trudności 1–10 na easyinf,
- nazwa gałęzi `main` w repo z materiałami,
- działanie `mysqli` w @php-wasm/web,
- zmiany API w ts-fsrs 6.0.0.

Wersje bibliotek sprawdzono w rejestrze npm 2026-11-05.

## Prompt dla Claude Code

Skopiuj cały blok poniżej do nowej sesji Claude Code w pustym repozytorium. Plik `arkusze_index_chr1skyy.json` z notatek badawczych umieść w repo jako `data/raw/chr1skyy-data.json`.

````text
# ZADANIE: Zbuduj „Pracownię 03” — darmową platformę do nauki kwalifikacji INF.03

Rola: jesteś doświadczonym inżynierem frontendu. Budujesz kompletną, produkcyjną aplikację webową po polsku do nauki do egzaminu zawodowego INF.03 (Tworzenie i administrowanie stronami i aplikacjami internetowymi oraz bazami danych). Inspiracją funkcjonalną jest easyinf.pl, ale NIE kopiujesz jego brandingu, logo, kolorów (granat + niebieski + żółty), tekstów ani nazw sekcji („Sztab”, „Pewniak”, „Sala egzaminacyjna”, „Audytor CKE”). Nazwa robocza produktu: „Pracownia 03” (możesz zaproponować lepszą, oryginalną).

ZASADY NADRZĘDNE
1. Zero płatności, zero paywalli, zero ścian logowania. Każda funkcja działa od razu, bez konta. Postęp zapisuje się lokalnie (IndexedDB). Opcjonalny eksport/import pliku JSON z postępem. Konto i synchronizacja to tylko opcjonalny moduł na później (Supabase), domyślnie wyłączony.
2. Aplikacja statyczna (SPA + PWA), bez własnego backendu. SQL i PHP działają w przeglądarce (WASM). Ma się dać hostować na GitHub Pages / Cloudflare Pages / Vercel.
3. Wszystkie teksty UI po polsku. Daty i serie dni liczone w strefie Europe/Warsaw.
4. Uczciwość wobec ucznia: na stronie „O projekcie” i w stopce teorii napisz wprost, że prawdziwa baza pytań CKE jest niejawna, a pytania w aplikacji pochodzą z opublikowanych arkuszy E.14/EE.09/INF.03 i informatorów CKE. Wynik sprawdzarki to wynik treningowy, nie ocena CKE.

## 1. STACK (przypnij DOKŁADNE wersje w package.json, bez ^ i ~, commituj lockfile)
- vite 8.3.6, react 19.3.1, react-dom 19.3.1, react-router 8.5.1, TypeScript (przypnij wersję zainstalowaną przy inicjalizacji), tryb strict
- tailwindcss 4.3.4 (tokeny kolorów jako zmienne CSS; patrz sekcja 7)
- zustand 5.0.16 (stan UI), zod 4.6.7 (walidacja danych z JSON)
- dexie 4.4.7 (IndexedDB: postęp, karty FSRS, wyniki)
- ts-fsrs 6.0.0 (powtórki fiszek; to nowa wersja główna, więc najpierw przeczytaj changelog/typy; jeśli API jest niestabilne, cofnij się do najnowszej 5.x i opisz to w README)
- Edytor: @uiw/react-codemirror 4.25.12, @codemirror/view 6.43.15, @codemirror/lang-html 6.4.12, @codemirror/lang-php 6.0.2, @codemirror/lang-sql 6.10.0 (+ lang-css i lang-javascript w wersjach zgodnych z @codemirror/view 6.43.x)
- SQL: sql.js 1.15.2 (SQLite WASM, plik .wasm serwowany lokalnie z /public, nie z CDN)
- PHP (OPCJONALNIE, za feature flagą, ładowane leniwie): @php-wasm/web 3.1.62 (licencja GPL-2.0-or-later: zapisz to w README i w /licencje)
- PDF: react-pdf 11.0.0 (+ pdfjs-dist w wersji, której wymaga react-pdf 11.0.0; nie mieszaj wersji workera)
- Wyszukiwanie: fuse.js 7.5.0
- PWA: vite-plugin-pwa 2.0.0 (offline dla aplikacji i danych JSON; PDF-y spoza domeny NIE są cache'owane domyślnie)
- Testy: Vitest + Testing Library + Playwright (e2e). Lint: ESLint + Prettier.
Nie dodawaj innych zależności runtime bez uzasadnienia w README.

## 2. ŹRÓDŁA DANYCH I LICENCJE

### 2a. Arkusze praktyczne (152 rekordy)
- Seed metadanych: plik data/raw/chr1skyy-data.json (kopia src/data.json z https://github.com/Chr1skyy/EgzaminZawodowyINF03-Wyszukiwarka). To tablica 152 obiektów: formula, year, session (1|6), number, language ("PHP"|"JS"|"JS+PHP"), name, codeName (np. "INF.03-01-26.06-SG"), archive_password, links{mainFolder, examSheet, gradingRules, archive, solution, solutionZIP}, tags[] (format "GRUPA: opis", grupy: HTML, CSS, JS, PHP, SQL, Grafika), difficulty ("Easy"|"Medium"|"Hard"). Rozkład: INF.03 = 80, EE.09 = 40, E.14 = 32, sesje 2018.06–2026.06.
- Napisz skrypt scripts/build-sheets.ts. Ma przekształcić seed do data/sheets.json według schematu z sekcji 4, zwalidować wynik zod i zakończyć build błędem, jeśli rekordów nie jest dokładnie 152 albo codeName się powtarza.
- Pliki NIE są kopiowane do repo. Budujemy URL-e link-out:
  RAW = https://raw.githubusercontent.com/Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03/main
  pdfUrl = RAW + mainFolder + "/" + examSheet; gradingUrl = RAW + mainFolder + "/" + gradingRules; archiveUrl = RAW + mainFolder + "/" + archive; solutionUrl = https://github.com/Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03/tree/main + mainFolder + "/" + solution
  Nazwa gałęzi „main” jest niezweryfikowana. Zrób z niej stałą w config.ts i dodaj skrypt scripts/check-links.ts (HEAD na każdy URL, raport z niedziałającymi).
- Uwagi do seeda:
  - 152 kody mają tylko 142 unikalne tytuły, bo CKE powtarza zadania pod nowymi kodami. Wylicz pole sameAs (lista codeName z identycznym znormalizowanym tytułem) i pokazuj w UI „To samo zadanie co …”.
  - Jeden folder w repo źródłowym ma uszkodzoną nazwę z cudzysłowem (inf03_2026_01_02). Check-links ma go wychwycić.
  - Jeden tytuł ma zepsute kodowanie („wskaŁşnik”). Zrób mapę ręcznych poprawek data/overrides/sheets.json.
- Hasło archiwum pokazuj dopiero po kliknięciu „Pokaż hasło” (jak na egzaminie).
- Przeglądarka PDF: najpierw spróbuj react-pdf na pdfUrl. Jeśli fetch/CORS się nie powiedzie, pokaż przycisk „Otwórz PDF w nowej karcie”. Nigdy nie rehostuj PDF-ów.
- Licencje (pokaż na stronie /licencje i w stopce każdej karty arkusza):
  - Repo Chr1skyy nie ma pliku LICENSE, więc rozwiązania są autorskie: tylko link, bez kopiowania kodu. Atrybucja: „Indeks i materiały: Chr1skyy (GitHub)”.
  - Arkusze CKE to materiały urzędowe (art. 4 pkt 2 pr. aut., interpretacja powszechna, bez oficjalnego stanowiska CKE). Podawaj źródło „CKE, <kod>”.
  - Opcjonalnie dodaj importer starszych E.14 2014–2017 z https://github.com/PumaYT22/EgzaminyZawodoweINF (MIT, z atrybucją) jako osobny etap. Ten importer nie może zmieniać liczby 152 w głównym katalogu; starsze arkusze wyświetl jako sekcję „Archiwum E.14”.

### 2b. Bank pytań teoretycznych
- Nie istnieje otwarty, licencjonowany zbiór ok. 2700 pytań INF.03. CKE nie publikuje bazy części pisemnej. NIE scrapuj serwisów quizowych (egzamin-informatyk.pl, praktycznyegzamin.pl, ee-informatyk.pl itd.): ich opracowania i bazy są chronione. NIE używaj Streax0/zsem-egzamin (licencja zastrzeżona).
- Zbuduj pipeline scripts/questions/:
  (1) folder data/raw/cke-pdf/ (PDF-y arkuszy pisemnych E.14 / EE.09 i informatorów CKE dodaje ręcznie właściciel projektu);
  (2) extract.ts: tekst z PDF przez pdfjs-dist, parser pytań „N. treść / A. B. C. D.”, klucz odpowiedzi z osobnego pliku;
  (3) dedupe.ts: normalizacja (małe litery, bez interpunkcji i białych znaków), hash, scalanie duplikatów E.14/EE.09/INF.03 z zachowaniem wszystkich źródeł w polu sources[];
  (4) categorize.ts: automatyczne tagowanie słowami kluczowymi do 7 działów (patrz schemat) + ręczny override;
  (5) review UI pod /admin/pytania (tylko w trybie dev): podgląd, edycja, dodanie wyjaśnienia, oznaczenie needsImage.
- Dostarcz data/questions.json z 60 przykładowymi pytaniami, które piszesz SAM (oryginalne, z wyjaśnieniami, zgodne z zakresem INF.03, oznaczone source.type = "original"), żeby aplikacja działała od pierwszego uruchomienia. Liczbę pytań w UI zawsze licz dynamicznie, nigdy jej nie hardkoduj.
- Docelowo realnie ok. 1000–1300 unikalnych pytań. Pytania wymagające obrazka bez pliku obrazka nie trafiają do losowania (needsImage && !image → wykluczone).

## 3. MODUŁY I EKRANY (własne nazwy, nie easyinf)

Nawigacja:
- Desktop (≥ md): lewy sidebar z grupami
  - NAUKA: Dziś, Ścieżka, Fiszki, Teoria, Arkusze, Sprint, Minigry
  - EGZAMIN: Próba generalna, Sprawdzarka
  - TY: Postęp, Ustawienia
  Prawy panel kontekstowy (≥ xl): fiszki do powtórki dziś, % ukończenia ścieżki, seria dni, minuty w tym tygodniu, poziom/XP.
- Mobile (< md): dolny pasek 5 zakładek: Dziś, Ścieżka, Teoria, Arkusze, Więcej (arkusz/drawer z resztą). Bezpieczny obszar iOS (env(safe-area-inset-bottom)). Edytor na mobile w trybie zakładek Kod | Podgląd | Konsola.

Ekrany:
1. Dziś (/): plan dnia z 3 kartami (powtórka fiszek N, jedno pytanie dnia, sugerowany arkusz wg słabych tagów), seria dni, XP do następnego poziomu, kalendarz aktywności (heatmapa 12 tygodni).
2. Ścieżka (/sciezka): roadmapa kursu krok po kroku. Poziomy (np. 1 HTML, 2 CSS, 3 SQL podstawy, 4 SQL złączenia i agregacje, 5 JS DOM, 6 PHP + mysqli, 7 formularze GET/POST, 8 grafika, 9 pełny arkusz). Każdy poziom ma lekcje (teoria w MDX lub JSON-blocks + mini-zadanie z edytorem i kryteriami). Lekcja odblokowuje się po ukończeniu poprzedniej, ale jest przełącznik „Odblokuj wszystko” w Ustawieniach (bez paywalla). Napisz minimum 3 kompletne lekcje na poziomy 1–3 i szkielety pozostałych.
3. Fiszki (/fiszki): talie per dział, harmonogram FSRS (ts-fsrs), oceny Again/Hard/Good/Easy po polsku („Nie pamiętam / Trudne / Dobrze / Łatwe”), skróty klawiszowe 1–4 i spacja, licznik „do powtórki dziś”. Dostarcz min. 80 oryginalnych fiszek (znaczniki HTML, właściwości CSS, SQL, funkcje PHP/JS).
4. Teoria (/teoria):
   a) „Losuj 1 pytanie” z filtrem działów (multi-select checkboxy z licznikiem pytań w dziale), natychmiastowa informacja zwrotna + wyjaśnienie + źródło, przycisk „Następne”; tryb „tylko błędne”.
   b) „Pełny test”: 40 losowych pytań (losowanie bez powtórzeń, odpowiedzi tasowane), timer 60:00 widoczny cały czas, nawigacja po numerach, flaga „wróć później”, auto-oddanie po czasie, wynik z progiem 50% (≥ 20/40 = ZDANE), przegląd odpowiedzi, rozbicie na działy, zapis do historii.
   c) Wyszukiwarka pytań (fuse.js).
5. Arkusze (/arkusze): siatka 152 kart. Każda karta: kod CKE, tytuł, sesja (np. „czerwiec 2026”), badge języka (JS / PHP / JS+PHP), pasek trudności x/10 z etykietą słowną i tooltipem „dlaczego x/10”, tagi (max 4 + „+N”), status (nie rozpoczęty / w trakcie / ukończony) i najlepszy wynik %. Filtry: kwalifikacja (INF.03/EE.09/E.14), rok, sesja, język, przedział trudności (suwak 1–10), tagi (multi), status; sortowanie: najnowsze, trudność, tytuł; wyszukiwanie po tytule/kodzie; filtry w URL (query params).
   Szczegół arkusza (/arkusze/:code): podgląd PDF, przyciski „Pobierz PDF”, „Zasady oceniania”, „Pliki (archiwum)”, „Pokaż hasło”, „Rozwiązanie (GitHub)”, lista tagów, „To samo zadanie co…”, checkbox „ukończony”, ręczna samoocena z checklisty kryteriów (jeśli są w criteria[]), przycisk „Otwórz w warsztacie”.
6. Warsztat (/warsztat/:code?): edytor wieloplikowy (index.html, styl.css, skrypt.js, *.php, kwerendy.txt), podgląd na żywo w iframe sandbox="allow-scripts" przez srcdoc, debounce 300 ms, obrazy użytkownika jako Blob URL (drag&drop), konsola przechwytująca console.log/error z iframe przez postMessage. Panel SQL: import pliku .sql (zrzut z archiwum arkusza) do sql.js, wykonywanie zapytań, tabela wyników. Warstwa „mysql→sqlite” przepisująca typowe konstrukcje (AUTO_INCREMENT, ENGINE=…, backticki, typy INT(11)/VARCHAR, CURDATE/NOW); zapytania CREATE USER / GRANT sprawdzane tylko tekstowo (regex), nie wykonywane. Panel PHP (feature flag, lazy): @php-wasm/web, render wyniku w podglądzie; shim mysqli → SQLite (mysqli_connect, mysqli_query, mysqli_fetch_array/assoc/row, mysqli_num_rows, mysqli_close) na tej samej bazie co panel SQL. To największe ryzyko: zacznij od prototypu i testu na arkuszu INF.03-01-26.06-SG. Jeśli się nie uda, zostaw PHP wyłączone, a w README opisz ograniczenia. Zapis projektu warsztatu w IndexedDB per arkusz.
7. Sprawdzarka (/sprawdzarka): uruchamia criteria[] arkusza (schemat w sekcji 4) na plikach z warsztatu lub wgranych przez użytkownika. Typy reguł: dom (DOMParser + selektor + min/max/tekst), css (getComputedStyle w ukrytym iframe: prop/equals), sql (wynik zapytania w sql.js porównany z oczekiwanymi kolumnami/wierszami lub regex na treści kwerendy), php-output (contains/regex, tylko gdy PHP włączone), manual (checkbox samooceny). Wynik: lista kryteriów ✓/✗ z punktami, suma %, próg 75%. Dostarcz kompletne criteria[] dla min. 3 arkuszy INF.03 z 2026 r., napisane samodzielnie na podstawie publicznych zasad oceniania (własnymi słowami).
8. Próba generalna (/proba): symulacja pełnego egzaminu. Etap 1: teoria 40 pytań / 60 min (jak 4b). Etap 2: losowy arkusz (filtr: tylko INF.03 albo wszystkie) z timerem 150:00, otwartym PDF i warsztatem obok; po czasie lub po kliknięciu „Oddaję” uruchamia się sprawdzarka plus samoocena manualna. Wynik końcowy: teoria ≥ 50% ORAZ praktyka ≥ 75% = „Zdane (trening)”. Timery odporne na odświeżenie strony: zapisz startedAt w IndexedDB i licz czas z Date.now(); ostrzeżenie beforeunload.
9. Sprint (/sprint): 5 minut, pytania jedno po drugim, +1 pkt za poprawną, 3 błędy kończą sprint, rekord osobisty, mnożnik XP za serię poprawnych.
10. Minigry (/minigry): min. 3 oryginalne minigry na bazie lokalnych danych:
    - „Selektor”: kliknij element trafiony przez selektor CSS,
    - „Kwerenda z klocków”: ułóż zapytanie SQL z rozsypanych fragmentów, zweryfikuj w sql.js,
    - „Znacznik czy atrybut?”: szybkie sortowanie kart na czas.
11. Postęp (/postep): historia testów (wykres wyników), skuteczność per dział i per tag arkuszy (wskazanie słabych tematów), lista ukończonych arkuszy, eksport/import JSON, „Wyczyść dane”.
12. Ustawienia (/ustawienia): motyw jasny/ciemny/systemowy, rozmiar fontu edytora, „Odblokuj całą ścieżkę”, cel dzienny (minuty), dzienny limit nowych fiszek, włącz PHP (beta).
13. /o-projekcie i /licencje: źródła, atrybucje, zastrzeżenia (pkt 4 zasad nadrzędnych).

## 4. MODELE DANYCH (zod + typy TS; pliki w /data, walidowane przy buildzie)

Sheet:
{ code: string /* "INF.03-01-26.06-SG" */, qualification: "INF.03"|"EE.09"|"E.14", year: number, session: "styczen"|"czerwiec", variant: string /* "01" */, title: string, language: "JS"|"PHP"|"JS+PHP", tags: { group: "HTML"|"CSS"|"JS"|"PHP"|"SQL"|"Grafika", label: string }[], sourceDifficulty: "Easy"|"Medium"|"Hard", difficulty: { score: number /*1-10*/, label: "łatwy"|"średni"|"trudny"|"bardzo trudny", features: { T:number,Q:number,S:number,L:number,K:number,G:number }, override?: { score:number, reason:string } }, files: { pdfUrl:string, gradingUrl:string, archiveUrl:string, archivePassword?:string, solutionUrl?:string }, sameAs: string[], criteria?: Criterion[], durationMin: 150, passThreshold: 0.75, attribution: string }

Criterion:
{ id: string, points: number, description: string, rule: { type:"dom", file:string, selector:string, min?:number, max?:number, textIncludes?:string } | { type:"css", file:string, selector:string, prop:string, equals:string } | { type:"sql", queryIndex:number, expectColumns?:string[], expectRowCount?:number, mustMatch?:string /*regex*/ } | { type:"php-output", file:string, contains?:string, regex?:string } | { type:"manual" } }

Question:
{ id: string /* hash znormalizowanej treści */, text: string, answers: [string,string,string,string], correct: 0|1|2|3, explanation?: string, category: "strony"|"bazy"|"aplikacje"|"podstawy"|"bhp"|"angielski"|"kompetencje", tags?: string[], image?: string, needsImage: boolean, qualifications: ("INF.03"|"EE.09"|"E.14")[], sources: { type:"cke"|"informator"|"original", ref?: string /* np. "EE.09-01-20.01#12" */ }[], verified: boolean }

Lesson:
{ id: string, level: number, order: number, title: string, minutes: number, blocks: ({ kind:"text", md:string } | { kind:"code", lang:string, code:string } | { kind:"quiz", questionIds:string[] } | { kind:"task", starter: Record<string,string>, criteria: Criterion[] })[], unlocksAfter?: string, xp: number }

Flashcard:
{ id: string, deck: "html"|"css"|"js"|"php"|"sql"|"teoria", front: string, back: string, example?: string }
FlashcardState (Dexie): { cardId: string, fsrs: /* obiekt Card z ts-fsrs */, lastReview?: string, log: /* ReviewLog[] */ }

Progress (Dexie, tabele):
- profile { id:"me", xp:number, level:number, streak:{ current:number, best:number, lastActiveDate:string /* YYYY-MM-DD Europe/Warsaw */ }, dailyGoalMin:number, settings:{...} }
- activity { date:string, minutes:number, xp:number }
- answers { id, questionId, correct:boolean, mode:"single"|"test"|"sprint"|"exam", at:string }
- tests { id, kind:"theory40"|"exam", startedAt, finishedAt?, questionIds:string[], answers:(number|null)[], score?:number, passed?:boolean, practice?:{ sheetCode, score, criteriaResults } }
- sheets { code, status:"todo"|"doing"|"done", bestScore?:number, workspace:Record<string,string>, updatedAt }
- lessons { id, completedAt }
Wersjonuj schemat Dexie (db.version(n)) i dodaj migracje. Eksport/import: jeden plik JSON { schemaVersion, exportedAt, tables }.

## 5. WZÓR TRUDNOŚCI (1–10)
Cechy znormalizowane do 0–1, wyliczane w scripts/build-sheets.ts z tagów i języka (później z criteria):
- T (waga 2,0): JS albo PHP = 0,5; JS+PHP = 1,0
- Q (waga 2,0): złożoność SQL: suma punktów za tagi SQL (SELECT 1, INSERT/UPDATE/DELETE 1, funkcje agregujące 2, JOIN 2, GROUP BY/HAVING 2, podzapytanie 3, ALTER/CREATE TABLE 2, CREATE USER/GRANT 2), podzielona przez 10 i obcięta do 1
- S (waga 2,0): logika skryptu: liczba tagów PHP + JS (pętle, warunki, formularz GET/POST, zapis do bazy, zdarzenia DOM, walidacja) / 6, obcięta do 1
- L (waga 1,5): CSS: liczba tagów CSS / 4 (bonus za flex/grid/pseudoklasy), obcięta do 1
- K (waga 1,5): liczba kryteriów / mediana kryteriów; dopóki brak criteria, użyj liczby wszystkich tagów / mediana liczby tagów, obcięte do 1
- G (waga 1,0): Grafika: 0 brak, 0,5 jedno przekształcenie, 1 dwa i więcej
raw = Σ(w_i·x_i) / Σ(w_i); dFeat = 1 + round(9·raw).
Kalibracja względem seeda: jeśli sourceDifficulty i dFeat bardzo się rozjeżdżają (Easy a dFeat ≥ 8, albo Hard a dFeat ≤ 3), zaloguj ostrzeżenie w raporcie buildu.
Kalibracja empiryczna (na przyszłość, gdy będą dane zbiorcze z opcjonalnej synchronizacji): przy N ≥ 30 próbach d = α·dFeat + (1−α)·dEmp, α = 30/(30+N), dEmp = odwrócony percentyl średniego wyniku.
Etykiety: 1–3 łatwy, 4–6 średni, 7–8 trudny, 9–10 bardzo trudny. Tooltip pokazuje rozkład cech. Pole override z uzasadnieniem ma pierwszeństwo.

## 6. GAMIFIKACJA
- XP:
  - poprawna odpowiedź +2
  - pytanie dnia +5
  - powtórka fiszki +1
  - ukończona lekcja +20
  - test teorii zdany +30
  - arkusz ≥ 75% +50 (pierwszy raz) / +10 (kolejne)
  - Próba generalna zdana +100
  - sprint: punkty × mnożnik serii
- Poziomy: próg poziomu n = 100·n^1,5 (zaokrąglone). Nazwy poziomów oryginalne (np. „Praktykant”, „Junior”, „Rzemieślnik”, „Architekt”, „Mistrz kwerend”).
- Seria dni: dzień zalicza się po zdobyciu ≥ 10 XP w danej dacie Europe/Warsaw. Jeden „dzień wolny” na tydzień chroni serię.
- Minuty nauki: licz tylko, gdy karta jest widoczna (Page Visibility API) i był input w ostatnich 60 s.
- Animacje nagród subtelne; respektuj prefers-reduced-motion.

## 7. KIERUNEK WIZUALNY (oryginalny, NIE easyinf)
Motyw: „pracownia / zeszyt inżyniera”. Ciepły papier, atrament i jeden wyrazisty akcent. Bez granatu, bez niebieskiego jako koloru głównego, bez żółtego.
Tokeny (CSS variables, Tailwind 4 @theme):
- Jasny:
  - --bg #FAF7F2 (kość słoniowa), --surface #FFFFFF, --surface-2 #F1ECE3
  - --ink #1F1D1A, --ink-muted #6B655C, --line #E4DDD1
  - --accent #C2410C (terakota), --accent-ink #FFFFFF, --accent-soft #FBE3D6
  - --success #3F7A55 (szałwia), --danger #B4232A, --info #6B4E71 (śliwka)
  - kody języków: JS #A16207 (ochra), PHP #6B4E71, SQL #3F7A55, HTML #C2410C, CSS #0E7C86 (morski, tylko jako badge)
- Ciemny:
  - --bg #161513, --surface #201E1B, --surface-2 #2A2723
  - --ink #EDE8DF, --ink-muted #A39C90, --line #37332D
  - --accent #F07A45, --accent-soft #3A2318
  - --success #7FB894, --danger #F2777C, --info #B79BC0
Kontrast tekstu min. WCAG AA w obu motywach (sprawdź automatycznie testem).
Typografia (self-hosted, woff2 w /public/fonts, font-display: swap):
- nagłówki: Bricolage Grotesque (600–800, lekko ściśnięty tracking)
- tekst: Atkinson Hyperlegible (czytelność dla uczniów)
- kod i liczniki/timery: JetBrains Mono (tabular-nums)
Skala: 14/16/18/22/28/36/48.
Detale:
- tło z delikatną kratką zeszytu (CSS background-image, opacity ~4%)
- karty z cienką ramką 1px --line, zaokrąglenie 14px, cień tylko na hover
- pasek trudności jako 10 segmentów „linijki”
- timer egzaminu jako duża cyfra mono z paskiem postępu, który zmienia kolor na --danger w ostatnich 5 min
- ikony: lucide-react (dopuszczalna dodatkowa zależność, przypnij wersję)
- logo: prosty znak typograficzny „P03” w kwadracie z zaokrągleniem, zrobiony w SVG przez Ciebie
Responsywność: działa od 360 px szerokości bez poziomego scrolla; gutter 16 px na mobile.
Dostępność: pełna obsługa klawiaturą, focus-visible, aria-live dla timerów i wyników, role i etykiety w quizach.

## 8. ARCHITEKTURA I JAKOŚĆ
- Struktura: src/app (routing, layout), src/features/{today,path,flashcards,theory,sheets,workshop,checker,exam,sprint,games,progress,settings}, src/lib/{db,fsrs,sql,php,difficulty,random,time}, src/data (ładowanie JSON + zod), scripts/.
- Ładowanie leniwe: sql.js, php-wasm, react-pdf i CodeMirror dopiero na ekranach, które ich używają (route-level code splitting). Bundle startowy < 250 kB gzip.
- Losowanie: seedowalny PRNG (np. mulberry32), żeby testy były deterministyczne.
- Bezpieczeństwo: kod użytkownika wykonuje się tylko w iframe sandbox (bez allow-same-origin); CSP w index.html; brak eval w głównym oknie.
- README: uruchomienie, skrypty danych, źródła i licencje, ograniczenia (SQLite vs MySQL, PHP beta, GPL php-wasm), jak dodawać pytania z PDF CKE.

## 9. KRYTERIA AKCEPTACJI (sprawdź każde i wypisz wynik na końcu)
1. npm run build przechodzi; walidacja zod danych przechodzi; data/sheets.json ma dokładnie 152 rekordy z unikalnymi kodami (80 INF.03 / 40 EE.09 / 32 E.14).
2. /arkusze pokazuje 152 karty; filtry (kwalifikacja, rok, język, trudność 1–10, tagi, status) działają łącznie i zapisują się w URL; każda karta ma trudność x/10 z tooltipem cech.
3. Szczegół arkusza otwiera PDF (lub czytelny fallback), linkuje zasady oceniania, archiwum i rozwiązanie; hasło jest ukryte do kliknięcia; widać atrybucję i sameAs.
4. Teoria: „Losuj 1” respektuje filtr działów; pełny test ma 40 unikalnych pytań, timer 60:00, auto-oddanie, próg 50% i przegląd odpowiedzi.
5. Próba generalna: teoria 40/60, potem losowy arkusz z timerem 150:00; timery przeżywają odświeżenie strony; wynik końcowy wymaga teorii ≥ 50% i praktyki ≥ 75%.
6. Warsztat: podgląd HTML/CSS/JS odświeża się ≤ 500 ms po wpisaniu; konsola działa; import zrzutu .sql z arkusza i SELECT z JOIN/GROUP BY zwracają wyniki w sql.js.
7. Sprawdzarka zwraca listę kryteriów z punktami dla 3 arkuszy z kompletnymi criteria[].
8. Fiszki: FSRS planuje kolejne powtórki; licznik „na dziś” zgadza się z bazą; skróty klawiszowe działają.
9. XP, poziomy, seria dni (Europe/Warsaw, test przejścia przez północ i zmianę czasu) oraz minuty w tygodniu są liczone i widoczne w prawym panelu (desktop) i na ekranie Dziś (mobile).
10. Mobile 360 px: dolny pasek 5 zakładek, brak poziomego scrolla, edytor w trybie zakładek.
11. Brak jakichkolwiek ekranów płatności, cenników, kłódek „premium” i wymuszonego logowania; aplikacja działa offline po pierwszym wczytaniu (bez PDF-ów zewnętrznych).
12. Lighthouse (mobile): Performance ≥ 85, Accessibility ≥ 95, Best Practices ≥ 95; axe bez błędów krytycznych.
13. Żaden plik w repo nie zawiera brandingu ani tekstów easyinf.pl; paleta nie używa granatu, niebieskiego jako koloru głównego ani żółtego.
14. Testy: unit (difficulty, FSRS-wrapper, streak, losowanie, mysql→sqlite rewriter, reguły sprawdzarki) i e2e Playwright (pełny test teorii, filtr arkuszy, próba generalna skrócona flagą testową).

KOLEJNOŚĆ PRACY:
(1) szkielet + tokeny + layout desktop/mobile;
(2) dane: build-sheets + walidacja + katalog arkuszy;
(3) teoria (losuj 1 + test 40/60) na przykładowych pytaniach;
(4) warsztat + sql.js;
(5) sprawdzarka;
(6) próba generalna;
(7) fiszki FSRS;
(8) ścieżka;
(9) gamifikacja, sprint, minigry;
(10) prototyp PHP (feature flag);
(11) PWA, testy, Lighthouse, README.
Po każdym etapie uruchom testy i zrób commit. Jeśli coś z tej specyfikacji okaże się niewykonalne (np. mysqli w php-wasm, CORS dla PDF), nie udawaj, że działa: wdroż fallback i opisz go w README w sekcji „Ograniczenia”.
````

## Wnioski

Najważniejsze odkrycie jest takie, że przewaga easyinf nie wynika z danych. Indeks 152 arkuszy jest publiczny, a format egzaminu znany. Przewaga easyinf to UX i sprawdzarka. Obie rzeczy da się zrobić w przeglądarce, więc darmowy projekt może wyprzedzić płatny model w tym, za co tamten pobiera opłatę. Najtrudniejsze części to dwie rzeczy: legalna, starannie zredagowana baza pytań oraz działające PHP+mysqli w WASM. Dlatego prompt traktuje pierwszą jako pipeline z ręczną redakcją, a drugą jako eksperyment za feature flagą. Dobrym kolejnym krokiem przed startem jest prośba do autora repozytoriów Chr1skyy o zgodę lub licencję. Zamieniłoby to link-out w stabilną współpracę i rozwiązało jedyne realne ryzyko prawne katalogu arkuszy.
