import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Po nowym wdrozeniu stare pliki JS znikaja. Przeladuj strone (najwyzej raz na 10 s).
// Blad tlumimy tylko wtedy, gdy naprawde przeladowujemy; inaczej trafia do ErrorBoundary,
// ktore pokaze „nowa wersja strony” (stlumiony blad dawal pusty modul i awarie lazy()).
window.addEventListener('vite:preloadError', (e) => {
  const last = Number(sessionStorage.getItem('p03-reload') || 0);
  if (Date.now() - last > 10_000) { e.preventDefault(); sessionStorage.setItem('p03-reload', String(Date.now())); location.reload(); }
});

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
