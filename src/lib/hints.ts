// Stopniowe podpowiedzi do kwerend: od ogolnej wskazowki do szkieletu z lukami.
// Budowane z rozwiazania wzorcowego (jesli jest) i z tresci zadania.

const KW = /\b(SELECT|DISTINCT|FROM|JOIN|INNER|LEFT|RIGHT|OUTER|ON|WHERE|AND|OR|NOT|IN|LIKE|BETWEEN|IS|NULL|GROUP|BY|HAVING|ORDER|ASC|DESC|LIMIT|AS|UPDATE|SET|INSERT|INTO|VALUES|DELETE|CREATE|ALTER|TABLE|ADD|DROP|COLUMN|USER|IDENTIFIED|GRANT|REVOKE|TO|ALL|PRIVILEGES|COUNT|SUM|AVG|MIN|MAX|YEAR|MONTH|DAY|CURDATE|NOW|UPPER|LOWER|LENGTH|CONCAT|ROUND)\b/gi;

const uniq = <T,>(a: T[]) => [...new Set(a)];
const clean = (s: string) => s.replace(/[`"]/g, '').trim();

/** Tabele uzyte w kwerendzie. */
function tablesOf(sql: string) {
  return uniq([...sql.matchAll(/\b(?:FROM|JOIN|UPDATE|INTO|TABLE)\s+[`"]?(\w+)/gi)].map((m) => m[1]));
}

/** Szkielet: slowa kluczowe i interpunkcja zostaja, reszta zamieniona na ___. */
function skeleton(sql: string) {
  const one = sql.replace(/\s+/g, ' ').trim();
  const tokens = one.match(/'[^']*'|"[^"]*"|`[^`]*`|\w+|[^\s\w]/g) ?? [];
  let out = '';
  for (const t of tokens) {
    const isKw = new RegExp(`^${KW.source}$`, 'i').test(t);
    const piece = isKw ? t.toUpperCase() : /^[\w'"`]/.test(t) ? '___' : t;
    const glue = !out || /^[,;).(]$/.test(piece) || out.endsWith('(') || out.endsWith('.');
    out += (glue ? '' : ' ') + piece;
  }
  // ladniej: nowa linia przed glownymi klauzulami
  return out.replace(/ (FROM|WHERE|GROUP BY|HAVING|ORDER BY|LIMIT|JOIN|INNER JOIN|LEFT JOIN|SET|VALUES)\b/g, '\n$1').replace(/___( ___)+/g, '___');
}

/** Podpowiedzi z samej tresci zadania (gdy brak rozwiazania albo jako uzupelnienie). */
function fromText(text: string): string[] {
  const t = text.toLowerCase();
  const h: string[] = [];
  if (/^(wybieraj|wyświetl|pokazuj|zwracaj)/.test(t) || /wybieraj/.test(t)) h.push('To kwerenda wybierająca: zaczynasz od SELECT kolumny FROM tabela.');
  if ((/licząc|liczb[aęy] (rekord|wierszy|osób|zamówień)|ile /.test(t)) && !/średni|sum[ęa]|łączn/.test(t)) h.push('Liczysz wiersze: użyj COUNT(*) (albo COUNT(kolumna)).');
  if (/średni/.test(t)) h.push('Średnią liczy funkcja AVG(kolumna).');
  if (/sum[ęa]|łączn/.test(t)) h.push('Sumę liczy funkcja SUM(kolumna).');
  if (/minimaln|najmniejsz|najtańsz/.test(t)) h.push('Najmniejszą wartość daje MIN(kolumna).');
  if (/maksymaln|największ|najdroższ/.test(t)) h.push('Największą wartość daje MAX(kolumna).');
  if (/dla każdego|grupuj|zgrupowan|ze względu na/.test(t)) h.push('„Dla każdego …” oznacza grupowanie: GROUP BY kolumna.');
  if (/rosnąco/.test(t)) h.push('Sortowanie rosnąco: ORDER BY kolumna ASC.');
  if (/malejąco/.test(t)) h.push('Sortowanie malejąco: ORDER BY kolumna DESC.');
  if (/relacj/.test(t)) h.push('Potrzebujesz dwóch tabel połączonych relacją: JOIN druga_tabela ON tabela1.klucz = tabela2.klucz.');
  if (/alias|nazw[aęy] kolumny/.test(t)) h.push('Kolumnie nadajesz nazwę aliasem: wyrażenie AS nazwa (w treści jest podane, jaka).');
  if (/rozpoczyna|zaczyna|zawiera|kończ/.test(t)) h.push('Dopasowanie tekstu robi LIKE, np. LIKE \'A%\' (zaczyna się na A) albo LIKE \'%x%\' (zawiera x).');
  if (/aktualizuj|zmieniaj|modyfikuj|ustaw/.test(t)) h.push('To kwerenda zmieniająca dane: UPDATE tabela SET kolumna = wartość WHERE warunek.');
  if (/usuwaj/.test(t)) h.push('To usuwanie wierszy: DELETE FROM tabela WHERE warunek.');
  if (/dodaj|wstawiaj/.test(t)) h.push(/kolumn|pole/.test(t) ? 'Nową kolumnę dodaje ALTER TABLE tabela ADD kolumna typ.' : 'Nowy wiersz dodaje INSERT INTO tabela (kolumny) VALUES (wartości).');
  if (/użytkownik/.test(t) && /tworz/.test(t)) h.push('Użytkownika tworzy CREATE USER \'nazwa\'@\'localhost\' IDENTIFIED BY \'hasło\'.');
  if (/uprawnie|prawa/.test(t)) h.push('Uprawnienia nadaje GRANT prawa ON baza.tabela TO \'użytkownik\'@\'localhost\'.');
  if (/bez powtórzeń|niepowtarzaj|unikaln/.test(t)) h.push('Bez powtórzeń: SELECT DISTINCT kolumna.');
  return h;
}

/** Lista podpowiedzi od najogolniejszej do najbardziej szczegolowej. */
export function makeHints(taskText: string, solution: string | null | undefined): string[] {
  const hints: string[] = [];
  const sol = solution ? solution.replace(/--[^\n]*/g, '').trim() : '';
  if (sol) {
    const S = sol.toUpperCase();
    const verb = /^\s*(\w+(?:\s+USER)?)/i.exec(sol)?.[1].toUpperCase() ?? 'SELECT';
    const tables = tablesOf(sol);
    hints.push(`Polecenie zaczyna się od ${verb}${tables.length ? `, a działasz na ${tables.length > 1 ? 'tabelach ' + tables.join(' i ') : 'tabeli ' + tables[0]}` : ''}.`);
    if (/\bJOIN\b/.test(S)) {
      const on = /\bON\s+([\w.`"]+)\s*=\s*([\w.`"]+)/i.exec(sol);
      const col = (x: string) => clean(x).split('.').pop();
      hints.push(`Tabele łączysz przez JOIN … ON${on ? ` – po kolumnach ${col(on[1])} i ${col(on[2])}` : ''} (klucz obcy = klucz główny).`);
    } else if (/FROM\s+\w+\s*,\s*\w+/i.test(sol)) hints.push('Dwie tabele po przecinku w FROM łączysz warunkiem w WHERE: tabela1.klucz = tabela2.klucz.');
    const fns = uniq([...S.matchAll(/\b(COUNT|SUM|AVG|MIN|MAX|YEAR|MONTH|DAY|UPPER|LOWER|LENGTH|CONCAT|ROUND)\s*\(/g)].map((m) => m[1]));
    if (fns.length) hints.push(`Przyda się funkcja ${fns.join(', ')}.`);
    if (/\bWHERE\b/.test(S)) {
      const where = /\bWHERE\b([\s\S]*?)(?=\bGROUP\b|\bORDER\b|\bLIMIT\b|\bHAVING\b|;|$)/i.exec(sol)?.[1] ?? '';
      const cols = uniq([...where.matchAll(/([A-Za-z_]\w*)\s*(?:=|<>|!=|<=|>=|<|>|\bLIKE\b|\bIN\b|\bBETWEEN\b|\bIS\b)/gi)].map((m) => m[1]).filter((c) => !/^(AND|OR|NOT)$/i.test(c)));
      const ops = uniq([...where.matchAll(/\b(LIKE|IN|BETWEEN|IS NULL|IS NOT NULL)\b/gi)].map((m) => m[1].toUpperCase()));
      hints.push(`Warunek w WHERE dotyczy kolumn: ${cols.join(', ') || 'z treści zadania'}${ops.length ? ` (użyj ${ops.join(', ')})` : ''}${/\bAND\b/i.test(where) ? '; kilka warunków łączysz AND' : ''}${/\bOR\b/i.test(where) ? '; alternatywę zapisujesz OR' : ''}.`);
    }
    if (/\bGROUP BY\b/.test(S)) hints.push(`Grupujesz wyniki: GROUP BY ${clean(/GROUP BY\s+([\w.,\s`]+?)(?=\bHAVING\b|\bORDER\b|\bLIMIT\b|;|$)/i.exec(sol)?.[1] ?? 'kolumna')}.`);
    if (/\bHAVING\b/.test(S)) hints.push('Warunek na wynik grupowania (np. na COUNT) idzie do HAVING, nie do WHERE.');
    if (/\bORDER BY\b/.test(S)) hints.push(`Sortujesz: ORDER BY … ${/\bDESC\b/.test(S) ? 'DESC (malejąco)' : 'ASC (rosnąco, domyślnie)'}.`);
    if (/\bLIMIT\b/.test(S)) hints.push(`Ograniczasz liczbę wierszy: LIMIT ${/LIMIT\s+(\d+)/i.exec(sol)?.[1] ?? 'n'}.`);
    if (/\bAS\b/.test(S)) hints.push('Pamiętaj o aliasach kolumn (AS „nazwa”) dokładnie takich jak w treści zadania.');
    if (/\bDISTINCT\b/.test(S)) hints.push('Wynik ma być bez powtórzeń: SELECT DISTINCT.');
    hints.push(`Szkielet (wstaw nazwy w miejsce ___):\n${skeleton(sol)}`);
  } else {
    hints.push(...fromText(taskText));
    if (!hints.length) hints.push('Przeczytaj treść jeszcze raz: co ma zwrócić kwerenda (kolumny), z której tabeli (FROM) i z jakim warunkiem (WHERE).');
  }
  return uniq(hints);
}
