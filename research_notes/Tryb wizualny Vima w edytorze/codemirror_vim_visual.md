# @replit/codemirror-vim 6.4.0: how visual mode works and where it differs from Vim

Method: I read the published code directly. That means the npm tarball of `@replit/codemirror-vim@6.4.0` (dist/index.js) and its new dependency `@replit/codemirror-vim-core@0.1.0` (vim.js, test/vim_test.js). I also read a shallow clone of github.com/replit/codemirror-vim (main branch, last commit 2026-11-01), the CHANGELOG and GitHub issue searches. Line numbers below refer to `vim.js` in `@replit/codemirror-vim-core@0.1.0` and `dist/index.js` in `@replit/codemirror-vim@6.4.0`.

Main source URLs:
- Core engine: [unpkg vim-core vim.js](https://unpkg.com/@replit/codemirror-vim-core@0.1.0/vim.js) / [GitHub packages/codemirror-vim-core/vim.js](https://github.com/replit/codemirror-vim/blob/main/packages/codemirror-vim-core/vim.js)
- CM6 adapter: [unpkg dist/index.js](https://unpkg.com/@replit/codemirror-vim@6.4.0/dist/index.js) / [GitHub packages/codemirror-vim/src](https://github.com/replit/codemirror-vim/tree/main/packages/codemirror-vim/src) (index.ts, cm_adapter.ts, block-cursor.ts)
- Tests: [vim_test.js](https://github.com/replit/codemirror-vim/blob/main/packages/codemirror-vim-core/test/vim_test.js)
- [CHANGELOG](https://github.com/replit/codemirror-vim/blob/main/packages/codemirror-vim/CHANGELOG.md)

## 1. Which visual-mode commands exist (defaultKeymap, context 'visual' and the global ones that also apply in visual)

### Takeaway
The visual-mode keymap is the CodeMirror 5 one with small additions. It covers v/V/Ctrl-V (and Ctrl-Q), o, O, gv, I, A, c/s/S/C/R/D/X/Y, r, ~, u, U, J/gJ, >, <, =, gq/gw, g?, gc, g~/gu/gU, p/P, :, text objects, gn/gN and `$` in block mode. These are missing compared with Vim: `g Ctrl-A`/`g Ctrl-X`, a visual Ctrl-A/Ctrl-X that works per line, a `P` that keeps the register (`v_P`), select mode (`gh`, `Ctrl-G`), `gv`-style counts (`1v`), `\%V` in patterns, and `:'<,'>` with blockwise awareness.

### Cited Findings
- **Entries with `context: 'visual'`** in `defaultKeymap` (vim.js lines 100-233):
  - `s` → keyToKey `c`
  - `S` → keyToKey `VdO`
  - `o` / `O` → motion `moveToOtherHighlightedEnd` (`O` passes `{sameLine:true}`)
  - `D` → delete, linewise
  - `Y` → yank, linewise
  - `C` → change, linewise
  - `~` → changeCase
  - `A` → enterInsertMode `endOfSelectedArea`
  - `I` → enterInsertMode `startOfSelectedArea`
  - `R` → change `{linewise:true, fullLine:true}`, `exitVisualBlock:true`
  - `u` / `U` → changeCase toLower / toUpper

  — [vim.js](https://unpkg.com/@replit/codemirror-vim-core@0.1.0/vim.js)
- **Context-free entries that also run in visual mode:**
  - Operators: `d y c = > < g~ gu gU gc gq gw g?`
  - `x`, and `X` (`operatorMotionArgs: {visualLine: true}`)
  - Actions: `v`, `V`, `<C-v>`, `<C-q>` → `toggleVisualMode` (blockwise for the last two); `gv` → `reselectLastSelection`
  - `J`, `gJ`, `p`, `P`, `r<character>`, `<C-a>`/`<C-x>` (`incrementNumberToken`)
  - Text objects `a<register>` / `i<register>`, plus `gn`/`gN`, `:` (ex)

  — [vim.js](https://unpkg.com/@replit/codemirror-vim-core@0.1.0/vim.js)
- **No `g<C-a>` / `g<C-x>` entry.** `incrementNumberToken` reads only `cm.getCursor()` and changes one number on that line. It has no visual-range logic, so visual Ctrl-A does not increment the first number on each selected line as Vim does. — [vim.js `incrementNumberToken`](https://unpkg.com/@replit/codemirror-vim-core@0.1.0/vim.js)
- **`:` in visual mode** pre-fills the prompt with `'<,'>` (`promptOptions.value = '\'<,\'>'`, line ~1986). Ex ranges are linewise only, and vim.js contains no `\%V` support (0 occurrences). — [vim.js](https://unpkg.com/@replit/codemirror-vim-core@0.1.0/vim.js)
- **`$` in block mode is supported.** The motion result keeps `ch: Infinity` when `vim.visualBlock` is set (`if (!(vim.visualBlock && newHead.ch === Infinity))`). Test `visual_block_move_to_eol` covers it. — [vim.js processMotion](https://unpkg.com/@replit/codemirror-vim-core@0.1.0/vim.js), [vim_test.js](https://github.com/replit/codemirror-vim/blob/main/packages/codemirror-vim-core/test/vim_test.js)
- **Visual-related tests in vim_test.js:**
  - Block mode: `c_visual_block`, `c_visual_block_replay`, `I_visual_block_replay`, `d_visual_block`, `D_visual_block`, `s_visual_block`, `visual_block_~`, `._swapCase_visualBlock`, `._delete_visualBlock`, `><visualblock`, `Yy_blockwise`, `A_visual_block`, `I_visual_block`, `r_visual_block`, `visual_block_*` (move_to_eol, different_line_lengths, truncate_on_short_line, corners, mode_switch, crossing_short_line, curPos_on_exit)
  - Selection and marks: `visual_marks`, `reselect_visual(_line/_block)`, `o_visual(_block)`
  - Other: `visual_join*`, `visual_paste`, `v_paste_from_register`, `blockwise_paste*`, `S_visual`, `yank_visual_block`, `._visual_>`, `ex_substitute_visual_range`

  No tests exist for visual Ctrl-A, `v_P`, or `I`/`A` in charwise visual. — [vim_test.js](https://github.com/replit/codemirror-vim/blob/main/packages/codemirror-vim-core/test/vim_test.js)

### Deviations from real Vim found in the code (the core of this report)
1. **`p`/`P` in visual mode.** `continuePaste` always runs `unnamedRegister.setText(selectedText)`, for both `p` and `P`.
   - Vim ≥ 8.2.4242 (`v_P`) leaves the registers unchanged on `P`; here `P` behaves like `p`.
   - The replaced text is stored without the linewise flag. In Vim, replacing a `V` selection makes `""` linewise.

   Fix from outside: `Vim.defineAction('vPasteKeep', (cm, args, vim) => { const rc = Vim.getRegisterController(); const r = rc.getRegister('"'); const saved = [r.toString(), r.linewise, r.blockwise]; Vim.handleKey(cm, 'p', 'mapping')… })` is awkward. Simpler: an action that saves the unnamed register with `getRegisterController().unnamedRegister`, then calls `Vim.handleKey(cm,'p')`, then restores it with `setText(...saved)`. Register it with `Vim.mapCommand('P','action','vPasteKeep',{},{context:'visual', isEdit:true})`. — [vim.js `continuePaste`](https://unpkg.com/@replit/codemirror-vim-core@0.1.0/vim.js)
2. **`I`/`A` in charwise/linewise visual** (`startOfSelectedArea`/`endOfSelectedArea`, lines 3068-3097):
   - Non-block `I`: goes to `sel.head` if the head is above the anchor, otherwise to `Pos(anchor.line, 0)`.
   - Non-block `A`: goes to `sel.head + 1` when the selection runs forward, otherwise to `Pos(anchor.line, 0)`.

   In Vim (normal.c `nv_edit` → `v_visop`), `I`/`A` outside block mode make the selection linewise: `I` inserts at the start of the first line and `A` appends at the end of the last line. That last point is from my memory of Vim's source, not verified here. A fix would remap with `Vim.mapCommand('A','action','myAppend',…,{context:'visual'})` to an action that computes the line end and calls `Vim.handleKey(cm,'<Esc>')` and then `A`. — [vim.js](https://unpkg.com/@replit/codemirror-vim-core@0.1.0/vim.js)
3. **Block `I`/`A`/`c` use live multi-cursor insertion.**
   - `enterInsertMode` → `selectForInsert(cm, head, height)` puts one CM6 cursor on every line of the block at the same `ch` (`offsetCursor(head, i, 0)`). Typing appears on all lines at once. Vim shows it only on the first line and copies it to the others on `<Esc>`.
   - Lines shorter than the block's start column are not skipped (Vim's `v_b_I` skips them) and are not padded with spaces (Vim's `v_b_A` pads them). Their cursor is placed at a column past the end of the line, which CM clamps to the line end. This is inferred from the code (`selectForInsert` does no length check).
   - Repeat with `.` replays through `lastInsertModeChanges.visualBlock` (line count), which is tested. — [vim.js `selectForInsert`, `enterInsertMode`](https://unpkg.com/@replit/codemirror-vim-core@0.1.0/vim.js)
4. **Blockwise selection is measured in character offsets (`ch`), not screen columns.** `makeCmSelection` 'block' mode creates one range per line `{anchor: Pos(top+i, fromCh), head: Pos(top+i, toCh)}`. With tabs, CJK or emoji the block is ragged on screen, whereas Vim uses virtual columns. The only special case is `r` in block mode, which turns tabs into `tabSize` spaces before replacing. — [vim.js `makeCmSelection`, `replace`](https://unpkg.com/@replit/codemirror-vim-core@0.1.0/vim.js)
5. **Dot-repeat of a multi-line charwise visual operation.** The code comment says "in the last line the same number of characters as in the last line the last time". The code actually uses `newHead = new Pos(oldAnchor.line + lineOffset, oldAnchor.ch)`, so the remembered end column is dropped. Linewise and blockwise repeat are implemented. — [vim.js processOperator `lastSel`](https://unpkg.com/@replit/codemirror-vim-core@0.1.0/vim.js)
6. **Counts on `v`/`V`.** `toggleVisualMode` has a `TODO: The repeat should actually select number of characters/lines equal to the repeat times the size of the previous visual operation`. A count only extends the selection by `repeat-1` characters, so Vim's `1v` (reselect the previous area size) is missing. — [vim.js `toggleVisualMode`](https://unpkg.com/@replit/codemirror-vim-core@0.1.0/vim.js)
7. **`gn` in V or Ctrl-V mode drops to charwise.** `findAndSelectNextInclusive` resets `visualLine`/`visualBlock` and signals `subMode:""`. — [vim.js](https://unpkg.com/@replit/codemirror-vim-core@0.1.0/vim.js)
8. **Visual `>`/`<` with a count** shifts the block that many times (`repeat = vim.visualMode ? args.repeat`), which matches Vim. In block mode the indent is inserted at the block's left edge using `tabSize` spaces or a tab (#222 fix). — [vim.js `indent` operator](https://unpkg.com/@replit/codemirror-vim-core@0.1.0/vim.js), [CHANGELOG 6.3.0](https://github.com/replit/codemirror-vim/blob/main/packages/codemirror-vim/CHANGELOG.md)

### Inferences
- Gaps that `Vim.defineOperator` + `Vim.mapCommand(..., {context:'visual'})` can fill: an operator receives `ranges` (one per line in block mode), so `g<C-a>` and visual `<C-a>` can be built as operators. Example: `Vim.defineOperator('visualIncrement', (cm, args, ranges) => { for each range find the first number at or after range start and replace it })`, then `Vim.mapCommand('<C-a>','operator','visualIncrement',{increase:true},{context:'visual', isEdit:true})`, plus `g<C-a>` with `{progressive:true}`. When the operator is called, `vim.visualMode` is still true, and `exitVisualMode` runs afterwards automatically (processOperator).
- The `I`/`A`-on-short-lines and screen-column issues are part of the engine and hard to patch from outside. A custom `defineAction` that pads or skips lines and then sets selections with `cm.setSelections` would be needed.

### Gaps
- I could not run a browser, so behaviour on short lines and tabs is inferred from code, not observed.
- The Vim-side behaviour of `I`/`A` in charwise visual mode comes from my knowledge of Vim's normal.c and was not fetched in this session.

## 2. Is there a release newer than 6.4.0, and what changed for visual mode?

### Takeaway
6.4.0 (2026-07-28) is the newest npm release as of 2026-11-06. It moved the engine into the separate package `@replit/codemirror-vim-core@^0.1.0`. Its only visual-mode fixes are `,` in visual mode and the "VISUAL LINE" status label. Main has one unreleased fix (macro `q`, #282) that does not touch visual mode.

### Cited Findings
- **npm `time` field:** 6.3.0 = 2025-03-27, 6.4.0 = 2026-07-29T01:13Z (latest). `npm view @replit/codemirror-vim version` returns 6.4.0. — [npm](https://www.npmjs.com/package/@replit/codemirror-vim)
- **Engine split:** 6.4.0's package.json depends on `"@replit/codemirror-vim-core": "^0.1.0"`, and dist/index.js does `import { initVim } from '@replit/codemirror-vim-core'`. vim-core has only one version, 0.1.0, published 2026-07-28. — [unpkg package.json](https://unpkg.com/@replit/codemirror-vim@6.4.0/package.json), [npm vim-core](https://www.npmjs.com/package/@replit/codemirror-vim-core)
- **CHANGELOG 6.4.0:**
  - Added: `gcc`
  - Fixed: `gj` at end of document; `:'a,.y` ranges; "`,` (repeat character search in reverse) in visual mode" (#256); `:sort` with pattern and `r`; "Status bar display of visual line mode" (#236)

  — [CHANGELOG](https://github.com/replit/codemirror-vim/blob/main/packages/codemirror-vim/CHANGELOG.md)
- **#236 diff:** before the fix, every subMode was shown as " block" (`cm.state.vim.mode += " block"`), so V mode displayed `--VISUAL BLOCK--`. It now uses `e.subMode === "linewise" ? " line" : " block"`. In ≤6.3.0, V mode was mislabelled. — [commit 71919db](https://github.com/replit/codemirror-vim/commit/71919db)
- **6.3.0 visual fixes:** "Indentation in visual block mode" (#222) and "Visual mode cursor shifted on empty lines" (#174). — [CHANGELOG](https://github.com/replit/codemirror-vim/blob/main/packages/codemirror-vim/CHANGELOG.md)
- **After 6.4.0 on main:** `c3131c4 fix: a q that is another key's argument does not end macro recording (#282)` (2026-11-01), plus CI and publishing commits. — [commits](https://github.com/replit/codemirror-vim/commits/main)

### Inferences
- `^6.4.0` already resolves to the newest version, so upgrading gains nothing for visual mode. The caret range would pick up a future 6.x automatically, including a new vim-core 0.1.x, because `^0.1.0` allows patch updates only.

### Gaps
- None for releases.

## 3. GitHub issues about visual mode, visual block and Ctrl-V

### Takeaway
There are few open visual-mode issues. The relevant ones are #277 (cursor past end of line after leaving visual), #229 (`v2a` behaves like `va`), #196 (`~` then `u` enters visual), #239 (no Select mode), #137 (block cursor not using the Layer/RectangleMarker API) and #118 (block-cursor rendering in Safari). Older visual-block issues (#15 arrows, #101 block marking, #63 no highlight, #183 arrow keys) are closed.

### Cited Findings
- **Issue search "visual"** — [search](https://github.com/replit/codemirror-vim/issues?q=is%3Aissue+visual)
  - Open: #277 "[Bug] Exiting Visual mode at end of line leaves the Normal-mode cursor past the final character"; #239 "[Feature] Implement Select mode"; #229 "[Bug] - vim command v2a behaves like va"; #199 "Support mapping an operator (`g@` and `operatorfunc`)"; #196 "[Bug] `~` followed by an undo enters visual mode"
  - Closed: #183 "Visual mode: arrow keys do not select text"; #171 "`j` in visual mode renders offset … empty lines"; #108 "Toggling insert mode doesn't work after highlighting text in visual mode"; #101 "Bugs with marking a block in visual mode when the cursor is not within the block"; #95 "jump to next/previous occurrence of a character in visual mode"; #63 "Visual modes do not highlight selection"; #59 "Copying With Ctrl+c Does Not Work"; #15 "Up/Down arrow stop working for visual-block mode"
- **#277 details**
  - Repro: on `alpha`, press `v`, `l`×5, `Esc`. The cursor stays at column 5 instead of 4, and the next `l` moves left.
  - Suspected cause: `exitVisualMode` calls `clipCursorToContent` before clearing the visual flags.
  - Proposed fix: clip after the flags are reset.
  - No maintainer reply and no PR.

  — [#277](https://github.com/replit/codemirror-vim/issues/277)
- **Confirmed in the code:** `exitVisualMode` runs `cm.setCursor(clipCursorToContent(cm, vim.sel.head))` while `vim.visualMode` is still true, and only then sets `visualMode=false`. — [vim.js `exitVisualMode`](https://unpkg.com/@replit/codemirror-vim-core@0.1.0/vim.js)
  - Outside workaround: after the mode changes to normal, clip the cursor. In a `cm.on('vim-mode-change', e => { if (e.mode==='normal') { const c=cm.getCursor(); const len=cm.getLine(c.line).length; if (len && c.ch>=len) cm.setCursor(c.line, len-1) } })` handler, guard against insert mode.
- **Issue search "block":** open #137 "Migrate block cursor to Layer and RectangleMarker API", #118 "[Bug] Block cursor text rendering issue on Safari"; closed #131 "block cursor off-by-one error", #109 "Oversized cursor over tab characters", #140 "Could the cursor use blinking rate from drawSelection?" (implemented in 6.1.0). — [search](https://github.com/replit/codemirror-vim/issues?q=is%3Aissue+block)
- **Keymap-related issues:** #244 "Allow CM6 keymaps before vim extension" (closed); #115 "`<C-d>` in Safari on iPad does not work" (open); #172 "Increment zero-padded decimal" (open); #20 "Ctrl+A doesn't increment the number" (closed 2022, fixed by PR); #17 "Ctrl-D no longer pages down" (closed). — [search](https://github.com/replit/codemirror-vim/issues?q=is%3Aissue+keymap+OR+uiw+OR+precedence+OR+ctrl)

### Inferences
- I found no issue specifically about Ctrl-V being taken by browser paste. The handler explains why: see section 4.

### Gaps
- I could not use the GitHub REST/GraphQL API from this session (not enabled for the repo). Issue lists come from github.com search pages fetched via WebFetch, which show only the first page of results.
- I found no issue on `'<,'>` problems, blockwise paste bugs, or visual dot-repeat bugs.

## 4. How Ctrl-V and other keys are handled in the browser, and conflicts with basicSetup and @uiw/react-codemirror

### Takeaway
On Windows and Linux, Vim gets Ctrl-V as `<C-v>` in normal and visual mode, and `preventDefault`s it so no browser paste happens. In insert mode Ctrl-V is unmapped, so the browser pastes. On macOS, Cmd-V is `<M-v>` (unmapped, so native paste) and Ctrl-V is `<C-v>` (visual block). However, CodeMirror's own defaultKeymap binds Ctrl-v to cursorPageDown on Mac, and Mod-a/Mod-d/Mod-u/Mod-i/Mod-[ everywhere. These CM keymaps win whenever the keymap handler is registered before the vim plugin. That is the case when vim() goes in @uiw/react-codemirror's `extensions` prop, because @uiw appends user extensions after basicSetup.

### Cited Findings
- **Key handling path.** The vim plugin reads raw `keydown` through ViewPlugin `eventHandlers`, not through CM keymaps. `vimKeyFromEvent` builds the key name: `if (e.ctrlKey) name += 'C-'; if (e.altKey) 'A-'; if (e.metaKey) 'M-'`. If `Vim.multiSelectHandleKey` matches, the plugin calls `e.preventDefault(); e.stopPropagation()`. — [dist/index.js `handleKey`](https://unpkg.com/@replit/codemirror-vim@6.4.0/dist/index.js), [vim.js `vimKeyFromEvent`](https://unpkg.com/@replit/codemirror-vim-core@0.1.0/vim.js)
- **Ctrl-C special case** (non-Mac): when something is selected, the plugin sets `waitForCopy`, returns without handling, and after the native `copy` event sends `<Esc>`. So Ctrl-C in visual mode copies to the OS clipboard and leaves visual mode. — [dist/index.js](https://unpkg.com/@replit/codemirror-vim@6.4.0/dist/index.js)
- **Insert mode** has no `<C-v>` entry in defaultKeymap (only `<C-v>`/`<C-q>` toggleVisualMode without context, and actions don't run in insert mode). — [vim.js defaultKeymap](https://unpkg.com/@replit/codemirror-vim-core@0.1.0/vim.js)
- **Maintainer on keymaps** (#244, 2026-07-29): "vim mode doesn't use keymap because vim is fundementally incompatible with keymaps … you're gonna have to hack around it", and suggests listening to `vim-mode-change`. A community workaround registers `keymap.of` entries for Ctrl-V/Ctrl-D whose handlers call `Vim.handleKey(getCM(view), "<C-v>", "mapping")` and return true. — [#244](https://github.com/replit/codemirror-vim/issues/244)
- **README:** "make sure vim is included before other keymaps … include the default keymap and all other keymaps you want to use in insert mode". It also says: "if you are not using `basicSetup`, make sure you include the drawSelection plugin to correctly render the selection in visual mode." — [README](https://github.com/replit/codemirror-vim/blob/main/packages/codemirror-vim/README.md)
- **How CM6 orders key handling.** `keymap` is `Facet.define({ enables: handleKeyEvents })`, and `handleKeyEvents = Prec.default(EditorView.domEventHandlers({keydown…}))`. It is a default-precedence plugin placed where the first keymap appears. `computeHandlers` runs plugin DOM handlers in plugin order. — @codemirror/view dist/index.js lines 9149-9162, 4750 (local node_modules, [source](https://github.com/codemirror/view/blob/main/src/keymap.ts))
- **Conflicting CM keymap bindings.**
  - `standardKeymap` adds `emacsStyleKeymap` for Mac only (`mac: b.key`). That includes `Ctrl-v: cursorPageDown`, `Ctrl-a: cursorLineStart`, `Ctrl-e`, `Ctrl-d: deleteCharForward`, `Ctrl-f`, `Ctrl-b`, `Ctrl-n`, `Ctrl-p`, `Ctrl-o`, `Ctrl-t`, `Ctrl-k`, `Ctrl-h`.
  - Everywhere: `Mod-a selectAll`, `Mod-u undoSelection`, `Mod-i selectParentSyntax`, `Mod-[ indentLess`.
  - searchKeymap: `Mod-d selectNextOccurrence`.

  — [@codemirror/commands](https://github.com/codemirror/commands/blob/main/src/commands.ts), [@codemirror/search](https://github.com/codemirror/search/blob/main/src/search.ts)
- **@uiw/react-codemirror 4.25.12 `useCodeMirror`:** `getExtensions = [updateListener, theme, scrollerTheme, ...defaultExtensions /* basicSetup incl. keymap.of(...) */]; … getExtensions = getExtensions.concat(extensions)`. User extensions, vim() included, therefore come after basicSetup's keymap. basicSetup also includes `drawSelection()`, `EditorState.allowMultipleSelections.of(true)`, `rectangularSelection()`, `crosshairCursor()` and `highlightSelectionMatches()`, each switchable with an option. — local node_modules/@uiw/react-codemirror/esm/useCodeMirror.js, @uiw/codemirror-extensions-basic-setup/esm/index.js ([repo](https://github.com/uiwjs/react-codemirror))
- **This project** (`src/components/Editor.tsx`) passes `vimExtensions()` first inside `extensions`, with the comment "vim musi byc pierwszy". It still comes after @uiw's basicSetup, and `basicSetup={BASIC_SETUP_VIM}` keeps the defaultKeymap and searchKeymap. `src/lib/vimMode.ts` returns `[vim({ status: true }), escape, insertTab, …]`. — local repo files

### Inferences
- Because basicSetup's `keymap.of(...)` comes before `vim()`, CM's `handleKeyEvents` probably runs before the vim plugin. If so:
  - Ctrl-A (selectAll on Linux/Windows) and Ctrl-D (selectNextOccurrence) would be taken by CM keymaps before Vim sees them.
  - On macOS, Ctrl-V (cursorPageDown), Ctrl-A/E/D/F/B/N/P/O would be taken too, so Ctrl-V would not start visual block mode on Mac.

  This should be tested in the browser. Ways to fix it:
  - (a) Wrap vim in `Prec.highest(vim({status:true}))`. That puts the vimPlugin in the highest bucket, ahead of `handleKeyEvents`, which is pinned to default prec.
  - (b) Pass `basicSetup={{defaultKeymap:false, searchKeymap:false, …}}` and re-add the keymaps after vim.
  - (c) Use the #244 workaround: a `Prec.highest(keymap.of([{key:'Ctrl-v', run: v => Vim.handleKey(getCM(v),'<C-v>','user')}]))`, applied only outside insert mode.
- **`rectangularSelection`/`crosshairCursor`** (Alt-drag) create multi-range CM selections outside Vim. vim-core treats an external multi-selection as a non-Vim selection, so Alt-drag is not the same as Ctrl-V block mode. Disabling these in Vim mode (`rectangularSelection:false, crosshairCursor:false`) avoids confusion. This is inferred; I did not trace `handleExternalSelection` in detail.
- **`highlightSelectionMatches`** highlights other occurrences of the visual selection, which Vim does not do. It is harmless but noisy; disable it in Vim mode.
- **`closeBrackets`** is already off in this project's Vim setup.
- **`allowMultipleSelections` is required for blockwise mode.** Vim sets one CM range per line (`cm.setSelections` → `EditorSelection.create(ranges, primIndex)`). Without `allowMultipleSelections`, CM6 keeps only the main range, so Ctrl-V would select only one line. basicSetup has it on by default; keep it on.

### Gaps
- I have not tested in a real browser whether the precedence problem appears in this exact project. It is inferred from the CM6 and @uiw source.
- I could not confirm whether CM6's own `paste` DOM handler can still insert text in normal mode when Cmd-V is pressed on Mac (`<M-v>` is not handled by vim, and the paste event does not go through `inputHandler`). It probably pastes text even in normal mode, but this is not verified.

## 5. How the selection, the block cursor and the status panel (mode indicator) are drawn

### Takeaway
The selection is drawn by CodeMirror's `drawSelection` (one `.cm-selectionBackground` rectangle set per range, so a block is one range per line). Vim hides the native selection and draws its own `.cm-fat-cursor` layer; in visual block mode only the primary range gets a cursor. With `vim({status:true})`, the panel shows `--NORMAL--`, `--INSERT--`, `--VISUAL--`, `--VISUAL LINE--` (correct only since 6.4.0), `--VISUAL BLOCK--` or `--REPLACE--`, plus the pending key buffer on the right. It does not show the selection size the way Vim's `showcmd` does.

### Cited Findings
- **`hideNativeSelection`** = `Prec.highest(EditorView.theme({...}))` with:
  - `.cm-vimMode .cm-line ::selection {background: transparent !important}`
  - `caretColor: transparent !important`
  - `.cm-fat-cursor {position:absolute; background:#ff9696; …}`
  - `&:not(.cm-focused) .cm-fat-cursor {background:none; outline: solid 1px #ff9696; color: transparent}`

  vimStyle also hides CM's own cursor layer: `.cm-vimMode .cm-cursorLayer:not(.cm-vimCursorLayer) {display:none}`. — [dist/index.js](https://unpkg.com/@replit/codemirror-vim@6.4.0/dist/index.js)
- **`BlockCursorPlugin`**
  - Appends `div.cm-cursorLayer.cm-vimCursorLayer` to `scrollDOM` and takes its blink rate from `getDrawSelectionConfig(...).cursorBlinkRate`.
  - `measureCursor` returns `null` for non-primary ranges when `vim.visualBlock` is set, so a block shows only one fat cursor.
  - When `anchor < head` it steps the head back one character, so the cursor sits on the last selected character.
  - Cursor height is 0.2 in overwrite mode and 0.5 when `vim.status` (pending keys) is non-empty, which gives an operator-pending half cursor.
  - Classes: `cm-fat-cursor cm-cursor-primary|secondary`.

  — [dist/index.js `BlockCursorPlugin`, `measureCursor`](https://unpkg.com/@replit/codemirror-vim@6.4.0/dist/index.js)
- **`cm-vimMode` class.** `updateClass` toggles it on `scrollDOM` whenever the editor is not in insert mode, or is in overwrite mode. — [dist/index.js](https://unpkg.com/@replit/codemirror-vim@6.4.0/dist/index.js)
- **The `vim()` extension** is `[vimStyle, vimPlugin, hideNativeSelection, options.status ? showPanel.of(statusPanel) : vimPanelState]`. It does not include `drawSelection`; the README requires it. — [dist/index.js](https://unpkg.com/@replit/codemirror-vim@6.4.0/dist/index.js), [README](https://github.com/replit/codemirror-vim/blob/main/packages/codemirror-vim/README.md)
- **Status text**
  - On `vim-mode-change`: `mode = e.mode; if (e.subMode) mode += e.subMode === "linewise" ? " line" : " block"`.
  - `updateStatus` renders `` `--${(vim.mode||"normal").toUpperCase()}--` `` (plus `(C-O)` for insert-normal). There are no spaces inside the dashes, unlike Vim's `-- VISUAL --`.
  - The label is a clickable `span` that sends `<Esc>`, followed by a flex spacer and `vim.status`. `vim.status` is the pending key sequence, built as `vim.status = (vim.status||"") + key` and cleared on `vim-command-done`.
  - Panel class: `.cm-vim-panel` (monospace, `min-height: 1.3em`, flex). Without `status:true`, the panel appears only for `:`/`/` dialogs.

  — [dist/index.js](https://unpkg.com/@replit/codemirror-vim@6.4.0/dist/index.js)
- **Event names.** The mode event is `vim-mode-change` with `{mode:"visual", subMode:"linewise"|"blockwise"|""}`. `toggleVisualMode` and `reselectLastSelection` (gv) send it; exitVisualMode sends `{mode:"normal"}`. — [vim.js](https://unpkg.com/@replit/codemirror-vim-core@0.1.0/vim.js)

### Inferences
- To match Vim's `-- VISUAL --` and Vim's selection-size `showcmd` (for example `3` lines, `5` chars, `3x4` block), add a small ViewPlugin or panel. It would listen to `getCM(view).on('vim-mode-change', …)` and to `update.selectionSet`, and compute:
  - lines = |head.line − anchor.line| + 1 (V mode)
  - chars (v mode, one line)
  - `${lines}x${cols}` (block mode)

  It would also hide or replace the built-in status span: use `vim()` without `status` and draw your own `showPanel`, or post-process `.cm-vim-panel` text. Doing this from outside needs no library patch.
- Colours: override `.cm-fat-cursor` (and `.cm-selectionBackground` / `&.cm-focused .cm-selectionBackground` from drawSelection) in your editor theme. Because `hideNativeSelection` is `Prec.highest`, an override needs equal or greater specificity or `!important`.
- **Rendering block selections over tabs or wide characters will look ragged**, because selections are built from `ch` offsets (section 1, item 4).

### Gaps
- I did not visually verify Safari block-cursor rendering (#118 is still open).
