# Katalog arkuszy praktycznych INF.03 / EE.09 / E.14

Stan na 2026-11-05. Metoda: w tej sesji chmurowej strony arkusze.pl, cke.gov.pl, egzamin-informatyk.pl, egzamininformatyk.pl i praktycznyegzamin.pl były **zablokowane przez politykę sieci** (proxy odpowiadało 403 na CONNECT, a WebFetch zwracał ENOTFOUND). Działały GitHub (git clone / API search) oraz WebSearch. Dlatego dane liczbowe pochodzą głównie z indeksu JSON w repozytoriach GitHub (sklonowanych lokalnie i przeanalizowanych), a informacje o CKE i arkusze.pl pochodzą z wyników wyszukiwarki. Żeby sprawdzić strony bezpośrednio, trzeba dodać te domeny do ustawień sieci sesji.

## Ile jest arkuszy? Weryfikacja liczby 152

### Takeaway
Liczba **152 jest dokładną liczbą wpisów w najbardziej kompletnym indeksie społecznościowym**, czyli `src/data.json` w repo Chr1skyy/EgzaminZawodowyINF03-Wyszukiwarka (strona: ezinf.it). Liczba się zgadza, ale oznacza „arkusze w tym katalogu”, a nie wszystkie arkusze, jakie kiedykolwiek powstały. Katalog zaczyna E.14 dopiero od sesji 2018.06. Starsze arkusze E.14 (2014–2018.01, co najmniej ok. 20 sztuk) są dostępne gdzie indziej. Ponadto CKE nie upubliczniła wszystkich wariantów z wcześniejszych sesji INF.03 (w numeracji są luki). Licząc razem ze starszymi E.14, realnie dostępnych arkuszy jest więc ok. 170+.

