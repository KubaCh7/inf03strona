// „System” pulpitu egzaminacyjnego: okna, skojarzenia plikow, schowek, okna Otworz/Zapisz jako.
import { createContext, useContext, useEffect, useRef } from 'react';
import { Folder, FileText, FileCode, FileImage, FileArchive, Server, NotebookPen, Code2, Brush, Image as Img, Palette, Globe, FolderOpen, NotebookText, Monitor, Trash2, File, BookOpen } from 'lucide-react';
import type { Sheet } from '../../lib/types';
import type { Vfs } from '../../lib/vfs';
import { ext } from '../../lib/vfs';
import type { MysqlServer } from '../../lib/mysqlServer';

export type AppId = 'explorer' | 'notepad' | 'notepadpp' | 'vscode' | 'browser' | 'xampp' | 'paint' | 'gimp' | 'photoshop' | 'pdf' | 'sevenzip';
export type Win = { id: number; app: AppId; title: string; args: Record<string, unknown>; x: number; y: number; w: number; h: number; min: boolean; max: boolean; z: number };
export type PickOpts = { mode: 'open' | 'save'; title?: string; dir?: string; name?: string; filters?: { label: string; exts: string[] }[]; dirOnly?: boolean };

export type OS = {
  vfs: Vfs; sheet: Sheet; server: MysqlServer; candidate: string;
  open: (app: AppId, args?: Record<string, unknown>) => void;
  openPath: (path: string) => void;
  close: (id: number) => void;
  setTitle: (id: number, t: string) => void;
  pick: (o: PickOpts) => Promise<string | null>;
  alert: (title: string, text: string, kind?: 'error' | 'info' | 'warn') => Promise<void>;
  confirm: (title: string, text: string) => Promise<boolean>;
  clip: { files?: { mode: 'copy' | 'cut'; paths: string[] }; image?: string };
  setClip: (c: OS['clip']) => void;
  screenshot: () => Promise<void>;
};
export const OSContext = createContext<OS | null>(null);
export const useOS = () => useContext(OSContext)!;

export const APPS: Record<AppId, { name: string; w: number; h: number; icon: (s?: number) => React.ReactNode }> = {
  explorer: { name: 'Eksplorator plików', w: 900, h: 560, icon: (s = 20) => <FolderOpen size={s} className="fill-[#ffd257] text-[#c79a1a]" strokeWidth={1.4} /> },
  notepad: { name: 'Notatnik', w: 760, h: 520, icon: (s = 20) => <NotebookText size={s} className="text-[#2b88d8]" strokeWidth={1.6} /> },
  notepadpp: { name: 'Notepad++', w: 1000, h: 680, icon: (s = 20) => <NotebookPen size={s} className="text-[#7bc043]" strokeWidth={1.8} /> },
  vscode: { name: 'Visual Studio Code', w: 1150, h: 720, icon: (s = 20) => <span className="grid place-items-center rounded-[4px] bg-[#0078d4] text-white" style={{ width: s, height: s }}><Code2 size={s * 0.7} strokeWidth={2.4} /></span> },
  browser: { name: 'Microsoft Edge', w: 1150, h: 740, icon: (s = 20) => <span className="grid place-items-center rounded-full bg-gradient-to-br from-[#36c3f0] via-[#1d7fd6] to-[#4bd36b] text-white" style={{ width: s, height: s }}><Globe size={s * 0.7} strokeWidth={2} /></span> },
  xampp: { name: 'XAMPP Control Panel', w: 680, h: 500, icon: (s = 20) => <span className="grid place-items-center rounded-[4px] bg-[#fb7a24] text-white" style={{ width: s, height: s }}><Server size={s * 0.68} strokeWidth={2.2} /></span> },
  paint: { name: 'Paint', w: 1000, h: 680, icon: (s = 20) => <Palette size={s} className="text-[#e8a33d]" strokeWidth={1.8} /> },
  gimp: { name: 'GIMP 2.10', w: 1280, h: 780, icon: (s = 20) => <span className="grid place-items-center rounded-full bg-[#7b6a52] text-[#f2d39b]" style={{ width: s, height: s }}><Brush size={s * 0.65} strokeWidth={2.2} /></span> },
  photoshop: { name: 'Photoshop', w: 1280, h: 780, icon: (s = 20) => <span className="grid place-items-center rounded-[4px] bg-[#0e2a47] text-[#4fb3ff]" style={{ width: s, height: s }}><Img size={s * 0.68} strokeWidth={2.2} /></span> },
  pdf: { name: 'Arkusz egzaminacyjny', w: 900, h: 760, icon: (s = 20) => <BookOpen size={s} className="text-[#d13438]" strokeWidth={1.8} /> },
  sevenzip: { name: '7-Zip', w: 720, h: 460, icon: (s = 20) => <span className="grid place-items-center bg-black font-bold text-white" style={{ width: s, height: s, fontSize: s * 0.45 }}>7z</span> },
};

