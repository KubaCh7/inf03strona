# Pracownia 03

Darmowa platforma do nauki na egzamin zawodowy **INF.03**, bez płatności i bez kont.

- **152 arkusze praktyczne** (80 × INF.03, 40 × EE.09, 32 × E.14, sesje 2018–2026) z filtrami, trudnością 2–10, PDF w stronie, zasadami oceniania, archiwami i linkiem do rozwiązań
- **Teoria**: losowanie pojedynczych pytań z filtrem działów, pełny test 40 pytań / 60 min / próg 50%, wyszukiwarka
- **Ścieżka**: 27 lekcji w 7 poziomach (HTML → CSS → SQL → JS → PHP → pełny arkusz) z zadaniami sprawdzanymi od razu
- **Fiszki** z algorytmem FSRS (ts-fsrs)
- **Warsztat**: edytor CodeMirror, podgląd na żywo, konsola, SQLite (sql.js) z przepisywaniem składni MySQL
- **Sprawdzarka** (wynik treningowy) i **Próba generalna** (teoria 60 min + losowy arkusz 150 min, timery odporne na odświeżenie)
- **Sprint**, 3 **minigry**, XP, poziomy, seria dni, synchronizacja przez Supabase bez konta

## Uruchomienie

```bash
npm install
npm run dev
```

`npm run build` najpierw uruchamia `scripts/build-data.mjs`, który z `data/raw/chr1skyy-data.json` buduje `src/data/sheets.json` (wymusza dokładnie 152 arkusze), a z `data/questions.mjs` i `data/flashcards.mjs` buduje pytania, fiszki i `supabase/seed.sql`.

## Supabase

Schemat: `supabase/migrations/0001_init.sql`. Tabele `sheets`, `questions`, `flashcards` są tylko do odczytu (RLS). Postęp trafia do tabeli `progress` wyłącznie przez funkcje `save_progress` / `load_progress`, kluczem jest losowy UUID z przeglądarki. Aplikacja wczytuje treści z Supabase, a gdy ta nie odpowiada, używa kopii z paczki.

URL i klucz publishable są w `src/config.ts` (można nadpisać przez `VITE_SUPABASE_URL` i `VITE_SUPABASE_KEY`).

## Źródła i licencje

- Zadania: CKE (materiały urzędowe). Indeks, archiwa i rozwiązania: [Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03](https://github.com/Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03). Pliki są pobierane bezpośrednio stamtąd, a do rozwiązań tylko linkujemy, bo repo nie ma licencji.
- Pytania i fiszki są napisane od zera. Prawdziwa baza pytań CKE jest niejawna.

## Ograniczenia

- SQL działa w SQLite. `CREATE USER` i `GRANT` są sprawdzane tylko tekstowo.
- PHP nie wykonuje się w przeglądarce, więc kod PHP sprawdzamy statycznie.
- Sprawdzarka daje wynik orientacyjny na podstawie tagów zadania i samooceny, a nie ocenę CKE.

## Kwerendy z arkuszy

`scripts/extract_queries.py <klon repo Chr1skyy> <katalog>` wyciąga z PDF-ów CKE treść zapytań („Zapytanie 1: …”) i z archiwów zadań zrzuty baz `.sql`. Wynik: `src/data/queries.json` (zadania i trudność, bez rozwiązań) i `public/dumps/*.sql`. Rozwiązania nie są kopiowane: aplikacja pobiera je w przeglądarce z GitHuba tylko do porównania wyników. 18 starszych arkuszy E.14 ma PDF bez warstwy tekstowej i nie ma ich w zakładce Kwerendy.
