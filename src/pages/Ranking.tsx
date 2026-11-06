import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Crown, FileText, RefreshCw, Trophy, UserRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { levelInfo, useStore } from '../lib/store';
import { DEFAULT_LOOK, type AvatarLook } from '../components/Avatar';
import Avatar from '../components/Avatar';
import { Loading, PageHeader } from '../components/ui';

type Row = { username: string; xp: number; sheets_done: number; exams_passed: number; equipped: { look?: Partial<AvatarLook>; frame?: string; title?: string; nick?: string; effect?: string } | null };
type Sort = 'xp' | 'sheets_done' | 'exams_passed';
const SORTS: [Sort, string][] = [['xp', 'Poziom i XP'], ['sheets_done', 'Zrobione arkusze'], ['exams_passed', 'Zdane arkusze (75%+)']];

export default function Ranking() {
  const account = useStore((s) => s.account);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>('xp');

  async function load() {
    setErr(null);
    const { data, error } = await supabase.rpc('leaderboard', { p_limit: 200 });
    if (error) { setErr(/does not exist|Could not find/i.test(error.message) ? 'Ranking nie jest jeszcze włączony na serwerze.' : 'Nie udało się pobrać rankingu. Sprawdź internet.'); setRows([]); return; }
    setRows(data as Row[]);
  }
  useEffect(() => { void load(); }, []);

  const sorted = rows ? [...rows].sort((a, b) => b[sort] - a[sort] || b.xp - a.xp) : null;
  const medal = (i: number) => (i === 0 ? 'text-[#D4A017]' : i === 1 ? 'text-[#9CA3AF]' : i === 2 ? 'text-[#B8733A]' : 'text-muted');

  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow="Ranking" title="Najlepsi w Pracowni" right={<button className="btn btn-ghost" onClick={load}><RefreshCw size={16} />Odśwież</button>}>
        Kto ma najwyższy poziom, najwięcej zrobionych i zdanych arkuszy. Widać też ich ludziki, ramki i tytuły ze sklepu.
      </PageHeader>
      {!account && (
        <div className="card mb-4 flex flex-wrap items-center gap-3 p-4">
          <UserRound className="text-accent" />
          <p className="min-w-0 flex-1 text-sm">W rankingu są osoby z kontem. Tu założysz konto i zapiszesz postęp, a pojawisz się na liście.</p>
          <Link className="btn btn-primary" to="/konto">Konto</Link>
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {SORTS.map(([k, label]) => <button key={k} className="chip" aria-pressed={sort === k} onClick={() => setSort(k)}>{label}</button>)}
      </div>
      {err && <p className="card mb-4 p-4 text-sm text-muted">{err}</p>}
      {!sorted ? <Loading /> : sorted.length === 0 && !err ? <p className="card p-6 text-center text-sm text-muted">Na razie pusto. Bądź pierwszy!</p> : (
        <ol className="space-y-2">
          {sorted.map((r, i) => {
            const lv = levelInfo(r.xp);
            const eq = r.equipped ?? {};
            const me = account?.username === r.username;
            return (
              <li key={r.username} className={`card flex items-center gap-3 p-3 md:gap-4 md:p-4 ${me ? 'ring-2 ring-accent' : ''} ${i < 3 ? 'gold-frame-soft' : ''}`}>
                <span className={`display w-8 shrink-0 text-center text-xl font-extrabold tabular ${medal(i)}`}>{i === 0 ? <Crown className="mx-auto" size={22} /> : i + 1}</span>
                <Avatar look={{ ...DEFAULT_LOOK, ...(eq.look ?? {}) }} size={48} ring={eq.frame && eq.frame !== 'none' ? eq.frame : undefined} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{eq.nick && eq.nick !== 'Ty' ? eq.nick : r.username}{me && <span className="ml-1.5 text-xs text-accent">(Ty)</span>}</p>
                  <p className="truncate text-xs text-muted">{eq.title || lv.name} · @{r.username}</p>
                </div>
                <div className="hidden text-center sm:block"><p className="display text-lg font-bold tabular">{r.sheets_done}</p><p className="text-[10px] text-muted"><FileText size={10} className="mr-0.5 inline" />arkuszy</p></div>
                <div className="hidden text-center sm:block"><p className="display text-lg font-bold tabular text-success">{r.exams_passed}</p><p className="text-[10px] text-muted"><Trophy size={10} className="mr-0.5 inline" />zdanych</p></div>
                <div className="w-20 text-right"><p className="display text-lg font-extrabold">Lv {lv.level}</p><p className="mono text-[11px] text-muted">{r.xp} XP</p></div>
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-4 text-xs text-muted">Ranking liczy się z postępu zapisanego na kontach. Odświeża się po każdym zapisie (kilka sekund po zmianie).</p>
    </div>
  );
}
