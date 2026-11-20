// Formatowanie pliku przy zapisie (Ctrl+S / :w), jak „Format on Save” w VS Code.
// Biblioteki ladowane dopiero przy pierwszym zapisie, zeby nie spowalniac strony.

export type FormatResult = { text: string } | { error: string; line?: number };

const lang = (file: string) => {
  const f = file.toLowerCase();
  if (/\.html?$/.test(f)) return 'html';
  if (f.endsWith('.css')) return 'css';
  if (f.endsWith('.js')) return 'js';
  if (f.endsWith('.php')) return 'php';
  if (/\.(sql|txt)$/.test(f)) return 'sql';
  return null;
};

export const canFormat = (file: string) => lang(file) !== null;

export async function formatCode(file: string, code: string, tabWidth = 2): Promise<FormatResult> {
  const l = lang(file);
  if (!l || !code.trim()) return { text: code };
  try {
    if (l === 'sql') {
      const { format } = await import('sql-formatter');
      // tylko jesli to SQL (kwerendy.txt), komentarze -- zostaja
      return { text: format(code, { language: 'mysql', keywordCase: 'upper', tabWidth, linesBetweenQueries: 1 }) + '\n' };
    }
    const prettier = await import('prettier/standalone');
    const base = { tabWidth, printWidth: 100, singleQuote: false, htmlWhitespaceSensitivity: 'ignore' as const };
    if (l === 'css') {
      const postcss = await import('prettier/plugins/postcss');
      return { text: await prettier.format(code, { ...base, parser: 'css', plugins: [postcss] }) };
    }
    const [babel, estree] = await Promise.all([import('prettier/plugins/babel'), import('prettier/plugins/estree')]);
    if (l === 'js') return { text: await prettier.format(code, { ...base, parser: 'babel', plugins: [babel, estree] }) };
    const [html, postcss] = await Promise.all([import('prettier/plugins/html'), import('prettier/plugins/postcss')]);
    if (l === 'html') return { text: await prettier.format(code, { ...base, parser: 'html', plugins: [html, postcss, babel, estree] }) };
    const php = await import('@prettier/plugin-php/standalone');
    // phpVersion podany wprost: inaczej wtyczka szuka composer.json na dysku (w przegladarce go nie ma)
    return { text: await prettier.format(code, { ...base, parser: 'php', phpVersion: '8.2', plugins: [php.default ?? php, html, postcss, babel, estree] } as Parameters<typeof prettier.format>[1]) };
  } catch (e) {
    // blad skladni: pliku nie ruszamy, tylko informujemy (jak VS Code)
    const err = e as Error & { loc?: { start?: { line?: number } } };
    const m = String(err.message ?? e).split('\n')[0].replace(/\s*\(\d+:\d+\)\s*$/, '');
    const line = err.loc?.start?.line ?? (Number(/\((\d+):\d+\)/.exec(String(err.message))?.[1] ?? /line (\d+)/i.exec(String(err.message))?.[1] ?? 0) || undefined);
    // najczestsze bledy po polsku, z miejscem, gdzie zwykle naprawde jest problem
    const pl = /expecting ['"]?;/i.test(m) ? `Brakuje średnika ; na końcu poprzedniej instrukcji${line && line > 1 ? ` (zwykle linia ${line - 1})` : ''}.`
      : /unexpected end of (file|input)/i.test(m) ? 'Plik kończy się za wcześnie: brakuje zamykającego } ) albo cudzysłowu.'
      : /unexpected ['"]?\}/i.test(m) ? 'Nadmiarowy albo źle postawiony nawias }.'
      : /Unexpected closing tag/i.test(m) ? 'Zamykasz znacznik HTML, który nie był otwarty (albo był już zamknięty).'
      : /Unclosed|unterminated/i.test(m) ? 'Niezamknięty cudzysłów, komentarz albo znacznik.'
      : /CssSyntaxError|Unknown word/i.test(m) ? 'Błąd w CSS: sprawdź średniki, dwukropki i nawiasy { }.' : '';
    const full = (pl ? pl + ' ' : '') + m;
    return { error: full.length > 220 ? full.slice(0, 220) + '…' : full, line };
  }
}
