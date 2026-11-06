# How browser and IDE Vim emulators handle visual mode and browser key conflicts (researched 2026-11-06)

Method note: this session's network blocked developer.mozilla.org, developer.chrome.com, bugzilla.mozilla.org and forum.obsidian.md, so those pages were not fetched directly. Claims about them come from search-result snippets and are marked as such. Source-code findings come from shallow clones made on 2026-11-06:
- replit/codemirror-vim: last commit 2026-11-01. This is the CM6 package and also the shared engine `codemirror-vim-core/vim.js`, about 7,167 lines.
- VSCodeVim/Vim: last commit 2026-10-03.

Line numbers below refer to those clones.

## Which keys can a web page not intercept, and can Ctrl-V be intercepted?

### Takeaway
Chrome/Chromium never lets a page cancel Ctrl/Cmd+N, Ctrl/Cmd+T and Ctrl/Cmd+W, and on macOS often never even delivers the event. Firefox reserves the same small set: content can see them but cannot prevent the default. Safari on Mac does not dispatch Cmd+N/W/Q/T. Ctrl-V is not reserved, so a keydown handler on a focused editor can cancel it in all of these browsers. On macOS, Ctrl-V is not paste at all (paste is Cmd-V), so it is free for visual block.

### Cited Findings
- A Chromium design proposal (BrowserKeys API) names ctrl-n, ctrl-w and ctrl-t as "the most problematic" Chromium accelerators, because terminals and remote-access tools use them for other things. It says letting the page see browser keys first "allows a malicious consumer to ignore keys like ctrl-w to keep the user stuck on the page" — [Chromium BrowserKeys proposal](https://chromium.org/developers/design-documents/extensions/proposed-changes/apis-under-development/browser-keys) (from search snippet)
- Chromium issue 33056 (2010): "Ctrl-N, Ctrl-T and Ctrl-W no longer available to client side JavaScript in Chrome4". Older browsers (FF3.x, IE7/8, Chrome3) had allowed them — [chromium-bugs group](https://groups.google.com/a/chromium.org/g/chromium-bugs/c/Ntc1byZXHfU) (from search snippet)
- Mozilla bug 1203059 says "Chrome does not allow content to override ctrl-T, ctrl-W, or ctrl-N" and does not even dispatch those to content. It says Firefox historically let pages preventDefault "almost any keyboard event" except a few, such as ctrl-F4 and ctrl-PageUp/PageDown — [Mozilla bug 1203059](https://bugzilla.mozilla.org/show_bug.cgi?id=1203059) (from search snippet)
- Firefox later reserved accel+T, accel+W, accel+N and a few others. Content can still handle these shortcuts but "cannot prevent the default actions" (reserved `<command>` keys) — [Mozilla bug 1203059](https://bugzilla.mozilla.org/show_bug.cgi?id=1203059), [Mozilla bug 1490665](https://bugzilla.mozilla.org/show_bug.cgi?id=1490665) (from search snippets)
- An open Firefox bug asks to let content handle Accel+N and Accel+T in fullscreen. It notes Chromium doesn't allow it in fullscreen either, and suggests Keyboard Lock as a possible route — [Mozilla bug 1593883](https://bugzilla.mozilla.org/show_bug.cgi?id=1593883) (from search snippet)
- W3C UI Events discussion (Masayuki Nakano, 2016): Chrome and Safari on Mac do not dispatch Cmd+N, Cmd+W, Cmd+Q, Cmd+T to the page — [public-webapps-github, Jan 2016](https://lists.w3.org/Archives/Public/public-webapps-github/2016Jan/0255.html) (from search snippet)
- WebKit bug 13031 (2007) argues that Mac users expect Cmd+W/Cmd+Q to work no matter what the page script does — [WebKit Bugzilla 13031](https://bugs.webkit.org/show_bug.cgi?id=13031) (from search snippet)
- Keyboard Lock API (`navigator.keyboard.lock()`):
  - Works only while JavaScript-initiated fullscreen is active, and only for keys the OS grants.
  - Locking "KeyW" sends W and every modifier combination with it (including Ctrl+W) to the app.
  - Chrome 68+ and Edge 79+ support it; Firefox and Safari do not.
  - A long (2 s) Esc press exits.
  - Sources: [Chrome Developers: Better full screen mode with the Keyboard Lock API](https://developer.chrome.com/blog/better-full-screen-mode), [Capture Keys with the Keyboard Lock API](https://developer.chrome.com/docs/capabilities/web-apis/keyboard-lock) (from search snippets; pages not fetchable here)
- Stack Overflow answers (2011–2016 era): in Chrome you may see the keydown for Ctrl+N but you cannot prevent the new window. The only workaround cited is remapping at the OS keyboard-layout level — [SO 38838302 mirror](https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/38838302/any-way-to-override-ctrl-n-to-open-a-new-window-in-chrome), [SO 7449505 mirror](https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/7449505/fully-kiosking-chrome-capture-and-prevent-default-of-c-w-t-n)
- A developer write-up confirms a page cannot stop Cmd/Ctrl+W from closing the tab even with preventDefault — [DEV: Should web browser let you control Ctrl/Cmd+W](https://dev.to/tomj/should-web-browser-let-you-control-ctrlcmd-w-59c8)
- Practical evidence that Ctrl-V can be intercepted in a web editor:
  - The CodeMirror 6 Vim plugin maps `<C-v>` and `<C-q>` to `toggleVisualMode {blockwise:true}` (`vim.js` l.218–219).
  - Its keydown handler calls `e.preventDefault(); e.stopPropagation()` whenever Vim consumed the key (`index.ts` l.247–250).
  - Replit and other CM6 users rely on this in the browser.
  - Source: [replit/codemirror-vim](https://github.com/replit/codemirror-vim)
- The same handler special-cases copy: `isCopy = key === "<C-c>" && !CodeMirror.isMac`. When something is selected, it does not consume Ctrl-C, so the native copy happens (`index.ts` l.227–231). This is the "let the browser copy" pattern on Windows/Linux — [replit/codemirror-vim](https://github.com/replit/codemirror-vim)
- Key naming in vim.js: ctrlKey gives `C-`, altKey gives `A-`, metaKey (Cmd) gives `M-`. On Mac a lone `A-` with a single character is dropped, because Option produces characters such as `{` on Swiss layouts (`vim.js` l.1222–1240). So Cmd is never treated as Ctrl. `<C-v>` on Mac means the physical Control key — [replit/codemirror-vim](https://github.com/replit/codemirror-vim)

### Inferences
- Ctrl-W (in insert mode: delete word; `<C-w>` window commands), Ctrl-N/Ctrl-T (insert-mode completion and indent) and on Mac Cmd-Q/Cmd-W cannot be emulated in a normal browser tab. A 1:1 emulator must use alternatives, document the gap, or offer fullscreen plus Keyboard Lock (Chromium only).
- Ctrl-R (redo) and Ctrl-V (visual block) are not in the reserved set described by these sources, so a focused-editor keydown handler with preventDefault normally wins. This is consistent with CodeMirror vim shipping `<C-r>` redo and `<C-v>` block in browsers. Verify Ctrl-R in each target browser; I found no primary source listing it as reserved or not.
- Ctrl-Q on Linux/Windows Chrome is not a browser quit shortcut (Chrome uses Ctrl+Shift+Q on Linux), so vim's alternative `<C-q>` for block mode is usually safe there. On Firefox Linux, Ctrl+Q is Quit. On macOS, Cmd+Q is Quit but Ctrl+Q is free. I found no primary source for Firefox's Ctrl+Q reservation, so treat this as unverified.
- On macOS, a page's Ctrl-V reaches keydown with `ctrlKey=true` and is not paste. In a native text field, Cocoa's Emacs binding Ctrl-V means "page down". That matches the Obsidian macOS report (see below) where Ctrl-V moved the cursor down a page instead of entering block mode.
- Recommended pattern:
  - Treat only `ctrlKey` (not `metaKey`) as Vim Ctrl.
  - On Mac, leave Cmd-C/Cmd-V/Cmd-X to the browser.
  - On Win/Linux, when Ctrl-V is used for block mode, keep paste available through Ctrl+Shift+V, or the browser `paste` event, or `"+p`/`"*p` through `navigator.clipboard.readText()`.
  - Always also bind `<C-q>` to blockwise visual, as real Vim does on Windows.

### Gaps
- No fetched primary page lists Chrome's full current reserved set (for example whether Ctrl+Shift+N/T/W, Ctrl+Tab and Ctrl+PageUp/Down are all reserved in 2026). MDN and developer.chrome.com were blocked here.
- No confirmed per-browser test data for Ctrl-R and Ctrl-Q interceptability in 2026.
- No information on whether Safari 18/19 changed reserved Cmd shortcuts.

## How do VSCodeVim, Monaco-vim, Ace, IdeaVim, Obsidian, Replit and vim.js-based editors handle Ctrl-V visual block and the clipboard conflict?

### Takeaway
Every emulator uses an ownership switch per key, sometimes per mode:
- VSCodeVim: `vim.useCtrlKeys` and `vim.handleKeys`.
- IdeaVim: `sethandler`.
- CodeMirror/Replit/Obsidian: a Vim keymap with preventDefault, plus a vimrc `unmap`.

The CodeMirror vim engine (used by CM5/CM6/Replit, monaco-vim and Obsidian) maps both `<C-v>` and `<C-q>` to blockwise visual.

### Cited Findings
- **VSCodeVim settings:**
  - `vim.useCtrlKeys` (default true): "Enable Vim ctrl keys overriding common VS Code operations such as copy, paste, find, etc." The FAQ says that if native ctrl commands (ctrl+f, ctrl+v) stop working, set it to false.
  - `vim.handleKeys` defaults to `{"<C-d>": true, "<C-s>": false, "<C-z>": false}`. false means VS Code handles the key.
  - `vim.overrideCopy` (default false) means "Override VS Code's copy command with our own".
  - Source: [VSCodeVim README](https://github.com/VSCodeVim/Vim/blob/master/README.md)
- VSCodeVim binds `ctrl+v` to `extension.vim_ctrl+v` with when-clause `editorTextFocus && vim.active && vim.use<C-v> && !inDebugRepl`. Per-key context keys `vim.use<C-x>` come from useCtrlKeys/handleKeys (`package.json` l.296–298) — [VSCodeVim package.json](https://github.com/VSCodeVim/Vim/blob/master/package.json)
- **IdeaVim `sethandler`** in `.ideavimrc`, for example `sethandler <C-C> n-v:ide i:vim`.
  - Mode letters: n, i, x, s, v (= x + s), c, a.
  - Handler values: ide or vim. Later definitions win. Modes left out default to vim.
  - `<CR>`, `<Esc>` and the arrows always go to Vim unless you set them explicitly.
  - Conflicts can also be resolved in Settings | Editor | Vim and Settings | Keymap.
  - Sources: [IdeaVim sethandler doc](https://github.com/JetBrains/ideavim/blob/master/doc/sethandler.md), [IdeaVim README](https://github.com/JetBrains/ideavim/blob/master/README.md)
- **monaco-vim** is "a layer between Codemirror's VIM keybindings and monaco". `initVimMode(editor, statusNode)` renders the status into a DOM node you provide. Its README warns that keys needing extra input (ex commands, search/replace) may have issues — [brijeshb42/monaco-vim](https://github.com/brijeshb42/monaco-vim)
- **Replit codemirror-vim** has three packages: `@replit/codemirror-vim` (CM6), `cm5-vim`, and the editor-agnostic `@replit/codemirror-vim-core` with a shared test suite. The README says to include `vim()` before other keymaps. Without `basicSetup`, you must include `drawSelection` "to correctly render the selection in visual mode" — [replit/codemirror-vim](https://github.com/replit/codemirror-vim) (README in `packages/codemirror-vim/README.md`, read from clone)
- **Obsidian:**
  - A Windows user on Obsidian 1.4.16 (forum thread 71811) reported that Ctrl+V still pasted instead of entering block mode with Vim mode on. The thread was closed without a resolution.
  - A macOS report (v0.15.2) said Control-v in normal mode moved the cursor down a page instead of entering block mode.
  - A block-selection rendering bug was reported fixed in 1.3.
  - Users report using the Vimrc Support plugin to `unmap <C-c>`/`iunmap <C-c>` with `set clipboard=unnamed`.
  - Sources: [Obsidian forum 71811](https://forum.obsidian.md/t/how-to-enter-visual-block-mode-ctrl-v-on-windows/71811), [Obsidian forum 39503](https://forum.obsidian.md/t/bug-vim-mode-visual-block-mode-is-broken/39503), [Obsidian forum 45310](https://forum.obsidian.md/t/vim-block-selection-rendering-improperly/45310), [Obsidian forum 3881](https://forum.obsidian.md/t/how-to-copy-with-vim-mode/3881) (all from search snippets)
- **Terminal analogue:** Windows Terminal binds Ctrl+V to paste and blocks Vim block mode. The common fix is to unbind it and paste with Ctrl+Shift+V or Shift+Insert — [microsoft/terminal #5790](https://github.com/microsoft/terminal/issues/5790), [microsoft/terminal #11267](https://github.com/microsoft/terminal/issues/11267). Vim also offers `<C-q>` as an alternative — [dev.to comment](https://dev.to/gnsp/comment/g1fn)

### Inferences
- The consensus UX is that Vim owns Ctrl-V by default, with a per-key opt-out. The second (block-mode) binding `<C-q>` should always exist.
- An Obsidian-style failure, where Ctrl-V still pastes, usually means a host keymap or the native paste ran before the Vim handler. Put the Vim keydown handler first, or in the capture phase, and call preventDefault on keydown. Cancelling keydown also stops the subsequent `paste` event.

### Gaps
- Ace keybinding-vim was not fetched. It is widely known to derive from the CodeMirror vim port, but I did not confirm this from a source here.
- The VSCodeVim ROADMAP.md feature table could not be fetched (404 at the expected path).
- No primary sources were fetched for documented visual-mode gaps per emulator, except the monaco-vim README caveat.

## How do these emulators render the visual-mode block cursor, VISUAL BLOCK selections, `$` in block mode and empty lines?

### Takeaway
All of them represent Vim's inclusive selection as an editor selection that is exclusive at the end, one character wider (head+1). They draw a separate "fat" block cursor on the last selected character, stepping back one character when head > anchor. Blockwise mode is rendered as one selection range per line, which means multiple cursors. `$` in block mode is stored as column = Infinity and expands every line to its own end.

### Cited Findings
- **CodeMirror vim `makeCmSelection`** (`vim.js` l.3889–3950):
  - Charwise: adds +1 to the head when head ≥ anchor, or +1 to the anchor when head < anchor. This turns Vim's inclusive selection into CM's half-open range.
  - Linewise: extends from column 0 to `lineLength`.
  - Blockwise: builds one range per line from top to bottom, with `fromCh`/`toCh` and the larger side +1. The primary range is the line containing the head.
  - Source: [replit/codemirror-vim](https://github.com/replit/codemirror-vim)
- **CM6 block cursor** (`block-cursor.ts` l.152–220):
  - In non-insert modes it draws a "fat cursor" div with the character copied into it.
  - When `anchor < head`, it draws on `head-1`, the last selected character, unless that character is "\n".
  - In visual block it draws the fat cursor only for the primary range (`if (vim.visualBlock && !primary) return null`).
  - Newlines and empty lines get a non-breaking space (`\xa0`), so the cursor has width on an empty line.
  - It handles tabs specially (width computed from tabSize) and surrogate pairs.
  - It hides the native `::selection` and caret (`backgroundColor: transparent`, `caretColor: transparent`) and relies on `drawSelection` for the highlight.
  - When unfocused, the cursor becomes an outline.
  - Source: [replit/codemirror-vim](https://github.com/replit/codemirror-vim)
- **`$` in block mode, CodeMirror vim:** after a motion, `if (!(vim.visualBlock && newHead.ch === Infinity)) newHead = clipCursorToContent(...)`. Infinity is kept so that each line's range goes to its own end (`vim.js` l.2075). `$` sets `vim.lastHPos = Infinity` (l.4437–4441) — [replit/codemirror-vim](https://github.com/replit/codemirror-vim)
- **`$` in block mode, VSCodeVim:** `iterateLinesInBlock` checks `runToLineEnd = vimState.desiredColumn === Number.POSITIVE_INFINITY`. The end column is `line.length + 1` when true, else `min(line.length, bottomRight.character + 1)`. So short lines and empty lines are clipped (`textEditor.ts` l.209–240) — [VSCodeVim](https://github.com/VSCodeVim/Vim)
- **VSCodeVim rendering** (`modeHandler.ts` l.1296–1342):
  - Visual: when start ≥ stop it uses `start.getRight()`, so the starting character is always included.
  - VisualLine: line begin to line end.
  - VisualBlock: one `vscode.Selection` per line from `iterateLinesInBlock`.
  - The cursor type in Visual, VisualLine and VisualBlock is `TextDecoration` (a decoration-drawn block), not the native cursor (`getCursorType`, l.1670–1680).
  - A code comment admits "our representation of a visual selection is so weird and inconsistent" (`statusBar.ts` ~l.225).
  - Source: [VSCodeVim](https://github.com/VSCodeVim/Vim)
- **Block-insert support (`I`/`A` in block mode):** CM vim has `selectForInsert`, which creates a zero-width cursor on each line of the block (`vim.js` l.3796–3803), so typed text goes to every line through multi-cursor. Block-register paste splits text by lines (`register.blockwise`, l.3305–3380) — [replit/codemirror-vim](https://github.com/replit/codemirror-vim)

### Inferences
- For a 1:1 implementation:
  - Keep the Vim model inclusive: `{anchor, head}` as character positions.
  - Derive the rendered half-open range with +1 on the right side.
  - Draw the block cursor yourself on `head`, in model coordinates, rather than on the DOM selection end.
  - Draw empty lines in a selection as a one-cell highlight. Vim shows a one-column block on empty lines in charwise and linewise mode.
  - In block mode, short lines that don't reach the left column get no highlight. With `$`, each line extends to its own end.
- Multi-selection rendering keeps block insert simple (`I`, `A`, `c` apply to every line). But with `$`, `A` must append at each line's own end, and short lines need padding behavior. Vim's `A` in a block pads short lines only when the block is not `$`. I found no emulator source confirming padding, so check this against Vim's `:h v_b_A`.

### Gaps
- I didn't verify how Monaco-vim and Ace render block selections. They likely use the same `makeCmSelection` logic through their adapters, but this is unconfirmed.
- I didn't verify how emulators render tabs and wide (CJK) characters in block mode, where display columns differ from character offsets. Vim's block uses virtual columns, while both inspected emulators use character offsets. That is a likely fidelity gap, but I found no documentation stating it.

## Does mouse dragging enter visual mode in these emulators, and what do double and triple clicks do?

### Takeaway
Both inspected emulators turn a non-Vim (mouse) selection into charwise visual mode. Clearing the selection exits visual mode. VSCodeVim makes this configurable with `vim.mouseSelectionGoesIntoVisualMode` (default true).

### Cited Findings
- **VSCodeVim:**
  - `vim.mouseSelectionGoesIntoVisualMode`, default true: "If enabled, dragging with the mouse activates Visual mode" (`package.json` l.981–984).
  - In `modeHandler.ts` (~l.385–405), a selection change from the mouse switches to `Mode.Visual` unless the editor is in Insert mode. An empty selection returns to Normal.
  - It special-cases clicking past EOL (`lastClickWasPastEol`, includes the last character). A code comment says double-click selection "causes an extra character to be selected so take one less character".
  - Source: [VSCodeVim](https://github.com/VSCodeVim/Vim)
- **CodeMirror vim `handleExternalSelection`** (`vim.js` l.6911–6940), triggered when the selection changes outside a Vim operation (`!cm.curOp?.isVimOp`):
  - When not in visual or insert mode and something is selected, it sets `visualMode = true, visualLine = false` and signals mode "visual".
  - "Mouse selections are considered visual characterwise". It converts the CM half-open range back to inclusive by subtracting 1 from the right side, and updates the `'<` and `'>` marks.
  - Clearing the selection exits visual mode.
  - Outside visual mode it resets `lastHPos` to the clicked column.
  - Source: [replit/codemirror-vim](https://github.com/replit/codemirror-vim)

### Inferences
- In Vim with `mouse=a`:
  - Dragging starts charwise visual.
  - Double-click selects a word in visual mode.
  - Triple-click selects a line in linewise visual (`-- VISUAL LINE --`).
  - Ctrl/Alt-drag can make a block, depending on the terminal or GUI.

  The inspected emulators always map mouse selection to charwise visual. Neither maps triple-click to linewise in the code I inspected. Matching Vim exactly would mean detecting `event.detail === 3` and entering `V`. This Vim behavior comes from general knowledge, not from a fetched source; verify against `:h mouse-using` and `:h double-click`.

### Gaps
- I fetched no primary source for Vim's own double-click and triple-click behavior.
- IdeaVim's mouse/select-mode behavior (`selectmode`, `idearefactormode`) was not documented on the fetched README page.

## How do the emulators display the mode name and showcmd (e.g. "-- VISUAL BLOCK --", "3x4")?

### Takeaway
VSCodeVim matches Vim exactly: `-- VISUAL --`, `-- VISUAL LINE --`, `-- VISUAL BLOCK --`, and showcmd selection sizes of `N` (characters, or lines when the selection spans lines) and `LxC` for blocks. The CodeMirror 6 status panel shows `--VISUAL BLOCK--` without the inner spaces, and shows typed keys rather than the selection size.

### Cited Findings
- **VSCodeVim `statusBarText`** (`statusBar.ts` l.171–200) returns `'-- NORMAL --'`, `'-- INSERT --'`, `'-- VISUAL --'`, `'-- VISUAL BLOCK --'`, `'-- VISUAL LINE --'` and `'-- REPLACE --'`. Settings `vim.showmodename` (default true) and `vim.showcmd` (default true) control the display — [VSCodeVim statusBar.ts](https://github.com/VSCodeVim/Vim), [README](https://github.com/VSCodeVim/Vim/blob/master/README.md)
- **VSCodeVim showcmd in visual modes** (`statusBar.ts` l.225–255):
  - Visual: shows the line count if the selection spans several lines, else the character count (at least 1, +1 if it ran over EOL).
  - VisualLine: shows the line count.
  - VisualBlock: shows `` `${lines}x${chars}` ``, followed by any pending command string.
  - Source: [VSCodeVim](https://github.com/VSCodeVim/Vim)
- **CM6 vim status panel** (enabled with `vim({status: true})`):
  - The mode text is `` `--${vim.mode.toUpperCase()}--` ``, where mode is "visual", "visual line" or "visual block", built from the `vim-mode-change` subMode (`index.ts` l.75–80, l.159–161). The result is "--VISUAL BLOCK--".
  - It appends "(C-O)" during insert-mode `<C-o>`.
  - The showcmd part is `vim.status`, the keys typed so far (`index.ts` l.233).
  - Clicking the mode label sends `<Esc>`.
  - The `vim-mode-change` event payload is `{mode: "visual", subMode: "linewise"|"blockwise"|""}` (`vim.js` l.23–24, l.3150).
  - Source: [replit/codemirror-vim](https://github.com/replit/codemirror-vim)
- IdeaVim supports `set showmode` and the `ideastatusicon` option for its status-bar widget — [IdeaVim README](https://github.com/JetBrains/ideavim/blob/master/README.md)
- monaco-vim renders status into a caller-supplied DOM node — [monaco-vim](https://github.com/brijeshb42/monaco-vim)

### Inferences
- To match Vim 1:1:
  - Show `-- VISUAL --`, `-- VISUAL LINE --` and `-- VISUAL BLOCK --` with spaces, bottom-left, as in VSCodeVim.
  - Show the showcmd area bottom-right with the selection size: `N` for charwise on one line, the line count otherwise and in linewise, `LxC` for block.
  - In block mode with `$`, Vim shows the column part based on the longest line. VSCodeVim's simple column difference does not reflect `$`.
- Note: real Vim counts block width in screen columns. VSCodeVim counts character offsets, so tabs and wide characters will differ.

### Gaps
- I found no primary-source confirmation of Vim's exact showcmd output for `$` blocks or for multibyte characters. Check `:h 'showcmd'` in Vim's documentation.
