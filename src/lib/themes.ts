import { createTheme } from '@uiw/codemirror-themes';
import { tags as t } from '@lezer/highlight';
import type { Extension } from '@codemirror/state';

/** Paleta motywu edytora w stylu VS Code. */
type P = {
  dark: boolean; bg: string; fg: string; sel: string; line: string; gutter: string; gutterFg: string; cursor: string;
  comment: string; keyword: string; string: string; number: string; func: string; tag: string; attr: string; prop: string; type: string; variable: string; op: string; punct?: string;
};

export type EditorThemeDef = { id: string; name: string; author: string; price: number; p: P };

export const EDITOR_THEMES: EditorThemeDef[] = [
  { id: 'auto', name: 'Pracownia (jak strona)', author: 'domyślny', price: 0, p: null as unknown as P },
  { id: 'vscode-dark', name: 'Dark+ (VS Code)', author: 'Microsoft', price: 0, p: { dark: true, bg: '#1E1E1E', fg: '#D4D4D4', sel: '#264F78', line: '#2A2D2E', gutter: '#1E1E1E', gutterFg: '#858585', cursor: '#AEAFAD', comment: '#6A9955', keyword: '#C586C0', string: '#CE9178', number: '#B5CEA8', func: '#DCDCAA', tag: '#569CD6', attr: '#9CDCFE', prop: '#9CDCFE', type: '#4EC9B0', variable: '#9CDCFE', op: '#D4D4D4', punct: '#808080' } },
  { id: 'vscode-light', name: 'Light+ (VS Code)', author: 'Microsoft', price: 0, p: { dark: false, bg: '#FFFFFF', fg: '#000000', sel: '#ADD6FF', line: '#F3F3F3', gutter: '#FFFFFF', gutterFg: '#237893', cursor: '#000000', comment: '#008000', keyword: '#AF00DB', string: '#A31515', number: '#098658', func: '#795E26', tag: '#800000', attr: '#E50000', prop: '#E50000', type: '#267F99', variable: '#001080', op: '#000000', punct: '#800000' } },
  { id: 'dracula', name: 'Dracula', author: 'Zeno Rocha', price: 60, p: { dark: true, bg: '#282A36', fg: '#F8F8F2', sel: '#44475A', line: '#44475A80', gutter: '#282A36', gutterFg: '#6272A4', cursor: '#F8F8F0', comment: '#6272A4', keyword: '#FF79C6', string: '#F1FA8C', number: '#BD93F9', func: '#50FA7B', tag: '#FF79C6', attr: '#50FA7B', prop: '#8BE9FD', type: '#8BE9FD', variable: '#F8F8F2', op: '#FF79C6' } },
  { id: 'one-dark-pro', name: 'One Dark Pro', author: 'binaryify', price: 60, p: { dark: true, bg: '#282C34', fg: '#ABB2BF', sel: '#3E4451', line: '#2C313C', gutter: '#282C34', gutterFg: '#495162', cursor: '#528BFF', comment: '#7F848E', keyword: '#C678DD', string: '#98C379', number: '#D19A66', func: '#61AFEF', tag: '#E06C75', attr: '#D19A66', prop: '#E06C75', type: '#E5C07B', variable: '#E06C75', op: '#56B6C2' } },
  { id: 'one-dark-night-flat', name: 'One Dark Pro Night Flat', author: 'binaryify', price: 80, p: { dark: true, bg: '#16191D', fg: '#ABB2BF', sel: '#2C313C', line: '#1D2025', gutter: '#16191D', gutterFg: '#3F4550', cursor: '#528BFF', comment: '#7F848E', keyword: '#C678DD', string: '#98C379', number: '#D19A66', func: '#61AFEF', tag: '#E06C75', attr: '#D19A66', prop: '#E06C75', type: '#E5C07B', variable: '#E06C75', op: '#56B6C2' } },
  { id: 'one-dark-darker', name: 'One Dark Pro Darker', author: 'binaryify', price: 80, p: { dark: true, bg: '#23272E', fg: '#ABB2BF', sel: '#323842', line: '#2A2F38', gutter: '#23272E', gutterFg: '#495162', cursor: '#528BFF', comment: '#7F848E', keyword: '#C678DD', string: '#98C379', number: '#D19A66', func: '#61AFEF', tag: '#E06C75', attr: '#D19A66', prop: '#E06C75', type: '#E5C07B', variable: '#E06C75', op: '#56B6C2' } },
  { id: 'monokai', name: 'Monokai', author: 'Wimer Hazenberg', price: 50, p: { dark: true, bg: '#272822', fg: '#F8F8F2', sel: '#49483E', line: '#3E3D32', gutter: '#272822', gutterFg: '#90908A', cursor: '#F8F8F0', comment: '#88846F', keyword: '#F92672', string: '#E6DB74', number: '#AE81FF', func: '#A6E22E', tag: '#F92672', attr: '#A6E22E', prop: '#66D9EF', type: '#66D9EF', variable: '#F8F8F2', op: '#F92672' } },
  { id: 'github-dark', name: 'GitHub Dark', author: 'GitHub', price: 50, p: { dark: true, bg: '#0D1117', fg: '#E6EDF3', sel: '#264F78', line: '#161B22', gutter: '#0D1117', gutterFg: '#6E7681', cursor: '#E6EDF3', comment: '#8B949E', keyword: '#FF7B72', string: '#A5D6FF', number: '#79C0FF', func: '#D2A8FF', tag: '#7EE787', attr: '#79C0FF', prop: '#79C0FF', type: '#FFA657', variable: '#FFA657', op: '#FF7B72' } },
  { id: 'github-light', name: 'GitHub Light', author: 'GitHub', price: 40, p: { dark: false, bg: '#FFFFFF', fg: '#1F2328', sel: '#B6E3FF', line: '#F6F8FA', gutter: '#FFFFFF', gutterFg: '#8C959F', cursor: '#1F2328', comment: '#6E7781', keyword: '#CF222E', string: '#0A3069', number: '#0550AE', func: '#8250DF', tag: '#116329', attr: '#0550AE', prop: '#0550AE', type: '#953800', variable: '#953800', op: '#CF222E' } },
  { id: 'tokyo-night', name: 'Tokyo Night', author: 'enkia', price: 70, p: { dark: true, bg: '#1A1B26', fg: '#A9B1D6', sel: '#33467C', line: '#1E2030', gutter: '#1A1B26', gutterFg: '#363B54', cursor: '#C0CAF5', comment: '#565F89', keyword: '#BB9AF7', string: '#9ECE6A', number: '#FF9E64', func: '#7AA2F7', tag: '#F7768E', attr: '#BB9AF7', prop: '#73DACA', type: '#2AC3DE', variable: '#C0CAF5', op: '#89DDFF' } },
  { id: 'night-owl', name: 'Night Owl', author: 'Sarah Drasner', price: 70, p: { dark: true, bg: '#011627', fg: '#D6DEEB', sel: '#1D3B53', line: '#01121F', gutter: '#011627', gutterFg: '#4B6479', cursor: '#80A4C2', comment: '#637777', keyword: '#C792EA', string: '#ECC48D', number: '#F78C6C', func: '#82AAFF', tag: '#CAECE6', attr: '#C5E478', prop: '#80CBC4', type: '#FFCB8B', variable: '#D6DEEB', op: '#C792EA' } },
  { id: 'catppuccin', name: 'Catppuccin Mocha', author: 'Catppuccin', price: 80, p: { dark: true, bg: '#1E1E2E', fg: '#CDD6F4', sel: '#45475A', line: '#2A2B3C', gutter: '#1E1E2E', gutterFg: '#6C7086', cursor: '#F5E0DC', comment: '#9399B2', keyword: '#CBA6F7', string: '#A6E3A1', number: '#FAB387', func: '#89B4FA', tag: '#89B4FA', attr: '#F9E2AF', prop: '#89DCEB', type: '#F9E2AF', variable: '#CDD6F4', op: '#94E2D5' } },
  { id: 'nord', name: 'Nord', author: 'Arctic Ice Studio', price: 50, p: { dark: true, bg: '#2E3440', fg: '#D8DEE9', sel: '#434C5E', line: '#3B4252', gutter: '#2E3440', gutterFg: '#4C566A', cursor: '#D8DEE9', comment: '#616E88', keyword: '#81A1C1', string: '#A3BE8C', number: '#B48EAD', func: '#88C0D0', tag: '#81A1C1', attr: '#8FBCBB', prop: '#88C0D0', type: '#8FBCBB', variable: '#D8DEE9', op: '#81A1C1' } },
  { id: 'gruvbox', name: 'Gruvbox Dark', author: 'jdinhlife', price: 50, p: { dark: true, bg: '#282828', fg: '#EBDBB2', sel: '#504945', line: '#32302F', gutter: '#282828', gutterFg: '#7C6F64', cursor: '#EBDBB2', comment: '#928374', keyword: '#FB4934', string: '#B8BB26', number: '#D3869B', func: '#FABD2F', tag: '#FB4934', attr: '#8EC07C', prop: '#83A598', type: '#FABD2F', variable: '#83A598', op: '#FE8019' } },
  { id: 'solarized-dark', name: 'Solarized Dark', author: 'Ethan Schoonover', price: 40, p: { dark: true, bg: '#002B36', fg: '#93A1A1', sel: '#073642', line: '#073642', gutter: '#002B36', gutterFg: '#586E75', cursor: '#D30102', comment: '#586E75', keyword: '#859900', string: '#2AA198', number: '#D33682', func: '#268BD2', tag: '#268BD2', attr: '#93A1A1', prop: '#268BD2', type: '#B58900', variable: '#268BD2', op: '#859900' } },
  { id: 'solarized-light', name: 'Solarized Light', author: 'Ethan Schoonover', price: 40, p: { dark: false, bg: '#FDF6E3', fg: '#657B83', sel: '#EEE8D5', line: '#EEE8D5', gutter: '#FDF6E3', gutterFg: '#93A1A1', cursor: '#D30102', comment: '#93A1A1', keyword: '#859900', string: '#2AA198', number: '#D33682', func: '#268BD2', tag: '#268BD2', attr: '#657B83', prop: '#268BD2', type: '#B58900', variable: '#268BD2', op: '#859900' } },
  { id: 'material-ocean', name: 'Material Theme Ocean', author: 'Mattia Astorino', price: 70, p: { dark: true, bg: '#0F111A', fg: '#A6ACCD', sel: '#717CB450', line: '#00010A', gutter: '#0F111A', gutterFg: '#3B3F51', cursor: '#FFCC00', comment: '#464B5D', keyword: '#C792EA', string: '#C3E88D', number: '#F78C6C', func: '#82AAFF', tag: '#F07178', attr: '#FFCB6B', prop: '#B2CCD6', type: '#FFCB6B', variable: '#EEFFFF', op: '#89DDFF' } },
  { id: 'palenight', name: 'Material Palenight', author: 'Mattia Astorino', price: 70, p: { dark: true, bg: '#292D3E', fg: '#A6ACCD', sel: '#717CB450', line: '#202331', gutter: '#292D3E', gutterFg: '#3A3F58', cursor: '#FFCC00', comment: '#676E95', keyword: '#C792EA', string: '#C3E88D', number: '#F78C6C', func: '#82AAFF', tag: '#F07178', attr: '#FFCB6B', prop: '#B2CCD6', type: '#FFCB6B', variable: '#EEFFFF', op: '#89DDFF' } },
  { id: 'ayu-dark', name: 'Ayu Dark', author: 'teabyii', price: 60, p: { dark: true, bg: '#0B0E14', fg: '#BFBDB6', sel: '#409FFF30', line: '#131721', gutter: '#0B0E14', gutterFg: '#6C7380', cursor: '#E6B450', comment: '#ACB6BF8C', keyword: '#FF8F40', string: '#AAD94C', number: '#D2A6FF', func: '#FFB454', tag: '#39BAE6', attr: '#FFB454', prop: '#39BAE6', type: '#59C2FF', variable: '#BFBDB6', op: '#F29668' } },
  { id: 'cobalt2', name: 'Cobalt2', author: 'Wes Bos', price: 70, p: { dark: true, bg: '#193549', fg: '#FFFFFF', sel: '#0050A4', line: '#1F4662', gutter: '#193549', gutterFg: '#AAAAAA', cursor: '#FFC600', comment: '#0088FF', keyword: '#FF9D00', string: '#A5FF90', number: '#FF628C', func: '#FFC600', tag: '#9EFFFF', attr: '#FFC600', prop: '#9EFFFF', type: '#80FFBB', variable: '#E1EFFF', op: '#FF9D00' } },
  { id: 'synthwave', name: "SynthWave '84", author: 'Robb Owen', price: 100, p: { dark: true, bg: '#262335', fg: '#FFFFFF', sel: '#463465', line: '#34294F', gutter: '#262335', gutterFg: '#FFFFFF73', cursor: '#F97E72', comment: '#848BBD', keyword: '#FEDE5D', string: '#FF8B39', number: '#F97E72', func: '#36F9F6', tag: '#72F1B8', attr: '#FEDE5D', prop: '#FF7EDB', type: '#FE4450', variable: '#FF7EDB', op: '#FEDE5D' } },
  { id: 'shades-of-purple', name: 'Shades of Purple', author: 'Ahmad Awais', price: 90, p: { dark: true, bg: '#2D2B55', fg: '#FFFFFF', sel: '#B362FF88', line: '#1F1F41', gutter: '#2D2B55', gutterFg: '#A599E9', cursor: '#FAD000', comment: '#B362FF', keyword: '#FF9D00', string: '#A5FF90', number: '#FF628C', func: '#FAD000', tag: '#9EFFFF', attr: '#FAD000', prop: '#9EFFFF', type: '#80FFBB', variable: '#E1EFFF', op: '#FF9D00' } },
  { id: 'rose-pine', name: 'Rosé Pine', author: 'Rosé Pine', price: 80, p: { dark: true, bg: '#191724', fg: '#E0DEF4', sel: '#403D52', line: '#1F1D2E', gutter: '#191724', gutterFg: '#6E6A86', cursor: '#E0DEF4', comment: '#6E6A86', keyword: '#31748F', string: '#F6C177', number: '#EBBCBA', func: '#EBBCBA', tag: '#9CCFD8', attr: '#C4A7E7', prop: '#9CCFD8', type: '#9CCFD8', variable: '#E0DEF4', op: '#31748F' } },
  { id: 'winter-is-coming', name: 'Winter is Coming', author: 'John Papa', price: 60, p: { dark: true, bg: '#011627', fg: '#A7DBF7', sel: '#103362', line: '#0F2338', gutter: '#011627', gutterFg: '#219FD5', cursor: '#219FD5', comment: '#999999', keyword: '#00BFF9', string: '#BCF0C0', number: '#8DEC95', func: '#87AFF4', tag: '#00BFF9', attr: '#7FDBCA', prop: '#7FDBCA', type: '#D29FFC', variable: '#A7DBF7', op: '#00BFF9' } },
  { id: 'panda', name: 'Panda Syntax', author: 'Siamak Mokhtari', price: 60, p: { dark: true, bg: '#292A2B', fg: '#E6E6E6', sel: '#3D3E3F', line: '#31353A', gutter: '#292A2B', gutterFg: '#757575', cursor: '#FF2C6D', comment: '#676B79', keyword: '#FF75B5', string: '#19F9D8', number: '#FFB86C', func: '#6FC1FF', tag: '#FF2C6D', attr: '#FFB86C', prop: '#B084EB', type: '#FFCC95', variable: '#E6E6E6', op: '#F3F3F3' } },
];

