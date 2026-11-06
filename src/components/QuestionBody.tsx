import type { Question } from '../lib/types';

type Q = Pick<Question, 'text' | 'image' | 'sources' | 'code' | 'text2' | 'figure' | 'imageAnswers'> & { source?: string };

/** Tresc pytania jako tekst + blok kodu. Obrazek tylko gdy pytanie ma rysunek albo odpowiedzi sa obrazkami. */
export function QuestionBody({ q, size = 'lg' }: { q: Q; size?: 'lg' | 'md' }) {
  const h = `${size === 'lg' ? 'text-xl md:text-2xl' : 'text-lg md:text-xl'} whitespace-pre-line font-bold leading-snug`;
  const style = { fontFamily: 'var(--font-sans)', letterSpacing: 0 };
  const img = q.image && (q.imageAnswers || q.figure) ? (
    <figure className="mt-3">
      <img src={q.image} alt={q.figure ? 'Rysunek do pytania' : q.text} loading="lazy" className={`rounded-lg border border-line bg-white p-2 ${q.figure ? 'max-h-80 max-w-full' : 'w-full max-w-3xl dark:invert-[.92] dark:hue-rotate-180'}`} />
    </figure>
  ) : null;
  return (
    <div>
      {q.text && <h3 className={h} style={style}>{q.text}</h3>}
      {q.code && <pre className="mono mt-3 max-w-3xl overflow-x-auto rounded-lg border border-line bg-surface-2 p-3 text-sm leading-relaxed" style={{ fontVariantLigatures: 'none' }}>{q.code}</pre>}
      {q.text2 && <h3 className={`${h} mt-3`} style={style}>{q.text2}</h3>}
      {img}
      {q.source === 'cke' && q.sources?.[0] && <p className="mt-2 text-xs text-muted">Pytanie z arkusza CKE · {q.sources.slice(0, 3).join(', ')}{q.sources.length > 3 ? ` i ${q.sources.length - 3} innych` : ''}</p>}
    </div>
  );
}

/** Etykieta odpowiedzi; gdy odpowiedzi sa obrazkami (skan), pokazujemy tylko litere. */
export function answerLabel(q: Pick<Question, 'imageAnswers' | 'ocr'>, text: string, origIndex: number) {
  if (q.imageAnswers && q.ocr) return `Odpowiedź ${'ABCD'[origIndex]}`;
  return text;
}
