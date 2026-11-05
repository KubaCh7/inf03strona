import { Component, type ReactNode } from 'react';

/** Lapie bledy renderowania, zeby awaria jednego elementu nie wywalala calej strony. */
export default class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode; resetKey?: unknown }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidUpdate(prev: { resetKey?: unknown }) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }); }
  componentDidCatch(error: Error) { console.error('Pracownia03:', error); }
  render() {
    if (!this.state.error) return this.props.children;
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
