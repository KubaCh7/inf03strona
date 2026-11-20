import { snippetCompletion as s, insertBracket, type Completion, type CompletionContext } from '@codemirror/autocomplete';
import type { EditorView } from '@codemirror/view';

/** Funkcja jak w VS Code: wstawia `nazwa()` z kursorem w nawiasie (albo sama nazwe, gdy za kursorem juz jest nawias). */
const fn = (label: string, detail: string, type = 'function'): Completion => ({
  label, detail, type,
  apply: (view: EditorView, _c: Completion, from: number, to: number) => {
    const paren = view.state.sliceDoc(to, to + 1) === '(';
    view.dispatch({ changes: { from, to, insert: label }, selection: { anchor: from + label.length + (paren ? 1 : 0) }, userEvent: 'input.complete' });
    if (paren) return;
    // nawias jak przy zwyklym pisaniu: wpisany pozniej `)` nadpisuje ten wstawiony, a nie dokleja drugi
    const tr = insertBracket(view.state, '(');
    if (tr) view.dispatch(tr); else view.dispatch({ changes: { from: from + label.length, insert: '()' }, selection: { anchor: from + label.length + 1 } });
  },
});
/** Zwykle slowo (zmienna, slowo kluczowe): wstawia tylko je, bez dodatkowych znakow. */
const word = (label: string, type: string, detail?: string): Completion => ({ label, type, detail });

// ---------- JavaScript: DOM i typowe API z arkuszy ----------
export const JS_COMPLETIONS: Completion[] = [
  fn('document.getElementById', 'element po id'),
  fn('document.querySelector', 'pierwszy pasujący element'),
  fn('document.querySelectorAll', 'wszystkie pasujące'),
  fn('document.getElementsByClassName', ''),
  fn('document.createElement', 'nowy element'),
  fn('addEventListener', 'podpięcie zdarzenia'),
  s('function ${}() {\n\t${}\n}', { label: 'function', detail: 'funkcja', type: 'keyword' }),
  s('for (let i = 0; i < ${}; i++) {\n\t${}\n}', { label: 'for', detail: 'pętla for', type: 'keyword' }),
  s('if (${}) {\n\t${}\n}', { label: 'if', detail: 'warunek', type: 'keyword' }),
  s('if (${}) {\n\t${}\n} else {\n\t${}\n}', { label: 'ifelse', detail: 'if … else', type: 'keyword' }),
  fn('console.log', 'wypisz w konsoli'),
  fn('alert', ''),
  fn('Math.random', 'liczba 0..1'),
  fn('Math.floor', 'zaokrąglenie w dół'),
  fn('localStorage.setItem', ''),
  fn('localStorage.getItem', ''),
  ...['innerHTML', 'textContent', 'innerText', 'value', 'style', 'src', 'href', 'className', 'classList', 'checked', 'length', 'appendChild', 'append', 'remove', 'setAttribute', 'getAttribute', 'parentElement', 'children', 'focus', 'push', 'pop', 'join', 'split', 'toUpperCase', 'toLowerCase', 'toFixed', 'includes', 'indexOf', 'forEach', 'map', 'filter']
    .map((p) => ({ label: p, type: 'property', boost: -1 })),
  ...['backgroundColor', 'color', 'display', 'fontSize', 'width', 'height', 'border', 'opacity', 'visibility', 'filter', 'transform'].map((p) => ({ label: `style.${p}`, type: 'property', detail: 'styl CSS', boost: -2 })),
  ...['parseInt', 'parseFloat', 'Number', 'String', 'isNaN', 'setTimeout', 'setInterval', 'prompt', 'confirm'].map((f) => fn(f, 'funkcja globalna')),
];

