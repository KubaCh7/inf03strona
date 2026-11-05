import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import Layout from './components/Layout';
import Today from './pages/Today';
import { Loading } from './components/ui';

const L = (f: () => Promise<{ default: React.ComponentType }>) => { const C = lazy(f); return <Suspense fallback={<Loading />}><C /></Suspense>; };

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Today /> },
      { path: 'sciezka', element: L(() => import('./pages/Path')) },
      { path: 'sciezka/:id', element: L(() => import('./pages/Lesson')) },
      { path: 'fiszki', element: L(() => import('./pages/Flashcards')) },
      { path: 'teoria', element: L(() => import('./pages/Theory')) },
      { path: 'arkusze', element: L(() => import('./pages/Sheets')) },
      { path: 'arkusze/:code', element: L(() => import('./pages/SheetDetail')) },
      { path: 'warsztat', element: L(() => import('./pages/WorkshopPage')) },
      { path: 'warsztat/:code', element: L(() => import('./pages/WorkshopPage')) },
      { path: 'sprawdzarka', element: L(() => import('./pages/CheckerPage')) },
      { path: 'proba', element: L(() => import('./pages/Exam')) },
      { path: 'sprint', element: L(() => import('./pages/Sprint')) },
      { path: 'minigry', element: L(() => import('./pages/Games')) },
      { path: 'postep', element: L(() => import('./pages/ProgressPage')) },
      { path: 'ustawienia', element: L(() => import('./pages/SettingsPage')) },
      { path: 'o-projekcie', element: L(() => import('./pages/About')) },
      { path: '*', element: <div className="card p-8">Nie ma takiej strony.</div> },
    ],
  },
]);

export default function App() { return <RouterProvider router={router} />; }
