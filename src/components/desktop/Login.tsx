import { useEffect, useState } from 'react';
import { ArrowRight, Wifi, Power, Accessibility } from 'lucide-react';

/** Ekran blokady i logowania Windows 11 (konto „Egzamin” bez hasla) + numer zdajacego. */
export default function Login({ onLogin }: { onLogin: (candidate: string) => void }) {
  const [now, setNow] = useState(new Date());
  const [stage, setStage] = useState<'lock' | 'login'>('lock');
  const [num, setNum] = useState(() => { try { return localStorage.getItem('p03:candidate') ?? ''; } catch { return ''; } });
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { const k = () => setStage('login'); if (stage === 'lock') { window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); } }, [stage]);
  const ok = /^\d{11}$/.test(num) || /^[A-Z0-9]{6,}$/i.test(num);
  const go = () => { if (!ok) return; try { localStorage.setItem('p03:candidate', num); } catch { /* */ } onLogin(num); };
  return (
    <div className="fixed inset-0 z-[85] select-none overflow-hidden font-['Segoe_UI_Variable','Segoe_UI',system-ui,sans-serif] text-white" onClick={() => stage === 'lock' && setStage('login')}
      style={{ background: 'radial-gradient(ellipse at 30% 110%, #4d8fd9 0%, transparent 55%), radial-gradient(ellipse at 80% -10%, #7aa8e6 0%, transparent 50%), linear-gradient(135deg,#0f2f63 0%,#1b4f9c 45%,#2a6fd0 70%,#173f7a 100%)' }}>
      {stage === 'lock' ? (
        <div className="flex h-full flex-col items-center pt-[14vh] [text-shadow:0_2px_8px_rgba(0,0,0,.35)]">
          <p className="text-[96px] font-semibold leading-none">{now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</p>
          <p className="mt-2 text-[22px]">{now.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <p className="mt-auto mb-16 text-[14px] opacity-80">Kliknij albo naciśnij dowolny klawisz, aby się zalogować</p>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center bg-black/25 backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
          <div className="grid h-[190px] w-[190px] place-items-center rounded-full bg-[#5a7fb8] text-[80px] font-light">E</div>
          <p className="mt-5 text-[28px] font-semibold">Egzamin</p>
          <label className="mt-6 block w-[300px] text-[13px]">Numer zdającego (z arkusza: PESEL lub numer paszportu)
            <input autoFocus value={num} onChange={(e) => setNum(e.target.value.replace(/\s/g, ''))} onKeyDown={(e) => e.key === 'Enter' && go()} placeholder="np. 08211512345"
              className="mt-1 h-9 w-full rounded-[4px] border-b-2 border-[#0067c0] bg-white/90 px-3 text-[15px] text-black outline-none" /></label>
          <p className="mt-1 w-[300px] text-[12px] opacity-75">Tym numerem nazwiesz folder na pulpicie i podpiszesz stronę. Konto „Egzamin” nie ma hasła.</p>
          <button disabled={!ok} onClick={go} className="mt-5 flex h-9 items-center gap-2 rounded-[4px] bg-white/20 px-5 hover:bg-white/30 disabled:opacity-40">Zaloguj się <ArrowRight size={16} /></button>
          <div className="absolute bottom-6 right-8 flex gap-5 opacity-90"><Wifi size={20} /><Accessibility size={20} /><Power size={20} /></div>
        </div>
      )}
    </div>
  );
}
