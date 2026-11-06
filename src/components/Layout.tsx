import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import {
  BookOpen, CalendarCheck, Coins, ShoppingBag, Database, GraduationCap, ChartLine, Code2, FileText, Flame, Gamepad2, Layers, Map, MoreHorizontal, Settings, ShieldCheck, Timer, Zap, X, Info,
} from 'lucide-react';
import { levelInfo, liveStreak, useStore, weekMinutes } from '../lib/store';
import { isDue } from '../lib/fsrs';
import { useContent } from '../lib/data';
import { LESSONS } from '../data/lessons';
import { Logo, Progress } from './ui';
import Tour, { useTour } from './Tour';
import ErrorBoundary from './ErrorBoundary';
import ReturnToExam from './ReturnToExam';
import Avatar from './Avatar';
import { applyAppStyle } from '../lib/themes';
import { celebrate } from '../lib/effects';

const NAV = [
  { group: 'Nauka', items: [
    { to: '/', label: 'Dziś', icon: CalendarCheck, end: true },
    { to: '/sciezka', label: 'Ścieżka', icon: Map },
    { to: '/nauka', label: 'Nauka', icon: GraduationCap },
    { to: '/kwerendy', label: 'Kwerendy', icon: Database },
    { to: '/arkusze', label: 'Arkusze', icon: FileText },
    { to: '/teoria', label: 'Teoria', icon: BookOpen },
    { to: '/fiszki', label: 'Fiszki', icon: Layers },
    { to: '/sprint', label: 'Sprint', icon: Zap },
    { to: '/minigry', label: 'Minigry', icon: Gamepad2 },
  ] },
  { group: 'Egzamin', items: [
    { to: '/proba', label: 'Próba egzaminu', icon: Timer, gold: true },
    { to: '/warsztat', label: 'Warsztat', icon: Code2 },
    { to: '/sprawdzarka', label: 'Sprawdzarka', icon: ShieldCheck },
  ] },
  { group: 'Ty', items: [
    { to: '/sklep', label: 'Sklep', icon: ShoppingBag },
    { to: '/postep', label: 'Postęp', icon: ChartLine },
    { to: '/ustawienia', label: 'Ustawienia', icon: Settings },
    { to: '/o-projekcie', label: 'O projekcie', icon: Info },
  ] },
];

const MOBILE = [
  { to: '/', label: 'Dziś', icon: CalendarCheck, end: true },
  { to: '/sciezka', label: 'Ścieżka', icon: Map },
  { to: '/teoria', label: 'Teoria', icon: BookOpen },
  { to: '/arkusze', label: 'Arkusze', icon: FileText },
];

function useTheme() {
  const theme = useStore((s) => s.settings.theme);
  const appStyle = useStore((s) => s.equipped.appStyle);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
      applyAppStyle(useStore.getState().equipped.appStyle, dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#161513' : '#FAF7F2');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme, appStyle]);
}

/** Liczy minuty nauki: tylko gdy karta jest widoczna i byl input w ostatnich 60 s. */
function useStudyClock() {
  const addMinute = useStore((s) => s.addMinute);
  const last = useRef(Date.now());
  useEffect(() => {
    const bump = () => { last.current = Date.now(); };
    const evs = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    let secs = 0;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - last.current < 60_000) {
        secs += 5;
        if (secs >= 60) { secs = 0; addMinute(); }
      }
    }, 5000);
    return () => { clearInterval(t); evs.forEach((e) => window.removeEventListener(e, bump)); };
  }, [addMinute]);
}

