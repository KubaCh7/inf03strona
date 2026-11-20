import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Files, Search, GitBranch, Play, Blocks, ChevronRight, ChevronDown, FilePlus, FolderPlus, RefreshCw, X, Settings, CircleUserRound, Bell, ArrowLeft, ArrowRight, Minus, Square, Copy, PanelLeft, PanelBottom, PanelRight, LayoutTemplate, MoreHorizontal, ListCollapse, Plus, Trash2, SplitSquareHorizontal, ChevronUp, MessageSquare, CircleX, TriangleAlert } from 'lucide-react';
import { useOS, type Win, useWinKeys } from '../os';
import { useFrame } from '../Window';
import { useDocs, type Doc } from './useDoc';
import { useVfs, base, ext, join, parent, HTDOCS, win as winPath } from '../../../lib/vfs';

const Editor = lazy(() => import('../../Editor'));
const LANG: Record<string, string> = { html: 'HTML', htm: 'HTML', php: 'PHP', css: 'CSS', js: 'JavaScript', sql: 'SQL', txt: 'Plain Text', json: 'JSON', md: 'Markdown' };
const FILTERS = [{ label: 'All Files (*.*)', exts: ['*'] }, { label: 'HTML (*.html)', exts: ['html'] }, { label: 'PHP (*.php)', exts: ['php'] }, { label: 'CSS (*.css)', exts: ['css'] }, { label: 'JavaScript (*.js)', exts: ['js'] }];

/** Ikony plikow jak w motywie Seti (domyslnym w VS Code). Foldery maja tylko strzalki. */
function Seti({ name }: { name: string }) {
  const e = ext(name);
  const [t, c] = ({ html: ['<>', '#E37933'], htm: ['<>', '#E37933'], css: ['#', '#519ABA'], js: ['JS', '#CBCB41'], json: ['{}', '#CBCB41'], php: ['php', '#A074C4'], sql: ['≡', '#F55385'], md: ['M↓', '#519ABA'],
    png: ['▣', '#A074C4'], jpg: ['▣', '#A074C4'], jpeg: ['▣', '#A074C4'], gif: ['▣', '#A074C4'], txt: ['≡', '#9D9D9D'] } as Record<string, [string, string]>)[e] ?? ['≡', '#9D9D9D'];
  return <span className="inline-grid h-4 w-4 shrink-0 place-items-center font-bold leading-none" style={{ color: c, fontSize: t.length > 2 ? 7 : t.length > 1 ? 8.5 : 12 }}>{t}</span>;
}

type Menu = [string, string, (() => void) | null][];
type Panel = 'terminal' | 'problems' | 'output' | 'debug' | 'ports';

