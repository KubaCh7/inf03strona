# Źródła pytań teoretycznych (część pisemna) INF.03 / EE.09 / E.14

> Uwaga metodologiczna (5.11.2026): w tej sesji bezpośrednie pobieranie stron (WebFetch) było zablokowane przez sieć (np. egzamin-informatyk.pl, arkusze.pl: ENOTFOUND). Dane o serwisach pochodzą z fragmentów wyników WebSearch, a nie z pełnej treści stron. Pliki z GitHuba pobrano przez raw.githubusercontent.com i sprawdzono lokalnie. Kod źródłowy repozytoriów nie był przeglądany przez API (dostęp zablokowany).

## 1. Które serwisy mają banki pytań, ile pytań, czy z obrazkami?

### Takeaway
Żaden serwis nie podaje wprost bazy ok. 2700 pytań. Największe liczby, jakie widać w wynikach wyszukiwania, to 1276 (praktycznyegzamin.pl), 1045 (egzamin-informatyk.pl) i 842 (egzamin-programista.pl, tylko INF.03). Wszystkie te serwisy to darmowe quizy HTML z trybem „40 pytań / 60 min”. Żaden nie publikuje bazy do pobrania (JSON/CSV). Liczba ~2700 może się wziąć z sumowania kilku serwisów razem z duplikatami, ale tego nie zweryfikowano.

