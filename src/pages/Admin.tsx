import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Coins, Gift, Megaphone, Send, ShieldAlert, Sparkles, Trash2, Users, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { SHOP } from '../data/shop';
import { adminDeleteGift, adminListGifts, adminSendGift, type SentGift } from '../lib/gifts';
import { PageHeader } from '../components/ui';

const QUICK = [
  { label: '+100 monet dla wszystkich', coins: 100, xp: 0, msg: 'Prezent od admina, miłej nauki!' },
  { label: '+250 XP dla wszystkich', coins: 0, xp: 250, msg: 'Bonus XP dla wszystkich!' },
  { label: 'Deszcz monet (+1000)', coins: 1000, xp: 0, msg: 'Deszcz monet! Wydawajcie w sklepie.' },
];

export default function Admin() {
  const isAdmin = useStore((s) => s.isAdmin);
  const account = useStore((s) => s.account);
  const [target, setTarget] = useState('');
  const [coins, setCoins] = useState(0);
  const [xp, setXp] = useState(0);
  const [item, setItem] = useState('');
  const [message, setMessage] = useState('');
  const [hours, setHours] = useState(168);
  const [users, setUsers] = useState<string[]>([]);
  const [sent, setSent] = useState<SentGift[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = () => adminListGifts().then(setSent).catch((e) => setMsg({ ok: false, text: (e as Error).message }));
  useEffect(() => {
    if (!isAdmin) return;
    void reload();
    supabase.rpc('leaderboard', { p_limit: 200 }).then(({ data }) => setUsers(((data ?? []) as { username: string }[]).map((u) => u.username).sort((a, b) => a.localeCompare(b))));
  }, [isAdmin]);

  if (!account || !isAdmin) return (
    <div className="card mx-auto max-w-md p-8 text-center">
      <ShieldAlert className="mx-auto text-muted" size={32} />
      <p className="mt-3 font-bold">Ta strona jest tylko dla admina.</p>
      {!account && <Link className="btn btn-primary mt-4" to="/konto">Zaloguj się</Link>}
    </div>
  );

  async function send(override?: { coins: number; xp: number; msg: string }) {
    setBusy(true); setMsg(null);
    const g = override ? { target: null, coins: override.coins, xp: override.xp, item: null, message: override.msg, hours: 168 } : { target: target || null, coins, xp, item: item || null, message, hours };
    try {
      await adminSendGift(g);
      setMsg({ ok: true, text: `Wysłano ${g.target ? `do ${g.target}` : 'do wszystkich'}. Kto jest na stronie, zobaczy to w ciągu minuty, reszta przy następnym wejściu.` });
      if (!override) { setCoins(0); setXp(0); setItem(''); setMessage(''); }
      void reload();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    setBusy(false);
  }

  const items = SHOP.filter((s) => s.price > 0);
  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow="Admin" title="Panel admina">Rozdawaj monety, XP i przedmioty ze sklepu wszystkim albo jednej osobie, albo napisz ogłoszenie. Ujemne liczby zabierają.</PageHeader>

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {QUICK.map((q) => <button key={q.label} className="btn btn-gold justify-center" disabled={busy} onClick={() => send(q)}><Gift size={16} />{q.label}</button>)}
      </div>

      <div className="card space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1 flex items-center gap-1.5 text-sm font-bold"><Users size={15} />Dla kogo</span>
            <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">Wszyscy (także bez konta)</option>
              {users.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </label>
          <label className="block"><span className="mb-1 block text-sm font-bold">Ważne przez</span>
            <select className="input" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
              {[[1, 'Jednorazowo, tylko teraz (1 godz.)'], [24, '1 dzień'], [72, '3 dni'], [168, '7 dni'], [720, '30 dni']].map(([h, l]) => <option key={h} value={h}>{l}</option>)}
            </select>
          </label>
          <label className="block"><span className="mb-1 flex items-center gap-1.5 text-sm font-bold"><Coins size={15} />Monety</span><input type="number" className="input" value={coins} onChange={(e) => setCoins(Number(e.target.value) || 0)} /></label>
          <label className="block"><span className="mb-1 flex items-center gap-1.5 text-sm font-bold"><Zap size={15} />XP</span><input type="number" className="input" value={xp} onChange={(e) => setXp(Number(e.target.value) || 0)} /></label>
          <label className="block sm:col-span-2"><span className="mb-1 flex items-center gap-1.5 text-sm font-bold"><Sparkles size={15} />Przedmiot ze sklepu (opcjonalnie)</span>
            <select className="input" value={item} onChange={(e) => setItem(e.target.value)}>
              <option value="">Bez przedmiotu</option>
              {items.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.price} monet)</option>)}
            </select>
          </label>
          <p className="text-xs text-muted sm:col-span-2">Każdy widzi wiadomość i dostaje prezent tylko raz. „Jednorazowo” = zobaczą ją tylko osoby, które wejdą na stronę w ciągu godziny (kto jest teraz online, dostaje ją w ciągu minuty).</p>
          <label className="block sm:col-span-2"><span className="mb-1 flex items-center gap-1.5 text-sm font-bold"><Megaphone size={15} />Wiadomość</span>
            <textarea className="input h-24" maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Np. Powodzenia na egzaminie! Albo samo ogłoszenie bez prezentu." />
          </label>
        </div>
        {msg && <p className={`rounded-lg p-3 text-sm ${msg.ok ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>{msg.text}</p>}
        <button className="btn btn-primary" disabled={busy} onClick={() => send()}><Send size={16} />{coins || xp || item ? 'Wyślij prezent' : 'Wyślij ogłoszenie'}</button>
      </div>

      <h2 className="mb-2 mt-8 text-lg font-bold">Wysłane</h2>
      <div className="card divide-y divide-line">
        {sent === null ? <p className="p-4 text-sm text-muted">Wczytuję…</p> : sent.length === 0 ? <p className="p-4 text-sm text-muted">Jeszcze nic nie wysłałeś.</p> : sent.map((g) => {
          const active = new Date(g.expires_at) > new Date();
          return (
            <div key={g.id} className={`flex flex-wrap items-center gap-3 p-3 text-sm ${active ? '' : 'opacity-50'}`}>
              <span className="mono w-36 shrink-0 text-xs text-muted">{new Date(g.created_at).toLocaleString('pl-PL')}</span>
              <span className="font-bold">{g.target ?? 'wszyscy'}</span>
              <span className="mono text-xs">{[g.coins && `${g.coins} monet`, g.xp && `${g.xp} XP`, g.item && (SHOP.find((s) => s.id === g.item)?.name ?? g.item)].filter(Boolean).join(' · ') || 'ogłoszenie'}</span>
              {g.message && <span className="min-w-0 flex-1 truncate text-muted">„{g.message}”</span>}
              <span className="ml-auto text-xs text-muted">{active ? `do ${new Date(g.expires_at).toLocaleDateString('pl-PL')}` : 'wygasło'}</span>
              <button className="rounded p-1 text-danger hover:bg-danger-soft" title="Usuń (kto jeszcze nie odebrał, już nie dostanie)" onClick={async () => { if (confirm('Usunąć? Kto już odebrał, ten zachowa.')) { await adminDeleteGift(g.id); void reload(); } }}><Trash2 size={14} /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