/** Visual Studio Code (motyw Dark Modern, angielski interfejs jak po instalacji). */
export default function VSCode({ win }: { win: Win }) {
  const os = useOS(); const vfs = useVfs(os.vfs); const frame = useFrame();
  const [modal, setModal] = useState<null | { doc: Doc; done: (r: 'save' | 'discard' | 'cancel') => void }>(null);
  const D = useDocs(win.args.path ? String(win.args.path) : null, 'Untitled-1', (doc) => new Promise((done) => setModal({ doc, done })), String(win.id));
  const FK = `p03:vsc:${os.vfs.key}:${win.id}`;
  const [folder, setFolder] = useState<string | null>(() => { try { const f = localStorage.getItem(FK); if (f !== null) return f || null; } catch { /* */ } return win.args.folder ? String(win.args.folder) : win.args.path ? parent(String(win.args.path)) : null; });
  useEffect(() => { try { localStorage.setItem(FK, folder ?? ''); } catch { /* */ } }, [FK, folder]);
  const [openDirs, setOpenDirs] = useState<Record<string, boolean>>({});
  const [menu, setMenu] = useState<string | null>(null);
  const [creating, setCreating] = useState<{ dir: string; kind: 'file' | 'dir'; err?: string } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [selPath, setSelPath] = useState<string | null>(null);
  const [view, setView] = useState<'explorer' | 'search' | 'scm' | 'run' | 'ext' | null>('explorer');
  const [panel, setPanel] = useState<Panel | null>(null);
  const [welcome, setWelcome] = useState(!win.args.path);
  const [pos, setPos] = useState({ ln: 1, col: 1, sel: 0 });
  const [quick, setQuick] = useState<string | null>(null);
  const [ctx, setCtx] = useState<{ x: number; y: number; path: string | null } | null>(null);
  const [search, setSearch] = useState('');
  const kroot = useRef<HTMLDivElement>(null);
  const showWelcome = welcome && !D.d.path && !D.d.text && D.docs.length === 1;
  const docName = showWelcome ? 'Welcome' : `${D.d.text !== D.d.saved ? '● ' : ''}${D.d.name}`;
  useEffect(() => { os.setTitle(win.id, `${docName}${folder ? ` - ${base(folder) || 'C:'}` : ''} - Visual Studio Code`); }, [docName, folder]); // eslint-disable-line react-hooks/exhaustive-deps

  const openFolder = async () => { const p = await os.pick({ mode: 'open', dirOnly: true, title: 'Open Folder', dir: folder ?? HTDOCS }); if (p) { setFolder(p); setView('explorer'); setOpenDirs({}); } };
  const saveSoon = (i = D.cur) => setTimeout(() => void D.save(FILTERS, i), 0);
  const newFile = () => { setWelcome(false); D.newDoc(); };
  const openPath = (p: string) => { setWelcome(false); D.openPath(p); };
  const togglePanel = (p: Panel = 'terminal') => setPanel((x) => (x ? null : p));
  useWinKeys(kroot, (e) => {
    const c = e.ctrlKey || e.metaKey; const k = e.key.toLowerCase();
    if (c && k === 's') { if (e.shiftKey) { e.preventDefault(); void D.saveAs(FILTERS); } else saveSoon(); }
    else if (c && k === 'o') { e.preventDefault(); void D.open(FILTERS, folder ?? undefined).then(() => setWelcome(false)); }
    else if (c && k === 'n') { e.preventDefault(); newFile(); }
    else if (c && (k === 'w' || e.key === 'F4')) { e.preventDefault(); if (showWelcome) setWelcome(false); else void D.closeDoc(D.cur); }
    else if (c && e.shiftKey && k === 'p') { e.preventDefault(); setQuick('>'); }
    else if (c && k === 'p') { e.preventDefault(); setQuick(''); }
    else if (c && k === 'b') { e.preventDefault(); setView((v) => (v ? null : 'explorer')); }
    else if (c && k === 'j') { e.preventDefault(); togglePanel(); }
    else if (c && (e.key === '`' || e.code === 'Backquote')) { e.preventDefault(); setPanel((x) => (x === 'terminal' ? null : 'terminal')); }
    else if (e.key === 'F2' && selPath && !(e.target as HTMLElement).closest('.cm-editor,input')) { e.preventDefault(); setRenaming(selPath); }
    else if (e.key === 'Delete' && selPath && !(e.target as HTMLElement).closest('.cm-editor,input')) { e.preventDefault(); del(selPath); }
  });

  // --- operacje Eksploratora ---
  const create = (name: string) => {
    const c = creating; if (!c) return;
    const n = name.trim(); if (!n) { setCreating(null); return; }
    const p = join(c.dir, n);
    if (vfs.exists(p)) { setCreating({ ...c, err: n }); return; }
    setCreating(null);
    if (c.kind === 'dir') vfs.mkdir(p); else { vfs.write(p, ''); openPath(p); }
    setSelPath(p); setOpenDirs((o) => ({ ...o, [c.dir]: true }));
  };
  const rename = (p: string, name: string) => {
    setRenaming(null); const n = name.trim(); if (!n || n === base(p)) return;
    try { const np = vfs.rename(p, n); setSelPath(np); const i = D.docs.findIndex((x) => x.path === p); if (i >= 0) D.update({ path: np, name: base(np) }, i); }
    catch { void os.alert('Visual Studio Code', `A file or folder ${n} already exists at this location. Please choose a different name.`, 'error'); }
  };
  const del = (p: string) => void os.confirm('Visual Studio Code', `Are you sure you want to delete '${base(p)}'${vfs.isDir(p) ? ' and its contents' : ''}?\n\nYou can restore this file from the Recycle Bin.`).then((ok) => { if (ok) { vfs.trash(p); setSelPath(null); } });
  const startNew = (kind: 'file' | 'dir') => {
    if (!folder) return;
    const dir = selPath && vfs.exists(selPath) ? (vfs.isDir(selPath) ? selPath : parent(selPath)) : folder;
    setOpenDirs((o) => ({ ...o, [dir]: true })); setCreating({ dir, kind });
  };

  // Drzewo jako zwykla funkcja (nie komponent), zeby pole nazwy nie bylo tworzone od nowa przy kazdym renderze
  const row = 'flex h-[22px] w-full items-center gap-1.5 pr-2 text-left';
  const tree = (dir: string, depth: number): React.ReactNode => (
    <>
      {creating?.dir === dir && (
        <div style={{ paddingLeft: 8 + depth * 8 + (creating.kind === 'dir' ? 0 : 16) }} className="relative py-[1px] pr-2">
          <div className="flex items-center gap-1.5">{creating.kind === 'dir' ? <ChevronRight size={16} className="shrink-0 text-[#cccccc]" /> : <Seti name="x.txt" />}
            <input autoFocus spellCheck={false} onChange={() => creating.err && setCreating({ ...creating, err: undefined })} onBlur={(e) => create(e.target.value)}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') create((e.target as HTMLInputElement).value); if (e.key === 'Escape') setCreating(null); }}
              className={`h-[20px] w-full border bg-[#313131] px-1 text-[13px] text-[#cccccc] outline-none ${creating.err ? 'border-[#be1100]' : 'border-[#0078d4]'}`} /></div>
          {creating.err && <div className="absolute left-0 right-2 z-10 border border-[#be1100] bg-[#5a1d1d] px-1.5 py-1 text-[12px] leading-snug" style={{ marginLeft: 8 + depth * 8 + 22 }}>A file or folder <b>{creating.err}</b> already exists at this location. Please choose a different name.</div>}
        </div>
      )}
      {vfs.list(dir).filter((p) => !base(p).startsWith('.')).map((p) => {
        const isDir = vfs.isDir(p); const sel = selPath === p; const active = D.d.path === p && !showWelcome;
        return (
          <div key={p}>
            {renaming === p ? (
              <div style={{ paddingLeft: 8 + depth * 8 + (isDir ? 0 : 16) }} className="flex items-center gap-1.5 py-[1px] pr-2">{isDir ? <ChevronRight size={16} /> : <Seti name={base(p)} />}
                <input autoFocus defaultValue={base(p)} spellCheck={false} onFocus={(e) => { const v = e.target.value; e.target.setSelectionRange(0, isDir || v.lastIndexOf('.') <= 0 ? v.length : v.lastIndexOf('.')); }}
                  onBlur={(e) => rename(p, e.target.value)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') rename(p, (e.target as HTMLInputElement).value); if (e.key === 'Escape') setRenaming(null); }}
                  className="h-[20px] w-full border border-[#0078d4] bg-[#313131] px-1 text-[13px] outline-none" /></div>
            ) : (
              <button onClick={() => { setSelPath(p); if (isDir) setOpenDirs((o) => ({ ...o, [p]: !o[p] })); else openPath(p); }}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setSelPath(p); setCtx({ x: e.clientX, y: e.clientY, path: p }); }}
                style={{ paddingLeft: 8 + depth * 8 + (isDir ? 0 : 16) }}
                className={`${row} ${sel ? 'bg-[#04395e] outline outline-1 -outline-offset-1 outline-[#0078d4]' : active ? 'bg-[#37373d]' : 'hover:bg-[#2a2d2e]'}`}>
                {isDir ? (openDirs[p] ? <ChevronDown size={16} className="shrink-0" /> : <ChevronRight size={16} className="shrink-0" />) : <Seti name={base(p)} />}
                <span className="truncate">{base(p)}</span>
              </button>
            )}
            {isDir && openDirs[p] && <div className="relative">{tree(p, depth + 1)}<span className="pointer-events-none absolute bottom-0 top-0 w-px bg-[#585858]/40" style={{ left: 8 + depth * 8 + 7 }} /></div>}
          </div>);
      })}
    </>
  );

  // --- menu ---
  const run = (f: (() => void) | null) => () => { setMenu(null); f?.(); };
  const M: Record<string, Menu> = {
    File: [['New Text File', 'Ctrl+N', newFile], ['New File...', 'Ctrl+Alt+Windows+N', () => startNew('file')], ['New Window', 'Ctrl+Shift+N', () => os.open('vscode')], ['-', '', null],
      ['Open File...', 'Ctrl+O', () => void D.open(FILTERS, folder ?? undefined).then(() => setWelcome(false))], ['Open Folder...', 'Ctrl+K Ctrl+O', () => void openFolder()], ['-', '', null],
      ['Save', 'Ctrl+S', () => void D.save(FILTERS)], ['Save As...', 'Ctrl+Shift+S', () => void D.saveAs(FILTERS)], ['Save All', 'Ctrl+K S', () => D.docs.forEach((_, i) => void D.save(FILTERS, i))], ['-', '', null],
      ['Auto Save', '', null], ['Preferences', '', null], ['-', '', null], ['Revert File', '', () => D.update({ text: D.d.saved })], ['Close Editor', 'Ctrl+F4', () => void D.closeDoc(D.cur)], ['Close Folder', 'Ctrl+K F', () => setFolder(null)], ['Close Window', 'Alt+F4', () => frame?.close()], ['-', '', null], ['Exit', '', () => frame?.close()]],
    Edit: [['Undo', 'Ctrl+Z', () => document.execCommand('undo')], ['Redo', 'Ctrl+Y', () => document.execCommand('redo')], ['-', '', null], ['Cut', 'Ctrl+X', null], ['Copy', 'Ctrl+C', null], ['Paste', 'Ctrl+V', null], ['-', '', null], ['Find', 'Ctrl+F', null], ['Replace', 'Ctrl+H', null], ['-', '', null], ['Toggle Line Comment', 'Ctrl+/', null], ['Emmet: Expand Abbreviation', 'Tab', null]],
    Selection: [['Select All', 'Ctrl+A', null], ['Expand Selection', 'Shift+Alt+RightArrow', null], ['Copy Line Down', 'Shift+Alt+DownArrow', null], ['Add Cursor Below', 'Ctrl+Alt+DownArrow', null]],
    View: [['Command Palette...', 'Ctrl+Shift+P', () => setQuick('>')], ['Open View...', '', null], ['-', '', null], ['Explorer', 'Ctrl+Shift+E', () => setView('explorer')], ['Search', 'Ctrl+Shift+F', () => setView('search')], ['Extensions', 'Ctrl+Shift+X', () => setView('ext')], ['-', '', null], ['Problems', 'Ctrl+Shift+M', () => setPanel('problems')], ['Output', 'Ctrl+Shift+U', () => setPanel('output')], ['Terminal', 'Ctrl+`', () => setPanel('terminal')], ['-', '', null], ['Word Wrap', 'Alt+Z', null]],
    Go: [['Back', 'Alt+LeftArrow', null], ['Forward', 'Alt+RightArrow', null], ['-', '', null], ['Go to File...', 'Ctrl+P', () => setQuick('')], ['Go to Line/Column...', 'Ctrl+G', null]],
    Run: [['Start Debugging', 'F5', null], ['Run Without Debugging', 'Ctrl+F5', null], ['-', '', null], ['Add Configuration...', '', null]],
    Terminal: [['New Terminal', 'Ctrl+Shift+`', () => setPanel('terminal')], ['Split Terminal', 'Ctrl+Shift+5', null], ['-', '', null], ['Run Task...', '', null]],
    Help: [['Welcome', '', () => setWelcome(true)], ['Show All Commands', 'Ctrl+Shift+P', () => setQuick('>')], ['Documentation', '', null], ['-', '', null], ['About', '', () => void os.alert('Visual Studio Code', 'Version: 1.106.0 (user setup)\nOS: Windows_NT x64 10.0.26100', 'info')]],
  };

  // --- szybkie otwieranie i paleta polecen ---
  const allFiles = useMemo(() => (folder ? vfs.tree(folder).map((f) => f.path).filter((p) => !/\/\./.test(p)) : []), [folder, vfs.ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const COMMANDS: [string, string, () => void][] = [['File: New Untitled Text File', 'Ctrl+N', newFile], ['File: Open Folder...', 'Ctrl+K Ctrl+O', () => void openFolder()], ['File: Save', 'Ctrl+S', () => void D.save(FILTERS)], ['File: Save As...', 'Ctrl+Shift+S', () => void D.saveAs(FILTERS)],
    ['View: Toggle Terminal', 'Ctrl+`', () => setPanel((x) => (x === 'terminal' ? null : 'terminal'))], ['View: Toggle Primary Side Bar Visibility', 'Ctrl+B', () => setView((v) => (v ? null : 'explorer'))], ['Help: Welcome', '', () => setWelcome(true)], ['View: Close Editor', 'Ctrl+F4', () => void D.closeDoc(D.cur)]];
  const qText = quick ?? '';
  const qItems = qText.startsWith('>')
    ? COMMANDS.filter(([l]) => l.toLowerCase().includes(qText.slice(1).trim().toLowerCase())).map(([l, k, f]) => ({ key: l, label: l, desc: '', kb: k, run: f }))
    : allFiles.filter((p) => base(p).toLowerCase().includes(qText.toLowerCase())).slice(0, 12).map((p) => ({ key: p, label: base(p), desc: winPath(parent(p)).replace(winPath(folder ?? ''), '').replace(/^\\/, '') || '', kb: '', run: () => openPath(p) }));
  const [qi, setQi] = useState(0);
  useEffect(() => setQi(0), [quick]);

  // --- terminal (PowerShell) ---
  const [term, setTerm] = useState<string[]>(['Windows PowerShell', 'Copyright (C) Microsoft Corporation. All rights reserved.', '', 'Install the latest PowerShell for new features and improvements! https://aka.ms/PSWindows', '']);
  const [cwd, setCwd] = useState(folder ?? 'C:/Users/Egzamin');
  useEffect(() => { if (folder) setCwd(folder); }, [folder]);
  const termEnd = useRef<HTMLDivElement>(null);
  useEffect(() => { termEnd.current?.scrollIntoView({ block: 'end' }); }, [term, panel]);
  const exec = (line: string) => {
    const out = [`PS ${winPath(cwd)}> ${line}`]; const [cmd, ...args] = line.trim().split(/\s+/); const a = args.join(' ').replace(/^["']|["']$/g, '');
    const resolve = (x: string) => (/^[a-z]:/i.test(x) ? x.replace(/\\/g, '/') : x === '..' ? parent(cwd) : join(cwd, x.replace(/\\/g, '/')));
    switch ((cmd ?? '').toLowerCase()) {
      case '': break;
      case 'cls': case 'clear': setTerm([]); return;
      case 'ls': case 'dir': case 'get-childitem': {
        out.push('', `    Directory: ${winPath(cwd)}`, '', 'Mode                 LastWriteTime         Length Name', '----                 -------------         ------ ----');
        for (const p of vfs.list(cwd)) { const n = vfs.get(p)!; const d = new Date(n.mtime); out.push(`${n.dir ? 'd----' : '-a---'}        ${d.toLocaleDateString('pl-PL')}     ${d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}  ${n.dir ? '              ' : String(vfs.size(p)).padStart(14)} ${base(p)}`); }
        out.push(''); break;
      }
      case 'cd': case 'set-location': { if (!a) { out.push(winPath(cwd)); break; } const t = resolve(a); if (vfs.isDir(t)) setCwd(t); else out.push(`cd : Cannot find path '${winPath(t)}' because it does not exist.`); break; }
      case 'mkdir': case 'md': { const t = resolve(a); vfs.mkdir(t); out.push('', `    Directory: ${winPath(cwd)}`, '', `d----        ${new Date().toLocaleString('pl-PL')}                  ${base(t)}`, ''); break; }
      case 'ni': case 'new-item': case 'touch': { const t = resolve(a.replace(/^-(Path|Name)\s+/i, '')); if (!vfs.exists(t)) vfs.write(t, ''); out.push(`-a---        ${new Date().toLocaleString('pl-PL')}              0 ${base(t)}`); break; }
      case 'echo': case 'write-output': out.push(a); break;
      case 'pwd': case 'get-location': out.push('', 'Path', '----', winPath(cwd), ''); break;
      case 'php': out.push(a === '-v' ? 'PHP 8.2.12 (cli) (built: Oct 24 2023 21:15:15) (ZTS Visual C++ 2019 x64)\nCopyright (c) The PHP Group\nZend Engine v4.2.12, Copyright (c) Zend Technologies' : `php : The term 'php' is not recognized as the name of a cmdlet, function, script file, or operable program.`); break;
      default: out.push(`${cmd} : The term '${cmd}' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again.`, `At line:1 char:1`, `+ ${line}`, `+ ${'~'.repeat(cmd.length)}`, '    + CategoryInfo          : ObjectNotFound: (' + cmd + ':String) [], CommandNotFoundException', '    + FullyQualifiedErrorId : CommandNotFoundException', '');
    }
    setTerm((t) => [...t, ...out.flatMap((l) => l.split('\n'))]);
  };

  // --- wyglad ---
  const tb = 'grid h-[26px] w-[26px] place-items-center rounded-[5px] text-[#cccccc] hover:bg-white/10';
  const act = (id: typeof view, Icon: typeof Files, title: string) => (
    <button title={title} onClick={() => setView((v) => (v === id ? null : id))} className={`relative grid h-12 w-12 place-items-center ${view === id ? 'text-[#d7d7d7]' : 'text-[#868686] hover:text-[#d7d7d7]'}`}>
      {view === id && <span className="absolute bottom-0 left-0 top-0 w-[2px] bg-[#0078d4]" />}<Icon size={24} strokeWidth={1.5} /></button>
  );
  const section = (title: string, open: boolean, extra?: React.ReactNode) => (
    <div className="group flex h-[22px] items-center border-t border-[#2b2b2b] pr-1 text-[11px] font-bold">{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}<span className="flex-1 truncate">{title}</span>{extra && <span className="flex gap-0.5 opacity-0 group-hover:opacity-100">{extra}</span>}</div>
  );
  const lang = showWelcome ? '' : LANG[ext(D.d.name)] ?? 'Plain Text';

  return (
    <div ref={kroot} className="relative flex h-full flex-col bg-[#1f1f1f] font-['Segoe_WPC','Segoe_UI',sans-serif] text-[13px] text-[#cccccc]" onPointerDown={() => ctx && setCtx(null)}>
      {/* pasek tytulu z menu i Command Center */}
      <div onPointerDown={(e) => { if (e.target === e.currentTarget) frame?.startMove(e); }} onDoubleClick={(e) => { if (e.target === e.currentTarget) frame?.toggleMax(); }}
        className={`flex h-[35px] shrink-0 select-none items-center border-b border-[#2b2b2b] ${frame?.active === false ? 'bg-[#1f1f1f] text-[#9d9d9d]' : 'bg-[#181818]'}`}>
        <span className="mx-2.5 grid h-4 w-4 place-items-center"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="#0065A9" d="M17.5 2 9.6 9.3 4.8 5.6 3 6.5v11l1.8.9 4.8-3.7 7.9 7.3 3.5-1.7V3.7z" /><path fill="#1F9CF0" d="m17.5 7-6 5 6 5z" /></svg></span>
        {Object.keys(M).map((m) => (
          <div key={m} className="relative">
            <button onClick={() => setMenu(menu === m ? null : m)} onMouseEnter={() => menu && setMenu(m)} className={`rounded-[4px] px-[7px] py-[3px] text-[13px] ${menu === m ? 'bg-white/10' : 'hover:bg-white/10'}`}>{m}</button>
            {menu === m && (
              <div className="absolute left-0 top-full z-50 mt-0.5 min-w-[260px] rounded-[6px] border border-[#454545] bg-[#1f1f1f] p-1 shadow-[0_4px_16px_rgba(0,0,0,.5)]" onMouseLeave={() => setMenu(null)}>
                {M[m].map(([l, k, f], i) => l === '-' ? <div key={i} className="my-1 h-px bg-[#454545]" /> : (
                  <button key={l} onClick={run(f)} className={`flex w-full items-center justify-between gap-6 rounded-[4px] px-6 py-[3px] text-left text-[13px] ${f ? 'hover:bg-[#0078d4] hover:text-white' : 'text-[#cccccc]/50'}`}><span>{l}</span><span className="text-[12px] opacity-80">{k}</span></button>))}
              </div>
            )}
          </div>
        ))}
        <span className="pointer-events-none flex-1" />
        <button className={tb} title="Go Back (Alt+LeftArrow)"><ArrowLeft size={16} /></button><button className={`${tb} opacity-50`} title="Go Forward (Alt+RightArrow)"><ArrowRight size={16} /></button>
        <button onClick={() => setQuick('')} title={`Search ${folder ? base(folder) : ''} (Ctrl+P)`} className="mx-1.5 flex h-[24px] w-[38%] max-w-[600px] items-center justify-center gap-2 rounded-[6px] border border-[#3c3c3c] bg-[#2a2a2a] text-[12.5px] text-[#9d9d9d] hover:bg-[#313131]">
          <Search size={14} />{folder ? base(folder) || 'C:' : 'Search'}</button>
        <button className={tb} title="Toggle Chat (Ctrl+Alt+I)"><MessageSquare size={15} /></button>
        <span className="pointer-events-none flex-1" />
        <button className={tb} title="Toggle Primary Side Bar (Ctrl+B)" onClick={() => setView((v) => (v ? null : 'explorer'))}><PanelLeft size={16} /></button>
        <button className={tb} title="Toggle Panel (Ctrl+J)" onClick={() => togglePanel()}><PanelBottom size={16} /></button>
        <button className={tb} title="Toggle Secondary Side Bar (Ctrl+Alt+B)"><PanelRight size={16} /></button>
        <button className={tb} title="Customize Layout..."><LayoutTemplate size={16} /></button>
        <span className="w-2" />
        <button onClick={() => frame?.minimize()} className="grid h-full w-[46px] place-items-center hover:bg-white/10" aria-label="Minimalizuj"><Minus size={15} strokeWidth={1.2} /></button>
        <button onClick={() => frame?.toggleMax()} className="grid h-full w-[46px] place-items-center hover:bg-white/10" aria-label="Maksymalizuj">{frame?.max ? <Copy size={12} strokeWidth={1.2} className="-scale-x-100" /> : <Square size={11} strokeWidth={1.2} />}</button>
        <button onClick={() => frame?.close()} className="grid h-full w-[46px] place-items-center hover:bg-[#e81123] hover:text-white" aria-label="Zamknij"><X size={16} strokeWidth={1.2} /></button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* pasek aktywnosci */}
        <div className="flex w-12 shrink-0 flex-col border-r border-[#2b2b2b] bg-[#181818]">
          {act('explorer', Files, 'Explorer (Ctrl+Shift+E)')}{act('search', Search, 'Search (Ctrl+Shift+F)')}{act('scm', GitBranch, 'Source Control (Ctrl+Shift+G)')}{act('run', Play, 'Run and Debug (Ctrl+Shift+D)')}{act('ext', Blocks, 'Extensions (Ctrl+Shift+X)')}
          <span className="flex-1" />
          <button title="Accounts" className="grid h-12 w-12 place-items-center text-[#868686] hover:text-[#d7d7d7]"><CircleUserRound size={24} strokeWidth={1.5} /></button>
          <button title="Manage" className="grid h-12 w-12 place-items-center text-[#868686] hover:text-[#d7d7d7]"><Settings size={24} strokeWidth={1.5} /></button>
        </div>

        {/* pasek boczny */}
        {view && (
          <div className="flex w-[260px] shrink-0 flex-col border-r border-[#2b2b2b] bg-[#181818]">
            <div className="flex h-[35px] items-center justify-between pl-5 pr-2 text-[11px]"><span>{({ explorer: 'EXPLORER', search: 'SEARCH', scm: 'SOURCE CONTROL', run: 'RUN AND DEBUG', ext: 'EXTENSIONS' })[view]}</span><button className={tb}><MoreHorizontal size={16} /></button></div>
            {view === 'explorer' && (folder ? (<>
              {section(base(folder).toUpperCase() || 'C:', true, <>
                <button className={tb} title="New File..." onClick={() => startNew('file')}><FilePlus size={16} /></button>
                <button className={tb} title="New Folder..." onClick={() => startNew('dir')}><FolderPlus size={16} /></button>
                <button className={tb} title="Refresh Explorer"><RefreshCw size={15} /></button>
                <button className={tb} title="Collapse Folders in Explorer" onClick={() => setOpenDirs({})}><ListCollapse size={16} /></button></>)}
              <div className="min-h-0 flex-1 overflow-auto pb-4 text-[13px]" onClick={(e) => { if (e.target === e.currentTarget) setSelPath(null); }} onContextMenu={(e) => { e.preventDefault(); setSelPath(null); setCtx({ x: e.clientX, y: e.clientY, path: null }); }}>{tree(folder, 0)}</div>
              {section('OUTLINE', false)}{section('TIMELINE', false)}
            </>) : (<>
              {section('NO FOLDER OPENED', true)}
              <div className="space-y-3 px-5 py-2 text-[13px] leading-snug">
                <p>You have not yet opened a folder.</p>
                <button data-coach="vsc-open-folder" onClick={() => void openFolder()} className="w-full rounded-[2px] border border-white/10 bg-[#0078d4] py-1 text-white hover:bg-[#026ec1]">Open Folder</button>
                {D.docs.some((d) => d.path || d.text) && <p>Opening a folder will close all currently open editors. To keep them open, add a folder instead.</p>}
                <p>You can clone a repository locally.</p>
                <button className="w-full rounded-[2px] border border-white/10 bg-[#0078d4] py-1 text-white hover:bg-[#026ec1]">Clone Repository</button>
                <p>To learn more about how to use Git and source control in VS Code <span className="text-[#4daafc]">read our docs</span>.</p>
              </div>
            </>))}
            {view === 'search' && (
              <div className="px-3 text-[13px]">
                <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="mb-2 h-[26px] w-full border border-[#3c3c3c] bg-[#313131] px-1.5 outline-none placeholder:text-[#989898] focus:border-[#0078d4]" />
                {search && folder && (() => { const res = allFiles.flatMap((p) => { const n = vfs.get(p); if (!n || n.bin) return []; const lines = (n.data ?? '').split('\n'); return lines.map((l, i) => ({ p, i, l })).filter((x) => x.l.toLowerCase().includes(search.toLowerCase())).slice(0, 20); });
                  return <><p className="mb-1 text-[12px] text-[#9d9d9d]">{res.length ? `${res.length} results in ${new Set(res.map((r) => r.p)).size} files` : 'No results found. Review your settings for configured exclusions and check your gitignore files'}</p>
                    {res.slice(0, 80).map((r) => <button key={r.p + r.i} onClick={() => openPath(r.p)} className="flex w-full items-center gap-1.5 truncate px-1 py-[1px] text-left hover:bg-[#2a2d2e]"><Seti name={base(r.p)} /><span className="truncate"><span className="text-[#9d9d9d]">{base(r.p)}:{r.i + 1} </span>{r.l.trim()}</span></button>)}</>; })()}
                {!folder && <p className="text-[#9d9d9d]">Open a folder to search its files.</p>}
              </div>
            )}
            {view === 'scm' && <div className="space-y-3 px-5 py-2 leading-snug"><p>The folder currently open doesn't have a git repository. You can initialize a repository which will enable source control features powered by git.</p><button className="w-full rounded-[2px] bg-[#0078d4] py-1 text-white hover:bg-[#026ec1]">Initialize Repository</button></div>}
            {view === 'run' && <div className="space-y-3 px-5 py-2 leading-snug"><button className="w-full rounded-[2px] bg-[#0078d4] py-1 text-white hover:bg-[#026ec1]">Run and Debug</button><p>To customize Run and Debug <span className="text-[#4daafc]">create a launch.json file</span>.</p></div>}
            {view === 'ext' && <div className="px-3"><input placeholder="Search Extensions in Marketplace" className="mb-2 h-[26px] w-full border border-[#3c3c3c] bg-[#313131] px-1.5 outline-none placeholder:text-[#989898]" />{section('INSTALLED', true)}<p className="px-2 py-2 text-[#9d9d9d]">No extensions installed. The exam workstation has no internet access.</p></div>}
          </div>
        )}

        {/* edytor */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex h-[35px] shrink-0 overflow-x-auto border-b border-[#2b2b2b] bg-[#181818] [scrollbar-width:none]">
              {showWelcome ? (
                <div className="flex items-center gap-1.5 border-r border-[#2b2b2b] border-t border-t-[#0078d4] bg-[#1f1f1f] pl-3 pr-2 text-white"><svg viewBox="0 0 24 24" width="14" height="14"><path fill="#1F9CF0" d="M17.5 2 9.6 9.3 4.8 5.6 3 6.5v11l1.8.9 4.8-3.7 7.9 7.3 3.5-1.7V3.7z" /></svg><span className="italic">Welcome</span><button onClick={() => setWelcome(false)} className="ml-2 grid h-5 w-5 place-items-center rounded-[4px] hover:bg-white/10"><X size={14} /></button></div>
              ) : D.docs.map((d, i) => {
                const on = i === D.cur; const dirty = d.text !== d.saved;
                return (
                  <div key={d.id} onClick={() => D.setCur(i)} onAuxClick={(e) => { if (e.button === 1) void D.closeDoc(i); }}
                    className={`group flex shrink-0 cursor-pointer items-center gap-1.5 border-r border-[#2b2b2b] pl-3 pr-1.5 ${on ? 'border-t border-t-[#0078d4] bg-[#1f1f1f] text-white' : 'border-t border-t-transparent bg-[#181818] text-[#9d9d9d]'}`}>
                    <Seti name={d.path ? d.name : 'x.txt'} /><span>{d.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); void D.closeDoc(i); }} title="Close (Ctrl+F4)" className="ml-1.5 grid h-5 w-5 place-items-center rounded-[4px] hover:bg-white/10">
                      {dirty ? <><span className="h-2 w-2 rounded-full bg-current group-hover:hidden" /><X size={14} className="hidden group-hover:block" /></> : <X size={14} className={on ? '' : 'invisible group-hover:visible'} />}</button>
                  </div>);
              })}
            </div>
            {!showWelcome && <div className="flex h-[22px] shrink-0 items-center gap-1 px-3 text-[12.5px] text-[#a9a9a9]">
              {(D.d.path && folder && D.d.path.startsWith(folder + '/') ? D.d.path.slice(folder.length + 1).split('/') : [D.d.name]).map((seg, i, all) => <span key={i} className="flex items-center gap-1">{i === all.length - 1 && <Seti name={seg} />}<span className="hover:text-[#cccccc]">{seg}</span>{i < all.length - 1 && <ChevronRight size={14} />}</span>)}</div>}
            <div className="min-h-0 flex-1 overflow-hidden">
              {showWelcome ? (
                <div className="h-full overflow-auto px-[8%] py-[6%]">
                  <p className="text-[34px] font-light text-[#cccccc]">Visual Studio Code</p><p className="mb-10 text-[19px] text-[#9d9d9d]">Editing evolved</p>
                  <div className="grid gap-10 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-[17px]">Start</p>
                      <div className="space-y-1.5 text-[#4daafc]">{([[FilePlus, 'New File...', newFile], [Files, 'Open File...', () => void D.open(FILTERS, folder ?? undefined).then(() => setWelcome(false))], [FolderPlus, 'Open Folder...', () => void openFolder()], [GitBranch, 'Clone Git Repository...', null], [Play, 'Connect to...', null]] as [typeof Files, string, (() => void) | null][]).map(([I, l, f]) => <button key={l} onClick={() => f?.()} className="flex items-center gap-2 hover:underline"><I size={16} />{l}</button>)}</div>
                      <p className="mb-2 mt-8 text-[17px]">Recent</p>
                      {folder ? <button onClick={() => setView('explorer')} className="text-[#4daafc] hover:underline">{base(folder)} <span className="ml-3 text-[#9d9d9d]">{winPath(parent(folder))}</span></button> : <button onClick={() => { setFolder(HTDOCS); setView('explorer'); }} className="text-[#4daafc] hover:underline">htdocs <span className="ml-3 text-[#9d9d9d]">C:\xampp</span></button>}
                    </div>
                    <div>
                      <p className="mb-2 text-[17px]">Walkthroughs</p>
                      {['Get started with VS Code', 'Learn the Fundamentals', 'Get Started with Accessibility Features'].map((t, i) => (
                        <div key={t} className="mb-2 rounded-[6px] bg-[#2b2b2b] px-4 py-3 hover:bg-[#313131]"><p className="flex items-center gap-2">{i === 0 && <span className="text-[#cca700]">★</span>}{t}</p>{i === 0 && <><p className="mt-1 text-[12.5px] text-[#9d9d9d]">Customize your editor, learn the basics, and start coding</p><div className="mt-2 h-1 rounded bg-[#454545]"><div className="h-full w-[10%] rounded bg-[#0078d4]" /></div></>}</div>))}
                      <p className="text-[#4daafc]">More...</p>
                    </div>
                  </div>
                  <label className="mt-12 flex items-center justify-center gap-2 text-[#cccccc]"><input type="checkbox" defaultChecked className="accent-[#0078d4]" />Show welcome page on startup</label>
                </div>
              ) : (
                <Suspense fallback={null}><Editor key={D.d.id} theme="vscode-dark-modern" bare autoFocus file={D.d.path ? base(D.d.path) : `${D.d.name}.txt`} value={D.d.text} onChange={(v) => D.update({ text: v })} onCursor={(ln, col, sel) => setPos({ ln, col, sel })} /></Suspense>
              )}
            </div>
          </div>

          {/* panel: terminal i reszta */}
          {panel && (
            <div className="flex h-[38%] min-h-[120px] shrink-0 flex-col border-t border-[#2b2b2b] bg-[#181818]">
              <div className="flex h-[35px] shrink-0 items-center gap-4 px-4 text-[11px]">
                {([['problems', 'PROBLEMS'], ['output', 'OUTPUT'], ['debug', 'DEBUG CONSOLE'], ['terminal', 'TERMINAL'], ['ports', 'PORTS']] as [Panel, string][]).map(([k, l]) => <button key={k} onClick={() => setPanel(k)} className={`h-full border-b ${panel === k ? 'border-[#0078d4] text-[#e7e7e7]' : 'border-transparent text-[#9d9d9d] hover:text-[#e7e7e7]'}`}>{l}</button>)}
                <span className="flex-1" />
                {panel === 'terminal' && <span className="flex items-center gap-1 text-[12px] text-[#cccccc]"><span className="mr-1">powershell</span><button className={tb} title="New Terminal"><Plus size={15} /></button><button className={tb} title="Split Terminal"><SplitSquareHorizontal size={14} /></button><button className={tb} title="Kill Terminal" onClick={() => setPanel(null)}><Trash2 size={14} /></button></span>}
                <button className={tb}><MoreHorizontal size={15} /></button><button className={tb} title="Maximize Panel Size"><ChevronUp size={15} /></button><button className={tb} title="Hide Panel (Ctrl+J)" onClick={() => setPanel(null)}><X size={15} /></button>
              </div>
              <div className="min-h-0 flex-1 overflow-auto px-5 pb-2 font-['Consolas',monospace] text-[14px] leading-[1.35]" onClick={(e) => (e.currentTarget.querySelector('input') as HTMLInputElement | null)?.focus()}>
                {panel === 'terminal' ? <>
                  {term.map((l, i) => <div key={i} className="whitespace-pre-wrap break-all">{l || ' '}</div>)}
                  <div ref={termEnd} className="flex"><span className="whitespace-pre">PS {winPath(cwd)}&gt; </span><input autoFocus spellCheck={false} onKeyDown={(e) => { if (e.key === 'Enter') { exec(e.currentTarget.value); e.currentTarget.value = ''; } }} className="min-w-0 flex-1 bg-transparent caret-[#cccccc] outline-none" /></div>
                </> : <p className="pt-1 font-['Segoe_UI',sans-serif] text-[13px] text-[#9d9d9d]">{panel === 'problems' ? 'No problems have been detected in the workspace.' : panel === 'ports' ? 'No forwarded ports. Forward a port to access your running services locally.' : ''}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* pasek stanu */}
      <div className={`flex h-[22px] shrink-0 items-center border-t border-[#2b2b2b] text-[12px] text-[#cccccc] ${folder ? 'bg-[#181818]' : 'bg-[#1f1f1f]'}`}>
        <span className="grid h-full w-[34px] place-items-center bg-[#0078d4] text-white" title="Open a Remote Window">&gt;&lt;</span>
        <button onClick={() => setPanel('problems')} className="flex h-full items-center gap-1 px-2 hover:bg-white/10"><CircleX size={13} />0 <TriangleAlert size={13} />0</button>
        <span className="flex-1" />
        {!showWelcome && <>
          <button className="h-full px-2 hover:bg-white/10">Ln {pos.ln}, Col {pos.col}{pos.sel ? ` (${pos.sel} selected)` : ''}</button>
          <button className="h-full px-2 hover:bg-white/10">Spaces: 4</button><button className="h-full px-2 hover:bg-white/10">UTF-8</button><button className="h-full px-2 hover:bg-white/10">CRLF</button>
          <button className="h-full px-2 hover:bg-white/10">{'{ }'} {lang}</button></>}
        <button className="grid h-full place-items-center px-2 hover:bg-white/10" title="No Notifications"><Bell size={13} /></button>
      </div>

      {/* menu kontekstowe Eksploratora */}
      {ctx && (
        <div onPointerDown={(e) => e.stopPropagation()} style={{ left: ctx.x - (kroot.current?.getBoundingClientRect().left ?? 0), top: ctx.y - (kroot.current?.getBoundingClientRect().top ?? 0) }}
          className="absolute z-50 min-w-[240px] rounded-[6px] border border-[#454545] bg-[#1f1f1f] p-1 text-[13px] shadow-[0_4px_16px_rgba(0,0,0,.5)]">
          {([['New File...', '', () => startNew('file')], ['New Folder...', '', () => startNew('dir')], ['Reveal in File Explorer', 'Shift+Alt+R', () => os.open('explorer', { path: ctx.path ? (vfs.isDir(ctx.path) ? ctx.path : parent(ctx.path)) : folder })], ['Open in Integrated Terminal', '', () => { setCwd(ctx.path && vfs.isDir(ctx.path) ? ctx.path : folder ?? cwd); setPanel('terminal'); }], ['-', '', null],
            ...(ctx.path ? [['Copy Path', 'Shift+Alt+C', () => void navigator.clipboard?.writeText(winPath(ctx.path!))], ['Copy Relative Path', 'Ctrl+K Ctrl+Shift+C', () => void navigator.clipboard?.writeText(winPath(ctx.path!.slice((folder ?? '').length + 1)))], ['-', '', null], ['Rename...', 'F2', () => setRenaming(ctx.path)], ['Delete', 'Delete', () => del(ctx.path!)]] : [])] as [string, string, (() => void) | null][])
            .map(([l, k, f], i) => l === '-' ? <div key={i} className="my-1 h-px bg-[#454545]" /> : <button key={l} onClick={() => { setCtx(null); f?.(); }} className="flex w-full justify-between gap-6 rounded-[4px] px-6 py-[3px] text-left hover:bg-[#0078d4] hover:text-white"><span>{l}</span><span className="text-[12px] opacity-80">{k}</span></button>)}
        </div>
      )}

      {/* Ctrl+P / Ctrl+Shift+P */}
      {quick !== null && (
        <div className="absolute inset-0 z-50" onPointerDown={() => setQuick(null)}>
          <div onPointerDown={(e) => e.stopPropagation()} className="absolute left-1/2 top-[40px] w-[600px] max-w-[90%] -translate-x-1/2 rounded-[6px] border border-[#313131] bg-[#222222] p-1.5 shadow-[0_8px_24px_rgba(0,0,0,.6)]">
            <input autoFocus value={quick} onChange={(e) => setQuick(e.target.value)} spellCheck={false}
              onKeyDown={(e) => { if (!e.ctrlKey) e.stopPropagation(); if (e.key === 'Escape') setQuick(null); else if (e.key === 'ArrowDown') { e.preventDefault(); setQi((i) => Math.min(qItems.length - 1, i + 1)); } else if (e.key === 'ArrowUp') { e.preventDefault(); setQi((i) => Math.max(0, i - 1)); } else if (e.key === 'Enter' && qItems[qi]) { setQuick(null); qItems[qi].run(); } }}
              placeholder={quick.startsWith('>') ? '' : 'Search files by name (append : to go to line or @ to go to symbol)'} className="h-[26px] w-full rounded-[2px] border border-[#0078d4] bg-[#313131] px-1.5 outline-none placeholder:text-[#989898]" />
            <div className="mt-1 max-h-[320px] overflow-auto">
              {!quick.startsWith('>') && !quick && <p className="px-2 pt-1 text-right text-[11px] text-[#9d9d9d]">{allFiles.length ? 'recently opened' : ''}</p>}
              {qItems.map((it, i) => <button key={it.key} onMouseEnter={() => setQi(i)} onClick={() => { setQuick(null); it.run(); }} className={`flex h-[22px] w-full items-center gap-2 rounded-[3px] px-2 text-left ${i === qi ? 'bg-[#04395e] text-white' : ''}`}>{!quick.startsWith('>') && <Seti name={it.label} />}<span className="truncate">{it.label}</span><span className="truncate text-[12px] text-[#9d9d9d]">{it.desc}</span><span className="ml-auto text-[11.5px] text-[#9d9d9d]">{it.kb}</span></button>)}
              {!qItems.length && <p className="px-2 py-1 text-[#9d9d9d]">{quick.startsWith('>') ? 'No matching commands' : folder ? 'No matching results' : 'Open a folder to search files.'}</p>}
            </div>
          </div>
        </div>
      )}

      {/* okno: zapisac zmiany? */}
      {modal && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-black/30">
          <div className="w-[440px] rounded-[6px] border border-[#454545] bg-[#1f1f1f] p-5 shadow-[0_8px_32px_rgba(0,0,0,.6)]">
            <div className="flex gap-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#cca700] text-[20px] font-bold text-black">!</span>
              <div><p className="mb-1.5 font-semibold">Do you want to save the changes you made to {modal.doc.name}?</p><p className="text-[#9d9d9d]">Your changes will be lost if you don't save them.</p></div></div>
            <div className="mt-5 flex justify-end gap-2">
              {([['save', 'Save', true], ['discard', "Don't Save", false], ['cancel', 'Cancel', false]] as const).map(([r, l, primary]) => <button key={r} autoFocus={primary} onClick={() => { modal.done(r); setModal(null); }} className={`min-w-[90px] rounded-[2px] px-3 py-1 ${primary ? 'bg-[#0078d4] text-white hover:bg-[#026ec1]' : 'bg-[#313131] hover:bg-[#3c3c3c]'}`}>{l}</button>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
