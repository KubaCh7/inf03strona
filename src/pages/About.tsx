import { PageHeader } from '../components/ui';
import { useContent } from '../lib/data';

export default function About() {
  const c = useContent();
  return (
    <div className="prose-p max-w-3xl">
      <PageHeader eyebrow="Źródła, licencje, uczciwie" title="O projekcie" />
      <div className="card p-6">
        <p><b>Pracownia 03</b> to darmowa platforma do nauki na egzamin zawodowy INF.03. Bez płatności, bez kont, bez reklam. Postęp jest w Twojej przeglądarce. Synchronizacja przez Supabase działa na losowym kodzie, bez danych osobowych.</p>
        <p>Dane wczytane z: <b>{c?.source === 'supabase' ? 'bazy Supabase' : c ? 'kopii offline w aplikacji' : '…'}</b>.</p>
        <h2 className="mt-6 text-xl font-bold">Arkusze praktyczne</h2>
        <p>Katalog obejmuje {c?.sheets.length ?? 152} opublikowanych zadań: 80 × INF.03, 40 × EE.09, 32 × E.14 (sesje 2018–2026). Treść zadań pochodzi od CKE (materiały urzędowe). Indeks, archiwa i przykładowe rozwiązania pochodzą z repozytorium <a className="underline" href="https://github.com/Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03" target="_blank" rel="noreferrer">Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03</a>. Nie kopiujemy ich: PDF-y i pliki są pobierane bezpośrednio stamtąd, a do rozwiązań tylko linkujemy.</p>
        <p>152 kody to 142 różne zadania, bo CKE czasem powtarza zadanie pod nowym kodem. Przy takich arkuszach widać „To samo zadanie co…”. Starsze E.14 (2014–2017) nie są w katalogu.</p>
        <h2 className="mt-6 text-xl font-bold">Pytania teoretyczne</h2>
        <p>Pełna baza pytań CKE jest niejawna (MEN jej nie publikuje). W aplikacji jest {c?.questions.filter((q) => q.source === 'cke').length ?? '…'} prawdziwych pytań z opublikowanych arkuszy pisemnych CKE (E.14 2014–2025, EE.09 2019–2026, z kluczami odpowiedzi; pytania z rysunkami i kodem pokazane jako wycinek arkusza) oraz {c?.questions.filter((q) => q.source !== 'cke').length ?? '…'} pytań napisanych od zera, z wyjaśnieniami.</p>
        <h2 className="mt-6 text-xl font-bold">Sprawdzarka i trudność</h2>
        <p>Sprawdzarka daje wynik treningowy: szuka w Twoim kodzie elementów, których wymaga dane zadanie, plus samoocena. Ocenę egzaminacyjną daje egzaminator według zasad oceniania CKE. Trudność 2–10 jest względna: liczona z tagów zadania (SQL, skrypty, CSS, grafika, liczba wymagań) i porównana z resztą puli.</p>
        <h2 className="mt-6 text-xl font-bold">Ograniczenia</h2>
        <p>SQL działa w SQLite w przeglądarce. Typowe konstrukcje MySQL są przepisywane automatycznie, ale CREATE USER/GRANT tylko sprawdzamy tekstowo. PHP nie wykonuje się w przeglądarce. Kod PHP sprawdzamy statycznie, a uruchamiasz go w XAMPP.</p>
        <h2 className="mt-6 text-xl font-bold">Biblioteki</h2>
        <p className="text-sm">React, React Router, Zustand, Tailwind CSS, CodeMirror, sql.js (MIT), ts-fsrs (MIT), Supabase JS, lucide-react. Fonty: Bricolage Grotesque, Atkinson Hyperlegible, JetBrains Mono (OFL).</p>
      </div>
    </div>
  );
}
