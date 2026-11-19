import { lazy, Suspense, useEffect, useState, useRef } from 'react';
import { Files, Search, GitBranch, Play, Blocks, ChevronRight, ChevronDown, FilePlus, FolderPlus, RefreshCw, X, Settings, UserCircle, Bell } from 'lucide-react';
import { useOS, FileIcon, type Win, useWinKeys } from '../os';
import { useDocs } from './useDoc';
import { useVfs, base, ext, join, parent, HTDOCS } from '../../../lib/vfs';

const Editor = lazy(() => import('../../Editor'));
const LANG: Record<string, string> = { html: 'HTML', htm: 'HTML', php: 'PHP', css: 'CSS', js: 'JavaScript', sql: 'SQL', txt: 'Plain Text', json: 'JSON' };

/** Visual Studio Code: folder w Eksploratorze, karty, podpowiedzi i formatowanie jak w warsztacie. */
export default function VSCode({ win }: { win: Win }) {
  const os = useOS(); const vfs = useVfs(os.vfs);
  const D = useDocs(win.args.path ? String(win.args.path) : null, 'Untitled-1');
  const [folder, setFolder] = useState<string | null>(win.args.folder ? String(win.args.folder) : win.args.path ? parent(String(win.args.path)) : null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [menu, setMenu] = useState<string | null>(null);
  const [creating, setCreating] = useState<{ dir: string; kind: 'file' | 'dir' } | null>(null);
  const welcome = !D.d.path && !D.d.text && D.docs.length === 1;
  useEffect(() => { os.setTitle(win.id, `${welcome ? 'Witamy' : `${D.d.text !== D.d.saved ? '● ' : ''}${D.d.name}`}${folder ? ` - ${base(folder) || 'C:'}` : ''} - Visual Studio Code`); }, [D.d, folder, welcome]); // eslint-disable-line react-hooks/exhaustive-deps
  const FILTERS = [{ label: 'Wszystkie pliki (*.*)', exts: ['*'] }, { label: 'HTML (*.html)', exts: ['html'] }, { label: 'PHP (*.php)', exts: ['php'] }, { label: 'CSS (*.css)', exts: ['css'] }, { label: 'JavaScript (*.js)', exts: ['js'] }];
  const openFolder = async () => { const p = await os.pick({ mode: 'open', dirOnly: true, title: 'Otwórz folder', dir: folder ?? HTDOCS }); if (p) setFolder(p); };
  const saveSoon = (i = D.cur) => setTimeout(() => void D.save(FILTERS, i), 450); // po formatowaniu (Ctrl+S formatuje kod)
  const kroot = useRef<HTMLDivElement>(null);
  useWinKeys(kroot, (e) => keys(e));
  const keys = (e: KeyboardEvent) => {
    const c = e.ctrlKey || e.metaKey; const k = e.key.toLowerCase();
    if (c && k === 's') { if (e.shiftKey) { e.preventDefault(); void D.saveAs(FILTERS); } else saveSoon(); }
    else if (c && k === 'o') { e.preventDefault(); void D.open(FILTERS, folder ?? undefined); } else if (c && k === 'n') { e.preventDefault(); D.newDoc(); } else if (c && k === 'w') { e.preventDefault(); void D.closeDoc(D.cur); }
  };
  const create = (name: string) => {
    const c = creating; setCreating(null); if (!c || !name.trim()) return;
    const p = join(c.dir, name.trim());
    if (vfs.exists(p)) { void os.alert('Visual Studio Code', `Plik lub folder ${name} już istnieje w tej lokalizacji.`, 'error'); return; }
    if (c.kind === 'dir') vfs.mkdir(p); else { vfs.write(p, ''); D.openPath(p); }
    setOpen((o) => ({ ...o, [c.dir]: true }));
  };
  const Tree = ({ dir, depth }: { dir: string; depth: number }) => (
    <>
      {creating?.dir === dir && <div style={{ paddingLeft: 8 + depth * 12 }} className="flex items-center gap-1 py-0.5"><FileIcon path={creating.kind === 'dir' ? '' : 'x.txt'} dir={creating.kind === 'dir'} size={14} /><input autoFocus onBlur={(e) => create(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') create((e.target as HTMLInputElement).value); if (e.key === 'Escape') setCreating(null); }} className="flex-1 border border-[#007fd4] bg-[#3c3c3c] px-1 text-[#ccc] outline-none" /></div>}
      {vfs.list(dir).map((p) => { const isDir = vfs.isDir(p); return (
        <div key={p}>
          <button onClick={() => (isDir ? setOpen((o) => ({ ...o, [p]: !o[p] })) : D.openPath(p))} style={{ paddingLeft: 8 + depth * 12 }} className={`flex w-full items-center gap-1 py-[2px] pr-2 text-left hover:bg-[#2a2d2e] ${D.d.path === p ? 'bg-[#37373d]' : ''}`}>
            {isDir ? (open[p] ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="w-[14px]" />}<FileIcon path={p} dir={isDir} size={14} /><span className="truncate">{base(p)}</span>
          </button>
          {isDir && open[p] && <Tree dir={p} depth={depth + 1} />}
        </div>); })}
    </>
  );
  const M: Record<string, [string, string, () => void][]> = {
    Plik: [['Nowy plik tekstowy', 'Ctrl+N', D.newDoc], ['Otwórz plik...', 'Ctrl+O', () => void D.open(FILTERS, folder ?? undefined)], ['Otwórz folder...', 'Ctrl+K Ctrl+O', () => void openFolder()], ['Zapisz', 'Ctrl+S', () => void D.save(FILTERS)], ['Zapisz jako...', 'Ctrl+Shift+S', () => void D.saveAs(FILTERS)], ['Zapisz wszystko', '', () => D.docs.forEach((_, i) => void D.save(FILTERS, i))], ['Zamknij edytor', 'Ctrl+F4', () => void D.closeDoc(D.cur)], ['Zamknij folder', '', () => setFolder(null)], ['Zakończ', '', () => os.close(win.id)]],
    Edycja: [['Cofnij', 'Ctrl+Z', () => document.execCommand('undo')], ['Ponów', 'Ctrl+Y', () => document.execCommand('redo')]],
    Zaznaczenie: [], Widok: [], Przejdź: [], Uruchom: [['Otwórz w przeglądarce', '', () => { const p = D.d.path; if (p) os.open('browser', { url: p.startsWith(HTDOCS + '/') ? 'localhost/' + p.slice(HTDOCS.length + 1) : 'file:///' + p }); }]], Terminal: [], Pomoc: [],
  };
  return (
    <div ref={kroot} className="flex h-full flex-col bg-[#1e1e1e] text-[13px] text-[#cccccc]">
      <div className="flex h-[30px] items-center bg-[#323233] px-1 text-[12.5px]">
        {Object.keys(M).map((m) => <div key={m} className="relative"><button onClick={() => setMenu(menu === m ? null : m)} onMouseEnter={() => menu && setMenu(m)} className={`rounded px-2 py-0.5 ${menu === m ? 'bg-[#505050]' : 'hover:bg-[#505050]'}`}>{m}</button>
          {menu === m && M[m].length > 0 && <div className="absolute left-0 top-full z-30 min-w-[280px] rounded-[5px] border border-[#454545] bg-[#252526] py-1 shadow-xl" onMouseLeave={() => setMenu(null)}>{M[m].map(([l, k, f]) => <button key={l} onClick={() => { setMenu(null); f(); }} className="flex w-full justify-between gap-6 px-6 py-1 text-left hover:bg-[#04395e]"><span>{l}</span><span className="text-[#999]">{k}</span></button>)}</div>}</div>)}
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex w-12 flex-col items-center gap-4 bg-[#333333] py-3 text-[#858585]">
          <Files size={24} className="text-white" /><Search size={22} /><GitBranch size={22} /><Play size={22} /><Blocks size={22} />
          <span className="flex-1" /><UserCircle size={22} /><Settings size={22} />
        </div>
        <div className="flex w-[240px] flex-col bg-[#252526]">
          <p className="px-5 py-2.5 text-[11px] tracking-wide">EKSPLORATOR</p>
          {folder ? (<>
            <div className="group flex items-center gap-1 px-1 py-0.5 text-[11px] font-bold uppercase"><ChevronDown size={14} /><span className="flex-1 truncate">{base(folder) || 'C:'}</span>
              <button title="Nowy plik..." onClick={() => setCreating({ dir: folder, kind: 'file' })} className="opacity-70 hover:opacity-100"><FilePlus size={15} /></button>
              <button title="Nowy folder..." onClick={() => setCreating({ dir: folder, kind: 'dir' })} className="opacity-70 hover:opacity-100"><FolderPlus size={15} /></button>
              <button title="Odśwież" className="opacity-70 hover:opacity-100"><RefreshCw size={14} /></button></div>
            <div className="min-h-0 flex-1 overflow-auto text-[13px]"><Tree dir={folder} depth={0} /></div>
          </>) : (
            <div className="space-y-3 px-5 text-[13px]"><p>Nie otwarto folderu.</p><button onClick={() => void openFolder()} className="w-full rounded-[2px] bg-[#0e639c] py-1.5 text-white hover:bg-[#1177bb]">Otwórz folder</button></div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          {!welcome && <div className="flex h-[35px] bg-[#252526]">
            {D.docs.map((d, i) => <div key={d.id} onClick={() => D.setCur(i)} className={`group flex items-center gap-1.5 border-r border-[#252526] px-3 ${i === D.cur ? 'border-t border-t-[#007acc] bg-[#1e1e1e] text-white' : 'bg-[#2d2d2d] text-[#969696]'}`}>
              <FileIcon path={d.name} size={14} />{d.name}<button onClick={(e) => { e.stopPropagation(); void D.closeDoc(i); }} className="ml-1 grid h-4 w-4 place-items-center rounded hover:bg-[#444]">{d.text !== d.saved ? <span className="text-[16px] leading-none group-hover:hidden">●</span> : null}<X size={13} className={d.text !== d.saved ? 'hidden group-hover:block' : ''} /></button></div>)}
          </div>}
          {!welcome && D.d.path && <div className="px-4 py-0.5 text-[12px] text-[#999]">{D.d.path.replace(/\//g, ' › ')}</div>}
          <div className="min-h-0 flex-1 overflow-hidden">
            {welcome ? (
              <div className="p-14 text-[#ccc]"><p className="text-[30px] font-light">Visual Studio Code</p><p className="mb-8 text-[#999]">Edytowanie rozwinięte</p>
                <p className="mb-2 text-[15px]">Rozpocznij</p>
                <div className="space-y-1.5 text-[#3794ff]"><button onClick={D.newDoc} className="block hover:underline">Nowy plik...</button><button onClick={() => void D.open(FILTERS, folder ?? undefined)} className="block hover:underline">Otwórz plik...</button><button onClick={() => void openFolder()} className="block hover:underline">Otwórz folder...</button></div></div>
            ) : (
              <Suspense fallback={null}><Editor key={D.d.id} file={D.d.path ? base(D.d.path) : `${D.d.name}.txt`} value={D.d.text} onChange={(v) => D.update({ text: v })} /></Suspense>
            )}
          </div>
        </div>
      </div>
      <div className="flex h-[22px] items-center gap-4 bg-[#007acc] px-2 text-[12px] text-white">
        <span>⊗ 0  ⚠ 0</span><span className="flex-1" /><span>Spacje: 2</span><span>UTF-8</span><span>CRLF</span><span>{LANG[ext(D.d.name)] ?? 'Plain Text'}</span><Bell size={13} />
      </div>
    </div>
  );
}
