import { makeHints } from '../../src/lib/hints.ts';
const cases: [string, string | null][] = [
  ['wybierające jedynie pola idObiekt, plik i nazwa z tabeli obiekty dla Islandii', "SELECT idObiekt, plik, nazwa FROM obiekty WHERE panstwo = 'Islandia';"],
  ['wybierające nazwy producentów oraz minimalną cenę rowerów zgrupowane dla każdego producenta', 'SELECT p.nazwa, MIN(r.cena) AS "najtańszy" FROM rowery r JOIN producenci p ON r.idProducenta = p.id GROUP BY p.nazwa ORDER BY p.nazwa DESC;'],
  ['liczące średnią pensję pracowników ze względu na stanowisko', null],
];
for (const [t, s] of cases) { console.log('---', t.slice(0, 50)); makeHints(t, s).forEach((h, i) => console.log(`${i + 1}. ${h}`)); }
