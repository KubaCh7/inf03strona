import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useOS, type Win } from '../os';
import { useDocs } from './useDoc';

/** Notatnik Windows 11 (karty, Plik/Edycja/Wyswietl, pasek stanu). */
export default function Notepad({ win }: { win: Win }) {
  const os = useOS();
  const D = useDocs(win.args.path ? String(win.args.path) : null);
  const [menu, setMenu] = useState<string | null>(null);
  const [pos, setPos] = useState({ l: 1, c: 1 });
  const [wrap, setWrap] = useState(true);
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { os.setTitle(win.id, `${D.d.name}${D.d.text !== D.d.saved ? ' *' : ''} - Notatnik`); }, [D.d]); // eslint-disable-line react-hooks/exhaustive-deps
  const caret = () => { const t = ta.current; if (!t) return; const before = t.value.slice(0, t.selectionStart); const ls = before.split('\n'); setPos({ l: ls.length, c: ls[ls.length - 1].length + 1 }); };
  const keys = (e: React.KeyboardEvent) => {
    const c = e.ctrlKey || e.metaKey; const k = e.key.toLowerCase();
    if (c && k === 's') { e.preventDefault(); void (e.shiftKey ? D.saveAs() : D.save()); }
    else if (c && k === 'o') { e.preventDefault(); void D.open(); }
    else if (c && k === 'n') { e.preventDefault(); D.newDoc(); }
    else if (c && k === 'w') { e.preventDefault(); void D.closeDoc(D.cur); }
  };
  const M: Record<string, [string, string, () => void][]> = {
    Plik: [['Nowa karta', 'Ctrl+N', D.newDoc], ['Otwórz', 'Ctrl+O', () => void D.open()], ['Zapisz', 'Ctrl+S', () => void D.save()], ['Zapisz jako', 'Ctrl+Shift+S', () => void D.saveAs()], ['Zamknij kartę', 'Ctrl+W', () => void D.closeDoc(D.cur)], ['Zamknij okno', '', () => os.close(win.id)]],
    Edycja: [['Cofnij', 'Ctrl+Z', () => document.execCommand('undo')], ['Zaznacz wszystko', 'Ctrl+A', () => ta.current?.select()], ['Godzina/data', 'F5', () => D.update({ text: D.d.text + new Date().toLocaleString('pl-PL') })]],
    Wyświetl: [['Zawijanie wierszy', wrap ? '✓' : '', () => setWrap((w) => !w)]],
  };
  return (
    <div className="flex h-full flex-col bg-white text-[13px] text-[#1a1a1a]" onKeyDown={keys}>
      <div className="flex items-end gap-1 bg-[#f3f3f3] px-2 pt-1">
        {D.docs.map((d, i) => <div key={d.id} onClick={() => D.setCur(i)} className={`group flex h-8 min-w-[160px] max-w-[220px] items-center gap-2 rounded-t-[6px] px-3 ${i === D.cur ? 'bg-white' : 'hover:bg-white/60'}`}>
          <span className="flex-1 truncate">{d.name}</span>{d.text !== d.saved && <span className="text-[16px] leading-none">•</span>}<button onClick={(e) => { e.stopPropagation(); void D.closeDoc(i); }} className="rounded p-0.5 opacity-60 hover:bg-black/10"><X size={12} /></button></div>)}
        <button onClick={D.newDoc} className="mb-1 rounded p-1 hover:bg-black/[.06]"><Plus size={15} /></button>
      </div>
      <div className="relative flex gap-1 border-b border-black/[.06] px-2 py-0.5">
        {Object.keys(M).map((m) => <div key={m} className="relative"><button onClick={() => setMenu(menu === m ? null : m)} className={`rounded px-2.5 py-1 hover:bg-black/[.05] ${menu === m ? 'bg-black/[.05]' : ''}`}>{m}</button>
          {menu === m && <div className="absolute left-0 top-full z-20 w-60 rounded-[8px] border border-black/10 bg-[#f9f9f9] p-1 shadow-xl" onMouseLeave={() => setMenu(null)}>{M[m].map(([l, k, f]) => <button key={l} onClick={() => { setMenu(null); f(); }} className="flex w-full justify-between rounded px-3 py-1.5 hover:bg-black/[.05]"><span>{l}</span><span className="text-[11px] text-[#666]">{k}</span></button>)}</div>}</div>)}
      </div>
      <textarea ref={ta} value={D.d.text} spellCheck={false} onChange={(e) => D.update({ text: e.target.value })} onKeyUp={caret} onClick={caret}
        className={`min-h-0 flex-1 resize-none p-2 font-['Consolas',monospace] text-[14px] outline-none ${wrap ? '' : 'whitespace-pre'}`} wrap={wrap ? 'soft' : 'off'} />
      <div className="flex h-6 items-center gap-6 border-t border-black/[.06] bg-[#f3f3f3] px-3 text-[12px] text-[#444]"><span>Wiersz {pos.l}, kolumna {pos.c}</span><span className="ml-auto">{D.d.text.length} znaków</span><span>100%</span><span>Windows (CRLF)</span><span>UTF-8</span></div>
    </div>
  );
}
