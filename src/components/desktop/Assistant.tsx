import { Fragment, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, X, Send, Lightbulb, Check, Copy, Eye } from 'lucide-react';
import { useOS } from './os';
import { answer, addHint, hintCount, type Answer } from '../../lib/assistant';
import { buildSteps, fetchSolution, type Step } from '../../lib/walkthrough';
import { loadReqs, type Reqs } from '../../lib/examiner';
import { loadQueries } from '../../lib/queries';

type Msg = { who: 'me' | 'bot'; q?: string; a?: Answer; shown?: boolean; revealed?: boolean };
const CHIPS = ['Co dalej?', 'Jak zaimportować bazę?', 'Jak zobaczyć stronę PHP?', 'Jak zrobić zrzut?', 'Kwerenda 1'];

/** **pogrubienie** i `kod` w odpowiedziach */
function Rich({ s }: { s: string }) {
  return <>{s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) => p.startsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : p.startsWith('`') ? <code key={i} className="rounded bg-black/[.06] px-1 font-mono text-[12px]">{p.slice(1, -1)}</code> : <Fragment key={i}>{p}</Fragment>)}</>;
}

/** Asystent egzaminacyjny: panel wysuwany z prawego dolnego rogu. Kazde pytanie i odsloniecie kodu liczy sie jako podpowiedz. */
export default function Assistant({ attempt, onClose }: { attempt: string; onClose: () => void }) {
  const os = useOS();
  const KEY = `p03:asst:${attempt}`;
  const [msgs, setMsgs] = useState<Msg[]>(() => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; } });
  const [min, setMin] = useState(false);
  const [q, setQ] = useState('');
  const [count, setCount] = useState(() => hintCount(attempt));
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [reqs, setReqs] = useState<Reqs | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(msgs.slice(-40))); } catch { /* */ } end.current?.scrollIntoView({ block: 'end' }); }, [msgs, KEY]);
  // rozwiazanie krok po kroku i wymagania arkusza (ladowane raz, w tle)
  useEffect(() => {
    let on = true;
    void (async () => {
      const [sol, all, qs] = await Promise.all([fetchSolution(os.sheet.code).catch(() => null), loadReqs(), loadQueries().catch(() => [])]);
      const r = all[os.sheet.code] ?? null; if (on) setReqs(r);
      const sq = qs.find((x) => x.code === os.sheet.code);
      if (sol && on) setSteps(buildSteps({ sheet: os.sheet, reqs: r, tasks: sq?.tasks ?? [], sol, dbName: r?.dbName ?? sq?.db ?? null }));
    })();
    return () => { on = false; };
  }, [os.sheet]);
  const hint = () => { addHint(attempt); setCount(hintCount(attempt)); };
  const ask = (text: string) => {
    const t = text.trim(); if (!t) return;
    const a = answer(t, { vfs: os.vfs, server: os.server, sheet: os.sheet, reqs, candidate: os.candidate }, steps);
    hint(); setMsgs((m) => [...m, { who: 'me', q: t }, { who: 'bot', a }]); setQ('');
  };
  const patch = (i: number, p: Partial<Msg>) => setMsgs((m) => m.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const next = (i: number) => { if (!steps || i + 1 >= steps.length) return; const s = steps[i + 1]; const code = s.sql ?? s.code; hint(); setMsgs((m) => [...m, { who: 'me', q: 'Następny krok' }, { who: 'bot', a: { step: i + 1, text: [`**${s.stage}: ${s.title}**`, ...s.text], code: code ? { code, lang: s.sql ? 'sql' : s.lang, label: s.sql ? 'Pokaż kwerendę' : `Pokaż kod${s.file ? ` (${s.file})` : ''}` } : undefined } }]); };

  return (
    <div data-noshot="1" onPointerDown={(e) => e.stopPropagation()}
      className={`p03-start absolute bottom-[56px] right-2 z-[160] flex w-[390px] flex-col overflow-hidden rounded-[8px] border border-black/10 bg-[rgba(243,243,243,.92)] text-[13px] text-[#1a1a1a] shadow-[0_16px_48px_rgba(0,0,0,.35)] backdrop-blur-xl ${min ? '' : 'h-[min(580px,calc(100%-70px))]'}`}>
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-black/[.06] pl-3 pr-1">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-[#ffd75e] to-[#f5a623] text-white"><Lightbulb size={16} /></span>
        <span className="flex-1 font-semibold">Asystent egzaminacyjny</span>
        <span title="Liczba podpowiedzi widoczna przy wyniku" className="rounded-full bg-black/[.06] px-2 py-0.5 text-[11px]">podpowiedzi: {count}</span>
        <button onClick={() => setMin((v) => !v)} title={min ? 'Rozwiń' : 'Zwiń'} className="grid h-8 w-8 place-items-center rounded-[4px] hover:bg-black/[.06]">{min ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
        <button onClick={onClose} title="Zamknij (Win+C)" className="grid h-8 w-8 place-items-center rounded-[4px] hover:bg-black/[.06]"><X size={16} /></button>
      </div>
      {!min && <>
        <div className="min-h-0 flex-1 space-y-2.5 overflow-auto px-3 py-3">
          {!msgs.length && <div className="rounded-[8px] bg-white/80 p-3 leading-relaxed">
            <p className="mb-1 font-semibold">Zapytaj, jeśli utkniesz.</p>
            <p className="text-[#555]">Znam ten arkusz i widzę, co już zrobiłeś na pulpicie. Mogę powiedzieć, co dalej, jak coś zrobić w XAMPP, phpMyAdmin, Paint czy GIMP, i podpowiedzieć zadanie (najpierw wskazówka, kod dopiero na życzenie).</p>
            <p className="mt-2 text-[11.5px] text-[#8a6100]">Każde pytanie liczy się jako podpowiedź i widać to przy wyniku.</p>
          </div>}
          {msgs.map((m, i) => m.who === 'me' ? (
            <div key={i} className="ml-10 rounded-[8px] rounded-br-[2px] bg-[#0067c0] px-3 py-2 text-white">{m.q}</div>
          ) : m.a && (
            <div key={i} className="mr-4 space-y-1.5 rounded-[8px] rounded-bl-[2px] bg-white px-3 py-2.5 leading-relaxed shadow-[0_1px_2px_rgba(0,0,0,.06)]">
              {m.a.list && <ul className="mb-1 space-y-0.5">{m.a.list.map((x) => <li key={x.label} className="flex items-start gap-1.5"><span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${x.ok ? 'bg-[#107c10] text-white' : 'border border-[#bbb]'}`}>{x.ok && <Check size={11} strokeWidth={3} />}</span><span className={x.ok ? 'text-[#666]' : ''}>{x.label}</span></li>)}</ul>}
              {m.a.text.map((t, k) => <p key={k}><Rich s={t} /></p>)}
              {m.a.code && (m.shown ? (
                <div className="relative"><pre className="max-h-56 overflow-auto rounded-[6px] bg-[#1f1f1f] p-2.5 font-mono text-[11.5px] leading-snug text-[#d4d4d4]">{m.a.code.code}</pre>
                  <button title="Kopiuj" onClick={() => void navigator.clipboard?.writeText(m.a!.code!.code)} className="absolute right-1.5 top-1.5 rounded bg-white/10 p-1 text-white hover:bg-white/20"><Copy size={12} /></button></div>
              ) : <button onClick={() => { hint(); patch(i, { shown: true }); }} className="flex items-center gap-1.5 rounded-[4px] border border-black/10 bg-[#f6f6f6] px-2.5 py-1 hover:bg-[#eee]"><Eye size={13} />{m.a.code.label}</button>)}
              {m.a.reveal && (m.revealed ? <p>{m.a.reveal.label.replace('Pokaż ', '').replace(/^./, (c) => c.toUpperCase())}: <code className="rounded bg-black/[.06] px-1 font-mono">{m.a.reveal.value}</code></p>
                : <button onClick={() => { hint(); patch(i, { revealed: true }); }} className="flex items-center gap-1.5 rounded-[4px] border border-black/10 bg-[#f6f6f6] px-2.5 py-1 hover:bg-[#eee]"><Eye size={13} />{m.a.reveal.label}</button>)}
              {m.a.step !== undefined && steps && m.a.step + 1 < steps.length && i === msgs.length - 1 && <button onClick={() => next(m.a!.step!)} className="text-[#0067c0] hover:underline">Następny krok →</button>}
              {m.a.chips && <div className="flex flex-wrap gap-1 pt-1">{m.a.chips.map((c) => <button key={c} onClick={() => ask(c)} className="rounded-full border border-black/10 bg-[#f6f6f6] px-2.5 py-0.5 text-[12px] hover:bg-[#eee]">{c}</button>)}</div>}
            </div>
          ))}
          <div ref={end} />
        </div>
        <div className="shrink-0 border-t border-black/[.06] p-2.5">
          <div className="mb-2 flex gap-1 overflow-x-auto [scrollbar-width:none]">{CHIPS.map((c) => <button key={c} onClick={() => ask(c)} className="shrink-0 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[12px] hover:bg-[#f0f0f0]">{c}</button>)}</div>
          <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex items-center gap-1.5 rounded-[6px] border border-black/10 border-b-[#0067c0] bg-white px-2.5">
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.stopPropagation()} placeholder="Zapytaj asystenta…" className="h-9 flex-1 bg-transparent outline-none" />
            <button type="submit" disabled={!q.trim()} className="grid h-7 w-7 place-items-center rounded-[4px] text-[#0067c0] hover:bg-black/[.05] disabled:opacity-30"><Send size={15} /></button>
          </form>
          {!steps && <p className="mt-1 text-[11px] text-[#777]">Wczytuję rozwiązanie arkusza…</p>}
        </div>
      </>}
    </div>
  );
}
