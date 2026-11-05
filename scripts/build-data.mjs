// Buduje src/data/sheets.json z indeksu Chr1skyy (152 arkusze) + liczy trudnosc 1-10.
import { readFileSync, writeFileSync } from 'node:fs';

const RAW_BASE = 'https://raw.githubusercontent.com/Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03/main';
const GH_BASE = 'https://github.com/Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03/blob/main';
const TREE_BASE = 'https://github.com/Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03/tree/main';

const TITLE_FIX = { 'Oblicz Twój wskaŁşnik BMI': 'Oblicz Twój wskaźnik BMI' };

const raw = JSON.parse(readFileSync('data/raw/chr1skyy-data.json', 'utf8'));
const enc = (p) => p.split('/').map(encodeURIComponent).join('/');

const SQL_POINTS = [
  [/SELECT/, 1], [/INSERT/, 1], [/UPDATE/, 1], [/DELETE/, 1], [/agregujące/, 2], [/GROUP BY/, 2],
  [/JOIN|n:m/, 2], [/podkwerenda/, 3], [/ALTER/, 2], [/CREATE TABLE/, 2], [/CREATE USER/, 1.5],
  [/GRANT/, 1.5], [/CREATE VIEW/, 2], [/DROP/, 1], [/daty/, 1], [/tekstowe/, 1], [/RAND/, 1],
];
const W = { T: 2, Q: 2, S: 2, L: 1.5, K: 1.5, G: 1 };
const SRC = { Easy: 0.22, Medium: 0.55, Hard: 0.85 };
const clip = (x) => Math.max(0, Math.min(1, x));
const medianTags = (() => { const a = raw.map((r) => r.tags.length).sort((a, b) => a - b); return a[Math.floor(a.length / 2)]; })();

function difficulty(r) {
  const tags = r.tags;
  const g = (p) => tags.filter((t) => t.startsWith(p + ':'));
  const T = r.language === 'JS+PHP' ? 1 : 0.5;
  let q = 0; for (const t of g('SQL')) for (const [re, pts] of SQL_POINTS) if (re.test(t)) { q += pts; break; }
  const Q = clip(q / 10);
  const S = clip((g('PHP').length + g('JS').length) / 4);
  const L = clip(g('CSS').length / 3);
  const K = clip(tags.length / (medianTags * 1.6));
  const G = clip(g('Grafika').length / 4);
  const feat = (W.T * T + W.Q * Q + W.S * S + W.L * L + W.K * K + W.G * G) / Object.values(W).reduce((a, b) => a + b);
  const blended = 0.6 * feat + 0.4 * SRC[r.difficulty];
  const r2 = (x) => Math.round(x * 100) / 100;
  return { raw: blended, features: { T: r2(T), Q: r2(Q), S: r2(S), L: r2(L), K: r2(K), G: r2(G) } };
}

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const sheets = raw.map((r) => {
  const title = TITLE_FIX[r.name] ?? r.name;
  const f = r.links.mainFolder;
  return {
    code: r.codeName,
    qualification: r.formula,
    year: r.year,
    session: r.session === 1 ? 'styczen' : 'czerwiec',
    variant: r.number,
    title,
    language: r.language,
    tags: r.tags.map((t) => { const i = t.indexOf(':'); return { group: t.slice(0, i), label: t.slice(i + 1).trim() }; }),
    sourceDifficulty: r.difficulty,
    difficulty: difficulty(r),
    files: {
      pdfRaw: `${RAW_BASE}${enc(f)}/${enc(r.links.examSheet)}`,
      pdfView: `${GH_BASE}${enc(f)}/${enc(r.links.examSheet)}`,
      gradingRaw: r.links.gradingRules ? `${RAW_BASE}${enc(f)}/${enc(r.links.gradingRules)}` : null,
      archiveUrl: r.links.archive ? `${RAW_BASE}${enc(f)}/${enc(r.links.archive)}` : null,
      archivePassword: r.archive_password || null,
      solutionUrl: r.links.solution ? `${TREE_BASE}${enc(f)}/${enc(r.links.solution)}` : null,
      solutionZip: r.links.solutionZIP ? `${RAW_BASE}${enc(f)}/${enc(r.links.solutionZIP)}` : null,
    },
    _norm: norm(title),
  };
});
// Skala wzgledna: percentyl surowego wyniku w puli 152 arkuszy -> 2..10
const sortedRaw = sheets.map((s) => s.difficulty.raw).sort((a, b) => a - b);
for (const s of sheets) {
  const pct = sortedRaw.filter((x) => x < s.difficulty.raw).length / (sortedRaw.length - 1);
  const score = 2 + Math.round(8 * pct);
  s.difficulty.score = score;
  s.difficulty.label = score <= 3 ? 'łatwy' : score <= 6 ? 'średni' : score <= 8 ? 'trudny' : 'bardzo trudny';
  delete s.difficulty.raw;
}
for (const s of sheets) s.sameAs = sheets.filter((o) => o !== s && o._norm === s._norm).map((o) => o.code);
for (const s of sheets) delete s._norm;
sheets.sort((a, b) => b.year - a.year || (b.session === 'czerwiec') - (a.session === 'czerwiec') || a.qualification.localeCompare(b.qualification) || a.variant.localeCompare(b.variant));

