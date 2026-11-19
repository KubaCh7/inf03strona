import { useEffect } from 'react';
import GimpUI from './editor/GimpUI';
import PhotoshopUI from './editor/PhotoshopUI';
import { useEditor, type Src } from './editor/engine';

export type EditorMode = 'gimp' | 'photoshop';

/** Edytor grafiki w wygladzie GIMP 2.10 albo Photoshop CC (polskie wersje). Wspolny silnik, eksport do grafik warsztatu. */
export default function ImageEditor({ mode, onMode, sources, hints, defaultName, paramShot, onSave, onClose, embedded, onTitle, initial, onDoc }: {
  mode: EditorMode; onMode: (m: EditorMode) => void;
  sources: Src[]; hints: string[]; defaultName?: string;
  paramShot?: { name: string; ext: string } | null;
  onSave: (name: string, dataUrl: string) => void; onClose: () => void;
  embedded?: boolean; onTitle?: (t: string) => void; initial?: Src | null; onDoc?: (name: string) => void;
}) {
  const ed = useEditor({ onSave, paramShot });
  useEffect(() => { if (initial) void ed.open(initial, false); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ed.docName) onDoc?.(ed.docName); }, [ed.docName]); // eslint-disable-line react-hooks/exhaustive-deps
  const modeSwitch = (
    <span className="mr-2 flex items-center gap-1 text-[11px]" title="Wygląd edytora (ten sam obraz zostaje)">
      {(['gimp', 'photoshop'] as const).map((m) => <button key={m} onClick={() => onMode(m)} className={`rounded-[3px] px-2 py-0.5 ${mode === m ? 'bg-[#2f6fd1] text-white' : 'bg-black/25 text-[#ddd] hover:bg-black/40'}`}>{m === 'gimp' ? 'GIMP' : 'Photoshop'}</button>)}
    </span>
  );
  const props = { ed, sources, hints, defaultName, hasParamShot: !!paramShot, onClose, modeSwitch: embedded ? null : modeSwitch, embedded, onTitle };
  return mode === 'gimp' ? <GimpUI {...props} /> : <PhotoshopUI {...props} />;
}