// ---------- PHP ----------
// Jak w VS Code: funkcje wstawiaja `nazwa()`, zmienne i slowa kluczowe tylko siebie. Gotowe bloki maja osobne nazwy.
export const PHP_COMPLETIONS: Completion[] = [
  s('<?php\n${}\n?>', { label: '<?php', detail: 'blok PHP', type: 'keyword' }),
  ...['$_POST', '$_GET', '$_SESSION', '$_COOKIE', '$_SERVER', '$_FILES'].map((v) => word(v, 'variable', 'tablica superglobalna')),
  ...['echo', 'if', 'else', 'elseif', 'while', 'for', 'foreach', 'as', 'return', 'exit', 'function', 'null', 'true', 'false', 'print'].map((k) => word(k, 'keyword')),
  fn('isset', 'czy zmienna istnieje'), fn('empty', 'czy pusta'), fn('unset', 'usuń zmienną'),
  fn('session_start', 'start sesji'), fn('session_destroy', 'koniec sesji'), fn('header', 'nagłówek, np. przekierowanie'), fn('setcookie', 'ciasteczko'), fn('date', 'data'),
  fn('mysqli_connect', 'połącz z bazą'), fn('mysqli_query', 'wyślij zapytanie'), fn('mysqli_fetch_assoc', 'wiersz jako tablica asocjacyjna'), fn('mysqli_fetch_row', 'wiersz jako tablica numeryczna'),
  fn('mysqli_fetch_array', 'wiersz jako tablica'), fn('mysqli_num_rows', 'liczba wierszy'), fn('mysqli_close', 'zamknij połączenie'), fn('mysqli_real_escape_string', 'zabezpiecz tekst'), fn('mysqli_set_charset', 'kodowanie znaków'),
  ...['count', 'strlen', 'strtolower', 'strtoupper', 'trim', 'explode', 'implode', 'sha1', 'md5', 'rand', 'round', 'number_format', 'is_numeric', 'intval', 'htmlspecialchars', 'time', 'file_put_contents', 'file_get_contents', 'json_encode', 'json_decode', 'array_push', 'in_array', 'sort', 'print_r', 'var_dump', 'password_hash', 'password_verify', 'str_replace', 'substr'].map((f) => fn(f, 'funkcja PHP')),
  // gotowe bloki (fragmenty): tylko gdy wybierzesz je z listy, nie koliduja z pisaniem
  { ...s('$polaczenie = mysqli_connect("localhost", "root", "", "${}");', { label: 'polaczenie', detail: 'fragment: połączenie z bazą', type: 'text' }), boost: -5 },
  { ...s('while ($wiersz = mysqli_fetch_assoc($wynik)) {\n\t${}\n}', { label: 'whilefetch', detail: 'fragment: pętla po wynikach', type: 'text' }), boost: -5 },
  { ...s('if (isset($_POST["${}"])) {\n\t${}\n}', { label: 'ifpost', detail: 'fragment: jeśli wysłano formularz', type: 'text' }), boost: -5 },
];

// ---------- SQL ----------
const SQL_KW = ['SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'ALTER TABLE', 'ADD COLUMN', 'DROP COLUMN', 'CREATE TABLE', 'DROP TABLE', 'JOIN', 'INNER JOIN', 'LEFT JOIN', 'ON', 'AS', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS NULL', 'IS NOT NULL', 'DISTINCT', 'ASC', 'DESC', 'PRIMARY KEY', 'FOREIGN KEY', 'REFERENCES', 'AUTO_INCREMENT', 'NOT NULL', 'DEFAULT', 'CREATE USER', 'IDENTIFIED BY', 'GRANT', 'REVOKE', 'TO', 'CREATE VIEW'];
export const SQL_COMPLETIONS: Completion[] = [
  ...SQL_KW.map((k) => ({ label: k, type: 'keyword' })),
  ...['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'NOW', 'CURDATE', 'YEAR', 'MONTH', 'LOWER', 'UPPER', 'CONCAT', 'RAND', 'ROUND'].map((f) => s(`${f}(\${})`, { label: `${f}()`, type: 'function' })),
  s('SELECT ${kolumny} FROM ${tabela} WHERE ${warunek};', { label: 'sel', detail: 'szablon SELECT', type: 'keyword' }),
  s("CREATE USER '${uzytkownik}'@'localhost' IDENTIFIED BY '${haslo}';", { label: 'createuser', detail: 'nowy użytkownik', type: 'keyword' }),
  s("GRANT ${SELECT} ON ${baza}.${tabela} TO '${uzytkownik}'@'localhost';", { label: 'grant', detail: 'nadaj uprawnienia', type: 'keyword' }),
];

/** Zrodlo podpowiedzi z listy, uruchamiane po literze, $, < lub kropce */
export function listSource(list: Completion[], re = /[\w$.<!]+$/) {
  return (ctx: CompletionContext) => {
    const w = ctx.matchBefore(re);
    if (!w || (w.from === w.to && !ctx.explicit)) return null;
    return { from: w.from, options: list, validFor: /^[\w$.<!]*$/ };
  };
}
