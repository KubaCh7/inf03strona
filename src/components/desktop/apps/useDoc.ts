import { useState } from 'react';
import { useOS, type PickOpts } from '../os';
import { base, DOCS, parent, dataUrlToText } from '../../../lib/vfs';

export type Doc = { id: number; path: string | null; name: string; text: string; saved: string };
let nid = 1;
export const TEXT_FILTERS: PickOpts['filters'] = [{ label: 'Wszystkie pliki (*.*)', exts: ['*'] }, { label: 'Dokumenty tekstowe (*.txt)', exts: ['txt'] }];

/** Wiele otwartych dokumentow (karty) zapisywanych na wirtualnym dysku. */
export function useDocs(initial?: string | null, untitled = 'Bez tytułu') {
  const os = useOS();
  const load = (p: string): Doc => { const n = os.vfs.get(p); const t = n?.bin ? dataUrlToText(n.data ?? '') : n?.data ?? ''; return { id: nid++, path: p, name: base(p), text: t, saved: t }; };
  const blank = (): Doc => ({ id: nid++, path: null, name: untitled, text: '', saved: '' });
  const [docs, setDocs] = useState<Doc[]>(() => [initial && os.vfs.exists(initial) ? load(initial) : blank()]);
  const [cur, setCur] = useState(0);
  const d = docs[Math.min(cur, docs.length - 1)];
  const update = (patch: Partial<Doc>, i = cur) => setDocs((ds) => ds.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  async function saveAs(filters = TEXT_FILTERS, i = cur) {
    const doc = docs[i];
    const p = await os.pick({ mode: 'save', title: 'Zapisywanie jako', dir: doc.path ? parent(doc.path) : DOCS, name: doc.path ? base(doc.path) : `${doc.name === untitled ? '*' : doc.name}.txt`.replace(/^\*\.txt$/, ''), filters });
    if (!p) return false;
    os.vfs.write(p, doc.text); update({ path: p, name: base(p), saved: doc.text }, i); return true;
  }
  async function save(filters?: PickOpts['filters'], i = cur) {
    const doc = docs[i];
    if (!doc.path) return saveAs(filters, i);
    os.vfs.write(doc.path, doc.text); update({ saved: doc.text }, i); return true;
  }
  async function open(filters?: PickOpts['filters'], dir?: string) {
    const p = await os.pick({ mode: 'open', title: 'Otwieranie', dir: dir ?? (d.path ? parent(d.path) : DOCS), filters: filters ?? TEXT_FILTERS });
    if (p) openPath(p);
  }
  function openPath(p: string) {
    const i = docs.findIndex((x) => x.path === p);
    if (i >= 0) { setCur(i); return; }
    const nd = load(p);
    setDocs((ds) => (ds.length === 1 && !ds[0].path && !ds[0].text ? [nd] : [...ds, nd]));
    setCur((c) => (docs.length === 1 && !docs[0].path && !docs[0].text ? 0 : docs.length));
  }
  const newDoc = () => { setDocs((ds) => [...ds, blank()]); setCur(docs.length); };
  async function closeDoc(i: number) {
    const doc = docs[i];
    if (doc.text !== doc.saved && !(await os.confirm(os.sheet ? 'Zapisywanie' : '', `Czy chcesz zapisać zmiany w ${doc.path ?? doc.name}?`).then((ok) => (ok ? save(undefined, i) : true)))) return;
    setDocs((ds) => { const n = ds.filter((_, k) => k !== i); return n.length ? n : [blank()]; });
    setCur((c) => Math.max(0, c >= i ? c - 1 : c));
  }
  return { docs, cur, setCur, d, update, save, saveAs, open, openPath, newDoc, closeDoc };
}
