import { useMemo, useRef } from 'react';
import ImageEditor from '../../ImageEditor';
import { useOS, type Win } from '../os';
import { useVfs, DESKTOP, HTDOCS, isImage, base, parent, join } from '../../../lib/vfs';

/** GIMP / Photoshop na wirtualnym dysku: obrazy z pulpitu i htdocs, eksport do folderu otwartego pliku. */
export default function Graphics({ win }: { win: Win }) {
  const os = useOS(); const vfs = useVfs(os.vfs);
  const lastDir = useRef(win.args.path ? parent(String(win.args.path)) : DESKTOP);
  const byName = useRef(new Map<string, string>());
  const sources = useMemo(() => {
    const out: { name: string; url: string }[] = []; byName.current.clear();
    for (const root of [DESKTOP, HTDOCS, 'C:/Users/Egzamin/Pictures', 'C:/Users/Egzamin/Downloads']) for (const f of vfs.tree(root)) {
      if (!isImage(f.path) || !f.node.data) continue;
      const label = (root === DESKTOP ? '' : root === HTDOCS ? 'htdocs/' : base(root) + '/') + f.rel;
      out.push({ name: label, url: f.node.data }); byName.current.set(label, f.path);
    }
    return out;
  }, [vfs.ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const initial = win.args.path && vfs.exists(String(win.args.path)) ? { name: base(String(win.args.path)), url: vfs.read(String(win.args.path)) } : null;
  return (
    <ImageEditor embedded mode={win.app === 'gimp' ? 'gimp' : 'photoshop'} onMode={() => {}} sources={sources} hints={[]} initial={initial}
      onTitle={(t) => os.setTitle(win.id, t)}
      onDoc={(n) => { const p = byName.current.get(n) ?? [...byName.current.entries()].find(([k]) => base(k) === n)?.[1]; if (p) lastDir.current = parent(p); }}
      pickOpen={async () => { const p = await os.pick({ mode: 'open', title: win.app === 'gimp' ? 'Otwórz obraz' : 'Otwórz', dir: lastDir.current, filters: [{ label: 'Wszystkie obrazy', exts: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'] }, { label: 'Wszystkie pliki (*.*)', exts: ['*'] }] }); if (!p) return null; lastDir.current = parent(p); return { name: base(p), url: vfs.read(p) }; }}
      pickSave={async (name) => { const p = await os.pick({ mode: 'save', title: win.app === 'gimp' ? 'Eksportuj obraz' : 'Zapisz zoptymalizowany jako', dir: lastDir.current, name, filters: [{ label: 'PNG (*.png)', exts: ['png'] }, { label: 'JPEG (*.jpg)', exts: ['jpg'] }, { label: 'GIF (*.gif)', exts: ['gif'] }] }); if (p) lastDir.current = parent(p); return p; }}
      onSave={(name, url) => { const p = /^C:\//.test(name) ? name : join(lastDir.current, name); vfs.write(p, url, true); }}
      onClose={() => os.close(win.id)} />
  );
}
