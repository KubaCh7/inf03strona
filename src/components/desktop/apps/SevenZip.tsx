import { useEffect, useRef, useState } from 'react';
import { Plus, Minus, Check, Copy, MoveRight, X, Info, FolderUp, KeyRound, ChevronDown, Lock } from 'lucide-react';
import { useOS, FileIcon, type Win, type OS } from '../os';
import { useDragBox, type CItem } from '../ui';
import { useVfs, base, parent, join, win as winPath, isText, fmtDate } from '../../../lib/vfs';
import { FolderSvg } from '../icons';

/** Menu archiwum jak w Windows 11 z zainstalowanym 7-Zip (Eksplorator i pulpit). */
export function archiveItems(os: OS, p: string): CItem[] {
  const name = base(p).replace(/\.\w+$/, '');
  const z = (extract?: string) => () => os.open('sevenzip', { path: p, extract });
  return [
    { label: 'Wyodrębnij wszystko...', icon: <FolderSvg size={15} />, run: z('win') },
    { label: '7-Zip', icon: <span className="grid h-[15px] w-[15px] place-items-center bg-black text-[7px] font-bold text-white">7z</span>, sub: [
      { label: 'Otwórz archiwum', run: z() }, { label: 'Otwórz archiwum', sub: [{ label: '*', run: z() }, { label: '#', run: z() }, { label: '7z', run: z() }] }, '-',
      { label: 'Wypakuj pliki...', run: z('ask') }, { label: 'Wypakuj tutaj', run: z('here') }, { label: `Wypakuj do "${name}\\"`, run: z('folder') }, { label: 'Testuj archiwum', run: z('test') }, '-',
      { label: 'Dodaj do archiwum...', off: true }, { label: 'Skompresuj i wyślij e-mailem...', off: true }, { label: `Dodaj do "${name}.7z"`, off: true }, { label: `Dodaj do "${name}.zip"`, off: true }, '-',
      { label: 'CRC SHA', sub: [{ label: 'CRC-32', off: true }, { label: 'CRC-64', off: true }, { label: 'SHA-1', off: true }, { label: 'SHA-256', off: true }, { label: '*', off: true }] },
    ] },
  ];
}