const codes = new Set(sheets.map((s) => s.code));
const count = (q) => sheets.filter((s) => s.qualification === q).length;
if (sheets.length !== 152 || codes.size !== 152) throw new Error(`Oczekiwano 152 unikalnych arkuszy, jest ${sheets.length}/${codes.size}`);
if (count('INF.03') !== 80 || count('EE.09') !== 40 || count('E.14') !== 32) throw new Error('Zly podzial kwalifikacji');

writeFileSync('src/data/sheets.json', JSON.stringify(sheets));
const hist = {}; for (const s of sheets) hist[s.difficulty.score] = (hist[s.difficulty.score] || 0) + 1;
console.log(`sheets.json: ${sheets.length} arkuszy, trudnosc:`, hist);

// ---- Pytania i fiszki ----
import { createHash } from 'node:crypto';
const { default: Q } = await import('../data/questions.mjs');
const { default: FC } = await import('../data/flashcards.mjs');
const CATS = ['strony', 'bazy', 'aplikacje', 'podstawy', 'bhp', 'angielski', 'kompetencje'];
const qs = Q.map(([category, text, answers, explanation]) => {
  if (!CATS.includes(category) || answers.length !== 4) throw new Error('Zle pytanie: ' + text);
  return { id: createHash('sha1').update(text).digest('hex').slice(0, 10), category, text, answers, correct: 0, explanation, source: 'original' };
});
// Pytania z opublikowanych arkuszy pisemnych CKE (scripts/extract_theory.py)
const cke = JSON.parse(readFileSync('data/cke_questions.json', 'utf8'));
for (const q of cke) qs.push({ id: q.id, category: q.category, text: q.text, answers: q.answers, correct: q.correct, explanation: q.explanation, source: 'cke', image: q.image, imageAnswers: q.imageAnswers, ocr: q.ocr, sources: q.sources });
if (new Set(qs.map((q) => q.id)).size !== qs.length) throw new Error('Zduplikowane pytania');
const fcs = FC.map(([deck, front, back, example], i) => ({ id: `${deck}-${i}`, deck, front, back, example: example ?? null }));
writeFileSync('src/data/questions.json', JSON.stringify(qs));
writeFileSync('src/data/flashcards.json', JSON.stringify(fcs));
console.log(`questions.json: ${qs.length}, flashcards.json: ${fcs.length}`);

// ---- Seed SQL dla Supabase ----
const lit = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const jlit = (v) => `${lit(JSON.stringify(v))}::jsonb`;
const out = [];
out.push('truncate public.sheets, public.questions, public.flashcards;');
for (const s of sheets) out.push(`insert into public.sheets (code, qualification, year, session, variant, title, language, difficulty, data) values (${lit(s.code)}, ${lit(s.qualification)}, ${s.year}, ${lit(s.session)}, ${lit(s.variant)}, ${lit(s.title)}, ${lit(s.language)}, ${s.difficulty.score}, ${jlit(s)});`);
for (const q of qs) out.push(`insert into public.questions (id, category, text, answers, correct, explanation, source, image, image_answers, ocr, sources) values (${lit(q.id)}, ${lit(q.category)}, ${lit(q.text)}, ${jlit(q.answers)}, ${q.correct}, ${lit(q.explanation)}, ${lit(q.source)}, ${lit(q.image)}, ${q.imageAnswers ? 'true' : 'false'}, ${q.ocr ? 'true' : 'false'}, ${jlit(q.sources ?? [])});`);
for (const f of fcs) out.push(`insert into public.flashcards (id, deck, front, back, example) values (${lit(f.id)}, ${lit(f.deck)}, ${lit(f.front)}, ${lit(f.back)}, ${lit(f.example)});`);
writeFileSync('supabase/seed.sql', out.join('\n') + '\n');
