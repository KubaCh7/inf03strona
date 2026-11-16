// Formatowanie pliku przy zapisie (Ctrl+S / :w), jak „Format on Save” w VS Code.
// Biblioteki ladowane dopiero przy pierwszym zapisie, zeby nie spowalniac strony.

export type FormatResult = { text: string } | { error: string };

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
    const m = String((e as Error).message ?? e).split('\n')[0];
    return { error: m.length > 160 ? m.slice(0, 160) + '…' : m };
  }
}
