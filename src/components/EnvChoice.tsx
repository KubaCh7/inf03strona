import { useEffect } from 'react';
import { Monitor, Code2, Server, FolderArchive, Camera, CheckCircle2 } from 'lucide-react';

/** Obowiazkowy wybor przed arkuszem: pulpit jak na egzaminie albo warsztat. Bez zamykania, Esc i klikniecia obok. */
export default function EnvChoice({ title, onDesktop, onWorkshop }: { title: string; onDesktop: () => void; onWorkshop: () => void }) {
  useEffect(() => {
    const block = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); } };
    window.addEventListener('keydown', block, true);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', block, true); document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="fixed inset-0 z-[200] grid place-items-center overflow-auto bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="env-title">
      <div className="card pop w-full max-w-3xl p-6 md:p-8">
        <p className="eyebrow">Zanim zaczniesz · {title}</p>
        <h2 id="env-title" className="display mt-1 text-3xl font-extrabold">Jak chcesz rozwiązać ten arkusz?</h2>
        <p className="mt-2 text-muted">Możesz to zrobić tak jak na prawdziwym egzaminie, na symulowanym komputerze, albo w wygodnym warsztacie do nauki. Wybierz jedną opcję, żeby przejść dalej.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <button onClick={onDesktop} className="group rounded-2xl border-2 border-accent bg-accent-soft/40 p-5 text-left transition hover:bg-accent-soft">
            <span className="flex items-center gap-2 text-lg font-bold"><Monitor size={22} className="text-accent" />Symulacja egzaminu</span>
            <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">jak na stanowisku CKE</span>
            <ul className="mt-3 space-y-1.5 text-sm">
              <li className="flex gap-2"><FolderArchive size={16} className="mt-0.5 shrink-0 text-accent" />Pulpit Windows: archiwum z hasłem, folder z numerem zdającego</li>
              <li className="flex gap-2"><Server size={16} className="mt-0.5 shrink-0 text-accent" />XAMPP (Apache + MySQL), phpMyAdmin, pliki w htdocs, localhost</li>
              <li className="flex gap-2"><Camera size={16} className="mt-0.5 shrink-0 text-accent" />Zrzuty sam: PrtSc → Paint → Zapisz jako</li>
              <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-accent" />Notepad++ / VS Code, GIMP / Photoshop, ocena folderu jak u egzaminatora</li>
            </ul>
            <span className="btn btn-primary mt-5 w-full">Symulacja egzaminu</span>
          </button>
          <button onClick={onWorkshop} className="group rounded-2xl border-2 border-line p-5 text-left transition hover:border-ink/40">
            <span className="flex items-center gap-2 text-lg font-bold"><Code2 size={22} />Warsztat do nauki</span>
            <span className="mt-1 inline-block rounded-full bg-surface-2 px-2 py-0.5 text-xs font-bold">szybciej, z pomocami</span>
            <ul className="mt-3 space-y-1.5 text-sm text-muted">
              <li>• Edytor z podpowiedziami (Emmet, SQL, CSS) i podglądem na żywo</li>
              <li>• Baza arkusza wczytana od razu, PHP działa bez XAMPP</li>
              <li>• Zrzuty kwerend robią się same</li>
              <li>• Arkusz PDF obok kodu</li>
            </ul>
            <span className="btn btn-ghost mt-5 w-full">Warsztat</span>
          </button>
        </div>
        <p className="mt-4 text-xs text-muted">Wybór możesz zmienić później: przy arkuszu są przyciski „Warsztat” i „Ćwicz na pulpicie jak na egzaminie”.</p>
      </div>
    </div>
  );
}
