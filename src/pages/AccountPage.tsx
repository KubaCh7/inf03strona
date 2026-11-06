import { useState } from 'react';
import { Cloud, CloudDownload, Eye, EyeOff, KeyRound, LogIn, LogOut, UserPlus } from 'lucide-react';
import { useStore } from '../lib/store';
import { applyRemote, changePassword, loadRemote, login, logout, register, remoteXp, saveRemote, type Remote } from '../lib/account';
import Avatar from '../components/Avatar';
import { PageHeader } from '../components/ui';

function Field({ label, type = 'text', value, onChange, auto, hint, optional }: { label: string; type?: string; value: string; onChange: (v: string) => void; auto?: string; hint?: string; optional?: boolean }) {
  const [show, setShow] = useState(false);
  const isPass = type === 'password';
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}{optional && <span className="ml-1 font-normal text-muted">(opcjonalnie)</span>}</span>
      <span className="relative block">
        <input className="input pr-10" type={isPass && !show ? 'password' : isPass ? 'text' : type} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={auto} />
        {isPass && <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted" onClick={() => setShow((x) => !x)} aria-label={show ? 'Ukryj hasło' : 'Pokaż hasło'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
      </span>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export default function AccountPage() {
  const { account, accountSaved, setAccount, xp, equipped } = useStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [choice, setChoice] = useState<Remote | null>(null);
  const [pwOld, setPwOld] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwOpen, setPwOpen] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null);
    if (mode === 'register' && pass !== pass2) { setErr('Hasła się różnią'); return; }
    setBusy(true);
    try {
      if (mode === 'register') {
        const s = await register(name, email, pass);
        setAccount(s);
        await saveRemote();
        setMsg('Konto założone. Twój postęp jest zapisany i zsynchronizuje się na każdym urządzeniu, na którym się zalogujesz.');
      } else {
        const s = await login(name, pass);
        setAccount(s);
        const r = await loadRemote(s.token);
        const rx = remoteXp(r);
        if (!r.progress) { await saveRemote(); setMsg('Zalogowano. Zapisaliśmy na koncie postęp z tego urządzenia.'); }
        else if (xp === 0 || rx === xp) { applyRemote(r); setMsg('Zalogowano. Wczytaliśmy postęp z konta.'); }
        else setChoice(r);
      }
      setPass(''); setPass2('');
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally { setBusy(false); }
  }

  if (!account) {
    return (
      <div className="mx-auto max-w-md">
        <PageHeader eyebrow="Konto" title={mode === 'login' ? 'Zaloguj się' : 'Załóż konto'}>
          Tu założysz konto i zapiszesz postęp. Zalogujesz się nim na telefonie, komputerze czy w szkole, a XP, monety, ścieżka i wyniki będą wszędzie te same.
        </PageHeader>
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
          <button className={`rounded-lg py-2 text-sm font-bold ${mode === 'login' ? 'bg-surface shadow-sm' : 'text-muted'}`} onClick={() => { setMode('login'); setErr(null); }}>Logowanie</button>
          <button className={`rounded-lg py-2 text-sm font-bold ${mode === 'register' ? 'bg-surface shadow-sm' : 'text-muted'}`} onClick={() => { setMode('register'); setErr(null); }}>Nowe konto</button>
        </div>
        <form className="card space-y-4 p-6" onSubmit={submit}>
          <Field label={mode === 'login' ? 'Nazwa użytkownika lub e-mail' : 'Nazwa użytkownika'} value={name} onChange={setName} auto="username" hint={mode === 'register' ? '3–24 znaki: litery, cyfry, _ . -' : undefined} />
          {mode === 'register' && <Field label="E-mail" type="email" value={email} onChange={setEmail} auto="email" optional hint="Możesz go podać, żeby logować się też e-mailem." />}
          <Field label="Hasło" type="password" value={pass} onChange={setPass} auto={mode === 'login' ? 'current-password' : 'new-password'} hint={mode === 'register' ? 'Minimum 6 znaków.' : undefined} />
          {mode === 'register' && <Field label="Powtórz hasło" type="password" value={pass2} onChange={setPass2} auto="new-password" />}
          {err && <p className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{err}</p>}
          <button className="btn btn-primary w-full" disabled={busy || !name || !pass}>{mode === 'login' ? <><LogIn size={16} />Zaloguj</> : <><UserPlus size={16} />Załóż konto i zapisz postęp</>}</button>
        </form>
        <p className="mt-3 text-center text-xs text-muted">Hasła są przechowywane tylko jako bezpieczny skrót (bcrypt). Bez konta wszystko też działa, a postęp zostaje w tej przeglądarce.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader eyebrow="Konto" title="Twoje konto" />
      {choice && (
        <div className="card pop mb-4 border-accent p-5">
          <p className="font-bold">Na koncie jest inny postęp niż na tym urządzeniu</p>
          <p className="mt-1 text-sm text-muted">Na koncie: {remoteXp(choice)} XP{choice.updated_at ? ` (zapisany ${new Date(choice.updated_at).toLocaleString('pl-PL')})` : ''}. Na tym urządzeniu: {xp} XP. Który zachować?</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button className="btn btn-primary" onClick={() => { applyRemote(choice); setChoice(null); setMsg('Wczytano postęp z konta.'); }}><CloudDownload size={16} />Z konta</button>
            <button className="btn btn-ghost" onClick={async () => { await saveRemote(); setChoice(null); setMsg('Na koncie zapisano postęp z tego urządzenia.'); }}><Cloud size={16} />Z tego urządzenia</button>
          </div>
        </div>
      )}
      <div className="card flex items-center gap-4 p-5">
        <Avatar look={equipped.look} size={64} ring={equipped.frame !== 'none' ? equipped.frame : undefined} />
        <div className="min-w-0 flex-1">
          <p className="display truncate text-2xl font-bold">{account.username}</p>
          {account.email && <p className="truncate text-sm text-muted">{account.email}</p>}
          <p className="mt-1 flex items-center gap-1.5 text-xs text-success"><Cloud size={13} />{accountSaved ? `Postęp zapisany na koncie · ${new Date(accountSaved).toLocaleString('pl-PL')}` : 'Synchronizacja włączona'}</p>
        </div>
      </div>
      {msg && <p className="pop mt-4 rounded-xl bg-success-soft p-3 text-sm text-success">{msg}</p>}
      {err && <p className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">{err}</p>}
      <div className="card mt-4 divide-y divide-line">
        <div className="p-5 text-sm text-muted">Postęp zapisuje się sam kilka sekund po każdej zmianie i przy zamknięciu karty. Na innym urządzeniu zaloguj się tym samym kontem, a wszystko się wczyta.</div>
        <div className="flex flex-wrap gap-2 p-5">
          <button className="btn btn-ghost" disabled={busy} onClick={async () => { setBusy(true); setErr(null); try { await saveRemote(); setMsg('Zapisano.'); } catch (e) { setErr((e as Error).message); } setBusy(false); }}><Cloud size={16} />Zapisz teraz</button>
          <button className="btn btn-ghost" disabled={busy} onClick={async () => { setBusy(true); setErr(null); try { const r = await loadRemote(account.token); applyRemote(r); setMsg('Wczytano postęp z konta.'); } catch (e) { setErr((e as Error).message); } setBusy(false); }}><CloudDownload size={16} />Wczytaj z konta</button>
          <button className="btn btn-ghost" onClick={() => setPwOpen((x) => !x)}><KeyRound size={16} />Zmień hasło</button>
        </div>
        {pwOpen && (
          <form className="space-y-3 p-5" onSubmit={async (e) => { e.preventDefault(); setErr(null); try { await changePassword(pwOld, pwNew); setMsg('Hasło zmienione. Inne urządzenia zostały wylogowane.'); setPwOld(''); setPwNew(''); setPwOpen(false); } catch (e2) { setErr((e2 as Error).message); } }}>
            <Field label="Obecne hasło" type="password" value={pwOld} onChange={setPwOld} auto="current-password" />
            <Field label="Nowe hasło" type="password" value={pwNew} onChange={setPwNew} auto="new-password" hint="Minimum 6 znaków." />
            <button className="btn btn-dark" disabled={!pwOld || !pwNew}>Zapisz nowe hasło</button>
          </form>
        )}
        <div className="p-5">
          <button className="btn btn-ghost text-danger" onClick={async () => { await saveRemote().catch(() => {}); await logout(); setMsg(null); }}><LogOut size={16} />Wyloguj</button>
          <p className="mt-2 text-xs text-muted">Po wylogowaniu postęp zostaje też na tym urządzeniu.</p>
        </div>
      </div>
    </div>
  );
}
