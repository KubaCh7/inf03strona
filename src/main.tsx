import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Po nowym wdrozeniu stare pliki JS znikaja. Zamiast bledu przeladuj strone (raz na minute).
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault();
  const last = Number(sessionStorage.getItem('p03-reload') || 0);
  if (Date.now() - last > 60_000) { sessionStorage.setItem('p03-reload', String(Date.now())); location.reload(); }
});

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
