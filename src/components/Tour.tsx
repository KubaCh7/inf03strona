import { useEffect, useLayoutEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { Logo } from './ui';

type Step = { target?: string; title: string; text: string; mobileHint?: string };

const STEPS: Step[] = [
  { title: 'Cześć! To jest Pracownia 03', text: 'Darmowe miejsce do nauki na INF.03: teoria, 152 arkusze, fiszki, warsztat z podglądem i próbny egzamin. Pokażę Ci w minutę, co gdzie jest.' },
  { target: '/', title: 'Dziś', text: 'Twój plan dnia: fiszki do powtórki, pytanie dnia (+5 XP), następna lekcja i sugerowany arkusz. Zaczynaj stąd codziennie.' },
  { target: '/sciezka', title: 'Ścieżka', text: 'Kurs krok po kroku: od pustego HTML przez CSS, SQL i JS do PHP. Każda lekcja ma małe zadanie, które sprawdzamy od razu.' },
  { target: '/nauka', title: 'Nauka', text: 'Wybierasz temat (HTML, CSS, JavaScript, PHP, SQL) i robisz zadania od najłatwiejszych do najtrudniejszych. Każde sprawdzamy od razu.', mobileHint: 'Na telefonie: w menu „Więcej”.' },
  { target: '/kwerendy', title: 'Kwerendy', text: 'Ponad 500 prawdziwych zapytań SQL z arkuszy CKE, na bazach z plików do zadań. Piszesz kwerendę, a my porównujemy wynik z rozwiązaniem.', mobileHint: 'Na telefonie: w menu „Więcej”.' },
  { target: '/teoria', title: 'Teoria', text: 'Pytania jak w części pisemnej. „Losuj 1 pytanie”, kiedy masz chwilę, albo pełny test 40 pytań na 60 minut.' },
  { target: '/arkusze', title: 'Arkusze', text: 'Wszystkie 152 zadania praktyczne CKE. Filtrujesz po roku, języku, trudności i tematach. W każdym masz PDF, pliki, hasło i rozwiązanie.' },
  { target: '/fiszki', title: 'Fiszki', text: 'Karty do zapamiętania znaczników, właściwości CSS, funkcji PHP i kwerend. Aplikacja sama pilnuje, kiedy coś powtórzyć.', mobileHint: 'Na telefonie: w menu „Więcej”.' },
  { target: '/warsztat', title: 'Warsztat', text: 'Edytor jak VS Code (Emmet: wpisz ! i Tab) z podglądem na żywo i bazą SQL w przeglądarce. Przy arkuszu PDF jest obok kodu.', mobileHint: 'Na telefonie: w menu „Więcej”.' },
  { target: '/proba', title: 'Próba egzaminu', text: 'Zielona zakładka: symulacja egzaminu na czas: teoria 60 minut i losowy arkusz na 150 minut. Zegar leci nawet po odświeżeniu.', mobileHint: 'Na telefonie: w menu „Więcej”.' },
  { target: '/sprint', title: 'Sprint i minigry', text: 'Szybkie 5 minut pytań do pierwszych 3 błędów oraz gry na selektory CSS i kwerendy z klocków.', mobileHint: 'Na telefonie: w menu „Więcej”.' },
  { target: 'level', title: 'XP, poziomy i seria', text: 'Za wszystko dostajesz XP. 10 XP dziennie podtrzymuje serię dni. W „Postęp” widzisz swoje wyniki.' },
  { title: 'Gotowe!', text: 'Najlepiej zacząć od pierwszej lekcji ścieżki albo od losowego pytania. Samouczek włączysz ponownie w Ustawieniach.' },
];

function findTarget(t?: string): HTMLElement | null {
  if (!t) return null;
  const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${t}"]`));
  const visible = els.find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  if (visible) return visible;
  const more = document.querySelector<HTMLElement>('[data-tour="more"]');
  return more && more.getBoundingClientRect().width > 0 ? more : null;
}

export default function Tour({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = STEPS[i];

  useLayoutEffect(() => {
    const upd = () => setRect(findTarget(step.target)?.getBoundingClientRect() ?? null);
    upd();
    window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, [step]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setI((x) => Math.min(STEPS.length - 1, x + 1));
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const vw = window.innerWidth, vh = window.innerHeight;
  const W = Math.min(340, vw - 32);
  let style: React.CSSProperties = { left: (vw - W) / 2, top: Math.max(16, vh / 2 - 150) };
  if (rect) {
    if (rect.right + W + 24 < vw) style = { left: rect.right + 16, top: Math.min(Math.max(16, rect.top - 20), vh - 260) };
    else if (rect.top > vh / 2) style = { left: Math.min(Math.max(16, rect.left + rect.width / 2 - W / 2), vw - W - 16), bottom: vh - rect.top + 14 };
    else style = { left: Math.min(Math.max(16, rect.left), vw - W - 16), top: rect.bottom + 14 };
  }
  const isMoreFallback = rect && step.target && findTarget(step.target)?.dataset.tour === 'more';
  const last = i === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {rect ? <div className="tour-spot" style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8 }} /> : <div className="absolute inset-0 bg-black/60" />}
      <div className="pop absolute z-[80] rounded-2xl border border-line bg-surface p-5 shadow-2xl" style={{ ...style, width: W }}>
        <div className="flex items-start justify-between gap-3">
          {i === 0 ? <Logo /> : <p className="eyebrow">Krok {i} z {STEPS.length - 1}</p>}
          <button className="rounded p-1 text-muted hover:bg-surface-2" onClick={onClose} aria-label="Zamknij samouczek"><X size={16} /></button>
        </div>
        <h2 id="tour-title" className="mt-3 text-xl font-bold">{step.title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">{step.text}</p>
        {isMoreFallback && step.mobileHint && <p className="mt-2 text-xs font-bold text-accent">{step.mobileHint}</p>}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex flex-1 gap-1">{STEPS.map((_, k) => <span key={k} className={`h-1.5 flex-1 rounded-full ${k <= i ? 'bg-accent' : 'bg-line'}`} />)}</div>
        </div>
        {last ? (
          <div className="mt-4 grid gap-2">
            <button className="btn btn-primary w-full" onClick={() => { onClose(); nav('/sciezka'); }}>Do pierwszej lekcji <ArrowRight size={15} /></button>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn btn-ghost px-3 py-1.5 text-sm" onClick={() => setI(i - 1)}><ArrowLeft size={15} />Wstecz</button>
              <button className="btn btn-ghost px-3 py-1.5 text-sm" onClick={onClose}>Zamknij</button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between gap-2">
            {i === 0 ? <button className="text-sm text-muted underline" onClick={onClose}>Pomiń</button> : <button className="btn btn-ghost px-3 py-1.5 text-sm" onClick={() => setI(i - 1)}><ArrowLeft size={15} />Wstecz</button>}
            <button className="btn btn-primary px-3 py-1.5 text-sm" onClick={() => setI(i + 1)}>{i === 0 ? 'Pokaż' : 'Dalej'}<ArrowRight size={15} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

export function useTour() {
  const done = useStore((s) => s.settings.tourDone);
  const setSettings = useStore((s) => s.setSettings);
  return { open: !done, close: () => setSettings({ tourDone: true }), reopen: () => setSettings({ tourDone: false }) };
}
