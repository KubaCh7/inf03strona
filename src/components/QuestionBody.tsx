import type { Question } from '../lib/types';

/** Tresc pytania: tekst albo wycinek z arkusza CKE (rysunki, listingi kodu). */
export function QuestionBody({ q, size = 'lg' }: { q: Pick<Question, 'text' | 'image' | 'sources'> & { source?: string }; size?: 'lg' | 'md' }) {
  return (
    <div>
      {q.image ? (
        <figure>
          <img src={q.image} alt={q.text} loading="lazy" className="w-full max-w-3xl rounded-lg border border-line bg-white p-2 dark:invert-[.92] dark:hue-rotate-180" />
          {!/Kod \d|Rysunek \d|Kształt \d/.test(q.text) && q.text.length < 400 && <figcaption className="sr-only">{q.text}</figcaption>}
        </figure>
      ) : (
        <h3 className={`${size === 'lg' ? 'text-xl md:text-2xl' : 'text-lg md:text-xl'} whitespace-pre-line font-bold leading-snug`} style={{ fontFamily: 'var(--font-sans)', letterSpacing: 0 }}>{q.text}</h3>
      )}
      {q.source === 'cke' && q.sources?.[0] && <p className="mt-2 text-xs text-muted">Pytanie z arkusza CKE · {q.sources.slice(0, 3).join(', ')}{q.sources.length > 3 ? ` i ${q.sources.length - 3} innych` : ''}</p>}
    </div>
  );
}

/** Etykieta odpowiedzi; przy odpowiedziach na obrazku (skan/OCR) pokazujemy tylko litere. */
export function answerLabel(q: Pick<Question, 'imageAnswers' | 'ocr'>, text: string, origIndex: number) {
  if (q.imageAnswers && q.ocr) return `Odpowiedź ${'ABCD'[origIndex]}`;
  return text;
}