/** Ikona pliku / folderu jak w Eksploratorze Windows 11. */
export function FileIcon({ path, dir, size = 20 }: { path: string; dir?: boolean; size?: number }) {
  if (dir) return <Folder size={size} className="fill-[#ffd257] text-[#d9a521]" strokeWidth={1.2} />;
  const e = ext(path);
  if (e === '7z' || e === 'zip' || e === 'rar') return <FileArchive size={size} className="text-[#8a6d3b]" strokeWidth={1.4} />;
  if (/^(png|jpe?g|gif|bmp|webp|svg|ico)$/.test(e)) return <FileImage size={size} className="text-[#2e8b57]" strokeWidth={1.4} />;
  if (/^(html?|php|css|js|sql|json|xml)$/.test(e)) return <FileCode size={size} className={e === 'php' ? 'text-[#777bb3]' : e === 'css' ? 'text-[#2965f1]' : e === 'js' ? 'text-[#c9a400]' : e === 'sql' ? 'text-[#e48e00]' : 'text-[#e34c26]'} strokeWidth={1.4} />;
  if (e === 'pdf') return <FileText size={size} className="text-[#d13438]" strokeWidth={1.4} />;
  if (e === 'txt' || e === 'csv') return <FileText size={size} className="text-[#5a5a5a]" strokeWidth={1.4} />;
  return <File size={size} className="text-[#777]" strokeWidth={1.4} />;
}
export const SpecialIcon = { pc: (s = 32) => <Monitor size={s} className="text-[#3a96dd]" strokeWidth={1.4} />, trash: (s = 32) => <Trash2 size={s} className="text-[#8c8c8c]" strokeWidth={1.3} /> };

export const typeName = (path: string, dir?: boolean) => {
  if (dir) return 'Folder plików';
  const e = ext(path);
  return ({ txt: 'Dokument tekstowy', html: 'Plik HTML', htm: 'Plik HTML', php: 'Plik PHP', css: 'Kaskadowy arkusz stylów', js: 'Plik JavaScript', sql: 'Plik SQL', png: 'Plik PNG', jpg: 'Plik JPG', jpeg: 'Plik JPEG', gif: 'Plik GIF', bmp: 'Plik BMP', webp: 'Plik WEBP', svg: 'Plik SVG', '7z': 'Archiwum 7z', zip: 'Archiwum ZIP', pdf: 'Dokument PDF', csv: 'Plik CSV', ico: 'Ikona' } as Record<string, string>)[e] ?? `Plik ${e.toUpperCase()}`;
};

/** Domyslny program dla pliku (dwuklik). */
export function defaultApp(path: string): AppId {
  const e = ext(path);
  if (e === '7z' || e === 'zip') return 'sevenzip';
  if (e === 'html' || e === 'htm' || e === 'pdf') return 'browser';
  if (/^(png|jpe?g|gif|bmp|webp)$/.test(e)) return 'paint';
  if (/^(php|css|js|sql|json|xml)$/.test(e)) return 'notepadpp';
  return 'notepad';
}
export const OPEN_WITH: Record<string, AppId[]> = {
  text: ['notepad', 'notepadpp', 'vscode', 'browser'],
  image: ['paint', 'gimp', 'photoshop', 'browser'],
};

/** Skroty klawiszowe okna: dzialaja, gdy fokus jest w oknie albo okno jest aktywne, a fokus „nigdzie” (body). */
export function useWinKeys(ref: React.RefObject<HTMLElement | null>, handler: (e: KeyboardEvent) => void) {
  const h = useRef(handler); h.current = handler;
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const el = ref.current; if (!el) return;
      const t = e.target as Node;
      const inside = el.contains(t);
      const idle = t === document.body || t === document.documentElement || !(t as HTMLElement).closest?.('[data-win]');
      if (inside || (idle && el.closest('[data-win]')?.getAttribute('data-active') === '1' && !document.querySelector('.z-\\[240\\],.z-\\[250\\],.z-\\[300\\]'))) h.current(e);
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [ref]);
}
