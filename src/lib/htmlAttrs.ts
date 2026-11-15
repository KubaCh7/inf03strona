// Atrybuty HTML jak w VS Code: po wybraniu nazwy atrybutu dopisz ="" i od razu pokaz dozwolone wartosci.
import { pickedCompletion, startCompletion } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import { EditorView } from '@uiw/react-codemirror';

// Atrybuty logiczne: VS Code wstawia je bez wartosci
const BOOLEAN = new Set('disabled required checked hidden autofocus multiple readonly selected novalidate async defer controls autoplay loop muted open reversed ismap nomodule playsinline formnovalidate allowfullscreen default inert itemscope'.split(' '));

/** Czy pozycja jest w nazwie atrybutu znacznika HTML (nie w <script>/<style>). */
function inAttrName(view: EditorView, pos: number) {
  const node = syntaxTree(view.state).resolveInner(pos, -1);
  return node.name === 'AttributeName';
}

export const htmlAttrBehaviour = EditorView.updateListener.of((u) => {
  if (!u.docChanged) return;
  const view = u.view;
  for (const tr of u.transactions) {
    const picked = tr.annotation(pickedCompletion);
    // 1) zaakceptowana nazwa atrybutu -> ="" + lista wartosci
    if (picked && picked.type === 'property') {
      const pos = u.state.selection.main.head;
      if (!inAttrName(view, pos) || u.state.sliceDoc(pos, pos + 1) === '=' || BOOLEAN.has(picked.label.toLowerCase())) return;
      // nie wolno zmieniac dokumentu w trakcie aktualizacji: zrob to zaraz po niej
      queueMicrotask(() => {
        if (view.state.selection.main.head !== pos) return;
        view.dispatch({ changes: { from: pos, insert: '=""' }, selection: { anchor: pos + 2 }, userEvent: 'input.complete' });
        startCompletion(view);
      });
      return;
    }
    // 2) zaakceptowana wartosc atrybutu -> kursor za zamykajacy cudzyslow (jak VS Code)
    if (picked && picked.type === 'constant') {
      const pos = u.state.selection.main.head;
      const next = u.state.sliceDoc(pos, pos + 1);
      if ((next === '"' || next === "'") && syntaxTree(u.state).resolveInner(pos, -1).name.startsWith('Attribute')) {
        queueMicrotask(() => { if (view.state.selection.main.head === pos) view.dispatch({ selection: { anchor: pos + 1 } }); });
      }
      return;
    }
    // 3) recznie wpisane =" albo =' przy atrybucie -> pokaz wartosci od razu
    if (tr.isUserEvent('input.type')) {
      const pos = u.state.selection.main.head;
      const before = u.state.sliceDoc(Math.max(0, pos - 2), pos);
      if (/=["']$/.test(before) && syntaxTree(u.state).resolveInner(pos, -1).name.startsWith('Attribute')) {
        queueMicrotask(() => startCompletion(view));
        return;
      }
    }
  }
});
