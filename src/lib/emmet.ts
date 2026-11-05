import expand, { resolveConfig } from 'emmet';
import { snippet, type Completion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import type { EditorView } from '@codemirror/view';

const HTML_TAGS = 'a abbr address area article aside audio b base bdi bdo blockquote body br button canvas caption cite code col colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr html i iframe img input ins kbd label legend li link main map mark math menu meta meter nav noscript object ol optgroup option output p param picture pre progress q rp rt ruby s samp script search section select slot small source span strong style sub summary sup svg table tbody td template textarea tfoot th thead time title tr track u ul var video wbr'.split(' ');

const FIELD = (i: number, p: string) => `\${${i}${p ? ':' + p : ''}}`;
const MARKUP = { type: 'markup' as const, syntax: 'html', options: { 'output.field': FIELD, 'output.indent': '  ' }, variables: { lang: 'pl', charset: 'UTF-8' } };
const STYLE = { type: 'stylesheet' as const, syntax: 'css', options: { 'output.field': FIELD, 'stylesheet.shortHex': true } };

let markupNames: string[] | null = null;
let styleNames: string[] | null = null;
const names = (kind: 'markup' | 'stylesheet') => {
  if (kind === 'markup') return (markupNames ??= Array.from(new Set([...HTML_TAGS, ...Object.keys(resolveConfig(MARKUP).snippets)])).sort());
  return (styleNames ??= Object.keys(resolveConfig(STYLE).snippets).sort());
};

function applyAbbr(kind: 'markup' | 'stylesheet', abbr: string) {
  return (view: EditorView, completion: Completion, from: number, to: number) => {
    let out: string;
    try { out = expand(abbr, kind === 'markup' ? MARKUP : STYLE); } catch { out = abbr; }
    // jak w VS Code: w szablonie strony nie skaczemy po wartosciach meta viewport
    out = out.replace(/\$\{\d+:(device-width|1\.0|IE=edge)\}/g, '$1');
    // snippet CodeMirror nie lubi samotnych { } w tekscie
    snippet(out.replace(/\$\{(\d+)\}/g, '${$1:}'))(view, completion, from, to);
  };
}


const COMPLEX = /[>+*.#[\]{}()^$@]/;

function insideTag(ctx: CompletionContext) {
  const line = ctx.state.doc.lineAt(ctx.pos);
  const before = line.text.slice(0, ctx.pos - line.from);
  return before.lastIndexOf('<') > before.lastIndexOf('>');
}

/** Podpowiedzi Emmet jak w VS Code: lista skrotow + znaczniki, posortowane, z „Emmet Abbreviation”. */
export function emmetSource(kind: 'markup' | 'stylesheet') {
  return (ctx: CompletionContext): CompletionResult | null => {
    if (kind === 'markup' && insideTag(ctx)) return null;
    const word = ctx.matchBefore(kind === 'markup' ? /[\w:!.#>*+\-$@^[\]{}()=%]+$/ : /[\w:!@#.\-+%$]+$/);
    if (!word || (word.from === word.to && !ctx.explicit)) return null;
    const typed = word.text;
    if (kind === 'markup') {
      // tylko na poczatku linii albo zaraz po znaczniku, nie w srodku zdania
      const line = ctx.state.doc.lineAt(ctx.pos);
      const lead = line.text.slice(0, word.from - line.from);
      const afterTag = lead.slice(lead.lastIndexOf('>') + 1);
      if (afterTag.trim() !== '') return null;
      if (!COMPLEX.test(typed) && !names(kind).some((n) => n.startsWith(typed.toLowerCase())) && !ctx.explicit) return null;
    }
    if (kind === 'stylesheet') {
      // tylko w deklaracji (wewnatrz { })
      const text = ctx.state.doc.sliceString(0, ctx.pos);
      if (text.lastIndexOf('{') <= text.lastIndexOf('}')) return null;
      const lineBefore = ctx.state.doc.lineAt(ctx.pos).text.slice(0, ctx.pos - ctx.state.doc.lineAt(ctx.pos).from);
      if (lineBefore.includes(':')) return null; // juz piszemy wartosc
    }
    const opts: Completion[] = names(kind).map((n) => ({ label: n, detail: 'Emmet Abbreviation', type: 'emmet', apply: applyAbbr(kind, n) }));
    if (COMPLEX.test(typed) || (typed && !names(kind).some((n) => n.startsWith(typed)))) {
      opts.unshift({ label: typed, detail: 'Emmet Abbreviation', type: 'emmet', apply: applyAbbr(kind, typed), boost: 99 });
    }
    return { from: word.from, options: opts, validFor: kind === 'markup' ? undefined : /^[\w:!@#.\-+%$]*$/ };
  };
}

