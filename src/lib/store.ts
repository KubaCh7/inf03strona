import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addDays, today, weekStart } from './time';
import { DEFAULT_LOOK, type AvatarLook } from '../components/Avatar';

export type Equipped = { look: AvatarLook; editorTheme: string; appStyle: string; frame: string; title: string; effect: string; nick: string };
const DEFAULT_EQUIPPED: Equipped = { look: DEFAULT_LOOK, editorTheme: 'auto', appStyle: 'terakota', frame: 'none', title: '', effect: 'none', nick: 'Ty' };

export type SheetStatus = 'todo' | 'doing' | 'done';
export type TestRecord = { id: string; kind: 'theory40' | 'exam' | 'sprint'; at: string; score: number; total: number; passed: boolean; byCat?: Record<string, [number, number]>; sheetCode?: string; practice?: number };
export type ActiveExam = {
  id: string;
  stage: 'theory' | 'practice' | 'done';
  mode: 'full' | 'theory' | 'practice';
  theory?: { questionIds: string[]; order: number[][]; answers: (number | null)[]; startedAt: number; durationMs: number; finishedAt?: number; score?: number };
  practice?: { sheetCode: string; startedAt: number; durationMs: number; finishedAt?: number; score?: number };
};
export type Settings = { theme: 'system' | 'light' | 'dark'; editorFont: number; unlockAll: boolean; dailyGoalMin: number; newCardsPerDay: number; pdfSide?: 'left' | 'right'; pdfWidth?: number; tourDone?: boolean; flashIntroSeen?: boolean; vim?: boolean };

type State = {
  xp: number;
  streak: { current: number; best: number; last: string | null; freezeWeek: string | null };
  activity: Record<string, { minutes: number; xp: number }>;
  qstats: Record<string, { seen: number; ok: number; lastWrong: boolean }>;
  tests: TestRecord[];
  sheets: Record<string, { status: SheetStatus; score?: number }>;
  lessons: Record<string, string>;
  queries: Record<string, { ok: boolean; sql: string }>;
  coins: number;
  coinsEarned: number;
  owned: string[];
  equipped: Equipped;
  skipped: Record<string, string>;
  practice: Record<string, { ok: boolean; files?: Record<string, string> }>;
  cards: Record<string, unknown>; // serializowane karty FSRS
  newCardsDay: { date: string; count: number };
  workspaces: Record<string, Record<string, string>>;
  settings: Settings;
  sprintBest: number;
  dailyQuestion: { date: string; id: string | null; done: boolean };
  activeExam: ActiveExam | null;
  syncCode: string;
  lastSync: string | null;
  account: { username: string; email: string | null; token: string } | null;
  accountSaved: string | null;

  addXp: (n: number) => void;
  addMinute: () => void;
  recordAnswer: (qid: string, ok: boolean) => void;
  addTest: (t: TestRecord) => void;
  setSheet: (code: string, patch: Partial<{ status: SheetStatus; score: number }>) => void;
  completeLesson: (id: string, xp: number) => void;
  saveQuery: (key: string, sql: string, ok?: boolean) => void;
  buy: (id: string, price: number) => boolean;
  equip: (patch: Partial<Equipped>) => void;
  setSkipped: (id: string, on: boolean) => void;
  savePractice: (id: string, patch: { ok?: boolean; files?: Record<string, string> }) => void;
  setCard: (id: string, card: unknown) => void;
  countNewCard: () => void;
  saveWorkspace: (key: string, files: Record<string, string>) => void;
  setSettings: (p: Partial<Settings>) => void;
  setSprintBest: (n: number) => void;
  setDailyQuestion: (d: State['dailyQuestion']) => void;
  setActiveExam: (e: ActiveExam | null) => void;
  replaceAll: (data: Partial<State>) => void;
  setSync: (code: string, at: string | null) => void;
  setAccount: (a: State['account']) => void;
  setAccountSaved: (at: string | null) => void;
};

