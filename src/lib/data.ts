import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Flashcard, Question, Sheet } from './types';

export type Content = { sheets: Sheet[]; questions: Question[]; flashcards: Flashcard[]; source: 'supabase' | 'offline' };

let cache: Promise<Content> | null = null;
let resolved: Content | null = null;

async function fromSupabase(): Promise<Content> {
  // arkusze i pytania zawsze z paczki aplikacji: tylko tam sa pliki z archiwow (assets: grafiki + baza .sql)
  // i recznie poprawione tresci pytan. Rekordy w Supabase ich nie maja (bez assets baza egzaminu sie nie laduje).
  const [s, q, f] = await Promise.all([
    import('../data/sheets.json'),
    import('../data/questions.json'),
    supabase.from('flashcards').select('id, deck, front, back, example').limit(5000),
  ]);
  if (f.error || !Array.isArray(f.data)) throw new Error('supabase');
  return {
    sheets: s.default as Sheet[],
    questions: q.default as Question[],
    flashcards: f.data as Flashcard[],
    source: 'supabase',
  };
}

async function fromBundle(): Promise<Content> {
  const [s, q, f] = await Promise.all([
    import('../data/sheets.json'),
    import('../data/questions.json'),
    import('../data/flashcards.json'),
  ]);
  return { sheets: s.default as Sheet[], questions: q.default as Question[], flashcards: f.default as Flashcard[], source: 'offline' };
}

function sortSheets(c: Content): Content {
  const key = (s: Sheet) => s.year * 100 + (s.session === 'czerwiec' ? 6 : 1);
  c.sheets.sort((a, b) => key(b) - key(a) || a.qualification.localeCompare(b.qualification) || a.variant.localeCompare(b.variant));
  return c;
}

export function loadContent(): Promise<Content> {
  if (!cache) {
    cache = Promise.race([
      fromSupabase(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 3500)),
    ])
      .catch(() => fromBundle())
      .then(sortSheets)
      .then((c) => { resolved = c; return c; });
  }
  return cache;
}

export function useContent(): Content | null {
  const [c, setC] = useState<Content | null>(resolved);
  useEffect(() => { if (resolved) return; let on = true; loadContent().then((x) => on && setC(x)); return () => { on = false; }; }, []);
  return c;
}

export const CATEGORY_LABEL: Record<string, string> = {
  strony: 'Strony WWW', bazy: 'Bazy danych', aplikacje: 'Aplikacje', podstawy: 'Podstawy', bhp: 'BHP', angielski: 'Angielski', kompetencje: 'Kompetencje',
};
export const SESSION_LABEL = { styczen: 'styczeń', czerwiec: 'czerwiec' } as const;
