import { Moon, Sun, Monitor } from 'lucide-react';
import { useStore } from '../lib/store';
import { Link } from 'react-router';
import { APP_STYLES, EDITOR_THEMES } from '../lib/themes';
import { PageHeader } from '../components/ui';

export default function SettingsPage() {
  const { settings, setSettings, owned, equipped, equip } = useStore();
  const ownedOrFree = (id: string, price: number) => price === 0 || owned.includes(id);
  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Konto bez konta" title="Ustawienia" />
      <div className="card divide-y divide-line">
        <div className="p-5">
          <p className="font-bold">Motyw</p>
          <div className="mt-2 flex gap-2">
            {([['system', 'Systemowy', Monitor], ['light', 'Jasny', Sun], ['dark', 'Ciemny', Moon]] as const).map(([k, l, I]) => (
              <button key={k} className="chip" aria-pressed={settings.theme === k} onClick={() => setSettings({ theme: k })}><I size={14} />{l}</button>
            ))}
          </div>
        </div>
        <div className="p-5">
          <p className="font-bold">Styl strony</p>
          <p className="text-sm text-muted">Kolor akcentu i tła całej strony. Więcej w <Link to="/sklep" className="underline">sklepie</Link>.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {APP_STYLES.filter((s) => ownedOrFree(`appStyle:${s.id}`, s.price)).map((s) => (
              <button key={s.id} className="chip" aria-pressed={equipped.appStyle === s.id} onClick={() => equip({ appStyle: s.id })}>
                <span className="flex h-3 w-6 overflow-hidden rounded-full">{s.swatch.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}</span>{s.name}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center justify-between gap-4 p-5">
          <span><b>Motyw edytora kodu</b><span className="block text-sm text-muted">Motywy z VS Code (Dracula, One Dark Pro i inne) kupisz w <Link to="/sklep" className="underline">sklepie</Link>.</span></span>
          <select className="input w-56" value={equipped.editorTheme} onChange={(e) => equip({ editorTheme: e.target.value })}>
            {EDITOR_THEMES.filter((t) => ownedOrFree(`editorTheme:${t.id}`, t.price)).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="flex items-center justify-between gap-4 p-5">
          <span><b>Odblokuj całą ścieżkę</b><span className="block text-sm text-muted">Bez czekania na zaliczenie poprzednich lekcji.</span></span>
          <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={settings.unlockAll} onChange={(e) => setSettings({ unlockAll: e.target.checked })} />
        </label>
        <label className="flex items-center justify-between gap-4 p-5">
          <span><b>Dzienny cel</b><span className="block text-sm text-muted">Minuty nauki dziennie (pasek tygodnia).</span></span>
          <input type="number" min={5} max={240} className="input w-24" value={settings.dailyGoalMin} onChange={(e) => setSettings({ dailyGoalMin: Math.max(5, Number(e.target.value) || 20) })} />
        </label>
        <label className="flex items-center justify-between gap-4 p-5">
          <span><b>Nowe fiszki dziennie</b><span className="block text-sm text-muted">Ile nowych kart wchodzi do nauki każdego dnia.</span></span>
          <input type="number" min={0} max={100} className="input w-24" value={settings.newCardsPerDay} onChange={(e) => setSettings({ newCardsPerDay: Math.max(0, Number(e.target.value) || 0) })} />
        </label>
        <div className="flex items-center justify-between gap-4 p-5">
          <span><b>Samouczek</b><span className="block text-sm text-muted">Oprowadzenie po stronie: co gdzie jest.</span></span>
          <button className="btn btn-ghost" onClick={() => setSettings({ tourDone: false })}>Pokaż ponownie</button>
        </div>
        <label className="flex items-center justify-between gap-4 p-5">
          <span><b>Rozmiar czcionki edytora</b><span className="block text-sm text-muted">{settings.editorFont}px</span></span>
          <input type="range" min={11} max={20} value={settings.editorFont} onChange={(e) => setSettings({ editorFont: Number(e.target.value) })} className="accent-[var(--accent)]" />
        </label>
      </div>
    </div>
  );
}
