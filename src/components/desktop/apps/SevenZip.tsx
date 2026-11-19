import { useEffect, useRef, useState } from 'react';
import { Plus, Minus, Check, Copy, MoveRight, X, Info, FolderUp, KeyRound, Lock } from 'lucide-react';
import { useOS, FileIcon, type Win } from '../os';
import { useVfs, base, parent, join, win as winPath, isText, fmtDate } from '../../../lib/vfs';

/** Pliki w archiwum arkusza (grafiki i zrzut bazy z sheet.assets). */
function contents(os: ReturnType<typeof useOS>) {
  const a = os.sheet.assets;
  return [...(a?.files ?? []).filter((f) => !f.startsWith('_')), ...(a?.sql ? [a.sql] : [])];
}
async function fetchAs(url: string, text: boolean) {
  const r = await fetch(url); if (!r.ok) throw new Error(`Nie można odczytać ${base(url)}`);
  if (text) return r.text();
  const b = await r.blob();
  return new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(b); });
}

export default function SevenZip({ win }: { win: Win }) {
  const os = useOS(); const vfs = useVfs(os.vfs);
  const arch = String(win.args.path ?? '');
  const files = contents(os);
  const pass = os.sheet.files.archivePassword;
  const [dlg, setDlg] = useState<null | 'extract' | 'pass' | 'progress'>(null);
  const [dest, setDest] = useState(join(parent(arch), base(arch).replace(/\.\w+$/, '')));
  const [pw, setPw] = useState(''); const [showPw, setShowPw] = useState(false);
  const [prog, setProg] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const pwRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (dlg === 'pass') { const t = setTimeout(() => pwRef.current?.focus(), 60); return () => clearTimeout(t); } }, [dlg]);

  useEffect(() => {
    os.setTitle(win.id, `${winPath(arch)}\\`);
    const m = win.args.extract;
    if (m === 'ask') setDlg('extract');
    else if (m === 'here') { setDest(parent(arch)); setDlg(pass ? 'pass' : 'progress'); }
    else if (m === 'folder') setDlg(pass ? 'pass' : 'progress');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function extract(password: string) {
    if (pass && password !== pass) {
      await os.alert('7-Zip', `Błąd danych w zaszyfrowanym pliku '${files[0] ?? ''}'. Nieprawidłowe hasło?\n\nBłędy: ${files.length}`, 'error');
      setDlg('pass'); setPw(''); setTimeout(() => pwRef.current?.focus(), 30); return;
    }
    setDlg('progress'); setProg(0);
    const a = os.sheet.assets!;
    try {
      vfs.mkdir(dest);
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const target = join(dest, f);
        if (vfs.exists(target) && !(await os.confirm('Potwierdź zastąpienie pliku', `Folder docelowy zawiera już przetwarzany plik:\n${winPath(target)}\n\nCzy chcesz zastąpić istniejący plik?`))) continue;
        const text = isText(f);
        vfs.write(target, await fetchAs(`${a.dir}/${f}`, text), !text);
        setProg(Math.round(((i + 1) / files.length) * 100));
      }
      setDlg(null);
      if (win.args.extract) os.close(win.id);
    } catch (e) { setDlg(null); void os.alert('7-Zip', (e as Error).message, 'error'); }
  }
  const tbtn = 'flex flex-col items-center gap-0.5 px-2.5 py-1 text-[11px] hover:bg-[#cce8ff] hover:outline hover:outline-1 hover:outline-[#99d1ff]';
  const box = 'fixed inset-0 z-[240] grid place-items-center bg-black/5';
  const dialog = 'w-[460px] border border-[#888] bg-[#f0f0f0] text-[12px] text-black shadow-[0_8px_30px_rgba(0,0,0,.35)]';

  return (
    <div className="flex h-full flex-col bg-[#f0f0f0] text-[12px] text-black">
      <div className="flex gap-3 border-b border-[#ddd] px-2 py-0.5 text-[12px]">{['Plik', 'Edycja', 'Widok', 'Ulubione', 'Narzędzia', 'Pomoc'].map((m) => <span key={m} className="px-1 hover:bg-[#cce8ff]">{m}</span>)}</div>
      <div className="flex border-b border-[#ddd] px-1 py-1">
        <button className={tbtn}><Plus size={20} className="text-[#2a9d2a]" />Dodaj</button>
        <button className={tbtn} onClick={() => setDlg('extract')}><Minus size={20} className="text-[#2a62c9]" />Wypakuj</button>
        <button className={tbtn}><Check size={20} className="text-[#2a9d2a]" />Testuj</button>
        <button className={tbtn}><Copy size={20} className="text-[#2a62c9]" />Kopiuj</button>
        <button className={tbtn}><MoveRight size={20} className="text-[#2a62c9]" />Przenieś</button>
        <button className={tbtn}><X size={20} className="text-[#c42b1c]" />Usuń</button>
        <button className={tbtn}><Info size={20} className="text-[#2a62c9]" />Informacje</button>
      </div>
      <div className="flex items-center gap-1 border-b border-[#ddd] px-1 py-1"><FolderUp size={15} /><span className="flex-1 border border-[#bbb] bg-white px-1.5 py-0.5">{winPath(arch)}\</span></div>
      <div className="min-h-0 flex-1 overflow-auto bg-white">
        <div className="sticky top-0 grid grid-cols-[1fr_90px_140px_90px] border-b border-[#ddd] bg-white px-2 py-0.5"><span>Nazwa</span><span className="text-right">Rozmiar</span><span className="pl-3">Zmodyfikowany</span><span>Zaszyfrowany</span></div>
        {files.map((f) => <div key={f} onClick={() => setSel(f)} onDoubleClick={() => setDlg('extract')} className={`grid grid-cols-[1fr_90px_140px_90px] px-2 py-[2px] ${sel === f ? 'bg-[#cce8ff]' : 'hover:bg-[#e5f3ff]'}`}>
          <span className="flex items-center gap-1.5"><FileIcon path={f} size={15} />{f}</span><span className="text-right text-[#555]">—</span><span className="pl-3 text-[#555]">{fmtDate(Date.now() - 86400000 * 30)}</span><span>{pass ? '+' : '-'}</span></div>)}
      </div>
      <div className="flex gap-6 border-t border-[#ddd] px-2 py-0.5 text-[11px]"><span>Zaznaczonych obiektów: {sel ? 1 : 0} z {files.length}</span></div>

      {dlg === 'extract' && <div className={box}><div className={dialog}>
        <div className="flex h-7 items-center bg-white pl-2"><span className="flex-1">Wypakuj : {winPath(arch)}</span><button onClick={() => setDlg(null)} className="grid h-full w-10 place-items-center hover:bg-[#c42b1c] hover:text-white"><X size={13} /></button></div>
        <div className="space-y-2 p-3">
          <label className="block">Wypakuj do:
            <div className="mt-1 flex gap-1"><input value={winPath(dest)} onChange={(e) => setDest(e.target.value.replace(/\\/g, '/'))} className="flex-1 border border-[#7a7a7a] bg-white px-1.5 py-0.5" />
              <button onClick={async () => { const p = await os.pick({ mode: 'open', dirOnly: true, title: 'Przeglądaj w poszukiwaniu folderu', dir: parent(arch) }); if (p) setDest(p); }} className="border border-[#adadad] bg-[#e1e1e1] px-2 hover:bg-[#e5f1fb]">...</button></div></label>
          <div className="grid grid-cols-2 gap-3">
            <fieldset className="border border-[#ccc] p-2"><legend className="px-1">Tryb ścieżek:</legend><select className="w-full border border-[#7a7a7a] bg-white"><option>Pełne ścieżki</option></select></fieldset>
            <fieldset className="border border-[#ccc] p-2"><legend className="px-1">Hasło</legend><input type={showPw ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} className="w-full border border-[#7a7a7a] bg-white px-1" /><label className="mt-1 flex items-center gap-1"><input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} />Pokaż hasło</label></fieldset>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-3 pb-3"><button onClick={() => void extract(pw)} className="h-6 w-20 border border-[#0078d7] bg-[#e1e1e1] hover:bg-[#e5f1fb]">OK</button><button onClick={() => setDlg(null)} className="h-6 w-20 border border-[#adadad] bg-[#e1e1e1] hover:bg-[#e5f1fb]">Anuluj</button></div>
      </div></div>}

      {dlg === 'pass' && <div className={box}><div className={dialog + ' !w-[380px]'}>
        <div className="flex h-7 items-center bg-white pl-2"><span className="flex-1">Wprowadź hasło</span><button onClick={() => { setDlg(null); if (win.args.extract) os.close(win.id); }} className="grid h-full w-10 place-items-center hover:bg-[#c42b1c] hover:text-white"><X size={13} /></button></div>
        <div className="space-y-2 p-3">
          <p className="flex items-center gap-2"><KeyRound size={16} className="text-[#c9a400]" />Wprowadź hasło:</p>
          <input ref={pwRef} autoFocus type={showPw ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void extract(pw)} className="w-full border border-[#7a7a7a] bg-white px-1.5 py-0.5" />
          <label className="flex items-center gap-1"><input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} />Pokaż hasło</label>
        </div>
        <div className="flex justify-end gap-2 px-3 pb-3"><button onClick={() => void extract(pw)} className="h-6 w-20 border border-[#0078d7] bg-[#e1e1e1] hover:bg-[#e5f1fb]">OK</button><button onClick={() => { setDlg(null); if (win.args.extract) os.close(win.id); }} className="h-6 w-20 border border-[#adadad] bg-[#e1e1e1] hover:bg-[#e5f1fb]">Anuluj</button></div>
      </div></div>}

      {dlg === 'progress' && <div className={box}><div className={dialog}>
        <div className="flex h-7 items-center bg-white pl-2"><Lock size={12} className="mr-1" />{prog}% Wypakowywanie {winPath(arch)}</div>
        <div className="space-y-2 p-3"><p>Wypakowywanie do: {winPath(dest)}</p><div className="h-4 border border-[#bbb] bg-white"><div className="h-full bg-[#06b025]" style={{ width: `${prog}%` }} /></div></div>
      </div></div>}
      {dlg === 'progress' && prog === 0 && !pass && <AutoStart run={() => void extract('')} />}
    </div>
  );
}
function AutoStart({ run }: { run: () => void }) { useEffect(() => { run(); }, []); return null; } // eslint-disable-line react-hooks/exhaustive-deps
