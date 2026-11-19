import PdfViewer from '../../PdfViewer';
import { useOS, type Win } from '../os';
import { useEffect } from 'react';

/** Arkusz egzaminacyjny (PDF) w oknie. */
export default function PdfApp({ win }: { win: Win }) {
  const os = useOS();
  useEffect(() => { os.setTitle(win.id, `${os.sheet.code}.pdf — Arkusz egzaminacyjny`); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="flex h-full flex-col bg-[#e9e9e9] p-1"><PdfViewer url={os.sheet.files.pdfRaw} fallback={os.sheet.files.pdfView} className="min-h-0 flex-1" /></div>;
}