### Cited Findings
- egzamin-informatyk.pl (EE.09 / INF.03 / E.14): „Łączna liczba pytań EE.09 / INF.03 / E.14 zgromadzonych w naszej bazie: 1045”. Ma test 40 pytań z limitem 60 minut — [egzamin-informatyk.pl](https://egzamin-informatyk.pl/testy-inf03-ee09-programowanie-bazy-danych/)
- egzamin-programista.pl (INF.03): „Łączna liczba pytań INF.03 zgromadzonych w naszej bazie: 842”. Strona pisze, że na 40 pytań przewidziano maks. 60 minut — [egzamin-programista.pl](https://egzamin-programista.pl/testy-inf03-tworzenie-administrowanie-stronami-aplikacjami-bazami-danych/)
- praktycznyegzamin.pl (INF.03, EE.09, E.14): we fragmencie wyniku podano 1276 pytań i datę 01.06.2026 (najpewniej datę aktualizacji). Ma osobne sekcje „teoria” i „teoria/test” — [praktycznyegzamin.pl teoria](https://www.praktycznyegzamin.pl/inf03ee09e14/teoria/), [test](https://www.praktycznyegzamin.pl/inf03ee09e14/teoria/test/)
- ee-informatyk.pl: zestaw 40 losowych pytań ze wszystkich egzaminów INF.03/EE.09/E.14 oraz wybór pojedynczych arkuszy. Wielkości bazy nie podaje — [ee-informatyk.pl](https://ee-informatyk.pl/inf03-ee09/test-online/)
- informatyk-egzamin.pl: test 40 pytań i quizy z poszczególnych sesji (np. „Egzamin zawodowy INF.03 2022”). Kategorie: „Bazy danych (BD)” oraz „Programowanie, witryny i aplikacje internetowe (PWAI)” — [informatyk-egzamin.pl test 40](https://informatyk-egzamin.pl/inf-03-ee-09-e-14-test-40-pytan/), [quiz 2022](https://informatyk-egzamin.pl/qsm_quiz/egzamin-zawodowy-inf-03-2022/)
- zawodowe.edu.pl: stronicowana lista pytań INF.03 w kategoriach m.in. „Programowanie webowe” i „Bazy danych”. Liczby pytań nie znaleziono — [zawodowe.edu.pl](https://zawodowe.edu.pl/technik-informatyk/INF.03/page/1/)
- Inne serwisy z testem INF.03 (wielkość bazy nieznana): [kursinf.pl](https://www.kursinf.pl/pytania/inf03), [egzaminy24.pl](https://egzaminy24.pl/test-inf03/), [technikinformatyk.pl](https://technikinformatyk.pl/kwalifikacja-inf-03-egzamin-online), [ti.dxe.pl](https://ti.dxe.pl/testy/inf03/?o=40) (we fragmencie: „Baza składa się z 64 pytań”, kontekst niejasny)
- egzaminzawodowy.info: wyszukiwarka nie zwróciła żadnej strony z tej domeny, więc nie potwierdzono, że ma bazę INF.03 — (brak źródła)
- Obrazki: import z repozytorium bewertowski81-code/portal-egzaminy (6 arkuszy EE.09, 240 pytań) zawiera 6 pytań z obrazkiem na arkusz EE.09-SG-20.01. Kolejne 12 pytań oznaczono jako „visual_without_image”, czyli pytania odwołujące się do grafiki, ale bez pliku. Wynika z tego, że część pytań (rząd 15–45% w tym arkuszu) wymaga ilustracji — [ee09_import_report.json](https://github.com/bewertowski81-code/portal-egzaminy/blob/HEAD/uploads/imports/ee09/ee09_import_report.json)

### Inferences
- Serwisy quizowe zbierają pytania z arkuszy pisemnych opublikowanych dla starych formuł (E.14 z formuły 2012, EE.09 z formuły 2017, sesje mniej więcej 2012–2022) oraz z relacji zdających z INF.03. Duża część pytań powtarza się między E.14, EE.09 i INF.03, a także między serwisami. Przy budowie bazy trzeba więc usuwać duplikaty, np. przez normalizację treści pytania.
- Sensowna realna baza bez duplikatów to raczej ~1000–1300 pytań, a nie 2700. Tak wynika z porównania liczb podanych przez największe serwisy.
- Pytania z obrazkami (zrzuty kodu, schematy, wyniki zapytań SQL, wygląd strony) trzeba przechowywać z polem `image`, i w części z nich obrazek jest konieczny do odpowiedzi.

### Gaps
- Nie udało się potwierdzić źródła liczby „~2700 pytań”. Brak serwisu, który taką liczbę deklaruje.
- Nie zweryfikowano regulaminów ani informacji o prawach autorskich w samych serwisach (fetch zablokowany). Należy przyjąć, że ich opracowania (wyjaśnienia, układ, obrazki) są chronione i nie wolno ich scrapować bez zgody.
- Nie znaleziono, ile procent pytań w tych serwisach ma obrazki.

## 2. Otwarte zbiory danych / repozytoria GitHub z pytaniami (JSON/CSV)

### Takeaway
Nie ma wiarygodnego, otwarcie licencjonowanego zbioru pytań teoretycznych INF.03 w JSON/CSV. Repozytoria na GitHubie dotyczą prawie wyłącznie części praktycznej (rozwiązania arkuszy). Znalezione pliki JSON z pytaniami są małe, mają słabą jakość albo restrykcyjną licencję.

### Cited Findings
- Streax0/zsem-egzamin, plik `data_question/inf03.json`: 344 pytania, schemat `{question, options:{A,B,C,D}, correct:"B", image:null, category:"INF.03"}`. Wszystkie mają category „INF.03” i żadne nie ma obrazka. Część pytań wygląda na wygenerowane i jest niskiej jakości (np. „Która baza danych umożliwia ArangoDB AQL?”). LICENSE to „ZSEM TECH END-USER LICENSE AGREEMENT AND PROPRIETARY INTELLECTUAL PROPERTY POLICY” (v3.0, 25.06.2026), czyli licencja zastrzeżona, bez prawa ponownego użycia. README opisuje platformę głównie pod INF.02 z trybem 40 pytań — [plik](https://github.com/Streax0/zsem-egzamin/blob/HEAD/data_question/inf03.json), [repo](https://github.com/Streax0/zsem-egzamin)
- bewertowski81-code/portal-egzaminy: panel PHP/MariaDB z losowaniem 40 pytań i mieszaniem odpowiedzi. Raport importu podaje 6 arkuszy EE.09 = 240 pytań (CSV + obrazki) zaimportowanych jako INF.03. Repozytorium nie ma pliku LICENSE (HTTP 404) — [repo](https://github.com/bewertowski81-code/portal-egzaminy)
- Chr1skyy/EgzaminZawodowyINF03-Wyszukiwarka: `src/data.json` to 152 rekordy o arkuszach **praktycznych** E.14/EE.09/INF.03 z lat 2018–2026, z tagami, trudnością i linkami do PDF/rozwiązań. Nie są to pytania teoretyczne. Brak LICENSE. Wersja online: ezinf.it — [repo](https://github.com/Chr1skyy/EgzaminZawodowyINF03-Wyszukiwarka)
- Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03 (151 gwiazdek, brak licencji), PumaYT22/EgzaminyZawodoweINF (MIT), jankupczyk/EE-09 (licencja „other”), NickyMB/Technik-Informatyk-Egzaminy, guliveer/inf.03_2023-odpowiedzi to rozwiązania arkuszy praktycznych, a nie banki pytań — wyszukiwanie `gh search repos` (5.11.2026); [guliveer](https://awesome.ecosyste.ms/projects/github.com%2Fguliveer%2Finf.03_2023-odpowiedzi)
- Wyszukiwanie repozytoriów „inf03 quiz”, „inf03 pytania”, „ee09 quiz”, „egzamin informatyk quiz” nic nie zwróciło. „inf.03 test” zwróciło tylko puste repozytoria bez opisu (0-nira-0/inf_03-test, Informaticulus/INF_03_testy) — `gh search repos`, 5.11.2026

### Inferences
- Najczystsza droga do własnej bazy: samodzielnie przepisać/sparsować oficjalne arkusze pisemne (PDF) E.14 i EE.09 z lat, w których CKE/OKE je publikowały, razem z kluczami odpowiedzi. Na tych materiałach urzędowych opiera się cała reszta serwisów. Do tego dochodzą przykładowe zadania z informatorów CKE.
- Schemat ze Streax0 (`question / options A–D / correct / image / category`) to rozsądny wzorzec. Warto dodać pola `source` (np. `EE.09-SG-20.01#12`), `qualification[]` i `explanation`.

### Gaps
- Nie przejrzano wszystkich wyników `gh search code` (pokazano 20). Mogą istnieć inne małe zbiory.
- Nie sprawdzono, czy ezinf.it lub serwisy quizowe mają publiczne API.

## 3. Oficjalny format egzaminu (CKE, sesje 2026)

### Takeaway
Potwierdzone: część pisemna to 40 zadań zamkniętych (4 odpowiedzi, 1 poprawna) w 60 minut, na komputerze w systemie SIOEZ. Próg zdania to co najmniej 50% w części pisemnej i 75% w części praktycznej. Część praktyczna INF.03 trwa **150 minut**, co potwierdzają materiały ZPE (INF.04: 180 min). Oficjalnie dopuszczalne długości to 120/150/180/210/240 min, ustalane dla każdej kwalifikacji osobno.

### Cited Findings
- „Część pisemna trwa 60 minut i przeprowadzana jest w formie testu składającego się z 40 zadań zamkniętych zawierających cztery odpowiedzi do wyboru, z których tylko jedna jest prawidłowa”. Próg: „z części pisemnej – co najmniej 50% punktów oraz z części praktycznej – co najmniej 75% punktów” — [Informator OKE Warszawa, technik informatyk 2024](https://www.oke.waw.pl/wp-content/uploads/OKE_WARSZAWA/EE/EE_Zawodowy/Informatory/2024/technik_informatyk.pdf); [ZPE – Egzamin zawodowy](https://zpe.gov.pl/a/egzamin-zawodowy/D4pEwkiDH)
- Część pisemna odbywa się w SIOEZ: „40 pytań zamkniętych, czas: 60 minut”. Zadania są „wybierane losowo dla każdego zdającego z bazy zadań egzaminacyjnych prowadzonej przez CKE”, a „baza zadań do części pisemnej i algorytm ich losowania nie będą upubliczniane” — [odpowiedź MEN na interpelację nr 17677](https://api.sejm.gov.pl/sejm/term10/interpellations/17677/reply/DVRCQF/body); [interpelacja](https://api.sejm.gov.pl/sejm/term10/interpellations/17677/body)
- Część praktyczna INF.03 trwa 150 minut, INF.04 180 minut — [ZPE – Egzamin zawodowy (INF.03)](https://zpe.gov.pl/a/egzamin-zawodowy/DUfMI8i89) (według fragmentu wyszukiwania; nie otwierano pełnej strony)
- Część praktyczna trwa „120, 150, 180, 210 lub 240 minut”, a długość dla danej kwalifikacji podaje informator — [OKE Kraków](https://www.oke.krakow.pl/inf/filemgmt/visit.php?lid=8531). Materiały dla sesji lato 2026 podają też wariant 160 min — [ZSTI Gliwice, szkolenie 2026 Lato](https://www.zsti.gliwice.pl/static/upload/store/dokumenty/zawodowy/nauczyciel/Szkolenie2026Lato.pdf)
- Harmonogram lato 2026 (formuła 2019): część praktyczna model „d” 1.06.2026, modele „w”, „wk”, „dk” 2–22.06.2026 — [harmonogram 2026 PP2019](https://zsti.gliwice.pl/static/upload/store/dokumenty/zawodowy/harmonogram2026_PP2019_EZ_akt._6_X_2025.pdf)

### Inferences
- Parametry dla modułu quizu: 40 losowych pytań, timer 60:00, zaliczenie przy ≥ 20/40 (50%). Tryb „1 pytanie” bez limitu czasu.
- Ponieważ prawdziwa baza CKE dla INF.03 jest niejawna, każda baza w aplikacji to przybliżenie: pytania ze starych arkuszy E.14/EE.09 i przykładowe zadania z informatorów. Warto napisać to użytkownikom wprost.

### Gaps
- Nie otwarto aktualnego (2025/2026) informatora CKE dla INF.03, żeby sprawdzić 150 min bezpośrednio w tekście (fetch zablokowany). Potwierdzenie pochodzi z ZPE.

## 4. Kategorie tematyczne i ich udziały

### Takeaway
Kategorie, które podano w zadaniu (Strony, Bazy, Aplikacje, Podstawy, BHP, Angielski, Kompetencje), pokrywają się z jednostkami efektów kształcenia INF.03 w podstawie programowej. Lista jednostek pochodzi jednak z wiedzy modelu, a nie ze sprawdzonego dokumentu. Nie znaleziono żadnego źródła z procentowymi udziałami kategorii w teście. Serwisy quizowe stosują prostszy, 2–3-kategoriowy podział.

### Cited Findings
- informatyk-egzamin.pl dzieli pytania na „Bazy danych (BD)” oraz „Programowanie, witryny i aplikacje internetowe (PWAI)” — [informatyk-egzamin.pl](https://informatyk-egzamin.pl/inf-03-ee-09-e-14-test-40-pytan/)
- zawodowe.edu.pl stosuje kategorie m.in. „Programowanie webowe”, „Bazy danych” — [zawodowe.edu.pl](https://zawodowe.edu.pl/technik-informatyk/INF.03/)
- egzaminy24.pl: test obejmuje HTML, CSS, JavaScript, PHP, SQL i bazy danych — [egzaminy24.pl](https://egzaminy24.pl/test-inf03/)
- Podstawa programowa technik informatyk / technik programista (źródło do weryfikacji listy jednostek) — [infozawodowe.men.gov.pl – technik informatyk](https://infozawodowe.men.gov.pl/image/professionCoreCurriculum/technik-informatyk_24d8e416b7d1838ec161bd91a891df84.pdf)

### Inferences
- Według wiedzy modelu (NIEZWERYFIKOWANE w tej sesji) jednostki efektów INF.03 w podstawie 2019 to: INF.03.1 BHP, INF.03.2 Podstawy informatyki, INF.03.3 Tworzenie i administrowanie bazami danych, INF.03.4 Tworzenie stron internetowych, INF.03.5 Programowanie aplikacji internetowych, INF.03.6 Język obcy zawodowy, INF.03.7 Kompetencje personalne i społeczne, INF.03.8 Organizacja pracy małych zespołów (ta ostatnia tylko dla części zawodów). Sprawdzić w PDF podstawy programowej powyżej.
- Na podstawie przeglądanych pytań z serwisów: przeważają pytania o strony (HTML/CSS), bazy (SQL) i aplikacje (JS/PHP). BHP, angielski i kompetencje to pojedyncze pytania. Do kategoryzacji ~1000+ pytań praktyczniejsze będzie automatyczne tagowanie słowami kluczowymi (SQL/SELECT → Bazy; HTML/CSS → Strony; JS/PHP → Aplikacje; ergonomia/porażenie → BHP; pytania po angielsku → Angielski).

### Gaps
- Brak źródła z udziałami procentowymi kategorii w teście CKE. Informatory podają tylko przykłady zadań, nie wagi, a wagi nie są publikowane (baza i algorytm losowania są niejawne według MEN).

## 5. Zasady prawne ponownego użycia materiałów CKE

### Takeaway
Arkusze i zadania CKE/OKE są powszechnie traktowane jako „urzędowe materiały” wyłączone spod ochrony prawa autorskiego (art. 4 pkt 2 pr. aut.). W tej sesji nie znaleziono jednak oficjalnego oświadczenia CKE w tej sprawie. Opracowania stron trzecich (wyjaśnienia, obrazki, układ baz w serwisach quizowych) mogą być chronione: jako utwory albo przez prawo sui generis do baz danych. Bezpieczna droga to oparcie się na oryginalnych PDF z CKE/OKE i własnych wyjaśnieniach.

### Cited Findings
- Art. 4: „Nie stanowią przedmiotu prawa autorskiego: 1) akty normatywne lub ich urzędowe projekty; 2) urzędowe dokumenty, materiały, znaki i symbole” — [standardyprawa.pl, art. 4](https://standardyprawa.pl/akt/19/art/3587)
- Pojęcie „materiałów urzędowych” jest szerokie: NSA wskazał, że obejmuje „wszystko to, co nie będąc dokumentem, jest urzędowe”. W komentarzach jako przykład pada m.in. „pytania egzaminacyjne” — [infor.pl – Dokumenty urzędowe a prawa autorskie](https://www.infor.pl/prawo/pomoc-prawna/urzedy/321819,Dokumenty-urzedowe-a-prawa-autorskie.html); [RUJ UJ – wyłączenie materiałów urzędowych](https://ruj.uj.edu.pl/entities/publication/a439856a-6a5b-4dbb-a6cb-4db9401885ed)
- CKE udostępnia zbiory zadań i arkusze bezpłatnie na swoich stronach — [portaloswiatowy.pl – MEN: próbne egzaminy dostępne bezpłatnie](https://www.portaloswiatowy.pl/komunikaty-men-i-cke/men-probne-egzaminy-sa-dostepne-bezplatnie-na-stronach-cke-4767.html)
- CKE reaguje na nieuprawnioną publikację materiałów w trakcie egzaminu: zawiadomienie do prokuratury po wycieku zdjęć arkusza maturalnego. Dotyczy to tajności przed egzaminem, nie prawa autorskiego — [PAP](https://www.pap.pl/aktualnosci/cke-analizuje-sprawe-publikacji-zdjec-arkusza-maturalnego-z-matematyki)
- Na gov.pl utwory, do których prawa mają osoby trzecie, wymagają zgody uprawnionych — [MEN – Prawa autorskie](https://efs-archiwum.men.gov.pl/wp-content/uploads/2020/02/Prawa-autorskie-1.pdf)

### Inferences
- Pytania z oficjalnie opublikowanych arkuszy (E.14, EE.09 i przykładowe INF.03 z informatorów) najpewniej można wykorzystać, podając źródło (np. „CKE, EE.09, styczeń 2020”). Ostrożnie z elementami w arkuszach, które mogą pochodzić od osób trzecich: zrzuty ekranu, logotypy, zdjęcia.
- Kopiowanie baz z egzamin-informatyk.pl, praktycznyegzamin.pl i podobnych (scraping) niesie ryzyko naruszenia prawa do baz danych (ustawa o ochronie baz danych) i regulaminów, nawet jeśli same pytania są urzędowe. Nie zalecane bez pisemnej zgody.
- Nie jest to porada prawna. Przy użyciu komercyjnym warto poprosić CKE o potwierdzenie.

### Gaps
- Nie znaleziono strony „warunki korzystania” na cke.gov.pl ani oficjalnego stanowiska CKE o ponownym użyciu arkuszy zawodowych.
- Nie zweryfikowano regulaminów serwisów quizowych.