type Entry = { name: string; size: number };
type Job = { kind: 'extract' | 'test' | 'open'; file?: string; dest?: string; wizard?: boolean };
async function fetchAs(url: string, text: boolean) {
  const r = await fetch(url); if (!r.ok) throw new Error(`Nie można otworzyć pliku ${base(url)}`);
  if (text) return r.text();
  const b = await r.blob();
  return new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(b); });
}
const num = (n: number) => (n ? n.toLocaleString('pl-PL') : '');
const clock = (ms: number) => { const s = Math.floor(ms / 1000); return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const crc = (s: string) => { let h = 0x811c9dc5; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h.toString(16).toUpperCase().padStart(8, '0'); };

export default function SevenZip({ win }: { win: Win }) {
  const os = useOS(); const vfs = useVfs(os.vfs);
  const arch = String(win.args.path ?? '');
  const mode = win.args.extract as undefined | 'ask' | 'here' | 'folder' | 'win' | 'test';
  const a = os.sheet.assets;
  const pass = os.sheet.files.archivePassword;
  const [entries, setEntries] = useState<Entry[]>(() => [...(a?.files ?? []).filter((f) => !f.startsWith('_')), ...(a?.sql ? [a.sql] : [])].map((n) => ({ name: n, size: 0 })));
  const [dlg, setDlg] = useState<null | 'extract' | 'pass' | 'progress' | 'winwiz' | 'winpass' | 'wincopy'>(null);
  const [dest, setDest] = useState(join(parent(arch), base(arch).replace(/\.\w+$/, '')));
  const [pathMode, setPathMode] = useState('full'); const [overwrite, setOverwrite] = useState('ask');
  const [pw, setPw] = useState(''); const [showPw, setShowPw] = useState(false); const [showAfter, setShowAfter] = useState(true);
  const [prog, setProg] = useState({ pct: 0, file: '', t0: 0, done: 0 });
  const [, tick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const pwRef = useRef<HTMLInputElement>(null);
  const pending = useRef<Job | null>(null);
  const cancel = useRef(false); const pauseRef = useRef(false); pauseRef.current = paused;
  const drag = useDragBox(dlg);
  const total = entries.reduce((s, e) => s + e.size, 0);

  useEffect(() => {
    os.setTitle(win.id, `${winPath(arch)}\\`);
    if (a) void Promise.all(entries.map(async (e) => { const r = await fetch(`${a.dir}/${e.name}`, { method: 'HEAD' }).catch(() => null); return { ...e, size: Number(r?.headers.get('content-length') ?? 0) }; })).then(setEntries);
    if (mode === 'ask') setDlg('extract');
    else if (mode === 'here') { setDest(parent(arch)); askPass({ kind: 'extract', dest: parent(arch) }); }
    else if (mode === 'folder') askPass({ kind: 'extract' });
    else if (mode === 'win') setDlg('winwiz');
    else if (mode === 'test') askPass({ kind: 'test' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (dlg === 'pass' || dlg === 'winpass') { const t = setTimeout(() => pwRef.current?.focus(), 60); return () => clearTimeout(t); } }, [dlg]);
  useEffect(() => { if (dlg !== 'progress') return; const t = setInterval(() => tick((n) => n + 1), 500); return () => clearInterval(t); }, [dlg]);

  function askPass(job: Job) {
    pending.current = job;
    if (!pass || pw === pass) { void run(pw); return; }
    setPw(''); setDlg(job.wizard ? 'winpass' : 'pass');
  }
  const closeIfMode = () => { if (mode) os.close(win.id); };
  const abort = () => { setDlg(null); closeIfMode(); };

  async function run(password: string) {
    const job = pending.current; if (!job || !a) return;
    if (pass && password !== pass) {
      setDlg(null);
      if (job.wizard) await os.alert('Foldery skompresowane', `Hasło jest nieprawidłowe. Spróbuj ponownie.`, 'error');
      else await os.alert('7-Zip', `Błąd danych w zaszyfrowanym pliku '${entries[0]?.name ?? ''}'. Nieprawidłowe hasło?\n\nBłędy: ${entries.length}`, 'error');
      setPw(''); setDlg(job.wizard ? 'winpass' : 'pass'); return;
    }
    if (job.kind === 'test') {
      setDlg(null);
      await os.alert('Testowanie', `Archiwum: ${winPath(arch)}\n\nNie ma błędów\n\nPliki: ${entries.length}\nRozmiar: ${num(total)}\nSpakowany rozmiar: ${num(Math.round(total * 0.97))}`, 'info');
      closeIfMode(); return;
    }
    if (job.kind === 'open' && job.file) {
      setDlg(null);
      const tmp = `C:/Users/Egzamin/AppData/Local/Temp/7zO${String(Date.now()).slice(-8)}`;
      const t = isText(job.file);
      os.openPath(vfs.write(join(tmp, job.file), await fetchAs(`${a.dir}/${job.file}`, t), !t)); return;
    }
    const to = job.dest ?? dest;
    setDlg(job.wizard ? 'wincopy' : 'progress'); cancel.current = false;
    const t0 = Date.now(); setProg({ pct: 0, file: '', t0, done: 0 });
    let all: 'yes' | 'no' | null = overwrite === 'yes' ? 'yes' : overwrite === 'skip' ? 'no' : null;
    try {
      vfs.mkdir(to);
      for (let i = 0; i < entries.length; i++) {
        while (pauseRef.current && !cancel.current) await new Promise((r) => setTimeout(r, 200));
        if (cancel.current) break;
        const f = entries[i].name;
        let target = join(to, pathMode === 'none' ? base(f) : f);
        setProg({ pct: Math.round((i / entries.length) * 100), file: f, t0, done: i });
        if (vfs.exists(target)) {
          if (!job.wizard && overwrite === 'rename') target = vfs.unique(parent(target), base(target));
          else if (!job.wizard && overwrite === 'renameOld') vfs.rename(target, base(vfs.unique(parent(target), base(target))));
          else if (all === 'no') continue;
          else if (all !== 'yes') {
            const ok = await os.confirm(job.wizard ? 'Zastępowanie lub pomijanie plików' : 'Potwierdź zastąpienie pliku', job.wizard
              ? `Miejsce docelowe zawiera już plik o nazwie „${base(f)}”.\n\nZastąpić plik w miejscu docelowym?`
              : `Folder docelowy zawiera już przetwarzany plik:\n${winPath(target)}\n\nCzy chcesz zastąpić istniejący plik?`);
            if (!ok) continue;
          }
        }
        const text = isText(f);
        vfs.write(target, await fetchAs(`${a.dir}/${f}`, text), !text);
        await new Promise((r) => setTimeout(r, 90)); // widoczny postęp jak w prawdziwym programie
      }
      setProg((p) => ({ ...p, pct: 100, done: entries.length }));
      await new Promise((r) => setTimeout(r, 250));
      setDlg(null);
      if (job.wizard && showAfter && !cancel.current) os.open('explorer', { path: to });
      closeIfMode();
    } catch (e) { setDlg(null); void os.alert('7-Zip', (e as Error).message, 'error'); }
  }

  const tbtn = 'flex w-[66px] flex-col items-center gap-0.5 py-1 text-[11.5px] hover:bg-[#e5f3ff] hover:outline hover:outline-1 hover:outline-[#cce8ff]';
  const box = mode ? 'fixed inset-0 z-[240] grid place-items-center [pointer-events:none!important] [&>*]:pointer-events-auto' : 'fixed inset-0 z-[240] grid place-items-center bg-black/5';
  const xpDlg = 'border border-[#888] bg-[#f0f0f0] text-[12px] text-black shadow-[0_8px_30px_rgba(0,0,0,.35)]';
  const winBtn = 'h-[23px] min-w-[75px] border border-[#adadad] bg-[#e1e1e1] px-3 hover:border-[#0078d7] hover:bg-[#e5f1fb]';
  const title = (t: string, onX: () => void) => <div onPointerDown={drag.onTitleDown} className="flex h-[30px] items-center bg-white pl-2.5"><span className="flex-1 truncate">{t}</span><button onClick={onX} className="grid h-full w-[45px] place-items-center hover:bg-[#c42b1c] hover:text-white"><X size={14} /></button></div>;
  const elapsed = prog.t0 ? Date.now() - prog.t0 : 0;
  const doneBytes = entries.slice(0, prog.done).reduce((s, e) => s + e.size, 0);
  const browse = async (t: string) => { const p = await os.pick({ mode: 'open', dirOnly: true, title: t, dir: parent(arch) }); if (p) setDest(p); };

  return (
    <div className={mode ? "contents font-['Segoe_UI',Tahoma,sans-serif] text-[12px] text-black" : "flex h-full flex-col bg-[#f0f0f0] font-['Segoe_UI',Tahoma,sans-serif] text-[12px] text-black"}>
      {!mode && <>
      <div className="flex gap-0.5 border-b border-[#ddd] bg-white px-1">{['Plik', 'Edycja', 'Widok', 'Ulubione', 'Narzędzia', 'Pomoc'].map((m) => <span key={m} className="px-2 py-[3px] hover:bg-[#e5f3ff]">{m}</span>)}</div>
      <div className="flex border-b border-[#ddd] px-1 py-0.5">
        <button className={tbtn}><Plus size={26} strokeWidth={2.4} className="text-[#2a9d2a]" />Dodaj</button>
        <button className={tbtn} onClick={() => setDlg('extract')}><Minus size={26} strokeWidth={2.4} className="text-[#2a62c9]" />Wypakuj</button>
        <button className={tbtn} onClick={() => askPass({ kind: 'test' })}><Check size={26} strokeWidth={2.4} className="text-[#2a9d2a]" />Testuj</button>
        <button className={tbtn} onClick={() => setDlg('extract')}><Copy size={24} className="text-[#2a62c9]" />Kopiuj</button>
        <button className={tbtn}><MoveRight size={26} className="text-[#2a62c9]" />Przenieś</button>
        <button className={tbtn}><X size={26} strokeWidth={2.4} className="text-[#c42b1c]" />Usuń</button>
        <button className={tbtn}><Info size={24} className="text-[#2a62c9]" />Informacje</button>
      </div>
      <div className="flex items-center gap-1 border-b border-[#ddd] px-1 py-1"><button title="W górę" onClick={() => os.close(win.id)} className="p-0.5 hover:bg-[#e5f3ff]"><FolderUp size={16} /></button>
        <span className="flex flex-1 items-center border border-[#7a7a7a] bg-white"><span className="flex-1 px-1.5 py-0.5">{winPath(arch)}\</span><ChevronDown size={13} className="mx-1" /></span></div>
      <div className="min-h-0 flex-1 overflow-auto bg-white">
        <div className="sticky top-0 grid min-w-[700px] grid-cols-[1fr_90px_110px_130px_85px_80px_120px] border-b border-[#e5e5e5] bg-white">{['Nazwa', 'Rozmiar', 'Spakowany rozmiar', 'Zmodyfikowany', 'Zaszyfrowany', 'CRC', 'Metoda'].map((h, i) => <span key={h} className={`truncate border-r border-[#e5e5e5] px-1.5 py-0.5 ${i && i < 3 ? 'text-right' : ''}`}>{h}</span>)}</div>
        {entries.map((e) => <div key={e.name} onClick={() => setSel(e.name)} onDoubleClick={() => askPass({ kind: 'open', file: e.name })} className={`grid min-w-[700px] grid-cols-[1fr_90px_110px_130px_85px_80px_120px] py-[1px] ${sel === e.name ? 'bg-[#cce8ff]' : 'hover:bg-[#e5f3ff]'}`}>
          <span className="flex items-center gap-1.5 truncate px-1.5"><FileIcon path={e.name} size={16} />{e.name}</span><span className="px-1.5 text-right">{num(e.size)}</span><span className="px-1.5 text-right">{num(Math.round(e.size * 0.97))}</span>
          <span className="px-1.5">{fmtDate(Date.now() - 86400000 * 40)}</span><span className="px-1.5">{pass ? '+' : '-'}</span><span className="px-1.5 font-mono text-[11px]">{crc(e.name)}</span><span className="truncate px-1.5">{pass ? '7zAES:19 LZMA2:24' : 'LZMA2:24'}</span></div>)}
      </div>
      <div className="flex gap-6 border-t border-[#ddd] px-2 py-0.5 text-[11px]"><span>{sel ? 1 : 0} obiekt(ów) zaznaczonych</span><span>{num(sel ? entries.find((e) => e.name === sel)?.size ?? 0 : total)}</span></div>
      </>}

      {dlg === 'extract' && <div className={box}><div style={drag.style} className={`${xpDlg} w-[520px]`}>
        {title(`Wypakuj : ${winPath(arch)}`, abort)}
        <div className="space-y-2 p-3">
          <label className="block">Wypakuj do:
            <div className="mt-1 flex gap-1"><span className="flex flex-1 items-center border border-[#7a7a7a] bg-white"><input value={winPath(dest)} onChange={(e) => setDest(e.target.value.replace(/\\/g, '/'))} className="flex-1 bg-transparent px-1.5 py-0.5 outline-none" /><ChevronDown size={13} className="mx-1" /></span>
              <button onClick={() => void browse('Przeglądaj w poszukiwaniu folderu')} className={`${winBtn} !min-w-0 !px-2`}>...</button></div></label>
          <label className="flex items-center gap-1.5"><input type="checkbox" defaultChecked /><input value={base(dest)} onChange={(e) => setDest(join(parent(dest), e.target.value))} className="w-60 border border-[#7a7a7a] bg-white px-1.5 py-0.5" /></label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <fieldset className="border border-[#ccc] p-2"><legend className="px-1">Tryb ścieżek:</legend>
                <select value={pathMode} onChange={(e) => setPathMode(e.target.value)} className="w-full border border-[#7a7a7a] bg-white"><option value="full">Pełne ścieżki</option><option value="none">Bez ścieżek</option><option value="abs">Ścieżki bezwzględne</option></select>
                <label className="mt-1.5 flex items-center gap-1"><input type="checkbox" />Wyeliminuj zduplikowany folder główny</label></fieldset>
              <fieldset className="border border-[#ccc] p-2"><legend className="px-1">Tryb nadpisywania:</legend>
                <select value={overwrite} onChange={(e) => setOverwrite(e.target.value)} className="w-full border border-[#7a7a7a] bg-white"><option value="ask">Pytaj przed nadpisaniem</option><option value="yes">Nadpisuj bez pytania</option><option value="skip">Pomiń istniejące pliki</option><option value="rename">Zmieniaj nazwy automatycznie</option><option value="renameOld">Zmieniaj nazwy istniejących plików</option></select></fieldset>
            </div>
            <div className="space-y-2">
              <fieldset className="border border-[#ccc] p-2"><legend className="px-1">Hasło</legend>
                <input type={showPw ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} className="w-full border border-[#7a7a7a] bg-white px-1 py-0.5" />
                <label className="mt-1.5 flex items-center gap-1"><input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} />Pokaż hasło</label></fieldset>
              <label className="flex items-center gap-1"><input type="checkbox" />Przywróć zabezpieczenia plików</label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-3 pb-3"><button onClick={() => { pending.current = { kind: 'extract' }; void run(pw); }} className={`${winBtn} !border-[#0078d7]`}>OK</button><button onClick={abort} className={winBtn}>Anuluj</button><button className={winBtn}>Pomoc</button></div>
      </div></div>}

      {dlg === 'pass' && <div className={box}><div style={drag.style} className={`${xpDlg} w-[360px]`}>
        {title('Wprowadź hasło', abort)}
        <div className="space-y-2 p-3">
          <p className="flex items-center gap-2"><KeyRound size={16} className="text-[#c9a400]" />Wprowadź hasło:</p>
          <input data-coach="7z-pass" ref={pwRef} type={showPw ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void run(pw); } }} className="w-full border border-[#7a7a7a] bg-white px-1.5 py-0.5" />
          <label className="flex items-center gap-1"><input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} />Pokaż hasło</label>
        </div>
        <div className="flex justify-end gap-2 px-3 pb-3"><button onClick={() => void run(pw)} className={`${winBtn} !border-[#0078d7]`}>OK</button><button onClick={abort} className={winBtn}>Anuluj</button></div>
      </div></div>}

      {dlg === 'progress' && <div className={box}><div style={drag.style} className={`${xpDlg} w-[480px]`}>
        <div onPointerDown={drag.onTitleDown} className="flex h-[30px] items-center bg-white pl-2.5">{prog.pct}% {paused ? 'Wstrzymano ' : ''}Wypakowywanie {base(arch)}</div>
        <div className="space-y-2 p-3">
          <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-x-4 gap-y-0.5">
            <span>Upłynęło:</span><span className="text-right">{clock(elapsed)}</span><span>Rozmiar całkowity:</span><span className="text-right">{num(Math.ceil(total / 1024))} KB</span>
            <span>Pozostało:</span><span className="text-right">{clock(prog.pct ? (elapsed * (100 - prog.pct)) / prog.pct : 0)}</span><span>Prędkość:</span><span className="text-right">{elapsed ? num(Math.round(doneBytes / 1024 / (elapsed / 1000))) || 0 : 0} KB/s</span>
            <span>Pliki:</span><span className="text-right">{prog.done}</span><span>Przetworzono:</span><span className="text-right">{num(Math.ceil(doneBytes / 1024)) || 0} KB</span>
            <span>Współczynnik kompresji:</span><span className="text-right">97%</span><span>Spakowany rozmiar:</span><span className="text-right">{num(Math.ceil((doneBytes * 0.97) / 1024)) || 0} KB</span>
          </div>
          <p className="truncate">{prog.file}</p>
          <div className="h-[18px] border border-[#bcbcbc] bg-[#e6e6e6]"><div className="h-full bg-[#06b025] transition-all" style={{ width: `${prog.pct}%` }} /></div>
        </div>
        <div className="flex justify-end gap-2 px-3 pb-3"><button className={winBtn}>Tło</button><button onClick={() => setPaused((p) => !p)} className={winBtn}>{paused ? 'Kontynuuj' : 'Wstrzymaj'}</button><button onClick={() => { cancel.current = true; }} className={winBtn}>Anuluj</button></div>
      </div></div>}

      {dlg === 'winwiz' && <div className={box}><div style={drag.style} className="w-[620px] overflow-hidden rounded-[8px] border border-black/15 bg-white text-[13px] text-black shadow-[0_16px_48px_rgba(0,0,0,.35)]">
        {title('', abort)}
        <div className="px-10 pb-8 pt-1">
          <p className="mb-1 flex items-center gap-2 text-[12px] text-[#444]"><FolderSvg size={16} />Wyodrębnij foldery skompresowane (zip)</p>
          <p className="mb-7 text-[19px] text-[#1a3f8f]">Wybierz miejsce docelowe i wyodrębnij pliki</p>
          <p className="mb-1">Pliki zostaną wyodrębnione do tego folderu:</p>
          <div className="flex gap-2"><input value={winPath(dest)} onChange={(e) => setDest(e.target.value.replace(/\\/g, '/'))} className="h-[26px] flex-1 border border-[#7a7a7a] px-1.5 outline-none focus:border-[#0078d7]" />
            <button onClick={() => void browse('Wybierz miejsce docelowe')} className={winBtn}>Przeglądaj...</button></div>
          <label className="mt-4 flex items-center gap-2"><input type="checkbox" checked={showAfter} onChange={(e) => setShowAfter(e.target.checked)} />Pokaż wyodrębnione pliki po zakończeniu</label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#dfdfdf] bg-[#f0f0f0] px-4 py-3"><button onClick={() => askPass({ kind: 'extract', wizard: true })} className={`${winBtn} !border-[#0078d7]`}>Wyodrębnij</button><button onClick={abort} className={winBtn}>Anuluj</button></div>
      </div></div>}

      {dlg === 'winpass' && <div className={box}><div style={drag.style} className="w-[440px] overflow-hidden rounded-[8px] border border-black/15 bg-white text-[13px] text-black shadow-[0_16px_48px_rgba(0,0,0,.35)]">
        {title('Hasło wymagane', abort)}
        <div className="flex gap-4 px-5 py-4"><Lock size={34} className="shrink-0 text-[#d39d00]" /><div className="flex-1 space-y-2"><p>Plik „{entries[0]?.name}” jest chroniony hasłem.</p><p>Wprowadź hasło, aby wyodrębnić pliki z „{base(arch)}”.</p>
          <input data-coach="7z-pass" ref={pwRef} type="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void run(pw); } }} placeholder="Hasło" className="h-[28px] w-full border border-[#7a7a7a] border-b-[#0078d7] px-2 outline-none" /></div></div>
        <div className="flex justify-end gap-2 bg-[#f0f0f0] px-4 py-3"><button onClick={() => void run(pw)} className={`${winBtn} !border-[#0078d7]`}>OK</button><button onClick={abort} className={winBtn}>Anuluj</button></div>
      </div></div>}

      {dlg === 'wincopy' && <div className={box}><div style={drag.style} className="w-[460px] overflow-hidden rounded-[8px] border border-black/15 bg-white text-[13px] text-black shadow-[0_16px_48px_rgba(0,0,0,.35)]">
        {title(`Ukończono: ${prog.pct}%`, () => { cancel.current = true; })}
        <div className="px-5 pb-5"><p className="mb-1">Kopiowanie elementów: {entries.length} z <span className="text-[#0067c0]">{base(arch)}</span> do <span className="text-[#0067c0]">{base(dest)}</span></p>
          <p className="mb-2 text-[22px]">Ukończono: {prog.pct}%</p>
          <div className="h-[22px] bg-[#e6e6e6]"><div className="h-full bg-[#06b025] transition-all" style={{ width: `${prog.pct}%` }} /></div>
          <p className="mt-2 text-[12px] text-[#555]">Nazwa: {prog.file}</p></div>
      </div></div>}
    </div>
  );
}
