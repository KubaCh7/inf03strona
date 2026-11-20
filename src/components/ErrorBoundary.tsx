import { Component, type ReactNode } from 'react';

/** Blad ladowania modulu po nowym wdrozeniu (stary plik JS juz nie istnieje). */
export const isStaleChunk = (e: Error | null) => !!e && /dynamically imported module|Importing a module script failed|error loading dynamically|_result\.default|Failed to fetch|ChunkLoadError|module script/i.test(String(e.message));

/** Lapie bledy renderowania, zeby awaria jednego elementu nie wywalala calej strony. */
export default class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode; resetKey?: unknown }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidUpdate(prev: { resetKey?: unknown }) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }); }
  componentDidCatch(error: Error) {
    console.error('Pracownia03:', error);
    // nowa wersja strony (brak starego pliku JS): odswiez sam, najwyzej raz na 10 s
    if (isStaleChunk(error)) { const last = Number(sessionStorage.getItem('p03-reload') || 0); if (Date.now() - last > 10_000) { sessionStorage.setItem('p03-reload', String(Date.now())); location.reload(); } }
  }
  render() {
    if (!this.state.error) return this.props.children;
    if (isStaleChunk(this.state.error)) return (
      <div className="card mx-auto my-8 max-w-lg p-6 text-center">
        <p className="display text-xl font-bold">Jest nowa wersja strony</p>
        <p className="mt-2 text-sm text-muted">Strona została zaktualizowana, a ta karta ma jeszcze starą wersję. Odśwież, Twój postęp jest bezpieczny.</p>
        <button className="btn btn-primary mt-4" onClick={() => location.reload()}>Odśwież stronę</button>
      </div>
    );
    if (this.props.fallback) return this.props.fallback;
    return (
      <div className="card mx-auto my-8 max-w-lg p-6 text-center">
        <p className="display text-xl font-bold">Coś poszło nie tak na tej stronie</p>
        <p className="mt-2 text-sm text-muted">Twój postęp jest bezpieczny. Spróbuj odświeżyć.</p>
        <p className="mono mt-3 break-words rounded-lg bg-surface-2 p-2 text-xs text-muted">{this.state.error.message}</p>
        <button className="btn btn-primary mt-4" onClick={() => location.reload()}>Odśwież stronę</button>
      </div>
    );
  }
}