### Cited Findings
- `data.json` zawiera 152 wpisy (152 unikalne `codeName`): **INF.03 = 80, EE.09 = 40, E.14 = 32** — [Chr1skyy/EgzaminZawodowyINF03-Wyszukiwarka, src/data.json](https://github.com/Chr1skyy/EgzaminZawodowyINF03-Wyszukiwarka/blob/main/src/data.json)
- Rozbicie na sesje (według data.json):
  - E.14: 2018.06 – 6, 2019.01 – 12, 2019.06 – 6, 2020.01 – 4, 2020.06 – 4 (razem 32)
  - EE.09: 2019.06 – 6, 2020.01 – 3, 2020.06 – 6, 2021.01 – 6, 2021.06 – 4, 2022.01 – 7, 2022.06 – 4, 2023.01 – 4 (razem 40)
  - INF.03: 2021.06 – 1, 2022.01 – 1, 2022.06 – 3, 2023.01 – 5, 2023.06 – 4, 2024.01 – 6, 2024.06 – 12, 2025.01 – 12, 2025.06 – 12, **2026.01 – 12, 2026.06 – 12** (razem 80)
  — [data.json](https://github.com/Chr1skyy/EgzaminZawodowyINF03-Wyszukiwarka/blob/main/src/data.json)
- Repo z materiałami ma 152 foldery arkuszy, czyli dokładnie tyle co data.json. Do tego dochodzi `.github/workflows` i jeden zepsuty folder `"inf03/inf03_2026_01_02` z cudzysłowem w nazwie (artefakt). Ostatni commit: 2026-10-27 „Update exam materials and fix SQL user typo”. README tego repo wciąż podaje nieaktualną liczbę: „Zbiór 125 arkuszy wraz z załącznikami i zasadami oceny” — [Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03](https://github.com/Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03)
- Luki w numeracji INF.03 we wczesnych sesjach. W 2023.06 są tylko warianty 01, 02, 04 i 07. W 2024.01 są 01, 02, 04, 05, 06 i 08. Od 2024.06 każda sesja ma komplet 01–12 — [lista folderów repo Chr1skyy](https://github.com/Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03/tree/main/inf03)
- Starsze E.14 są w innym repo. PumaYT22/EgzaminyZawodoweINF ma foldery E14/2014 (2), 2015 (3), 2016 (7) i 2017 (7), np. `e14_2016_czerwiec_1..3`, `e14_2016_styczen_1..2`, `e14_2017_czerwiec_1..5`, a także „wrzesien”/„pazdziernik” w 2014–2016. Ma też foldery „E14” dla lat 2021–2024, które prawdopodobnie są błędnie oznaczone (E.14 w formule 2012 kończyło się wcześniej) — [PumaYT22/EgzaminyZawodoweINF](https://github.com/PumaYT22/EgzaminyZawodoweINF)
- W formule 2019 zadania części praktycznej są losowane z bazy CKE. CKE publikuje „jawne zadania” dla wskazanych kwalifikacji w dziale „Egzamin zawodowy formuła 2019 > Jawne zadania egzaminacyjne”, co najmniej 3 miesiące przed sesją — [OKE Poznań, komunikat jawne zadania 2025](https://oke.poznan.pl/files/cms/846/20240819_2025_pp2019_jawne_zadania.pdf); [komunikat 2024](https://www.oke.poznan.pl/files/cms/787/20230818_2024_pp2019_jawne_zadania.pdf)
- Od sesji zimowej 2026 egzaminu w formule 2012 już się nie przeprowadza — [ZSTI Gliwice, szkolenie 2026](https://www.zsti.gliwice.pl/static/upload/store/dokumenty/zawodowy/nauczyciel/Szkolenie2026Lato.pdf)
- Zadania powtarzają się między kwalifikacjami. 152 wpisy mają tylko **142 unikalne tytuły**. Przykłady z tym samym tytułem: E.14-01-18.06 = INF.03-01-21.06-SG = INF.03-01-22.01-SG („Restauracja Wszystkie Smaki”); E.14-05-19.06 i INF.03-01-24.01-SG („Usługi informatyczne”); E.14-06-19.06 i INF.03-02-24.01-SG („Pogotowie komputerowe”); EE.09-01-19.06 i INF.03-01-22.06-SG („Portal dla wędkarzy”); EE.09-02-20.06-SG i INF.03-06-24.01-SG („Biuro podróży”); EE.09-05-20.06-SG i INF.03-08-24.01-SG („Salon fryzjerski”) — [data.json](https://github.com/Chr1skyy/EgzaminZawodowyINF03-Wyszukiwarka/blob/main/src/data.json)

### Inferences
- 152 to najpewniej liczba wzięta z ezinf.it lub z data.json Chr1skyy. Jest poprawna jako „liczba arkuszy z pełnym kompletem (PDF + załączniki + zasady oceniania + rozwiązanie) w największej bazie społecznościowej”. Nie jest to pełna liczba historyczna: brakuje E.14 z 2013/2014–2018.01, a przy E.14 liczba może zależeć od tego, jak liczy się sesje dodatkowe i edycje zmodyfikowane.
- Proponowana definicja do serwisu: „arkusz” = jeden unikalny kod CKE (kwalifikacja + numer wariantu + rok.miesiąc). Duplikaty (to samo zadanie pod nowym kodem) warto pokazywać jako osobne wpisy z polem `same_as`.
- Od 2024.06 schemat jest stały: 12 wariantów INF.03 na sesję, czyli 24 rocznie. Sesje 2027 dodadzą zapewne kolejne 2 × 12.

### Gaps
- Nie udało się otworzyć cke.gov.pl, arkusze.pl ani egzamin-informatyk.pl (blokada sieci), więc nie da się potwierdzić, czy CKE upubliczniło brakujące warianty (np. INF.03-03-23.06, INF.03-03-24.01) ani jaka jest dokładna liczba starych E.14 na arkusze.pl.
- Nie potwierdzono, czy foldery „wrzesien”/„pazdziernik” w PumaYT22 to prawdziwe sesje CKE, czy błędne etykiety.

## Schemat kodów i nazewnictwa

### Takeaway
Kod ma postać `KWAL-NN-RR.MM[-SG]`: kwalifikacja, dwucyfrowy numer wariantu, dwucyfrowy rok i miesiąc sesji (01 = styczeń, 06 = czerwiec). Sufiks `-SG` występuje od sesji 2020.01 (EE.09, E.14) i we wszystkich INF.03. E.14 i EE.09 z 2018–2019.06 nie mają sufiksu.

### Cited Findings
- Przykłady z indeksu: `E.14-01-18.06`, `EE.09-01-19.06`, `EE.09-01-20.01-SG`, `E.14-04-20.06-SG`, `INF.03-01-21.06-SG`, `INF.03-12-26.06-SG` — [data.json](https://github.com/Chr1skyy/EgzaminZawodowyINF03-Wyszukiwarka/blob/main/src/data.json)
- Nazwy plików w repo Chr1skyy:
  - folder: `{kwal}/{kwal}_{RRRR}_{MM}_{NN}`
  - arkusz: `e_14_2018_06_01.pdf` / `inf_03_2026_06_01_SG.pdf`
  - zasady oceniania: `..._zo.pdf` / `INF_03_2026_06_01_SG_zo.pdf`
  - załączniki: `zad1.zip`, `pliki1.zip`, `pliki7.7z`, `materialy1.7z`
  - rozwiązanie: `rozwiazanie/` i `rozwiazanie.zip`
  — [repo](https://github.com/Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03)
- arkusze.pl używa slugów typu `{kwal}-{rok}-{styczen|czerwiec}-egzamin-zawodowy-praktyczny.pdf` oraz `...-praktyczny-zasady-oceniania.pdf`, np. `https://arkusze.pl/zawodowy/inf04-2026-styczen-egzamin-zawodowy-praktyczny-zasady-oceniania.pdf` — [arkusze.pl (wynik wyszukiwania)](https://arkusze.pl/zawodowy/inf04-2026-styczen-egzamin-zawodowy-praktyczny-zasady-oceniania.pdf)
- PumaYT22 używa nazw słownych: `Egzaminy/E14/2016/e14_2016_czerwiec_1` — [repo](https://github.com/PumaYT22/EgzaminyZawodoweINF)

### Inferences
- „SG” najpewniej znaczy „Sesja Główna” (wariant do egzaminu w terminie głównym). Nie znaleziono źródła, które to potwierdza.
- Slug arkusze.pl nie ma numeru wariantu w podanym przykładzie. Jak tam rozróżniane są warianty 01–12 jednej sesji, nie zweryfikowano (strona zablokowana).

### Gaps
- Brak oficjalnej definicji sufiksu SG i ewentualnych innych sufiksów (np. dla sesji dodatkowych lub dostosowanych arkuszy).

## Źródła: kto hostuje co (z URL patterns)

### Takeaway
Najlepszym źródłem danych do zbudowania serwisu jest para repozytoriów Chr1skyy. Indeks JSON (152 wpisy z tytułami, tagami, trudnością, hasłami do archiwów i ścieżkami plików) jest gotowy do użycia. Repo z materiałami trzyma PDF-y, załączniki, zasady oceniania i rozwiązania pod przewidywalnymi ścieżkami. Oficjalnym źródłem jest CKE (dział „Jawne zadania egzaminacyjne”), a arkusze.pl jest agregatorem PDF.

### Cited Findings
- **Chr1skyy/EgzaminZawodowyINF03-Wyszukiwarka**: statyczna wyszukiwarka (build.js, src/js, deploy przez GitHub Actions, CNAME `ezinf.it`). Filtruje po formule, roku, trudności, języku i tagach, a także pozwala oznaczać wykonane zadania. Wersja online: https://ezinf.it/ oraz https://chr1skyy.github.io/EgzaminZawodowyINF03-Wyszukiwarka/ — [README](https://github.com/Chr1skyy/EgzaminZawodowyINF03-Wyszukiwarka)
- Schemat wpisu w data.json: `formula`, `year`, `session` (1/6), `number`, `language` (PHP 99 / JS 51 / JS+PHP 2), `name`, `codeName`, `archive_password`, `links{mainFolder, examSheet, gradingRules, archive, solution, solutionZIP}`, `tags[]` (68 unikalnych tagów w kategoriach SQL / Grafika / CSS / PHP / JS / HTML), `difficulty` (Easy 92 / Medium 54 / Hard 6). Przykład:
  `{"formula":"E.14","year":2018,"session":6,"number":"01","codeName":"E.14-01-18.06","name":"Restauracja \"Wszystkie Smaki\"","links":{"mainFolder":"/e14/e14_2018_06_01","examSheet":"e_14_2018_06_01.pdf","gradingRules":"e_14_2018_06_01_zo.pdf","archive":"zad1.zip","solution":"rozwiazanie","solutionZIP":"rozwiazanie.zip"},"tags":["HTML: formularz","PHP: odbieranie danych formularza (POST)","SQL: ..."],"difficulty":"Easy"}` — [data.json](https://github.com/Chr1skyy/EgzaminZawodowyINF03-Wyszukiwarka/blob/main/src/data.json)
- Archiwa z załącznikami są zaszyfrowane hasłem, tak jak na egzaminie. Hasła są w polu `archive_password` (np. `Wykon@jTo` dla E.14-01-18.06) — [data.json](https://github.com/Chr1skyy/EgzaminZawodowyINF03-Wyszukiwarka/blob/main/src/data.json)
- Plik do pobrania można złożyć z rekordu: `https://raw.githubusercontent.com/Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03/main{mainFolder}/{examSheet}`. Przykładowe ścieżki: `inf03/inf03_2026_06_01/inf_03_2026_06_01_SG.pdf`, `.../INF_03_2026_06_01_SG_zo.pdf`, `.../pliki1.7z`, `.../rozwiazanie/islandia.php` — [repo](https://github.com/Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03) (nazwa gałęzi `main` nie została zweryfikowana, bo API dla tego repo było zablokowane w sesji)
- **arkusze.pl**: hostuje PDF arkuszy praktycznych i zasad oceniania pod `https://arkusze.pl/zawodowy/{slug}.pdf` (np. inf04-2025-czerwiec, tlo01-2026-styczen, giw08-2026-styczen). Ma już materiały z 2026 roku — [arkusze.pl inf04 2025 czerwiec ZO](https://arkusze.pl/zawodowy/inf04-2025-czerwiec-egzamin-zawodowy-praktyczny-zasady-oceniania.pdf); [giw08 2026 styczeń](https://arkusze.pl/zawodowy/giw08-2026-styczen-egzamin-zawodowy-praktyczny.pdf)
- **CKE**: zadania praktyczne formuły 2019 publikuje w „Egzaminy zawodowe > Egzamin zawodowy formuła 2019 > Jawne zadania egzaminacyjne” — [OKE Poznań, komunikat](https://oke.poznan.pl/files/cms/846/20240819_2025_pp2019_jawne_zadania.pdf)
- Portal ZPE (gov) linkuje przykładowe zadania praktyczne CKE dla INF.03 — [zpe.gov.pl](https://zpe.gov.pl/a/egzamin-zawodowy/DUfMI8i89)
- Media (se.pl) publikują artykuły typu „arkusze CKE do ściągnięcia” dla technika informatyka po każdej sesji — [se.pl 2025](https://www.se.pl/krakow/egzamin-zawodowy-2025-technik-informatyk-arkusze-cke-odpowiedzi-do-sciagniecia-aa-mAJS-dsB7-cz8W.html)
- **egzamin-informatyk.pl / praktycznyegzamin.pl**: nie udało się ich otworzyć ani znaleźć w wyszukiwarce. Nie ma w tych notatkach danych o ich zawartości.

### Inferences
- Do zbudowania serwisu najprościej wziąć data.json (152 rekordy) jako seed. Trzeba dodać pole `url_oficjalny` (CKE lub arkusze.pl) oraz linki do rozwiązań w innych repo. Hasła do archiwów są publiczne w repo, ale na stronie dla uczniów lepiej je pokazywać dopiero „po kliknięciu”, tak jak na egzaminie.

### Gaps
- Dokładne URL-e plików na cke.gov.pl i to, czy CKE trzyma archiwum wszystkich sesji INF.03 od 2021: niezweryfikowane (blokada sieci).

## Repozytoria GitHub z rozwiązaniami

### Takeaway
Zdecydowanie najlepsze jest Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03 (151★, 152 arkusze z rozwiązaniami, aktualizowane w październiku i listopadzie 2026). Drugie jest PumaYT22/EgzaminyZawodoweINF (25★, licencja MIT, obejmuje też E.14 z 2014–2017 i INF.04, ale INF.03 tylko do 2024).

### Cited Findings
Liczba gwiazdek i daty aktualizacji według `gh search repos` z 2026-11-05:
- **Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03**: 151★, aktualizacja 2026-11-05. Ma 152 foldery (E.14 2018.06–2020.06, EE.09 2019.06–2023.01, INF.03 2021.06–2026.06), a w każdym PDF, ZO, załączniki i rozwiązanie. W drzewie repo nie ma pliku LICENSE — [repo](https://github.com/Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03)
- **Chr1skyy/EgzaminZawodowyINF03-Wyszukiwarka**: 10★, indeks + UI (ezinf.it) — [repo](https://github.com/Chr1skyy/EgzaminZawodowyINF03-Wyszukiwarka)
- **PumaYT22/EgzaminyZawodoweINF**: 25★, licencja MIT (Jakub Guźda 2024). Zawiera E14 2014–2024 (73 foldery), EE09 2020–2024 (32), INF03 2021–2024 (34) i INF04, a do tego materiały (skróty teorii i praktyki). Ma powiązaną aplikację Android i stronę egzaminyez.pl — [repo](https://github.com/PumaYT22/EgzaminyZawodoweINF)
- **jankupczyk/EE-09**: 41★, rozwiązania EE.09 — [repo](https://github.com/jankupczyk/EE-09)
- **NickyMB/Technik-Informatyk-Egzaminy**: 12★, „Rozwiązane arkusze z egzaminów EE.09 i E.14” — [repo](https://github.com/NickyMB/Technik-Informatyk-Egzaminy)
- Mniejsze repozytoria:
  - [machinacyfrowa/EE.09](https://github.com/machinacyfrowa/EE.09) (4★)
  - [nurekkartezjusz/INF.03-E.14-EE.09-rozwiazania-egzaminow](https://github.com/nurekkartezjusz/INF.03-E.14-EE.09-rozwiazania-egzaminow) (2★)
  - [alanwnuczko/INF03](https://github.com/alanwnuczko/INF03) (aktualizacja 2026-10)
  - [PiotrCiechanowski/INF03-egzamin-zawodowy](https://github.com/PiotrCiechanowski/INF03-egzamin-zawodowy)
  - [EgzaminyINF/EE.09](https://github.com/EgzaminyINF/EE.09)
  - [guliveer/inf.03_2023-odpowiedzi](https://github.com/guliveer/inf.03_2023-odpowiedzi)
- Pokrewne: [maciejkrol18/teoriainformatyk](https://github.com/maciejkrol18/teoriainformatyk) (7★), strona do nauki teorii INF.02/INF.03; [PEXEL2002/Laby_TAI](https://github.com/PEXEL2002/Laby_TAI), laboratoria przygotowujące do praktyki INF.03

### Inferences
- Rozwiązania w repo są autorskie (README Chr1skyy: „Rozwiązania są napisane przeze mnie”). Repo bez licencji oznacza domyślnie „all rights reserved”. Kodu rozwiązań nie należy więc kopiować bez zgody autora, wystarczy linkowanie. Repo PumaYT22 (MIT) pozwala na reuse z atrybucją.

### Gaps
- Nie sprawdzono jakości i kompletności rozwiązań w mniejszych repo.

## Licencje i kwestie prawne: rehosting czy linkowanie?

### Takeaway
Bezpieczniej **linkować** (do CKE jako źródła oficjalnego, do arkusze.pl i repo GitHub), a samemu hostować tylko własne metadane (kod, tytuł, tagi). Nie znaleziono w tej sesji regulaminu CKE ani arkusze.pl dotyczącego redystrybucji.

### Cited Findings
- Repo Chr1skyy nie zawiera pliku LICENSE — [drzewo repo](https://github.com/Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03)
- PumaYT22/EgzaminyZawodoweINF jest na licencji MIT — [LICENSE](https://github.com/PumaYT22/EgzaminyZawodoweINF/blob/main/LICENSE)
- CKE publikuje jawne zadania „do publicznej wiadomości” na swojej stronie — [OKE Poznań, komunikat 2024](https://www.oke.poznan.pl/files/cms/787/20230818_2024_pp2019_jawne_zadania.pdf)

### Inferences
- Publikacja „do publicznej wiadomości” nie oznacza automatycznie zgody na rehosting. Część środowiska powołuje się na art. 4 ustawy o prawie autorskim (materiały urzędowe), ale w tej sesji nie znaleziono źródła, które by to potwierdzało. Rehosting PDF-ów CKE z wyraźnym podaniem źródła jest powszechny (arkusze.pl, repo GitHub), ale ryzyko prawne nie zostało ocenione.
- Obrazki i bazy z załączników (zdjęcia stockowe) mogą mieć innych właścicieli praw niż CKE.

### Gaps
- Brak treści regulaminu cke.gov.pl i arkusze.pl (strony zablokowane). Warto sprawdzić stopkę i regulamin tych stron przed rehostingiem.

## Pełna tabela 152 arkuszy (z data.json, stan 2026-10/11)

Kolumna „Kategorie tagów” pokazuje, których technologii dotyczy zadanie. Pełne tagi, hasła do archiwów i nazwy plików są w data.json. Kolumna „Folder w repo Chr1skyy” jest względna wobec `https://github.com/Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03/tree/main`.

| # | Kod (codeName) | Tytuł / temat | Język | Trudność | Kategorie tagów | Folder w repo Chr1skyy |
|---|---|---|---|---|---|---|
| 1 | E.14-01-18.06 | Restauracja "Wszystkie Smaki" | PHP | Easy | HTML, PHP, SQL | `/e14/e14_2018_06_01` |
| 2 | E.14-02-18.06 | Bar "Smaczne Jadło" | PHP | Easy | HTML, PHP, SQL | `/e14/e14_2018_06_02` |
| 3 | E.14-03-18.06 | Bar "Smacznie i Miło" | PHP | Easy | Grafika, SQL | `/e14/e14_2018_06_03` |
| 4 | E.14-04-18.06 | Restauracja "Kulinaria.pl" | PHP | Easy | Grafika, SQL | `/e14/e14_2018_06_04` |
| 5 | E.14-05-18.06 | Dom weselny | JS | Easy | Grafika, JS | `/e14/e14_2018_06_05` |
| 6 | E.14-06-18.06 | Pizzeria | JS | Easy | Grafika, JS | `/e14/e14_2018_06_06` |
| 7 | E.14-01-19.01 | Filmoteka | PHP | Easy | CSS, Grafika, HTML, PHP, SQL | `/e14/e14_2019_01_01` |
| 8 | E.14-02-19.01 | Formatowanie dokumentów HTML | JS | Medium | Grafika, HTML, JS | `/e14/e14_2019_01_02` |
| 9 | E.14-03-19.01 | Baza filmów | PHP | Easy | CSS, Grafika, HTML, PHP, SQL | `/e14/e14_2019_01_03` |
| 10 | E.14-04-19.01 | Hurtownia kawy | JS | Easy | CSS, Grafika, JS | `/e14/e14_2019_01_04` |
| 11 | E.14-05-19.01 | Idziemy na grzyby | PHP | Easy | CSS, Grafika, SQL | `/e14/e14_2019_01_05` |
| 12 | E.14-06-19.01 | Biuro podróży "WESOŁA WYPRAWA" | PHP | Medium | CSS, Grafika, PHP | `/e14/e14_2019_01_06` |
| 13 | E.14-07-19.01 | Hurtownia komputerowa - podzespoły | PHP | Easy | CSS, Grafika, HTML, PHP, SQL | `/e14/e14_2019_01_07` |
| 14 | E.14-08-19.01 | Hurtownia komputerowa - podzespoły | PHP | Easy | CSS, Grafika, HTML, PHP, SQL | `/e14/e14_2019_01_08` |
| 15 | E.14-09-19.01 | Atlas zwierząt | PHP | Easy | HTML, PHP, SQL | `/e14/e14_2019_01_09` |
| 16 | E.14-10-19.01 | Drapieżniki i inne | PHP | Easy | HTML, PHP, SQL | `/e14/e14_2019_01_10` |
| 17 | E.14-11-19.01 | Zdjęcia psów | JS | Medium | CSS, Grafika, JS | `/e14/e14_2019_01_11` |
| 18 | E.14-12-19.01 | Fotografie zwierząt | JS | Medium | CSS, Grafika, JS | `/e14/e14_2019_01_12` |
| 19 | E.14-01-19.06 | Sklep papierniczy | PHP | Easy | Grafika, HTML, PHP, SQL | `/e14/e14_2019_06_01` |
| 20 | E.14-02-19.06 | Hurtownia papiernicza | PHP | Easy | CSS, Grafika, HTML, PHP, SQL | `/e14/e14_2019_06_02` |
| 21 | E.14-03-19.06 | Biblioteka Publiczna w Książkowicach | PHP | Easy | HTML, PHP, SQL | `/e14/e14_2019_06_03` |
| 22 | E.14-04-19.06 | Biblioteka Publiczna w Książkowicach | PHP | Easy | HTML, PHP, SQL | `/e14/e14_2019_06_04` |
| 23 | E.14-05-19.06 | Usługi informatyczne | JS | Medium | Grafika, HTML, JS | `/e14/e14_2019_06_05` |
| 24 | E.14-06-19.06 | Pogotowie komputerowe | JS | Medium | Grafika, HTML, JS | `/e14/e14_2019_06_06` |
| 25 | E.14-01-20.01-SG | Podzespoły komputerowe | PHP | Easy | CSS, Grafika, SQL | `/e14/e14_2020_01_01` |
| 26 | E.14-02-20.01-SG | Fabryka żelków | JS | Easy | CSS, Grafika, JS | `/e14/e14_2020_01_02` |
| 27 | E.14-03-20.01-SG | Fabryka cukierków | JS | Easy | CSS, Grafika, HTML, JS | `/e14/e14_2020_01_03` |
| 28 | E.14-04-20.01-SG | Gromady kręgowców | PHP | Easy | CSS, SQL | `/e14/e14_2020_01_04` |
| 29 | E.14-01-20.06-SG | Malarz | JS | Easy | Grafika, JS, SQL | `/e14/e14_2020_06_01` |
| 30 | E.14-02-20.06-SG | Wynajem pokoi | PHP | Easy | Grafika, SQL | `/e14/e14_2020_06_02` |
| 31 | E.14-03-20.06-SG | Moje kwiaty | PHP | Easy | Grafika, HTML, PHP, SQL | `/e14/e14_2020_06_03` |
| 32 | E.14-04-20.06-SG | Ozdoby - sklep | JS+PHP | Medium | Grafika, HTML, JS, PHP, SQL | `/e14/e14_2020_06_04` |
| 33 | EE.09-01-19.06 | Portal dla wędkarzy | PHP | Easy | Grafika, SQL | `/ee09/ee09_2019_06_01` |
| 34 | EE.09-02-19.06 | Stacja paliw | JS | Easy | Grafika, JS, SQL | `/ee09/ee09_2019_06_02` |
| 35 | EE.09-03-19.06 | Zawody wędkarskie | PHP | Easy | Grafika, HTML, PHP, SQL | `/ee09/ee09_2019_06_03` |
| 36 | EE.09-04-19.06 | Pomocnik matematyczny | JS | Medium | Grafika, JS, SQL | `/ee09/ee09_2019_06_04` |
| 37 | EE.09-05-19.06 | Poznaj Ciągi Liczbowe | JS | Medium | Grafika, JS, SQL | `/ee09/ee09_2019_06_05` |
| 38 | EE.09-06-19.06 | Pogotowie Ratunkowe | PHP | Easy | Grafika, HTML, PHP, SQL | `/ee09/ee09_2019_06_06` |
| 39 | EE.09-01-20.01-SG | Wędkuj z nami! | PHP | Easy | Grafika, SQL | `/ee09/ee09_2020_01_01` |
| 40 | EE.09-02-20.01-SG | Witamy na stacji paliw | JS | Easy | Grafika, JS, SQL | `/ee09/ee09_2020_01_02` |
| 41 | EE.09-03-20.01-SG | Prognoza pogody dla Poznania | PHP | Easy | Grafika, SQL | `/ee09/ee09_2020_01_03` |
| 42 | EE.09-01-20.06-SG | Mój organizer | PHP | Easy | Grafika, HTML, PHP, SQL | `/ee09/ee09_2020_06_01` |
| 43 | EE.09-02-20.06-SG | Biuro podróży | PHP | Easy | CSS, SQL | `/ee09/ee09_2020_06_02` |
| 44 | EE.09-03-20.06-SG | Mój kalendarz | PHP | Easy | Grafika, HTML, PHP, SQL | `/ee09/ee09_2020_06_03` |
| 45 | EE.09-04-20.06-SG | Salon kosmetyczny | JS | Easy | CSS, Grafika, JS, SQL | `/ee09/ee09_2020_06_04` |
| 46 | EE.09-05-20.06-SG | Salon fryzjerski | JS | Easy | CSS, Grafika, JS, SQL | `/ee09/ee09_2020_06_05` |
| 47 | EE.09-06-20.06-SG | Witamy w biurze podróży | PHP | Easy | CSS, SQL | `/ee09/ee09_2020_06_06` |
| 48 | EE.09-01-21.01-SG | Światowe Rozgrywki Piłkarskie | PHP | Easy | CSS, Grafika, HTML, PHP, SQL | `/ee09/ee09_2021_01_01` |
| 49 | EE.09-02-21.01-SG | Reprezentacja Polski w Piłce Nożnej | PHP | Easy | CSS, Grafika, HTML, PHP, SQL | `/ee09/ee09_2021_01_02` |
| 50 | EE.09-03-21.01-SG | Oblicz swoje BMI | PHP | Medium | CSS, Grafika, HTML, PHP, SQL | `/ee09/ee09_2021_01_03` |
| 51 | EE.09-04-21.01-SG | Oblicz Twój wskaŁşnik BMI | PHP | Medium | CSS, Grafika, HTML, PHP, SQL | `/ee09/ee09_2021_01_04` |
| 52 | EE.09-05-21.01-SG | Przyloty | PHP | Medium | CSS, Grafika, PHP, SQL | `/ee09/ee09_2021_01_05` |
| 53 | EE.09-06-21.01-SG | Odloty z lotniska | PHP | Medium | CSS, Grafika, PHP, SQL | `/ee09/ee09_2021_01_06` |
| 54 | EE.09-01-21.06-SG | Portal społecznościowy - moje konto | PHP | Easy | Grafika, SQL | `/ee09/ee09_2021_06_01` |
| 55 | EE.09-02-21.06-SG | Internetowy sklep z eko-warzywami | PHP | Medium | Grafika, HTML, PHP, SQL | `/ee09/ee09_2021_06_02` |
| 56 | EE.09-03-21.06-SG | Internetowa wypożyczalnia filmów | PHP | Medium | Grafika, HTML, PHP, SQL | `/ee09/ee09_2021_06_03` |
| 57 | EE.09-04-21.06-SG | Portal społecznościowy - panel administratora | PHP | Easy | Grafika, HTML, PHP, SQL | `/ee09/ee09_2021_06_04` |
| 58 | EE.09-01-22.01-SG | Zgłoszenie na kartę wędkarską | PHP | Easy | Grafika, HTML, PHP, SQL | `/ee09/ee09_2022_01_01` |
| 59 | EE.09-02-22.01-SG | Prognoza pogody dla Wrocławia | PHP | Easy | Grafika, SQL | `/ee09/ee09_2022_01_02` |
| 60 | EE.09-03-22.01-SG | Dodanie zespołu ratowniczego | PHP | Easy | Grafika, HTML, PHP, SQL | `/ee09/ee09_2022_01_03` |
| 61 | EE.09-04-22.01-SG | Forum wielbicieli psów | PHP | Hard | CSS, Grafika, HTML, PHP, SQL | `/ee09/ee09_2022_01_04` |
| 62 | EE.09-05-22.01-SG | Nasze osiedle | PHP | Hard | CSS, Grafika, HTML, PHP, SQL | `/ee09/ee09_2022_01_05` |
| 63 | EE.09-06-22.01-SG | Konfigurator stylu | JS | Medium | Grafika, JS, SQL | `/ee09/ee09_2022_01_06` |
| 64 | EE.09-07-22.01-SG | Galeria miejsc ciekawych | JS | Medium | CSS, Grafika, JS, SQL | `/ee09/ee09_2022_01_07` |
| 65 | EE.09-01-22.06-SG | Forum miłośników psów | PHP | Medium | CSS, Grafika, HTML, PHP, SQL | `/ee09/ee09_2022_06_01` |
| 66 | EE.09-02-22.06-SG | Pomocnik CSS | JS | Medium | CSS, Grafika, HTML, JS, SQL | `/ee09/ee09_2022_06_02` |
| 67 | EE.09-03-22.06-SG | Hurtownia spożywcza - opinie klientów | PHP | Easy | Grafika, SQL | `/ee09/ee09_2022_06_03` |
| 68 | EE.09-04-22.06-SG | Sieci komputerowe | JS | Hard | CSS, Grafika, JS, SQL | `/ee09/ee09_2022_06_04` |
| 69 | EE.09-01-23.01-SG | Akta pracownicze | PHP | Easy | Grafika, SQL | `/ee09/ee09_2023_01_01` |
| 70 | EE.09-02-23.01-SG | Galeria obrazów | JS | Medium | CSS, Grafika, JS, SQL | `/ee09/ee09_2023_01_02` |
| 71 | EE.09-03-23.01-SG | Gazeta codzienna | JS | Medium | Grafika, JS, SQL | `/ee09/ee09_2023_01_03` |
| 72 | EE.09-04-23.01-SG | Wizytówki pracowników | PHP | Easy | CSS, Grafika, HTML, PHP, SQL | `/ee09/ee09_2023_01_04` |
| 73 | INF.03-01-21.06-SG | Restauracja "Wszystkie Smaki" | PHP | Easy | HTML, PHP, SQL | `/inf03/inf03_2021_06_01` |
| 74 | INF.03-01-22.01-SG | Restauracja "Wszystkie Smaki" | PHP | Easy | HTML, PHP, SQL | `/inf03/inf03_2022_01_01` |
| 75 | INF.03-01-22.06-SG | Portal dla wędkarzy | PHP | Easy | CSS, Grafika, SQL | `/inf03/inf03_2022_06_01` |
| 76 | INF.03-02-22.06-SG | Całodobowa stacja paliw | JS | Easy | CSS, Grafika, HTML, JS, SQL | `/inf03/inf03_2022_06_02` |
| 77 | INF.03-03-22.06-SG | Zawody polskich wędkarzy | PHP | Easy | Grafika, HTML, PHP, SQL | `/inf03/inf03_2022_06_03` |
| 78 | INF.03-01-23.01-SG | Malowanie pokoi i biur | JS | Easy | CSS, Grafika, HTML, JS, SQL | `/inf03/inf03_2023_01_01` |
| 79 | INF.03-02-23.01-SG | Pensjonat pod dobrym humorem | PHP | Easy | CSS, Grafika, SQL | `/inf03/inf03_2023_01_02` |
| 80 | INF.03-03-23.01-SG | Grupa Polskich Kwiaciarni | PHP | Easy | CSS, Grafika, HTML, PHP, SQL | `/inf03/inf03_2023_01_03` |
| 81 | INF.03-04-23.01-SG | Biuro turystyczne | PHP | Easy | CSS, SQL | `/inf03/inf03_2023_01_04` |
| 82 | INF.03-05-23.01-SG | Organizer: Sierpnień | PHP | Easy | CSS, Grafika, HTML, PHP, SQL | `/inf03/inf03_2023_01_05` |
| 83 | INF.03-01-23.06-SG | Dzisiejsze promocje naszego sklepu dla uczniów | PHP | Easy | Grafika, HTML, PHP, SQL | `/inf03/inf03_2023_06_01` |
| 84 | INF.03-02-23.06-SG | Hurtownia szkolna z najlepszymi cenami | PHP | Easy | CSS, Grafika, HTML, PHP, SQL | `/inf03/inf03_2023_06_02` |
| 85 | INF.03-04-23.06-SG | Biblioteka w Książkowicach Wielkich | PHP | Easy | Grafika, HTML, PHP, SQL | `/inf03/inf03_2023_06_04` |
| 86 | INF.03-07-23.06-SG | Biblioteka w Książkowicach Małych | PHP | Easy | CSS, Grafika, HTML, PHP, SQL | `/inf03/inf03_2023_06_07` |
| 87 | INF.03-01-24.01-SG | Usługi informatyczne | JS | Medium | CSS, Grafika, HTML, JS | `/inf03/inf03_2024_01_01` |
| 88 | INF.03-02-24.01-SG | Pogotowie komputerowe | JS | Medium | CSS, Grafika, HTML, JS | `/inf03/inf03_2024_01_02` |
| 89 | INF.03-04-24.01-SG | Terminarz | PHP | Easy | CSS, Grafika, SQL | `/inf03/inf03_2024_01_04` |
| 90 | INF.03-05-24.01-SG | Usługi kosmetyczne | JS | Easy | CSS, Grafika, HTML, JS, SQL | `/inf03/inf03_2024_01_05` |
| 91 | INF.03-06-24.01-SG | Biuro podróży | PHP | Easy | CSS, SQL | `/inf03/inf03_2024_01_06` |
| 92 | INF.03-08-24.01-SG | Salon fryzjerski | JS | Easy | CSS, Grafika, JS, SQL | `/inf03/inf03_2024_01_08` |
| 93 | INF.03-01-24.06-SG | Motocykle - moja pasja | PHP | Easy | CSS, Grafika, SQL | `/inf03/inf03_2024_06_01` |
| 94 | INF.03-02-24.06-SG | Chat | JS | Hard | Grafika, HTML, JS, SQL | `/inf03/inf03_2024_06_02` |
| 95 | INF.03-03-24.06-SG | Poziomy rzek w województwie dolnośląskim | PHP | Medium | CSS, Grafika, HTML, PHP, SQL | `/inf03/inf03_2024_06_03` |
| 96 | INF.03-04-24.06-SG | Zdjęcia | PHP | Medium | CSS, Grafika, SQL | `/inf03/inf03_2024_06_04` |
| 97 | INF.03-05-24.06-SG | KupAuto! Internetowy komis samochodowy | PHP | Easy | Grafika, HTML, PHP, SQL | `/inf03/inf03_2024_06_05` |
| 98 | INF.03-06-24.06-SG | Formularz rejestracyjny konferencji "Nasze Kwiaty" | JS | Medium | Grafika, HTML, JS, SQL | `/inf03/inf03_2024_06_06` |
| 99 | INF.03-07-24.06-SG | Ważenie pojazdów ciężarowych we Wrocławiu | PHP | Medium | CSS, Grafika, PHP, SQL | `/inf03/inf03_2024_06_07` |
| 100 | INF.03-08-24.06-SG | Zarejestruj się w sklepie | JS | Hard | CSS, Grafika, JS, SQL | `/inf03/inf03_2024_06_08` |
| 101 | INF.03-09-24.06-SG | Zwiedzamy Polskę | JS | Medium | CSS, Grafika, JS, SQL | `/inf03/inf03_2024_06_09` |
| 102 | INF.03-10-24.06-SG | Nasz zespół | JS | Medium | CSS, Grafika, JS, SQL | `/inf03/inf03_2024_06_10` |
| 103 | INF.03-11-24.06-SG | Hodowla świnek morskich | PHP | Easy | CSS, Grafika, SQL | `/inf03/inf03_2024_06_11` |
| 104 | INF.03-12-24.06-SG | Efekty na obrazach | JS | Medium | CSS, Grafika, HTML, JS, SQL | `/inf03/inf03_2024_06_12` |
| 105 | INF.03-01-25.01-SG | Kursy komputerowe | JS | Easy | CSS, Grafika, JS, SQL | `/inf03/inf03_2025_01_01` |
| 106 | INF.03-02-25.01-SG | Montaż paneli podłogowych | JS | Easy | CSS, Grafika, HTML, JS, SQL | `/inf03/inf03_2025_01_02` |
| 107 | INF.03-03-25.01-SG | Kalendarz | PHP | Medium | Grafika, HTML, PHP, SQL | `/inf03/inf03_2025_01_03` |
| 108 | INF.03-04-25.01-SG | Obuwie męskie | PHP | Easy | CSS, HTML, PHP, SQL | `/inf03/inf03_2025_01_04` |
| 109 | INF.03-05-25.01-SG | Firma szkoleniowa | PHP | Medium | CSS, Grafika, PHP, SQL | `/inf03/inf03_2025_01_05` |
| 110 | INF.03-06-25.01-SG | Pozycyjne systemy liczbowe | JS | Medium | Grafika, JS, SQL | `/inf03/inf03_2025_01_06` |
| 111 | INF.03-07-25.01-SG | Wyszukiwarka miast | PHP | Easy | CSS, Grafika, HTML, PHP, SQL | `/inf03/inf03_2025_01_07` |
| 112 | INF.03-08-25.01-SG | Mieszalnia farb | PHP | Easy | CSS, Grafika, HTML, PHP, SQL | `/inf03/inf03_2025_01_08` |
| 113 | INF.03-09-25.01-SG | Klub zdobywców gór polskich | PHP | Easy | Grafika, HTML, PHP, SQL | `/inf03/inf03_2025_01_09` |
| 114 | INF.03-10-25.01-SG | Koło szachowe gambit piona | PHP | Easy | Grafika, HTML, PHP, SQL | `/inf03/inf03_2025_01_10` |
| 115 | INF.03-11-25.01-SG | Konkurs - wolontariat szkolny | PHP | Easy | Grafika, HTML, SQL | `/inf03/inf03_2025_01_11` |
| 116 | INF.03-12-25.01-SG | Piekarnia | PHP | Easy | CSS, Grafika, HTML, PHP, SQL | `/inf03/inf03_2025_01_12` |
| 117 | INF.03-01-25.06-SG | Ranking gier komputerowych / Gry komputerowe | PHP | Medium | CSS, Grafika, HTML, PHP, SQL | `/inf03/inf03_2025_06_01` |
| 118 | INF.03-02-25.06-SG | Moje zadania / Planer zadań | JS | Medium | CSS, Grafika, JS, SQL | `/inf03/inf03_2025_06_02` |
| 119 | INF.03-03-25.06-SG | Biblioteka szkolna "Wiedzamin" | PHP | Easy | CSS, Grafika, SQL | `/inf03/inf03_2025_06_03` |
| 120 | INF.03-04-25.06-SG | Firma przewozowa Półdarmo | PHP | Hard | CSS, Grafika, HTML, PHP, SQL | `/inf03/inf03_2025_06_04` |
| 121 | INF.03-05-25.06-SG | Fotografia artystyczna | JS | Medium | CSS, Grafika, JS, SQL | `/inf03/inf03_2025_06_05` |
| 122 | INF.03-06-25.06-SG | Biblioteka miejska | PHP | Medium | CSS, Grafika, HTML, PHP, SQL | `/inf03/inf03_2025_06_06` |
| 123 | INF.03-07-25.06-SG | Biuro turystyczne | PHP | Easy | CSS, Grafika, HTML, PHP, SQL | `/inf03/inf03_2025_06_07` |
| 124 | INF.03-08-25.06-SG | Poznaj smoki! | JS+PHP | Medium | CSS, Grafika, HTML, JS, PHP, SQL | `/inf03/inf03_2025_06_08` |
| 125 | INF.03-09-25.06-SG | Malowanie i gipsowanie / Remonty | PHP | Easy | CSS, Grafika, HTML, PHP, SQL | `/inf03/inf03_2025_06_09` |
| 126 | INF.03-10-25.06-SG | Szkolenia i kursy | PHP | Medium | CSS, Grafika, HTML, PHP, SQL | `/inf03/inf03_2025_06_10` |
| 127 | INF.03-11-25.06-SG | Opony | PHP | Easy | Grafika, PHP, SQL | `/inf03/inf03_2025_06_11` |
| 128 | INF.03-12-25.06-SG | Przychodnia Medica | PHP | Medium | CSS, Grafika, HTML, SQL | `/inf03/inf03_2025_06_12` |
| 129 | INF.03-01-26.01-SG | Konfigurator samochodów | PHP | Easy | CSS, HTML, SQL | `/inf03/inf03_2026_01_01` |
| 130 | INF.03-02-26.01-SG | Zdrowy bazarek | PHP | Easy | Grafika, HTML, PHP, SQL | `/inf03/inf03_2026_01_02` |
| 131 | INF.03-03-26.01-SG | Pola figur płaskich | JS | Easy | CSS, Grafika, JS | `/inf03/inf03_2026_01_03` |
| 132 | INF.03-04-26.01-SG | System informacji dla maturzystów / Matura | PHP | Medium | CSS, PHP, SQL | `/inf03/inf03_2026_01_04` |
| 133 | INF.03-05-26.01-SG | Zgłoszenia wydarzeń | PHP | Easy | CSS, HTML, PHP, SQL | `/inf03/inf03_2026_01_05` |
| 134 | INF.03-06-26.01-SG | Informacja o chorobach w Polsce | PHP | Easy | CSS, Grafika, HTML, PHP, SQL | `/inf03/inf03_2026_01_06` |
| 135 | INF.03-07-26.01-SG | Pogoda w Europie | PHP | Medium | CSS, Grafika, PHP, SQL | `/inf03/inf03_2026_01_07` |
| 136 | INF.03-08-26.01-SG | Korona gór polskich | PHP | Medium | CSS, Grafika, PHP, SQL | `/inf03/inf03_2026_01_08` |
| 137 | INF.03-09-26.01-SG | Stylizacja paznokci / Twoje wymarzone paznokcie | JS | Medium | CSS, Grafika, JS, PHP, SQL | `/inf03/inf03_2026_01_09` |
| 138 | INF.03-10-26.01-SG | Blog kulinarny | PHP | Medium | CSS, Grafika, PHP, SQL | `/inf03/inf03_2026_01_10` |
| 139 | INF.03-11-26.01-SG | Lista aktorów / KinoTEKA | PHP | Easy | CSS, PHP, SQL | `/inf03/inf03_2026_01_11` |
| 140 | INF.03-12-26.01-SG | Studio tatuażu | JS | Medium | CSS, Grafika, HTML, JS, SQL | `/inf03/inf03_2026_01_12` |
| 141 | INF.03-01-26.06-SG | Zwiedzaj Islandię | PHP | Easy | CSS, PHP, SQL | `/inf03/inf03_2026_06_01` |
| 142 | INF.03-02-26.06-SG | Łowcy wodospadów | PHP | Easy | CSS, Grafika, HTML, PHP, SQL | `/inf03/inf03_2026_06_02` |
| 143 | INF.03-03-26.06-SG | Sklep meblowy | JS | Medium | CSS, Grafika, JS, SQL | `/inf03/inf03_2026_06_03` |
| 144 | INF.03-04-26.06-SG | Rezerwacje wycieczek | JS | Medium | Grafika, HTML, JS, SQL | `/inf03/inf03_2026_06_04` |
| 145 | INF.03-05-26.06-SG | Sprzedaż antyków | PHP | Medium | CSS, Grafika, HTML, PHP, SQL | `/inf03/inf03_2026_06_05` |
| 146 | INF.03-06-26.06-SG | Strefa pacjenta | JS | Medium | CSS, Grafika, JS, SQL | `/inf03/inf03_2026_06_06` |
| 147 | INF.03-07-26.06-SG | Gra kółko i krzyżyk | JS | Easy | CSS, JS, SQL | `/inf03/inf03_2026_06_07` |
| 148 | INF.03-08-26.06-SG | Wypożyczalnia gier / PoGRAJmy! | JS | Easy | CSS, Grafika, JS, SQL | `/inf03/inf03_2026_06_08` |
| 149 | INF.03-09-26.06-SG | Restauracja Marchewka | JS | Medium | CSS, JS, SQL | `/inf03/inf03_2026_06_09` |
| 150 | INF.03-10-26.06-SG | Portal laboratorium | PHP | Medium | CSS, HTML, PHP, SQL | `/inf03/inf03_2026_06_10` |
| 151 | INF.03-11-26.06-SG | Atlas drzew | JS | Medium | CSS, Grafika, JS, SQL | `/inf03/inf03_2026_06_11` |
| 152 | INF.03-12-26.06-SG | Salon rowerowy | JS | Medium | CSS, Grafika, HTML, JS, SQL | `/inf03/inf03_2026_06_12` |

Źródło tabeli: [Chr1skyy/EgzaminZawodowyINF03-Wyszukiwarka src/data.json](https://github.com/Chr1skyy/EgzaminZawodowyINF03-Wyszukiwarka/blob/main/src/data.json). Lokalna kopia surowego JSON (do seedowania bazy): `research_notes/Platforma do nauki INF03/arkusze_index_chr1skyy.json`.
