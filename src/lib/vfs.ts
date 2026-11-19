// Wirtualny dysk pulpitu egzaminacyjnego (C:\...). Pliki tekstowe albo binarne (data URL).
// Stan per proba egzaminu w IndexedDB, odswiezenie strony niczego nie gubi.
import { useSyncExternalStore } from 'react';

export type VNode = { dir: boolean; data?: string; bin?: boolean; mtime: number };
export const DESKTOP = 'C:/Users/Egzamin/Desktop';
export const DOCS = 'C:/Users/Egzamin/Documents';
export const DOWNLOADS = 'C:/Users/Egzamin/Downloads';
export const HTDOCS = 'C:/xampp/htdocs';
export const RECYCLE = 'C:/$Recycle.Bin';

const norm = (p: string) => p.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '').replace(/^c:/i, 'C:');
export const parent = (p: string) => norm(p).slice(0, norm(p).lastIndexOf('/')) || 'C:';
export const base = (p: string) => norm(p).slice(norm(p).lastIndexOf('/') + 1);
export const join = (...ps: string[]) => norm(ps.join('/'));
export const win = (p: string) => norm(p).replace(/\//g, '\\');
export const ext = (p: string) => (/\.([^.\\/]+)$/.exec(p)?.[1] ?? '').toLowerCase();
export const isText = (p: string) => /^(html?|php|css|js|txt|sql|csv|json|xml|md|ini|conf|log)$/.test(ext(p));
export const isImage = (p: string) => /^(png|jpe?g|gif|bmp|webp|svg|ico)$/.test(ext(p));

const XAMPP_INDEX = `<?php
	if (!empty($_SERVER['HTTPS']) && ('on' == $_SERVER['HTTPS'])) {
		$uri = 'https://';
	} else {
		$uri = 'http://';
	}
	$uri .= $_SERVER['HTTP_HOST'];
	header('Location: '.$uri.'/dashboard/');
	exit;
?>
Something is wrong with the XAMPP installation :-(
`;

function fresh(): Map<string, VNode> {
  const m = new Map<string, VNode>();
  const t = Date.now();
  for (const d of ['C:', 'C:/Users', 'C:/Users/Egzamin', DESKTOP, DOCS, DOWNLOADS, 'C:/Users/Egzamin/Pictures', 'C:/xampp', HTDOCS, 'C:/xampp/htdocs/dashboard', 'C:/xampp/htdocs/img', 'C:/xampp/mysql', 'C:/xampp/php', 'C:/xampp/apache', 'C:/Program Files', RECYCLE]) m.set(d, { dir: true, mtime: t });
  m.set(HTDOCS + '/index.php', { dir: false, data: XAMPP_INDEX, mtime: t });
  m.set(HTDOCS + '/applications.html', { dir: false, data: '<!DOCTYPE html><html><head><title>XAMPP</title></head><body><h1>Applications</h1></body></html>', mtime: t });
  m.set(HTDOCS + '/favicon.ico', { dir: false, data: '', bin: true, mtime: t });
  return m;
}

// ---------- IndexedDB ----------
function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => { const r = indexedDB.open('pracownia03-vm', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
export async function kvGet<T>(key: string): Promise<T | undefined> {
  try { const db = await idb(); return await new Promise((res) => { const q = db.transaction('kv').objectStore('kv').get(key); q.onsuccess = () => res(q.result as T); q.onerror = () => res(undefined); }); } catch { return undefined; }
}
export async function kvSet(key: string, v: unknown) {
  try { const db = await idb(); await new Promise<void>((res) => { const tx = db.transaction('kv', 'readwrite'); if (v === undefined) tx.objectStore('kv').delete(key); else tx.objectStore('kv').put(v, key); tx.oncomplete = () => res(); tx.onerror = () => res(); }); } catch { /* prywatne okno */ }
}

export class Vfs {
  nodes = fresh();
  ver = 0;
  private subs = new Set<() => void>();
  private t: number | undefined;
  constructor(public key: string) {}
  async load() { const s = await kvGet<[string, VNode][]>(this.key); if (s?.length) this.nodes = new Map(s); this.bump(false); }
  subscribe = (f: () => void) => { this.subs.add(f); return () => { this.subs.delete(f); }; };
  private bump(save = true) {
    this.ver++; this.subs.forEach((f) => f());
    if (save) { clearTimeout(this.t); this.t = window.setTimeout(() => void kvSet(this.key, [...this.nodes]), 400); }
  }
  async reset() { this.nodes = fresh(); await kvSet(this.key, undefined); this.bump(false); }

  get(p: string) { return this.nodes.get(norm(p)); }
  exists(p: string) { return this.nodes.has(norm(p)); }
  isDir(p: string) { return !!this.get(p)?.dir; }
  list(dir: string) {
    const d = norm(dir) + '/';
    return [...this.nodes.keys()].filter((k) => k.startsWith(d) && !k.slice(d.length).includes('/')).sort((a, b) => {
      const da = this.nodes.get(a)!.dir, db = this.nodes.get(b)!.dir;
      return da === db ? base(a).localeCompare(base(b), 'pl', { numeric: true }) : da ? -1 : 1;
    });
  }
  /** Wszystkie pliki (nie katalogi) pod sciezka, z sciezkami wzglednymi. */
  tree(dir: string) { const d = norm(dir) + '/'; return [...this.nodes.entries()].filter(([k, n]) => k.startsWith(d) && !n.dir).map(([k, n]) => ({ rel: k.slice(d.length), path: k, node: n })); }
  read(p: string) { return this.get(p)?.data ?? ''; }
  size(p: string) { const n = this.get(p); if (!n || n.dir) return 0; const d = n.data ?? ''; return n.bin ? Math.round((d.length - d.indexOf(',') - 1) * 0.75) : new Blob([d]).size; }
  mkdir(p: string) { const n = norm(p); if (this.exists(n)) return n; if (!this.exists(parent(n))) this.mkdir(parent(n)); this.nodes.set(n, { dir: true, mtime: Date.now() }); this.bump(); return n; }
  write(p: string, data: string, bin = false) { const n = norm(p); if (!this.exists(parent(n))) this.mkdir(parent(n)); this.nodes.set(n, { dir: false, data, bin, mtime: Date.now() }); this.bump(); return n; }
  unique(dir: string, name: string) {
    if (!this.exists(join(dir, name))) return join(dir, name);
    const m = /^(.*?)(\.[^.]*)?$/.exec(name)!; let i = 2;
    while (this.exists(join(dir, `${m[1]} (${i})${m[2] ?? ''}`))) i++;
    return join(dir, `${m[1]} (${i})${m[2] ?? ''}`);
  }
  remove(p: string) { const n = norm(p); for (const k of [...this.nodes.keys()]) if (k === n || k.startsWith(n + '/')) this.nodes.delete(k); this.bump(); }
  rename(p: string, name: string) {
    const n = norm(p), to = join(parent(n), name);
    if (to === n) return n;
    if (this.exists(to) && to.toLowerCase() !== n.toLowerCase()) throw new Error(`W tej lokalizacji istnieje już plik o nazwie „${name}”.`);
    for (const [k, v] of [...this.nodes]) if (k === n || k.startsWith(n + '/')) { this.nodes.delete(k); this.nodes.set(to + k.slice(n.length), v); }
    this.bump(); return to;
  }
  copy(src: string, destDir: string, move = false) {
    const s = norm(src), to = move && parent(s) === norm(destDir) ? s : this.unique(destDir, base(s));
    if (norm(destDir).startsWith(s + '/')) throw new Error('Folder docelowy jest podfolderem folderu źródłowego.');
    if (to === s) return s;
    for (const [k, v] of [...this.nodes]) if (k === s || k.startsWith(s + '/')) { this.nodes.set(to + k.slice(s.length), { ...v, mtime: move ? v.mtime : Date.now() }); if (move) this.nodes.delete(k); }
    this.bump(); return to;
  }
  trash(p: string) { return this.copy(p, RECYCLE, true); }
}

export function useVfs(v: Vfs) { useSyncExternalStore(v.subscribe, () => v.ver); return v; }
export const fmtSize = (b: number) => (b < 1024 ? `${b} B` : `${Math.max(1, Math.round(b / 1024)).toLocaleString('pl-PL')} KB`);
export const fmtDate = (t: number) => new Date(t).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const dataUrlToText = (d: string) => { try { const b = atob(d.slice(d.indexOf(',') + 1)); return decodeURIComponent(escape(b)); } catch { return ''; } };
