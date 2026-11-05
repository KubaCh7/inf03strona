import { snippetCompletion as s, type Completion, type CompletionContext } from '@codemirror/autocomplete';

const fn = (label: string, detail: string, apply?: string): Completion => ({ label, detail, type: 'function', apply });

// ---------- JavaScript: DOM i typowe API z arkuszy ----------
export const JS_COMPLETIONS: Completion[] = [
  s('document.getElementById("${id}")', { label: 'document.getElementById', detail: 'element po id', type: 'function' }),
  s('document.querySelector("${selektor}")', { label: 'document.querySelector', detail: 'pierwszy pasujący element', type: 'function' }),
  s('document.querySelectorAll("${selektor}")', { label: 'document.querySelectorAll', detail: 'wszystkie pasujące', type: 'function' }),
  s('document.getElementsByClassName("${klasa}")', { label: 'document.getElementsByClassName', type: 'function' }),
  s('document.createElement("${div}")', { label: 'document.createElement', detail: 'nowy element', type: 'function' }),
  s('addEventListener("${click}", function () {\n\t${}\n});', { label: 'addEventListener', detail: 'podpięcie zdarzenia', type: 'method' }),
  s('function ${nazwa}() {\n\t${}\n}', { label: 'function', detail: 'funkcja', type: 'keyword' }),
  s('for (let ${i} = 0; ${i} < ${n}; ${i}++) {\n\t${}\n}', { label: 'for', detail: 'pętla for', type: 'keyword' }),
  s('if (${warunek}) {\n\t${}\n}', { label: 'if', detail: 'warunek', type: 'keyword' }),
  s('if (${warunek}) {\n\t${}\n} else {\n\t\n}', { label: 'ifelse', detail: 'if … else', type: 'keyword' }),
  s('console.log(${});', { label: 'console.log', detail: 'wypisz w konsoli', type: 'function' }),
  s('alert("${}");', { label: 'alert', type: 'function' }),
  s('Math.floor(Math.random() * ${n})', { label: 'Math.random', detail: 'losowa liczba 0..n-1', type: 'function' }),
  s('localStorage.setItem("${klucz}", ${wartosc});', { label: 'localStorage.setItem', type: 'function' }),
  s('localStorage.getItem("${klucz}")', { label: 'localStorage.getItem', type: 'function' }),
  ...['innerHTML', 'textContent', 'innerText', 'value', 'style', 'src', 'href', 'className', 'classList', 'checked', 'length', 'appendChild', 'append', 'remove', 'setAttribute', 'getAttribute', 'parentElement', 'children', 'focus', 'push', 'pop', 'join', 'split', 'toUpperCase', 'toLowerCase', 'toFixed', 'includes', 'indexOf', 'forEach', 'map', 'filter']
    .map((p) => ({ label: p, type: 'property', boost: -1 })),
  ...['backgroundColor', 'color', 'display', 'fontSize', 'width', 'height', 'border', 'opacity', 'visibility', 'filter', 'transform'].map((p) => ({ label: `style.${p}`, type: 'property', detail: 'styl CSS', boost: -2 })),
  ...['parseInt', 'parseFloat', 'Number', 'String', 'isNaN', 'setTimeout', 'setInterval', 'prompt', 'confirm'].map((f) => fn(f, 'funkcja globalna')),
];

// ---------- PHP ----------
export const PHP_COMPLETIONS: Completion[] = [
  s('$polaczenie = mysqli_connect("localhost", "root", "", "${baza}");', { label: 'mysqli_connect', detail: 'połącz z bazą', type: 'function' }),
  s('$wynik = mysqli_query($polaczenie, "${SELECT * FROM tabela}");', { label: 'mysqli_query', detail: 'wyślij zapytanie', type: 'function' }),
  s('while ($wiersz = mysqli_fetch_assoc($wynik)) {\n\techo $wiersz["${kolumna}"];\n}', { label: 'whilefetch', detail: 'pętla po wynikach', type: 'keyword' }),
  s('mysqli_fetch_assoc($wynik)', { label: 'mysqli_fetch_assoc', detail: 'wiersz jako tablica asocjacyjna', type: 'function' }),
  s('mysqli_fetch_row($wynik)', { label: 'mysqli_fetch_row', detail: 'wiersz jako tablica numeryczna', type: 'function' }),
  s('mysqli_fetch_array($wynik)', { label: 'mysqli_fetch_array', type: 'function' }),
  s('mysqli_num_rows($wynik)', { label: 'mysqli_num_rows', detail: 'liczba wierszy', type: 'function' }),
  s('mysqli_close($polaczenie);', { label: 'mysqli_close', detail: 'zamknij połączenie', type: 'function' }),
  s('mysqli_real_escape_string($polaczenie, ${tekst})', { label: 'mysqli_real_escape_string', type: 'function' }),
  s('$_POST["${pole}"]', { label: '$_POST', detail: 'dane z formularza POST', type: 'variable' }),
  s('$_GET["${pole}"]', { label: '$_GET', detail: 'dane z adresu', type: 'variable' }),
  s('$_COOKIE["${nazwa}"]', { label: '$_COOKIE', type: 'variable' }),
  s('$_SESSION["${klucz}"]', { label: '$_SESSION', type: 'variable' }),
  s('isset($_POST["${pole}"])', { label: 'isset', detail: 'czy zmienna istnieje', type: 'function' }),
  s('if (!empty($_POST["${pole}"])) {\n\t${}\n}', { label: 'ifpost', detail: 'jeśli wysłano formularz', type: 'keyword' }),
  s('if (${warunek}) {\n\t${}\n}', { label: 'if', type: 'keyword' }),
  s('foreach ($${tablica} as $${element}) {\n\t${}\n}', { label: 'foreach', type: 'keyword' }),
  s('for ($i = 0; $i < ${n}; $i++) {\n\t${}\n}', { label: 'for', type: 'keyword' }),
  s('echo "${}";', { label: 'echo', detail: 'wypisz', type: 'keyword' }),
  s('setcookie("${nazwa}", "${wartosc}", time() + ${3600});', { label: 'setcookie', type: 'function' }),
  s('session_start();', { label: 'session_start', type: 'function' }),
  s('date("Y-m-d")', { label: 'date', detail: 'bieżąca data', type: 'function' }),
  s('header("Location: ${strona.php}");', { label: 'header', type: 'function' }),
  s('<?php\n${}\n?>', { label: '<?php', detail: 'blok PHP', type: 'keyword' }),
  ...['empty', 'count', 'strlen', 'strtolower', 'strtoupper', 'trim', 'explode', 'implode', 'sha1', 'md5', 'rand', 'round', 'number_format', 'is_numeric', 'intval', 'htmlspecialchars', 'time', 'file_put_contents', 'file_get_contents', 'json_encode', 'json_decode', 'array_push', 'in_array', 'sort', 'print_r', 'var_dump', 'include', 'require'].map((f) => fn(f, 'funkcja PHP')),
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
