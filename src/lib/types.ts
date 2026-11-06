export type Qualification = 'INF.03' | 'EE.09' | 'E.14';
export type Sheet = {
  code: string;
  qualification: Qualification;
  year: number;
  session: 'styczen' | 'czerwiec';
  variant: string;
  title: string;
  language: 'JS' | 'PHP' | 'JS+PHP';
  tags: { group: 'HTML' | 'CSS' | 'JS' | 'PHP' | 'SQL' | 'Grafika'; label: string }[];
  sourceDifficulty: 'Easy' | 'Medium' | 'Hard';
  difficulty: { score: number; label: string; features: Record<'T' | 'Q' | 'S' | 'L' | 'K' | 'G', number> };
  files: {
    pdfRaw: string; pdfView: string; gradingRaw: string | null; archiveUrl: string | null;
    archivePassword: string | null; solutionUrl: string | null; solutionZip: string | null;
  };
  sameAs: string[];
};
export type Category = 'strony' | 'bazy' | 'aplikacje' | 'podstawy' | 'bhp' | 'angielski' | 'kompetencje';
export type Question = { id: string; category: Category; text: string; answers: string[]; correct: number; explanation: string | null; source: string; image?: string | null; imageAnswers?: boolean; ocr?: boolean; sources?: string[]; code?: string; text2?: string; figure?: boolean };
export type Flashcard = { id: string; deck: string; front: string; back: string; example: string | null };