const cache = new Map<string, Extension>();
export function editorTheme(id: string): Extension | null {
  const def = EDITOR_THEMES.find((x) => x.id === id);
  if (!def || !def.p) return null;
  if (cache.has(id)) return cache.get(id)!;
  const p = def.p;
  const ext = createTheme({
    theme: p.dark ? 'dark' : 'light',
    settings: {
      background: p.bg, foreground: p.fg, caret: p.cursor, selection: p.sel, selectionMatch: p.sel,
      lineHighlight: p.line, gutterBackground: p.gutter, gutterForeground: p.gutterFg, gutterBorder: 'transparent',
    },
    styles: [
      { tag: [t.comment, t.lineComment, t.blockComment], color: p.comment, fontStyle: 'italic' },
      { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword, t.definitionKeyword], color: p.keyword },
      { tag: [t.string, t.special(t.string), t.regexp], color: p.string },
      { tag: [t.number, t.bool, t.null, t.atom], color: p.number },
      { tag: [t.function(t.variableName), t.function(t.propertyName)], color: p.func },
      { tag: [t.tagName, t.angleBracket], color: p.tag },
      { tag: [t.attributeName], color: p.attr },
      { tag: [t.attributeValue], color: p.string },
      { tag: [t.propertyName], color: p.prop },
      { tag: [t.typeName, t.className, t.namespace], color: p.type },
      { tag: [t.variableName, t.self, t.special(t.variableName)], color: p.variable },
      { tag: [t.operator, t.compareOperator, t.arithmeticOperator, t.logicOperator], color: p.op },
      { tag: [t.punctuation, t.bracket, t.separator], color: p.punct ?? p.fg },
      { tag: [t.unit, t.color], color: p.number },
      { tag: [t.heading], color: p.tag, fontWeight: 'bold' },
    ],
  });
  cache.set(id, ext);
  return ext;
}