const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); }));

export const PERSISTED_KEYS = ['xp', 'streak', 'activity', 'qstats', 'tests', 'sheets', 'lessons', 'queries', 'practice', 'coins', 'coinsEarned', 'owned', 'equipped', 'skipped', 'cards', 'newCardsDay', 'workspaces', 'settings', 'sprintBest', 'dailyQuestion'] as const;

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      xp: 0,
      streak: { current: 0, best: 0, last: null, freezeWeek: null },
      activity: {},
      qstats: {},
      tests: [],
      sheets: {},
      lessons: {},
      queries: {},
      practice: {},
      coins: 0,
      coinsEarned: 0,
      owned: [],
      equipped: DEFAULT_EQUIPPED,
      skipped: {},
      cards: {},
      newCardsDay: { date: '', count: 0 },
      workspaces: {},
      settings: { theme: 'system', editorFont: 14, unlockAll: false, dailyGoalMin: 20, newCardsPerDay: 15 },
      sprintBest: 0,
      dailyQuestion: { date: '', id: null, done: false },
      activeExam: null,
      syncCode: uuid(),
      lastSync: null,
      account: null,
      accountSaved: null,

      addXp: (n) => set((s) => {
        const d = today();
        const act = { ...s.activity, [d]: { minutes: s.activity[d]?.minutes ?? 0, xp: (s.activity[d]?.xp ?? 0) + n } };
        let streak = s.streak;
        // dzien zalicza sie od 10 XP
        if (act[d].xp >= 10 && streak.last !== d) {
          const y = addDays(d, -1);
          const y2 = addDays(d, -2);
          let current = 1;
          let freezeWeek = streak.freezeWeek;
          if (streak.last === y) current = streak.current + 1;
          else if (streak.last === y2 && freezeWeek !== weekStart(d)) { current = streak.current + 1; freezeWeek = weekStart(d); }
          streak = { current, best: Math.max(streak.best, current), last: d, freezeWeek };
        }
        const c = n > 0 ? Math.ceil(n / 2) : 0; // monety: polowa XP, min. 1
        return { xp: s.xp + n, activity: act, streak, coins: s.coins + c, coinsEarned: s.coinsEarned + c };
      }),
      addMinute: () => set((s) => {
        const d = today();
        return { activity: { ...s.activity, [d]: { xp: s.activity[d]?.xp ?? 0, minutes: (s.activity[d]?.minutes ?? 0) + 1 } } };
      }),
      recordAnswer: (qid, ok) => {
        set((s) => {
          const prev = s.qstats[qid] ?? { seen: 0, ok: 0, lastWrong: false };
          return { qstats: { ...s.qstats, [qid]: { seen: prev.seen + 1, ok: prev.ok + (ok ? 1 : 0), lastWrong: !ok } } };
        });
        if (ok) { get().addXp(2); if (typeof window !== 'undefined') window.dispatchEvent(new Event('p03:correct')); }
      },
      addTest: (t) => set((s) => ({ tests: [t, ...s.tests].slice(0, 200) })),
      setSheet: (code, patch) => set((s) => {
        const prev = s.sheets[code] ?? { status: 'todo' as SheetStatus };
        const next = { ...prev, ...patch };
        if (patch.score !== undefined && prev.score !== undefined) next.score = Math.max(prev.score, patch.score);
        return { sheets: { ...s.sheets, [code]: next } };
      }),
      completeLesson: (id, xp) => {
        if (get().lessons[id]) return;
        set((s) => ({ lessons: { ...s.lessons, [id]: new Date().toISOString() } }));
        get().addXp(xp);
      },
      buy: (id, price) => {
        const s = get();
        if (s.owned.includes(id) || s.coins < price) return false;
        set({ coins: s.coins - price, owned: [...s.owned, id] });
        return true;
      },
      equip: (patch) => set((s) => ({ equipped: { ...s.equipped, ...patch, look: { ...s.equipped.look, ...(patch.look ?? {}) } } })),
      setSkipped: (id, on) => set((s) => { const n = { ...s.skipped }; if (on) n[id] = new Date().toISOString(); else delete n[id]; return { skipped: n }; }),
      saveQuery: (key, sql, ok) => {
        const prev = get().queries[key];
        const nowOk = ok ?? prev?.ok ?? false;
        set((s) => ({ queries: { ...s.queries, [key]: { sql, ok: nowOk || !!prev?.ok } } }));
        if (ok && !prev?.ok) get().addXp(8);
      },
      savePractice: (id, patch) => {
        const prev = get().practice[id];
        set((s) => ({ practice: { ...s.practice, [id]: { ...prev, ...patch, ok: !!(patch.ok || prev?.ok) } } }));
        if (patch.ok && !prev?.ok) get().addXp(10);
      },
      setCard: (id, card) => set((s) => ({ cards: { ...s.cards, [id]: card } })),
      countNewCard: () => set((s) => {
        const d = today();
        return { newCardsDay: { date: d, count: (s.newCardsDay.date === d ? s.newCardsDay.count : 0) + 1 } };
      }),
      saveWorkspace: (key, files) => set((s) => ({ workspaces: { ...s.workspaces, [key]: files } })),
      setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      setSprintBest: (n) => set((s) => ({ sprintBest: Math.max(s.sprintBest, n) })),
      setDailyQuestion: (dq) => set({ dailyQuestion: dq }),
      setActiveExam: (e) => set({ activeExam: e }),
      replaceAll: (data) => set(data),
      setSync: (code, at) => set({ syncCode: code, lastSync: at }),
      setAccount: (a) => set({ account: a }),
      setAccountSaved: (at) => set({ accountSaved: at }),
    }),
    { name: 'pracownia03', version: 1, merge: (persisted, current) => { const p = (persisted ?? {}) as Partial<State>; return { ...current, ...p, equipped: { ...DEFAULT_EQUIPPED, ...(p.equipped ?? {}), look: { ...DEFAULT_LOOK, ...(p.equipped?.look ?? {}) } } } as State; } },
  ),
);

