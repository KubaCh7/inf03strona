// „System” pulpitu egzaminacyjnego: okna, skojarzenia plikow, schowek, okna Otworz/Zapisz jako.
import { createContext, useContext, useEffect, useRef } from 'react';
import { AppSvg, FolderSvg, FileSvg, PcSvg, BinSvg } from './icons';
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
  properties: (path: string) => void;
};
export const OSContext = createContext<OS | null>(null);
export const useOS = () => useContext(OSContext)!;

export const APPS: Record<AppId, { name: string; w: number; h: number; icon: (s?: number) => React.ReactNode }> = {
  explorer: { name: 'Eksplorator plików', w: 900, h: 560, icon: (s = 20) => AppSvg.explorer(s) },
  notepad: { name: 'Notatnik', w: 760, h: 520, icon: (s = 20) => AppSvg.notepad(s) },
  notepadpp: { name: 'Notepad++', w: 1000, h: 680, icon: (s = 20) => AppSvg.notepadpp(s) },
  vscode: { name: 'Visual Studio Code', w: 1150, h: 720, icon: (s = 20) => AppSvg.vscode(s) },
  browser: { name: 'Microsoft Edge', w: 1150, h: 740, icon: (s = 20) => AppSvg.browser(s) },
  xampp: { name: 'XAMPP Control Panel', w: 680, h: 500, icon: (s = 20) => AppSvg.xampp(s) },
  paint: { name: 'Paint', w: 1000, h: 680, icon: (s = 20) => AppSvg.paint(s) },
  gimp: { name: 'GIMP 2.10', w: 1280, h: 780, icon: (s = 20) => AppSvg.gimp(s) },
  photoshop: { name: 'Photoshop', w: 1280, h: 780, icon: (s = 20) => AppSvg.photoshop(s) },
  pdf: { name: 'Arkusz egzaminacyjny', w: 900, h: 760, icon: (s = 20) => AppSvg.pdf(s) },
  sevenzip: { name: '7-Zip', w: 720, h: 460, icon: (s = 20) => AppSvg.sevenzip(s) },
};

/** Ikona pliku / folderu jak w Eksploratorze Windows 11. */
export function FileIcon({ path, dir, size = 20 }: { path: string; dir?: boolean; size?: number }) {
  return dir ? <FolderSvg size={size} /> : <FileSvg path={path} size={size} />;
}
export const SpecialIcon = { pc: (s = 32) => <PcSvg size={s} />, trash: (s = 32, full = false) => <BinSvg size={s} full={full} /> };

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

// ---------- przeciaganie plikow (pulpit, Eksplorator, foldery, Kosz) ----------
export const DND = 'application/x-p03-paths';
export function dragStart(e: React.DragEvent, paths: string[]) {
  e.dataTransfer.setData(DND, JSON.stringify(paths));
  e.dataTransfer.effectAllowed = 'copyMove';
}
export const isFileDrag = (e: React.DragEvent) => e.dataTransfer.types.includes(DND) || e.dataTransfer.types.includes('Files');
/** Upuszczenie na folder: pliki z pulpitu/Eksploratora sa przenoszone (Ctrl = kopiuj), pliki z komputera kopiowane. */
export async function dropTo(os: OS, e: React.DragEvent, dir: string) {
  e.preventDefault(); e.stopPropagation();
  const raw = e.dataTransfer.getData(DND);
  const { vfs } = os;
  try {
    if (raw) {
      const paths = JSON.parse(raw) as string[];
      for (const p of paths) {
        if (!vfs.exists(p) || p === dir || parentOf(p) === dir) continue;
        if (dir === RECYCLE_PATH) vfs.trash(p); else vfs.copy(p, dir, !e.ctrlKey);
      }
      return;
    }
    for (const f of Array.from(e.dataTransfer.files)) {
      const bin = !/\.(html?|php|css|js|txt|sql|csv|json|xml)$/i.test(f.name);
      const data = bin ? await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f); }) : await f.text();
      vfs.write(vfs.unique(dir, f.name), data, bin);
    }
  } catch (err) { void os.alert('Przenoszenie elementów', (err as Error).message, 'error'); }
}
const parentOf = (p: string) => p.slice(0, p.lastIndexOf('/'));
const RECYCLE_PATH = 'C:/$Recycle.Bin';