/** Style calej strony: nadpisuja zmienne akcentu (jasny i ciemny wariant). */
export type AppStyle = { id: string; name: string; price: number; light: Record<string, string>; dark: Record<string, string>; swatch: string[] };
const acc = (a: string, soft: string, dA: string, dSoft: string) => ({ light: { '--accent': a, '--accent-soft': soft }, dark: { '--accent': dA, '--accent-soft': dSoft } });
export const APP_STYLES: AppStyle[] = [
  { id: 'terakota', name: 'Terakota', price: 0, ...acc('#C2410C', '#FBE3D6', '#F07A45', '#3A2318'), swatch: ['#C2410C', '#FAF7F2'] },
  { id: 'ocean', name: 'Ocean', price: 0, ...acc('#0E7490', '#D7EEF3', '#38BDF8', '#0F2A36'), swatch: ['#0E7490', '#F2F8FA'] },
  { id: 'las', name: 'Las', price: 40, ...acc('#2F7D4F', '#DDF0E3', '#5FCB8A', '#15291C'), swatch: ['#2F7D4F', '#F4F8F2'] },
  { id: 'lawenda', name: 'Lawenda', price: 40, ...acc('#7C3AED', '#EDE4FD', '#A78BFA', '#251C3A'), swatch: ['#7C3AED', '#F7F5FC'] },
  { id: 'malina', name: 'Malina', price: 40, ...acc('#BE185D', '#FBE1EC', '#F472B6', '#3A1729'), swatch: ['#BE185D', '#FBF5F7'] },
  { id: 'grafit', name: 'Grafit', price: 40, ...acc('#334155', '#E2E8F0', '#94A3B8', '#1E2632'), swatch: ['#334155', '#F5F6F8'] },
  { id: 'sloneczny', name: 'Słoneczny', price: 60, ...acc('#B45309', '#FCEFD5', '#FBBF24', '#3A2C0E'), swatch: ['#B45309', '#FFFBF2'] },
  { id: 'koral', name: 'Koral', price: 60, ...acc('#E0533D', '#FDE4DF', '#FF8A73', '#3B1C17'), swatch: ['#E0533D', '#FFF7F5'] },
  { id: 'mieta', name: 'Mięta', price: 60, ...acc('#0F9F8F', '#D5F3EF', '#2DD4BF', '#0F2E2A'), swatch: ['#0F9F8F', '#F3FBFA'] },
  { id: 'dracula-site', name: 'Dracula (cała strona)', price: 150, light: { '--accent': '#BD93F9', '--accent-soft': '#EFE6FE' }, dark: { '--accent': '#FF79C6', '--accent-soft': '#3D2A44', '--bg': '#282A36', '--surface': '#2F3241', '--surface-2': '#383A4A', '--line': '#44475A', '--ink': '#F8F8F2', '--ink-muted': '#A9AAC2' }, swatch: ['#FF79C6', '#282A36'] },
  { id: 'onedark-site', name: 'One Dark (cała strona)', price: 150, light: { '--accent': '#61AFEF', '--accent-soft': '#DCEBFA' }, dark: { '--accent': '#61AFEF', '--accent-soft': '#1E3247', '--bg': '#21252B', '--surface': '#282C34', '--surface-2': '#2F343E', '--line': '#3A3F4B', '--ink': '#D7DAE0', '--ink-muted': '#8B929E' }, swatch: ['#61AFEF', '#282C34'] },
  { id: 'nightflat-site', name: 'Night Flat (cała strona)', price: 150, light: { '--accent': '#C678DD', '--accent-soft': '#F2E4F7' }, dark: { '--accent': '#C678DD', '--accent-soft': '#2C2233', '--bg': '#121417', '--surface': '#16191D', '--surface-2': '#1D2025', '--line': '#2A2E35', '--ink': '#D0D4DB', '--ink-muted': '#7F848E' }, swatch: ['#C678DD', '#16191D'] },
];

const STYLE_KEYS = ['--accent', '--accent-soft', '--bg', '--surface', '--surface-2', '--line', '--ink', '--ink-muted'];
export function applyAppStyle(id: string, dark: boolean) {
  const st = APP_STYLES.find((s) => s.id === id) ?? APP_STYLES[0];
  const root = document.documentElement;
  for (const k of STYLE_KEYS) root.style.removeProperty(k);
  if (st.id === 'terakota') return;
  const vars = dark ? st.dark : st.light;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
}