// ---- Poziomy ----
export const LEVEL_NAMES = ['Praktykant', 'Stażysta', 'Junior', 'Junior+', 'Rzemieślnik', 'Mid', 'Kwerendziarz', 'Architekt', 'Senior', 'Mistrz kwerend', 'Egzaminator'];
export const levelThreshold = (n: number) => Math.round(100 * Math.pow(n, 1.5)); // XP potrzebne, by wejsc na poziom n+1
export function levelInfo(xp: number) {
  let level = 1;
  let base = 0;
  while (xp >= base + levelThreshold(level)) { base += levelThreshold(level); level++; }
  const need = levelThreshold(level);
  return { level, name: LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)], into: xp - base, need, pct: (xp - base) / need };
}

export function weekMinutes(activity: State['activity']) {
  const d = today();
  const ws = weekStart(d);
  let m = 0;
  for (let i = 0; i < 7; i++) m += activity[addDays(ws, i)]?.minutes ?? 0;
  return m;
}

/** Aktywna seria (0 jesli przerwana dluzej niz dozwolone) */
export function liveStreak(streak: State['streak']) {
  if (!streak.last) return 0;
  const d = today();
  if (streak.last === d || streak.last === addDays(d, -1)) return streak.current;
  if (streak.last === addDays(d, -2) && streak.freezeWeek !== weekStart(d)) return streak.current;
  return 0;
}

export function exportProgress() {
  const s = useStore.getState() as unknown as Record<string, unknown>;
  const tables: Record<string, unknown> = {};
  for (const k of PERSISTED_KEYS) tables[k] = s[k];
  return { schemaVersion: 1, exportedAt: new Date().toISOString(), tables };
}