function SideItem({ to, label, icon: Icon, end, gold }: { to: string; label: string; icon: typeof Map; end?: boolean; gold?: boolean }) {
  return (
    <NavLink to={to} end={end} data-tour={to}
      className={({ isActive }) => `group flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] transition-colors ${gold ? `nav-gold gold-shine ${isActive ? 'ring-2 ring-[var(--gold-3)] ring-offset-1 ring-offset-surface' : ''}` : isActive ? 'bg-ink text-bg font-bold' : 'text-ink hover:bg-surface-2'}`}>
      <Icon size={18} strokeWidth={2} className="shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export function RightPanel() {
  const content = useContent();
  const { xp, streak, activity, cards, lessons, settings } = useStore();
  const lv = levelInfo(xp);
  const due = useMemo(() => Object.values(cards).filter((c) => isDue(c)).length, [cards]);
  const newLeft = content ? content.flashcards.filter((f) => !cards[f.id]).length : 0;
  const done = Object.keys(lessons).length;
  const wm = weekMinutes(activity);
  const st = liveStreak(streak);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' }).format(d); });
  const dn = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <p className="eyebrow">Powtórka na dziś</p>
          <Layers size={16} className="text-muted" />
        </div>
        <p className="display mt-1 text-3xl font-bold tabular">{due}<span className="ml-1 text-base font-normal text-muted">fiszek czeka</span></p>
        <p className="text-xs text-muted">+ {Math.min(newLeft, settings.newCardsPerDay)} nowych dostępnych</p>
        <NavLink to="/fiszki" className="btn btn-primary mt-3 w-full">Powtórz teraz</NavLink>
      </div>
      <div className="card p-4">
        <p className="eyebrow">Poziom {lv.level}</p>
        <p className="display text-xl font-bold">{lv.name}</p>
        <Progress value={lv.pct} className="mt-2" />
        <p className="mono mt-1 text-xs text-muted tabular">{lv.into} / {lv.need} XP</p>
      </div>
      <div className="card p-4">
        <div className="flex items-center gap-2">
          <Flame size={18} className={st ? 'text-accent' : 'text-muted'} />
          <p className="display text-xl font-bold tabular">{st}</p>
          <p className="text-sm text-muted">{st === 1 ? 'dzień serii' : 'dni serii'}</p>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center">
          {days.map((d) => {
            const x = activity[d]?.xp ?? 0;
            const wd = (new Date(d + 'T12:00:00Z').getUTCDay() + 6) % 7;
            return (
              <div key={d} className="flex flex-col items-center gap-1">
                <span className={`h-6 w-6 rounded-md ${x >= 10 ? 'bg-accent' : x > 0 ? 'bg-accent-soft' : 'bg-surface-2'}`} title={`${d}: ${x} XP`} />
                <span className="text-[10px] text-muted">{dn[wd]}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-3">
          <p className="display text-xl font-bold tabular">{wm}<span className="text-sm font-normal text-muted"> min</span></p>
          <p className="text-xs text-muted">w tym tygodniu</p>
          <Progress value={wm / (settings.dailyGoalMin * 7)} className="mt-2 h-1.5" />
        </div>
        <div className="card p-3">
          <p className="display text-xl font-bold tabular">{done}<span className="text-sm font-normal text-muted">/{LESSONS.length}</span></p>
          <p className="text-xs text-muted">lekcji ścieżki</p>
          <Progress value={done / LESSONS.length} className="mt-2 h-1.5" />
        </div>
      </div>
    </div>
  );
}

function useRewardEffect() {
  useEffect(() => {
    const h = () => celebrate(useStore.getState().equipped.effect);
    window.addEventListener('p03:correct', h);
    return () => window.removeEventListener('p03:correct', h);
  }, []);
}

export default function Layout() {
  useTheme();
  useRewardEffect();
  useStudyClock();
  const loc = useLocation();
  const [more, setMore] = useState(false);
  const xp = useStore((s) => s.xp);
  const coins = useStore((s) => s.coins);
  const eq = useStore((s) => s.equipped);
  const lv = levelInfo(xp);
  useEffect(() => { setMore(false); window.scrollTo(0, 0); }, [loc.pathname]);
  const wide = /^\/(warsztat|proba|sprawdzarka|arkusze\/|kwerendy\/|nauka\/[a-z]+\/)/.test(loc.pathname);
  const tour = useTour();

  return (
    <div className="min-h-dvh">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface/85 px-3 py-5 backdrop-blur md:flex">
        <NavLink to="/" className="mb-6 px-2"><Logo /></NavLink>
        <nav className="flex-1 space-y-5 overflow-y-auto">
          {NAV.map((g) => (
            <div key={g.group}>
              <p className="eyebrow mb-1.5 px-3">{g.group}</p>
              <div className="space-y-0.5">{g.items.map((i) => <SideItem key={i.to} {...i} />)}</div>
            </div>
          ))}
        </nav>
        <NavLink to="/sklep" data-tour="level" className="mt-4 rounded-xl border border-line bg-surface p-3 hover:bg-surface-2">
          <div className="flex items-center gap-3">
            <Avatar look={eq.look} size={40} ring={eq.frame !== 'none' ? eq.frame : undefined} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{eq.nick || lv.name}</p>
              <p className="truncate text-[11px] text-muted">{eq.title || `Poziom ${lv.level} · ${lv.name}`}</p>
              <Progress value={lv.pct} className="mt-1 h-1.5" />
            </div>
          </div>
          <p className="mono mt-1 flex items-center justify-between text-[11px] text-muted"><span className="inline-flex items-center gap-1 font-bold text-[#B45309] dark:text-[#FACC15]"><Coins size={12} />{coins}</span><span>Lv {lv.level} · {xp} XP</span></p>
        </NavLink>
      </aside>

      {/* Top bar mobile */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/85 px-4 py-3 backdrop-blur md:hidden">
        <NavLink to="/"><Logo /></NavLink>
        <NavLink to="/sklep" data-tour="level" className="mono flex items-center gap-2 rounded-full border border-line bg-surface py-0.5 pl-0.5 pr-3 text-xs"><Avatar look={eq.look} size={26} /><span className="inline-flex items-center gap-1 font-bold text-[#B45309] dark:text-[#FACC15]"><Coins size={12} />{coins}</span><span>Lv {lv.level}</span></NavLink>
      </header>

      <div className="md:pl-60">
        <div className={`mx-auto flex gap-8 px-4 pt-5 md:px-8 md:pt-8 ${wide ? 'max-w-[1600px]' : 'max-w-7xl'}`}>
          <main className="pb-safe min-w-0 flex-1"><ErrorBoundary resetKey={loc.pathname}><Outlet /></ErrorBoundary></main>
          {!wide && <aside className="hidden w-72 shrink-0 xl:block"><div className="sticky top-8"><RightPanel /></div></aside>}
        </div>
      </div>

      {/* Bottom bar mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="grid grid-cols-5">
          {MOBILE.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} data-tour={to} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${isActive ? 'text-accent font-bold' : 'text-muted'}`}>
              <Icon size={21} />{label}
            </NavLink>
          ))}
          <button data-tour="more" onClick={() => setMore(true)} className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] text-muted"><MoreHorizontal size={21} />Więcej</button>
        </div>
      </nav>

      <ReturnToExam />
      {tour.open && !more && <Tour onClose={tour.close} />}
      {more && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-black/40" aria-label="Zamknij" onClick={() => setMore(false)} />
          <div className="pop absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface p-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
            <div className="mb-3 flex items-center justify-between"><p className="display text-lg font-bold">Więcej</p><button onClick={() => setMore(false)} className="btn btn-ghost px-2 py-1" aria-label="Zamknij"><X size={18} /></button></div>
            {NAV.map((g) => (
              <div key={g.group} className="mb-3">
                <p className="eyebrow mb-1 px-1">{g.group}</p>
                <div className="grid grid-cols-2 gap-1.5">{g.items.map((i) => <SideItem key={i.to} {...i} />)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
