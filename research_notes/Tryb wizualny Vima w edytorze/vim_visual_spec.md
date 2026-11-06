# Vim / Neovim Visual mode: a precise, testable spec

**How this was researched.** I took the primary sources directly: Vim's `runtime/doc` help files (visual.txt, change.txt, motion.txt, options.txt, index.txt, intro.txt, term.txt, gui_w32.txt, Vim 9.2 master), Neovim's `runtime/doc` (visual.txt, vim_diff.txt, news.txt, pattern.txt, options.txt, master/HEAD), and the relevant Vim C source (screen.c, normal.c, ops.c). I also ran **about 200 headless test cases on a real Vim 9.1.0016** (Ubuntu build, `vim -Nu NONE`, so all options are defaults: `selection=inclusive`, `noautoindent`, `ts=8 sw=8 noet`). Each case fed keys with `feedkeys(keys,'xt!')`, then recorded `mode()`, the cursor, `getpos('v')` (the anchor), the buffer, `""`/`"0`/`"1`/`"-`/`"a`, `getregtype()`, `'<`/`'>` and `visualmode()` through a `<Cmd>` call. That call does not change the mode.

Notation used below:
- `[T]` means the behavior was **observed in Vim 9.1.0016** by that harness. The harness lives in `/tmp/claude-0/-home-user-inf03strona/b4ba847d-7ab4-5a25-a4fa-c100490bbe42/scratchpad/t/` (`run.py`, `rec.vim`, `cases.py`, `cases2.py`, `out.txt`). That folder is temporary.
- Positions are `(line, col)`, 1-based, with byte columns as `getpos()` reports them.
- "anchor" is the fixed end of the selection (`getpos('v')`). "cursor" is the moving end.
- `^V` means CTRL-V, and register type `^V3` is a blockwise register of width 3.
- Test buffer **L** (used unless stated otherwise):
  ```
  1: one two three
  2: four five six
  3: seven eight nine
  4: (empty)
  5: ten
  ```
- Test buffer **B** (for block tests): `abcdefgh` / `abc` / `abcdefghij` / `abcdefgh`.
- Test buffer **I** (for indent tests): `    alpha beta` / `    gamma delta` / `epsilon`, where each indent is 4 spaces.

---

## 1. Entering, switching and leaving Visual mode; counts; o/O; gv; mode indicator and showcmd

### Takeaway
`v`/`V`/`CTRL-V` start char/line/block Visual mode at the cursor. Pressing a different one of the three switches mode and keeps both ends. Pressing the same one, `<Esc>`, `CTRL-C` or `CTRL-[` leaves without changes; the cursor stays where it was and `'<`/`'>` are set. A count before `v`/`V`/`CTRL-V` reuses (and multiplies) the size of the last Visual operation. `gv` reselects the previous area and mode. `o` swaps the ends; `O` swaps horizontally in block mode only. The mode message is `-- VISUAL --`, `-- VISUAL LINE --` or `-- VISUAL BLOCK --`. With `showcmd`, the selection size shows as `N` (chars), `N` (lines) or `LxC` (block).

### Cited Findings
**Entering**
- `v` starts charwise Visual, `V` linewise, `CTRL-V` blockwise. "The character under the cursor will be used as the start." — [visual.txt #visual-use](https://vimhelp.org/visual.txt.html#visual-use)
- `mode()` reports `v`, `V` or `^V` (char 0x16). Anchor = cursor = start position. [T]
- `CTRL-Q` is the documented alternative to `CTRL-V` for Windows, where `CTRL-V` pastes. It "doesn't work for terminals when it's used for control flow". — [gui_w32.txt #CTRL-V-alternative](https://vimhelp.org/gui_w32.txt.html#CTRL-V-alternative)
- In Vim 9.1 on Linux, `CTRL-Q` in Normal mode also started blockwise Visual (`mode()` = `^V`). [T]

**Switching and exiting by the same key.** The table from [visual.txt #v_v](https://vimhelp.org/visual.txt.html#v_v):

| old mode \ key | `v` | `CTRL-V` | `V` |
|---|---|---|---|
| Normal | Visual | blockwise Visual | linewise Visual |
| Visual | **Normal** | blockwise | linewise |
| blockwise | Visual | **Normal** | linewise |
| linewise | Visual | blockwise | **Normal** |

- Switching mode keeps both the anchor and the cursor. Example: `vl` at (1,5), then `V` gives mode `V`, anchor (1,5), cursor (1,6). `vjl` then `CTRL-V` gives a block with anchor (1,5) and cursor (2,6). `CTRL-V jl v` then `y` yanked charwise `"two three\nfour f"`. [T]
- Exiting with the same key: the cursor stays at the cursor end. Example: `vlv` from (1,5) ends at (1,6). `'<`/`'>` and `visualmode()` are set. [T]

**Esc, CTRL-C and CTRL-[**
- "If you use <Esc>, click the left mouse button or use any command that does a jump to another buffer while in Visual mode, the highlighting stops and no text is affected." — [visual.txt #visual-start](https://vimhelp.org/visual.txt.html#visual-start)
- `CTRL-C` stops Visual mode too. If Insert mode is pending (`-- (insert) VISUAL --`), it stops that as well. — [visual.txt #v_CTRL-C](https://vimhelp.org/visual.txt.html#v_CTRL-C)
- `<Esc>`, `CTRL-C` and `CTRL-[` behaved the same. After `vjl<Esc>` from (1,5), the cursor is at (2,6) and stays there (it does not move left as Insert-mode Esc does). Then `'<`=(1,5), `'>`=(2,6), `visualmode()`=`v`. [T]
- One exception to "the cursor stays": if the cursor was on the end-of-line position (after `v$`, or after `l` past the last character), it is clamped back to the last character. Example: `v$<Esc>` on line 1 gives cursor (1,13), while `'>` is (1,14). [T]
- `Vj<Esc>` from (1,7) gives cursor (2,7), so linewise mode keeps the column. `'<`=(1,1) and `'>`=(2, 2147483647), i.e. MAXCOL in linewise mode. [T]
- Neovim: an unmapped ALT chord may act like `<Esc>` followed by the key. Example: `<A-x>` acts like `<Esc>x`. — [Neovim visual.txt #v_ALT](https://neovim.io/doc/user/visual.html#v_ALT)

**gv**
- "Start Visual mode with the same area as the previous area and the same mode. In Visual mode the current and the previous Visual area are exchanged. After using "p" or "P" in Visual mode the text that was put will be selected." — [visual.txt #gv](https://vimhelp.org/visual.txt.html#gv)
- `vjl<Esc>gg0gv` restores mode `v` with anchor (1,5) and cursor (2,6). The cursor returns to the end it was on. [T]
- `gv` with no previous Visual area does nothing (stays in Normal mode). [T]
- `gv` after `Vj>` reselects the same 2 lines in `V` mode. [T]
- `gv` after block `I...<Esc>` reselects the original block. [T]
- `gv` after Visual `p` selects the put text. Example: `viwp` of "two" at (2,5), then `gv`, selects (2,5)-(2,7). [T] After a block `p`, it selects the put block. [T]
- Neovim: an operator target that internally creates a temporary Visual selection (`gn`, `d<C-v>j`, an omap text object) does **not** update the `gv` area, `'<`/`'>` or `visualmode()`. — [Neovim visual.txt #gv](https://neovim.io/doc/user/visual.html#gv), [vim_diff.txt](https://neovim.io/doc/user/vim_diff.html)

**o and O**
- `o`: "The current cursor position becomes the start of the highlighted text and the cursor is moved to the other end … The highlighted area remains the same." — [visual.txt #v_o](https://vimhelp.org/visual.txt.html#v_o)
- `O`: like `o`, "but in Visual block mode the cursor moves to the other corner in the same line." — [visual.txt #v_O](https://vimhelp.org/visual.txt.html#v_O)
- `vjlo` from (1,5) gives cursor (1,5) and anchor (2,6). `oo` returns to the original state. [T]
- `O` in charwise mode is the same as `o`. [T]
- Block `CTRL-V jll` from (1,5), so anchor (1,5) and cursor (2,7):
  - `o` gives cursor (1,5), anchor (2,7).
  - `O` gives cursor (2,5), anchor (1,7).
  [T]
- After `o`, motions move the new cursor end. `vll o hh` from (1,5) gives cursor (1,3) and anchor (1,7). [T]

**Counts before v / V / CTRL-V** ([visual.txt #v](https://vimhelp.org/visual.txt.html#v))
- With no previous Visual operation, `[count]v` selects count characters, "like moving the cursor right N * [count] characters. One less when 'selection' is not "exclusive"". `[count]V` selects count lines. `[count]CTRL-V` is "used as with v". — [visual.txt #v](https://vimhelp.org/visual.txt.html#v)
- Observed from (1,1): `3v` gives cursor (1,3); `3V` gives cursor (3,1) in mode `V`; `3CTRL-V` gives a 1x3 block with cursor (1,3). [T]
- With a previous Visual operation, the type of the old area is used ([visual.txt #visual-start](https://vimhelp.org/visual.txt.html#visual-start)):
  - linewise: lines × count;
  - block: lines and columns × count;
  - charwise in one line: chars × count;
  - charwise over several lines: lines × count, and "in the last line the same number of characters is used as in the last line in the previously highlighted area";
  - "If the "$" command was used … the area will be extended to the rightmost column of the longest line."
- Observed cases. [T]
  - After `vlly` (3 chars): `j1v` selects (2,1)-(2,3); `2v` selects (2,1)-(2,6).
  - After `Vjy`: `1v` gives mode `V` over 2 lines. The mode of the previous operation is used even though `v` was typed.
  - After a 2x2 block yank: `1v` gives a 2x2 block; `2v` gives a 4x4 block (cursor (5,4) from (2,1)).
  - After `vjy` from (1,5) to (2,5): `1v` at (2,1) selects to (3,5).

**Mode indicator ('showmode', on by default in Vim)**
- Vim's `showmode()` builds the message as `"--"` + optional `" (insert)"` + one of `" VISUAL"`, `" VISUAL LINE"`, `" VISUAL BLOCK"`, `" SELECT"`, `" SELECT LINE"`, `" SELECT BLOCK"` + `" --"`. — [Vim src/screen.c](https://github.com/vim/vim/blob/master/src/screen.c)
- So the exact strings are `-- VISUAL --`, `-- VISUAL LINE --`, `-- VISUAL BLOCK --`, `-- SELECT --`, `-- SELECT LINE --`, `-- SELECT BLOCK --`. `-- (insert) VISUAL --` appears when Visual mode is started from Insert mode with `CTRL-O v`. — [intro.txt #Insert-Visual-mode](https://vimhelp.org/intro.txt.html#mode-switching), [visual.txt #v_CTRL-C](https://vimhelp.org/visual.txt.html#v_CTRL-C)

**showcmd selection size**
- From the docs: "In Visual mode the size of the selected area is shown":
  - characters within a line: the number of characters; "2-6" means 2 characters and 6 bytes;
  - more than one line: the number of lines;
  - a block: "{lines}x{columns}" in screen characters.
  'showcmd' is "Vim default: on". — [options.txt #'showcmd'](https://vimhelp.org/options.txt.html#%27showcmd%27)
- From the source (`clear_showcmd`):
  - block: `"%ldx%ld"` (lines, rightcol-leftcol+1 in virtual/screen columns);
  - `V` mode **or** anchor and cursor on different lines: `"%ld"` lines, so a single-line `V` selection shows `1`;
  - otherwise the char count, or `chars-bytes` when they differ.
  Closed folds count as whole. — [Vim src/normal.c clear_showcmd](https://github.com/vim/vim/blob/master/src/normal.c)

### Inferences
- A faithful emulator needs a `lastVisual = {mode, anchor, cursor, curswant==MAXCOL}` record per buffer, used for `gv`, and a separate `lastVisualOpSize` used for counted `v` and for `.`.
- Mode switching must never reset the anchor.
- Test cases can be written directly from the observed pairs above, e.g. `L`, cursor (1,5), keys `vlV` → expect mode `V`, anchor (1,5), cursor (1,6).

### Gaps
- `CTRL-Q` working in a Unix terminal depends on the terminal not using XON/XOFF flow control. My test used feedkeys, so it skipped the terminal entirely.
- I did not verify the showcmd strings visually: the harness ran in Ex mode, which has no screen. Those rules come from the source code.

---

## 2. Inclusive selection semantics, end-of-line, empty lines, `$` in block mode, cursor drawing

### Takeaway
With the default `selection=inclusive`, the character under the cursor and the anchor character are both part of the selection. In Visual mode the cursor may sit one position past the last character, on the line break. When it does, charwise operators include the newline. On an empty line the "character" selected is its newline. In block mode `$` makes the right edge "end of each line" (ragged) until a non-vertical motion cancels it.

### Cited Findings
- "The text from the start of the Visual mode up to and including the character under the cursor is highlighted." It is excluded only with `selection=exclusive` when the cursor is after the area. — [visual.txt #visual-use](https://vimhelp.org/visual.txt.html#visual-use)
- In charwise mode, uppercase and non-alpha operators (except `~` and `U`) work on whole lines. — [visual.txt #visual-use](https://vimhelp.org/visual.txt.html#visual-use)
- In block mode the selection is "a rectangle between start position and the cursor". — [visual.txt #visual-block](https://vimhelp.org/visual.txt.html#visual-block)
- **`l` can go onto the EOL.** In the source `nv_right`, `past_line = (VIsual_active && *p_sel != 'o')` lets the cursor move onto the NUL after the last character. — [Vim src/normal.c](https://github.com/vim/vim/blob/master/src/normal.c)
  - Observed on the 13-char line 1: `vllll` from (1,12) stops at (1,14), one past the end. More `l` does not move further or wrap with default 'whichwrap'. [T]
- **v$**: the cursor goes to (1,14), the EOL position. [T]
  - `v$y` from (1,5) yanks `"two three\n"` as charwise (type `v`), with `'>`=(1,14). [T]
  - `v$d` joins: lines become `one four five six`, ..., `"1`=`"two three\n"`. [T]
  - `v$cX<Esc>` gives `one Xfour five six`. [T]
  - `vj$d` from (1,1) deletes `"one two three\nfour five six\n"`. The register is still **charwise**, not linewise. [T]
- **The EOL rule in the operator.** If the end of a charwise operation is on the NUL, the source sets `inclusive=FALSE` and "Try to include the newline, unless it's an operator that works on lines only". It moves the end to column 0 of the next line, unless the end is on the last line. — [Vim src/ops.c do_pending_operator](https://github.com/vim/vim/blob/master/src/ops.c)
- **`$` is sticky vertically in charwise mode.** `v$j` from (1,2) gives cursor (2,4), the EOL of `abc`. `y` then yanks `"bcdefgh\nabc\n"`. [T]
- **Empty line.** [T]
  - `vy` on an empty line yanks `"\n"` (type `v`).
  - `vd` on an empty line **deletes the line** (the line break). Register `"\n"`, type `v`. It goes to `"1`, not `"-`.
  - `vj` from (3,10) onto the empty line 4 puts the cursor at (4,1). `y` yanks `"ht nine\n\n"`, including the empty line's own newline.
- **Last character.** `vd` on the last char of line 1 (1,13) leaves `one two thre` with the cursor at (1,12). [T]
- **Block `$`.** "When the "$" command is used with blockwise Visual mode, the right end of the highlighted text will be determined by the longest highlighted line. This stops when a motion command is used that does not move straight up or down." — [visual.txt #v_$](https://vimhelp.org/visual.txt.html#v_$)
  - `CTRL-V jj $` from (1,3) on B gives cursor (3,11), the EOL of the 10-char line. `CTRL-V $ jj` gives the same. [T]
  - `y` gives `"cdefgh\nc\ncdefghij"`, type `^V8`. Lines are ragged, not padded. [T]
  - `CTRL-V $jj h` cancels the `$`: cursor (3,10), and `y` gives a rectangular block, cols 2..10, type `^V9`. [T]
- **Block yank padding.** [T]
  - A line that ends *inside* the block contributes only its existing chars, not padded. Example: block cols 2-4, line `abc` contributes `bc`.
  - A line that ends *entirely before* the block contributes spaces of the block width. Example: block cols 5-6 over `abc` contributes `"  "`. Seen in block `d`/`c` on B: `"ef\n  \nef\nef"`.
- **Cursor drawing.** Vim's help says only that the highlight "normally includes the character under the cursor" ([visual.txt](https://vimhelp.org/visual.txt.html#visual-use)). Neovim's vim_diff explicitly lists "Visual selection highlights the character at cursor" as a Neovim improvement. — [Neovim vim_diff.txt](https://neovim.io/doc/user/vim_diff.html)
  - So in classic terminal Vim the cursor cell is drawn as the cursor (block cursor) rather than with the `Visual` highlight. In Neovim the cursor cell also gets the `Visual` highlight.
- **'virtualedit'** allows positioning past EOL or inside tabs, which is useful for blocks. It is off by default. — [visual.txt #blockwise-operators](https://vimhelp.org/visual.txt.html#blockwise-operators)

### Inferences
- Model the cursor column in Visual mode as allowing `col == lineLength` (0-based), i.e. "on the newline". `l` may move there; `$` sets `curswant = MAXCOL`.
- At operator time, a charwise selection whose end is on the newline includes the newline, which joins the next line. An exception: when the end is on the last line of the buffer there is no newline to include.
- On `<Esc>`, clamp the cursor to the last character.
- Block selections need a `curswant==MAXCOL` flag. It is cleared by `h`, `l`, `w` and similar motions, and kept by `j`/`k`/`G`.

### Gaps
- I did not verify multi-byte characters or tabs inside blocks beyond the documented examples (see section 4).
- Rendering in the terminal (cursor shape over the selection) was not observable headlessly.

---

## 3. All operators on charwise selections (with notes for V and CTRL-V where the doc groups them)

### Takeaway
After any operator, Visual mode ends; the mode is Normal, or Insert for c/s/C/S/R/I/A. The cursor goes to the **start** of the operated region, with operator-specific adjustments listed below. Most charwise operators act on exactly the selected characters. `X D Y C S R` (and `:`, `J`, `gq`, `=`, `!`, `>`, `<`) act on **whole lines** in char and line mode. Registers follow normal rules: yank → `"0` and `""`; a delete within one line → `"-`; a multi-line delete → `"1`. Register type is `v` (charwise), `V` (linewise) or `^V{width}` (block).

### Cited Findings
**The operator list** ([visual.txt #visual-operators](https://vimhelp.org/visual.txt.html#visual-operators))
- Operators: `~ d c y > < ! = gq`.
- Additional commands: `: r s C S R x D X Y p P J U u ^] I A`.
- Footnotes:
  - (1) always whole lines: `! = gq : J`;
  - (2) whole lines when not using CTRL-V: `C S R X Y`;
  - (3) `D`: whole lines, or to the end of line in block mode;
  - (4) in block mode works on the block only: `c > < r C`.
- Also: `CTRL-A`, `CTRL-X`, `g CTRL-A`, `g CTRL-X`, `g?`, `gJ`, `gw`, `zy`, `K`, `CTRL-]`, `CTRL-\ CTRL-N` (stop), `CTRL-G` (to Select mode). — [index.txt #visual-index](https://vimhelp.org/index.txt.html#visual-index)
- A register name goes just before the operator (`v{move}"xd`), and so does a count (`v{move}3>`). — [visual.txt #visual-operators](https://vimhelp.org/visual.txt.html#visual-operators)

The test start for this group is buffer L, cursor (1,5) on `t` of "two", unless stated otherwise.

**d / x / `<Del>`** — [change.txt #v_d](https://vimhelp.org/change.txt.html#v_d)
- All three are identical. [T]
- `vlld` → `one  three`, cursor (1,5), `""`=`"two"` type `v`, `"-`=`"two"`, `"1` unchanged.
- `vjd` → `one five six`, cursor (1,5), `""`=`"1`=`"two three\nfour "`, type `v`.
- A backwards selection is identical: `vkhd` from (2,6) → `one ive six`, cursor (1,5).

**y**
- `vlly` gives cursor (1,5) (unchanged) and `"0`=`""`=`"two"`. [T]
- `vhhy` from (1,7) **moves the cursor to the start**, (1,5). [T]
- `vky` from (2,3) gives cursor (1,3). [T]
- Doc for `y`: "Yank the highlighted text [into register x]". — [change.txt #v_y](https://vimhelp.org/change.txt.html#v_y)
- `"ay` stores into `"a` and also `""`. `"Ay` appends: `"a`=`"onetwo"`. [T]

**c / s** — [change.txt #v_c](https://vimhelp.org/change.txt.html#v_c)
- Both are identical: "Delete the highlighted text [into register x] and start insert". [T]
- `vllcXY<Esc>` → `one XY three`, cursor (1,6) (Esc moves left onto `Y`), `"-`=`"two"`. [T]
- `vjcXY<Esc>` → `one XYfive six`, with `"1` filled. [T]
- A count is ignored: `vl3cX<Esc>` replaced only the 2 selected chars. [T]

**X / D (charwise or linewise)** — [change.txt #v_X](https://vimhelp.org/change.txt.html#v_X)
- Delete the highlighted **lines**. `vlX` → line 1 removed, `""`=`"1`=`"one two three\n"` type `V`, cursor (1,1) on the first non-blank of the new line 1. [T]

**C / S / R (charwise or linewise)** — [change.txt #v_C](https://vimhelp.org/change.txt.html#v_C)
- "Delete the highlighted lines … and start insert". `R` is "Currently just like {Visual}["x]S".
- `vlCXY<Esc>` → line 1 becomes `XY`, type `V` in `"1`, cursor (1,2). [T]
- With default `noautoindent`, the indent is not kept: `VcXY<Esc>` on `    alpha beta` gives `XY`. [T]

**Y (charwise)**
- Linewise yank of the touched lines: `vlY` gives `"one two three\n"` type `V`, cursor (1,1). [T]
- Neovim's default `Y`→`y$` mapping is a **Normal-mode** mapping ([Neovim change.txt #Y-default](https://neovim.io/doc/user/change.html#Y-default)), so `v_Y` is unaffected.

**r{char}** — [change.txt #v_r](https://vimhelp.org/change.txt.html#v_r)
- "Replace all selected characters by {char}. CTRL-C will be inserted literally."
- `vjr*` from (1,5) → `one *********` / `*****five six`, cursor (1,5). Newlines are not replaced. [T]
- In linewise mode: `Vr-` → `-------------`. [T]
- **`r<CR>`**: in char/line mode each char becomes a literal `^M` (CR). In **block** mode the line is *split* at the block (see section 4). Source: `op_replace` treats `\r`/`\n` as a line split only in the block branch unless typed via CTRL-V. — [Vim src/ops.c op_replace](https://github.com/vim/vim/blob/master/src/ops.c) [T]

**~ / u / U / g? / g~ / gU** — [change.txt #v_~](https://vimhelp.org/change.txt.html#v_%7E)
- `~` switches case, `U` uppercases, `u` lowercases, `g?` applies rot13. `g~`, `gU` and `gu` typed in Visual mode act the same as `~`, `U` and `u`. [T]
- `vjl~` from (1,1) → `ONE TWO THREE` / `FOur five six`. [T]
- The cursor goes to the selection start: `vhh~` from (1,7) gives (1,5). [T]
- `vllg?` → `bar two three`. [T]

**> / < with counts** — [change.txt #v_>](https://vimhelp.org/change.txt.html#v_%3E)
- "Shift the highlighted lines [count] 'shiftwidth' rightwards". This works on whole lines in char and line mode.
- On buffer I with defaults sw=8, ts=8, noet:
  - `vj>` → `\t    alpha beta`, `\t    gamma delta`;
  - `vj3>` → three more tabs, `\t\t\t    alpha...`;
  - `vk<` → indent removed.
  [T]
- The cursor goes to the **first non-blank of the first line**: (1,6) after `>` = tab + 4 spaces. [T]

**=** — [change.txt #v_=](https://vimhelp.org/change.txt.html#v_=)
- Filters the highlighted lines like `={motion}`. With the default C-indent fallback, `Vjjj=` on `if x/{/foo/}` → `foo` indented with `\t`. Cursor (1,1). [T]

**J / gJ** — [change.txt #v_J](https://vimhelp.org/change.txt.html#v_J)
- "Join the highlighted lines, with a minimum of two lines". `gJ` does not insert or remove spaces.
- `vJ` with a single-line selection still joins 2 lines → `one two three four five six`, cursor (1,14) at the join point. [T]
- `vjjJ` joins 3 lines. [T]
- `v3J` joined only 2 lines, so the count was ignored. [T]
- `vjgJ` on I → `    alpha beta    gamma delta`. [T]
- `vjJ` on I removes the indent and inserts one space. [T]

**p / P** (replacing the selection) — [change.txt #v_p](https://vimhelp.org/change.txt.html#v_p)
- "Vim will try to replace the selected text with the contents of the register … (Implementation detail: it actually works by first putting the register after the selection and then deleting the selection.)"
- "With p the previously selected text is put in the unnamed register … But you cannot repeat the same change. With P the unnamed register is not changed … you can repeat the same change."
- Charwise `p` with a charwise register. `yiw` on "two", `w`, `viwp` over "three" → `one two two`. Then `""`=`"-`=`"three"` and `"0`=`"two"` is kept. The cursor is on the last char of the put text, (1,11). [T]
- Charwise `P`: same text, but `""` stays `"two"`. [T]
- Linewise register into a charwise selection. `yy`, then `viwp` over "five" → `four ` / `one two three` / ` six`: the line is split and the register lines are put in between. Cursor (3,1). [T]
- A multi-line linewise register over the last word works the same: `yj` then `Gviwp`. [T]
- Charwise register into a linewise selection. `yiw`, then `Vp` on line 2 → line 2 becomes `one`. `""`=`"1`=`"four five six\n"` type `V`. [T]
- Linewise register into a linewise selection: `yy`, `jjVp` → line 3 replaced. The old line goes to `""` and `"1` as `V`. Cursor (3,1). [T]
- Blockwise register into a linewise selection: `Vp` inserts the block's lines as **separate lines** (`on`, `fo`). [T]
- Visual `p` on an empty line with "one" → `oneten`. The empty line's newline was selected and replaced, so the next line joined. [T]
- `"ap` uses register a; the replaced text goes to `""`/`"-`. [T]
- A count repeats the put: `viw3p` with "one" → `oneoneone`. [T]
- `.` after a Visual `p` uses the *new* unnamed register, which now holds the replaced text. That is the documented reason it "cannot repeat the same change". [T]

**: (Ex command)** — [visual.txt #v_:](https://vimhelp.org/visual.txt.html#visual-operators), [visual.txt #:visual_example](https://vimhelp.org/visual.txt.html#:visual_example)
- "Note that the "'<,'>" will appear automatically when you press ":" in Visual mode." The command always works on whole lines.
- `vj:` → the command line contains exactly `'<,'>`, Visual mode has ended, and `'<`/`'>` are set. [T]
- `v3:` also gave `'<,'>`: the count is dropped in favor of the Visual range. [T]
- Use `\%V` in a pattern to restrict to the exact Visual area: `:'<,'>s/\%V(/#/g`. — [visual.txt](https://vimhelp.org/visual.txt.html#visual-operators)

**gq / gw** — [change.txt #v_gq](https://vimhelp.org/change.txt.html#v_gq)
- Format the highlighted lines, always whole lines.
- With `tw=8`, `Vgq` on `aaa bbb ccc ddd` → `aaa bbb` / `ccc ddd`. The cursor goes to the first non-blank of the last formatted line, (2,1). [T]
- A charwise selection inside a line formats the whole line. [T]
- `gw` puts the cursor back. — [change.txt #v_gw](https://vimhelp.org/change.txt.html#v_gw)

**Text objects in Visual mode** — [motion.txt #v_object-select](https://vimhelp.org/motion.txt.html#v_object-select)
- "When start and end of the Visual area are the same (just after typing "v"): One object is selected … When start and end … are not the same: For non-block objects the area is extended by one object or the white space up to the next object, or both for the "a" objects. The direction … depends on which side of the Visual area the cursor is. For the block objects the block is extended one level outwards."
- Word objects. [T]
  - `viw` at (1,6) selects (1,5)-(1,7), "two".
  - `viwiw` extends over the following space: cursor (1,8).
  - `vaw` selects "two " (1,5)-(1,8).
  - `vaw` on the last word "three" takes the **leading** space: (1,8)-(1,13).
  - `vlliw` from (1,1), where start≠end, extends by one object to (1,4), the space.
  - Backwards: `vh iw` from (1,9) extends left to (1,5); `vb iw` → (1,4).
- **Mode changes.** `vip` and `vap` switch the mode to **linewise `V`**. `vip` on lines 1-3 → `V`, cursor (3,1). `vipy` gives a type `V` register. [T]
  - `Viw` switched linewise to **charwise `v`**. [T]
  - `CTRL-V iw` stays blockwise. [T]
- `vapap` extends by a further paragraph: cursor (6,1). [T]
- Block objects. [T]
  - `vi(` with the cursor on `b` in `f(a, (b), c)` selects just `b`.
  - `vi(i(` stays on `b`: after the first `i(` start==end, so the second is treated as a fresh selection.
  - `va(` → `(b)`.
  - `vit` in `<a><b>xy</b></a>` → `xy`; `vitit` → `<b>xy</b>`, one level out.
  - `vi"` → `hi there`; `va"` → `"hi there" ` (includes the trailing white space).
- Neovim adds the `al` object (whole buffer) and `il` (current line without leading/trailing white space). These are listed in news "since 0.12", i.e. unreleased HEAD. — [Neovim visual.txt](https://neovim.io/doc/user/visual.html), [Neovim news.txt](https://neovim.io/doc/user/news.html)

**`*` / `#` in Visual mode**
- In **Vim**, `*` in Visual mode is just the normal `*` motion. It searches the word under the cursor and **extends** the selection. [T]
  - On `foo bar foo baz foo`, `v*` from (1,1) moves the cursor to (1,9), and `y` yanks `"foo bar f"`.
  - `v#` moves backwards.
  - The Vim help suggests a mapping such as `:vmap X y/<C-R>"<CR>` to search for the selection. — [visual.txt #visual-search](https://vimhelp.org/visual.txt.html#visual-search)
- In **Neovim**, `{Visual}*` and `{Visual}#` are default mappings that "search forward/backward for the current selection". — [Neovim pattern.txt #v_star-default](https://neovim.io/doc/user/pattern.html#v_star-default), [vim_diff.txt default-mappings](https://neovim.io/doc/user/vim_diff.html#default-mappings)

**CTRL-A / CTRL-X / g CTRL-A / g CTRL-X** — [change.txt #v_CTRL-A](https://vimhelp.org/change.txt.html#v_CTRL-A)
- `{Visual}CTRL-A` adds [count] to the number in the highlighted text. `g CTRL-A` adds an extra [count] per line, creating a sequence.
- `vjCTRL-A` on `x 1 y 2` / `z 3` → `x 2 y 2` / `z 3`. [T]
  - Only the **first** number of each selected line is incremented, and only where the selection covers it. On line 2 the selection covered only col 1, so `3` was not touched.
- `Vj5CTRL-A` → `x 6 y 2` / `z 8`. [T]
- `Vjjjg CTRL-A` on four `1.` lines → `2.`, `3.`, `4.`, `5.`. With a count, `2g CTRL-A` → `3.`, `5.`, `7.`, `9.`. [T]
  - Note: the doc example starts at the second line and gets `1. 2. 3. 4.`. When all lines are selected, every line is incremented.
- `VjCTRL-X` on `10` / `10` → `9` / `9`. [T]
- A partial number is used as-is. `v` on the middle digit of `123` + CTRL-A → `133`: only the selected digits count as the number. [T]
- After the operation the cursor is at the selection start and the mode is Normal. [T]

**Other commands**
- `K` runs 'keywordprg' on the highlighted text. `CTRL-]` jumps to the highlighted tag. Both are in [index.txt](https://vimhelp.org/index.txt.html#visual-index).
- `zy` yanks without trailing whitespace of block lines. — [change.txt #v_zy](https://vimhelp.org/change.txt.html#v_zy)
- Neovim default `{Visual}@`: "repeats a register for all selected lines if the selection is linewise". — [Neovim visual.txt](https://neovim.io/doc/user/visual.html)
- Neovim default `gc` toggles comments. — [Neovim vim_diff.txt](https://neovim.io/doc/user/vim_diff.html#default-mappings)
- In Vim's Visual mode, `Q` "does not start Ex mode". — [index.txt](https://vimhelp.org/index.txt.html#visual-index)

### Inferences
- The cursor rule after charwise operators is "go to the start of the region". Then:
  - `c`/`s`: Insert mode starts there; after `<Esc>` the cursor is on the last inserted char.
  - `p`: the cursor ends on the last char of the put text.
  - `J`: the cursor is at the last join point.
  - `>`, `<`, `X`, `D` (linewise effect): the cursor is on the first non-blank of the first affected line.
- Register routing must replicate Vim's rules: small (within one line) deletes go to `"-`, others to `"1`..`"9` with a shift, yanks go to `"0`, and the type is stored with the text.

### Gaps
- I did not test `!{filter}` (external command), `K`, `CTRL-]` or `gw`. Their behavior here comes only from the docs.
- I did not test count + `CTRL-A` on hex, octal or alpha values ('nrformats').

---

## 4. Blockwise specifics (I, A, $A, c, C, s, d, D, X, Y, r, ~, >, <, J, y/p of blocks, o vs O)

### Takeaway
`I` inserts at the block's left column on every line that **reaches** the block; short lines are skipped. `A` appends after the block's right column, **padding short lines with spaces**. With `$`, `A` appends at each line's end. `c` replaces the block on every line, after Esc. Text is replicated to the other lines only when you press `<Esc>` (or `CTRL-C`) and only if no line break was typed. `d`/`x`/`X` delete the block, while `D`/`C` go to the end of each line. A block register has type `^V{width}` and is put as a rectangle starting at the cursor column; short or missing lines get padding, and new lines are appended at the buffer end.

### Cited Findings
**I** — [visual.txt #v_b_I](https://vimhelp.org/visual.txt.html#v_b_I)
- "I{string}<ESC> will insert {string} at the start of block on every line of the block, provided that the line extends into the block. Thus lines that are short will remain unmodified. TABs are split to retain visual columns. Works only for adding text to a line, not for deletions."
- `CTRL-V jjj IXX<Esc>` from (1,3) on B → `abXXcdefgh`, `abXXc`, `abXXcdefghij`, `abXXcdefgh`. Cursor (1,3), at the block start on the first line. [T]
- Short lines are skipped. A block at col 5 → `abcdXXefgh`, `abc` unchanged, `abcdXXefghij`, `abcdXXefgh`. [T]
- `CTRL-C` instead of `<Esc>` still replicated the text in this Vim 9.1 test. [T]
- A **count** repeats the text: `3IX` → `XXX` on every line. [T]
- `<BS>` and `<Left>` inside the insert are honored: `IXY<BS><Esc>` → `X`; `IXY<Left>Z<Esc>` → `XZY` on every line. [T]
- **A line break typed during `I` aborts the replication.** `IX<CR>Y<Esc>` only changed the first line (`abX` / `Ycdefgh`); the other lines were untouched. [T]
- Repeating `.` after a block `I` repeats the insert on a same-height block at the cursor: `CTRL-V jIZ<Esc>jj.` changes lines 3-4. [T]

**A** — [visual.txt #v_b_A](https://vimhelp.org/visual.txt.html#v_b_A)
- "1. Block was created with <C-v>$ — the string is appended to the end of each line. 2. Block was created with <C-v>{move-around} — the string is appended to the end of the block on each line, and whitespace is inserted to pad to the end-of-block column." And "I" and "A" behave differently for short lines on purpose.
- `CTRL-V jjjl AXX<Esc>` from (1,3), block cols 3-4 → `abcdXXefgh`, **`abc XX`** (padded), `abcdXXefghij`, `abcdXXefgh`. Cursor (1,3). [T]
- Block cols 5-6: line `abc` → `abc   XX`, padded to col 7. [T]
- `CTRL-V jjj $ AXX<Esc>` → `abcdefghXX`, `abcXX`, `abcdefghijXX`, `abcdefghXX`. [T]
- A count works: `2AX` → `XX`. [T]
- The help examples with tabs (ts=8, sw=4) are reproducible test vectors: `v_b_I_example`, `v_b_A_example`, `v_b_<_example`, `v_b_>_example`, `v_b_r_example`. — [visual.txt #blockwise-examples](https://vimhelp.org/visual.txt.html#blockwise-examples)

**c / s / C** — [visual.txt #v_b_c](https://vimhelp.org/visual.txt.html#v_b_c), [#v_b_C](https://vimhelp.org/visual.txt.html#v_b_C)
- "All selected text in the block will be replaced by the same text string … You can then enter text (without a line break). When you hit <Esc>, the same string is inserted in all previously selected lines." `C` is "Like using "c", but the selection is extended until the end of the line for all lines."
- `CTRL-V jjl cXY<Esc>` from (1,3) → `abXYefgh`, `abXY`, `abXYefghij`. Cursor (1,4). `""`=`"1`=`"cd\nc\ncd"` type `^V2`. [T]
- With short lines (block at cols 5-6), the short line `abc` is **not** changed. [T]
- `s` behaves the same as `c`. [T]
- `CTRL-V jjC XY<Esc>` → `abXY` ×3. Register `"cdefgh\nc\ncdefghij"` type `^V8`. [T]
- `CTRL-V jj$ cX<Esc>` behaves the same as `C`. [T]

**d / x / X / D / Y** — [change.txt #v_b_D](https://vimhelp.org/change.txt.html#v_X)
- `d`, `x` and `X` in block mode all delete the block (X is "whole lines when not using CTRL-V"). Example: `CTRL-V jjl d` → `abefgh`, `ab`, `abefghij`, cursor (1,3), register `^V2`. [T]
- `D`: "In Visual block mode, "D" deletes the highlighted text plus all text until the end of the line." `CTRL-V jjD` → `ab` ×3, cursor (1,2), type `^V8`. [T]
- `Y` in block mode yanks the **block**, not lines: `"cd\nc\ncd"`, type `^V2`. Cursor at the block's top-left. [T]
- `.` after a block `d` deletes a same-size block at the cursor. [T]

**y and the cursor**
- The cursor goes to the top-left corner whatever corner it was on. `CTRL-V khhy` from (3,5) → cursor (2,2), with `'<`=(2,2) and `'>`=(3,5). [T]

**p / P of a block register** — [change.txt #blockwise-register](https://vimhelp.org/change.txt.html#blockwise-register), [#blockwise-put](https://vimhelp.org/change.txt.html#blockwise-put)
- A blockwise register is "inserted before ("P") or after ("p") the cursor column in the current and next lines … the whole block of text start[s] in the same column".
- `CTRL-V jly` of `ab`/`ab`, then `p` at (1,1) → `aabbcdefgh`, `aabbc`; cursor (1,2). `P` → `ababcdefgh`, `ababc`; cursor (1,1). [T]
- Put past the end. `p` at the end of the last line of `ab`/`ab`/`ab` → `abab` and **a new line `  ab`**, padded with spaces to the column. [T]
- Put on the last line with fewer lines than the block: new lines are appended, padded. [T]

**p with a Visual block selection** — [change.txt #blockwise-put](https://vimhelp.org/change.txt.html#blockwise-put)
- "When a register contains text from one line (characterwise), using a blockwise Visual selection, putting that register will paste that text repeatedly in each of the selected lines". The doc example `aaavvaaa` → `aaaTEXTaaa` was reproduced exactly, with the cursor at (1,7). [T]
- A 1-char register over a 3-line block → each line's block replaced by `a`. [T]
- A block register over a block selection replaces it with the register block. The register's height counts, not the selection's: a 2-line register put over a 3-line selection changed 2 lines and deleted the block on the 3rd. [T]
- A linewise register over a block: the block is deleted and the lines are put **below**, as whole lines. [T]

**r in block** — [visual.txt #v_b_r](https://vimhelp.org/visual.txt.html#v_b_r)
- "Every screen char in the highlighted region is replaced with the same char, ie TABs are split and the virtual whitespace is replaced, maintaining screen layout."
- `CTRL-V jjjl rX` → `abXXefgh`, `abX` (the short line only up to its end), `abXXefghij`, `abXXefgh`. [T]
- `r<CR>` in a block **splits each line** and removes the block text. [T] Source: [ops.c op_replace](https://github.com/vim/vim/blob/master/src/ops.c)

**~ / u / U in block**
- These operate on the block only. Examples: `abCDefgh`, `abC`; `u` on `ABCD` cols 2-3 → `AbcD`. [T]

**> / < in block** — [visual.txt #v_b_>](https://vimhelp.org/visual.txt.html#v_b_%3E)
- "The block is shifted by 'shiftwidth'. The RHS of the block is irrelevant. The LHS of the block determines the point from which to apply a right shift … The LHS of the block determines the point up to which to shift left."
- `CTRL-V j>` at col 4 of `ab cd` → `ab\t   cd`, i.e. whitespace inserted at the block's left edge. [T]
- `<` on `ab     cd` at col 4 → `ab cd`. [T]

**J in block**
- Joins whole lines: `CTRL-V jJ` → `abcdefgh abc`. [T]

**o vs O**
- See section 1. `O` swaps the left and right columns on the same line; `o` swaps diagonally. — [visual.txt #v_O](https://vimhelp.org/visual.txt.html#v_O) [T]

### Inferences
- Block insert/append are implemented as: record the block (top line, left vcol, right vcol, `$`-flag), do a normal insert on the first line, and on `<Esc>` take the inserted string, as long as it has no newline and the insert stayed on the first line. Then insert it at the same virtual column on lines 2..n:
  - for `I`: skip lines shorter than the left column;
  - for `A`: pad lines shorter than right+1 with spaces;
  - for `$A`: append at each line's end.
- `c` is the same as delete-block followed by `I` semantics, except that short lines are skipped entirely.

### Gaps
- I did not test tab splitting inside blocks or 'virtualedit=block' in the harness. Use the help's `blockwise-examples` as golden vectors for those.
- `zp`/`zP` (put a block without trailing spaces) were only documented, not tested. — [change.txt](https://vimhelp.org/change.txt.html#blockwise-register)

---

## 5. Linewise specifics (V then d / y / p / J / > / < / =; register type)

### Takeaway
In `V` mode every operator works on whole lines and produces a `V`-type register whose text ends with `\n`. After `d`/`X`/`x`, the cursor lands on the first non-blank of the line that took the deleted lines' place. After `>`, `<` and `=`, it is the first non-blank of the first line. After `y`, the cursor goes to the first selected line, at column 1, unless the cursor end was the top end, in which case its column is kept.

### Cited Findings
- Source (do_pending_operator) for `V` mode: `oap->start = VIsual; if (VIsual_mode == 'V') { oap->start.col = 0; }`. Then "Set oap->start to the first position … w_cursor is equal to oap->start", and `if (VIsual_mode == 'V') oap->motion_type = MLINE`. — [Vim src/ops.c](https://github.com/vim/vim/blob/master/src/ops.c)
- This explains the yank cursor (observed): [T]
  - `Vy` at (2,5) → (2,1)
  - `Vjy` from (2,5) → (2,1)
  - `Vjky` → (2,1)
  - `VY` → (2,1)
  - but `Vky` from (2,5) → **(1,5)**, because the cursor was above the anchor.
- `Vd` on I line 1 → cursor (1,5), the first non-blank of `    gamma delta`. Register `"    alpha beta\n"` type `V`, in `"1` (not `"-`). [T]
- `Vjd` and `Vkd` give identical results. [T]
- Deleting the last lines (`Vkd` on lines 4-5) → the cursor goes to the new last line, (3,1). [T]
- `Vx`, `VX` and `VD` all delete lines. [T]
- `VJ` joins the selected lines, at least 2. `Vj>` / `Vk>` → cursor at the first non-blank of the top line. [T]
- Charwise `v` with `X D Y C S R` produces linewise results too (see section 3). — [visual.txt #visual-operators](https://vimhelp.org/visual.txt.html#visual-operators)
- `Vp` / `VP`, by register type of the put text: [T]
  - linewise: replaces the lines;
  - charwise: the replacement becomes its own line(s);
  - blockwise: the block rows become separate lines.
  - The replaced lines go to `""` and `"1` as `V` with `p`; nothing changes with `P`.
- Select mode exception: "When using an operator in Select mode, and the selection is linewise, the selected lines are operated upon, but like in characterwise selection. For example, when a whole line is deleted, it can later be pasted halfway a line." — [visual.txt #Select-mode](https://vimhelp.org/visual.txt.html#Select-mode)
- `'>` in linewise mode has col = MAXCOL (2147483647 from `getpos`) and `'<` has col 1. [T]

### Inferences
- An emulator should store the `V`-mode selection as whole lines and the register text with a trailing `\n` plus a `linewise` flag.
- Pasting a linewise register always creates new lines, even over a charwise selection, where it splits the line.

### Gaps
- I did not test `!` (filter) or `gq` with a count in `V` mode.

---

## 6. Marks '< '> / `< `> and the "." repeat of Visual operations

### Takeaway
`'<` and `'>` hold the start and end (sorted, not anchor/cursor) of the **last** Visual area in the buffer. They are set when Visual mode ends, by Esc or by an operator, not while it is active. `.` after a Visual operator in Vim reapplies it to a **same-size** region starting at the cursor; any count to `.` is ignored. Neovim HEAD changed `.` to a "semantic" replay.

### Cited Findings
**Marks**
- "'<  `<  To the first line or character of the last selected Visual area in the current buffer. For block mode it may also be the last character in the first line (to be able to define the block)." — [motion.txt #'<](https://vimhelp.org/motion.txt.html#%27%3C)
- "'>  `>  To the last line or character … For block mode it may also be the first character of the last line … Note that 'selection' applies, the position may be just after the Visual area." — [motion.txt #'>](https://vimhelp.org/motion.txt.html#%27%3E)
- `m<` / `m>` set them explicitly. — [motion.txt](https://vimhelp.org/motion.txt.html#m%3C)
- Observed: [T]
  - While still in Visual mode, `'<`/`'>` were still (0,0), i.e. unset/previous.
  - After `vkkl<Esc>` from (3,6): `'<`=(1,7), `'>`=(3,6). Sorted.
  - After `vkhd`, the marks are the original area (1,5)-(2,6) even though the text changed.
  - After `v$`: `'>`=(1,14), past the last char.
  - Linewise: `'<`=(line,1), `'>`=(line,MAXCOL).
  - `` `< `` jumps to (1,7); `'>` jumps to the first non-blank of line 3.
- Block mode stores corners. Example: `CTRL-V jjhh` from (1,5) gives `'<`=(1,5) and `'>`=(3,3), the upper-right and lower-left corners, as the doc describes. [T]
- Neovim: "An operator on a target that creates a Visual selection ("cgn") does not change '< '>." `gn` does not change them either, "so "cgn" with a /\%V pattern can be repeated". — [Neovim vim_diff.txt](https://neovim.io/doc/user/vim_diff.html), [Neovim visual.txt #gn](https://neovim.io/doc/user/visual.html#gn)

**Dot repeat (Vim)** — [visual.txt #visual-repeat](https://vimhelp.org/visual.txt.html#visual-repeat)
- "When repeating a Visual mode operator, the operator will be applied to the same amount of text as the last time: Linewise: same number of lines. Blockwise: same number of lines and columns. Normal Visual mode within one line: same number of characters. With several lines: same number of lines, in the last line the same number of characters as in the last line the last time. The start of the text is the Cursor position. If "$" was used … up to the rightmost column of the longest line. Any count passed to the . command is not used."
- Observed: [T]
  - `vlld` then `w.` deletes 3 chars at the cursor.
  - `viwd` (3-char word "one") then `w.` deletes 3 chars ("two"). It does **not** re-run `iw`.
  - `vld` then `3.` deleted 2 chars, so the count was ignored.
  - `Vjd .` deletes 2 more lines; `Vd 2.` deleted 1 line (count ignored).
  - `Vj> .` shifts the same 2 lines again; `V3> .` repeats the 3-level shift.
  - `vlcZ<Esc> w.` replaces 2 chars with `Z`.
  - Block `d` and block `I` repeat on a same-size block at the cursor.
  - `vjd .` repeats a 2-line region with the same last-line char count.
- Edge case: `v$hd` (7 chars) then `j.` on the 3-char line `abc` deleted `"abc\n"`. The region is clamped at the end of the line, newline included. [T]

**Dot repeat (Neovim HEAD)**
- "Repeating a Visual operation works "semantically": . replays the captured keysequence (Visual selection plus operator) at the cursor: "viwd" then "." deletes the word at the cursor, whatever its size."
- "A [count] given to "." is prepended to the replayed keys. If the selection was extended by a command that cannot be replayed (mouse, search, Ex command, scroll), or used gv … "." instead applies the operator to a same-size area, as if "1v" preceded it."
- Source: [Neovim visual.txt #visual-repeat](https://neovim.io/doc/user/visual.html#visual-repeat).
- This is listed under news "since 0.12", i.e. Neovim's unreleased HEAD/nightly; released Neovim 0.12 and older behave like Vim. — [Neovim news.txt](https://neovim.io/doc/user/news.html), [vim_diff.txt](https://neovim.io/doc/user/vim_diff.html)

### Inferences
- For 1:1 Vim behavior, store `{mode, lineCount, lastLineCharCount or colCount, curswantMAXCOL}` from the last Visual operation, and on `.` construct the region from the cursor. Do **not** re-run the text object.
- If the emulator targets "Neovim-like" behavior, choose explicitly: Neovim stable equals Vim, HEAD is semantic.

### Gaps
- I did not verify the Neovim HEAD semantics empirically (no nvim binary installed). The behavior comes from the docs only.

---

## 7. Select mode, mouse selection, and consolidated Neovim differences

### Takeaway
Select mode (`gh` / `gH` / `g CTRL-H`, or `CTRL-G` from Visual) looks like Visual mode, but a typed printable character replaces the selection and enters Insert mode. `CTRL-G` toggles between Visual and Select, and `CTRL-O` gives one Visual command. With `mouse=a` (set by defaults.vim in xterm-like terminals; Neovim default `nvi`), a left-button drag starts **Visual** mode (Select mode only if 'selectmode' contains `mouse`). A double click selects a word, a triple click a line, and a quadruple click a block.

### Cited Findings
**Select mode**
- How to enter it: mouse with 'selectmode' containing "mouse"; shifted special keys with "key"; v/V/CTRL-V with "cmd"; `gh`, `gH`, `g CTRL-H`; or `CTRL-G` from Visual. — [visual.txt #Select-mode](https://vimhelp.org/visual.txt.html#Select-mode)
- Commands:
  - printable characters, `<NL>` and `<CR>` delete the selection and enter Insert mode, inserting the char;
  - shifted non-printable movement keys extend the selection;
  - unshifted ones stop Select mode (with 'keymodel' "stopsel");
  - `<Esc>` stops it;
  - `CTRL-O` gives Visual mode for one command;
  - `CTRL-G` switches to Visual;
  - `CTRL-R {reg}` chooses the register for the deleted text.
  — [visual.txt #Select-mode](https://vimhelp.org/visual.txt.html#Select-mode)
- `<BS>` / `CTRL-H` in Select mode delete the selection. — [change.txt #v_<BS>](https://vimhelp.org/change.txt.html#v_%3CBS%3E)
- 'selectmode' default is `""`. — [options.txt #'selectmode'](https://vimhelp.org/options.txt.html#%27selectmode%27)
- Observed `mode()` values: `gh` → `s`, `gH` → `S`, `g CTRL-H` → `^S` (0x13). `vl CTRL-G` → `s`; a second `CTRL-G` → `v`. [T]
- Observed edits: [T]
  - `gh lll X <Esc>`: in Select mode `l` is printable, so it **replaced the selection** with `l`, then `llX` were inserted → `lllXne two three`. In Select mode, printable letters are text, not motions.
  - `ghll<BS>` deleted the selection and left the mode as Insert.
- Mode messages: `-- SELECT --`, `-- SELECT LINE --`, `-- SELECT BLOCK --`. — [src/screen.c](https://github.com/vim/vim/blob/master/src/screen.c)

**Mouse**
- `<LeftMouse>` sets the cursor and stops Visual mode, when 'mouse' contains `n` or `a`.
- `<RightMouse>` starts Visual mode, or moves the closest end of the selection to the click.
- `<LeftRelease>` after a drag works "like a <LeftMouse>, if it is not at the same position".
- `<A-LeftMouse>` starts or extends a blockwise selection.
- Source: [visual.txt #<LeftMouse>](https://vimhelp.org/visual.txt.html#%3CLeftMouse%3E)
- "Whether the selection that is started with the mouse is in Visual mode or Select mode depends on whether "mouse" is included in the 'selectmode' option." — [term.txt #mouse-using](https://vimhelp.org/term.txt.html#mouse-using)
- Mouse table ('mousemodel' "extend"): `<LeftDrag>` / `<LeftRelease>` "start or extend (1)", where (1) means "only if mouse pointer moved since press". `<A-RightMouse>` starts or extends blockwise. In "popup" mode, `<S-LeftMouse>` extends, `<A-LeftMouse>` does blockwise, and `<RightMouse>` opens a popup menu. — [term.txt #mouse-overview](https://vimhelp.org/term.txt.html#mouse-overview)
- Double click selects a word (or up to a `%` match), triple a line, quadruple a rectangular block. "Dragging the mouse with a double click … will result in whole words to be selected". — [term.txt #double-click](https://vimhelp.org/term.txt.html#double-click)
- In Insert mode, starting a mouse selection enters Normal mode temporarily (like `CTRL-O`) and returns to Insert when the selection ends. — [term.txt](https://vimhelp.org/term.txt.html#mouse-using)
- Defaults:
  - Vim's built-in 'mouse' is `""` (`"a"` in the GUI and Win32); defaults.vim sets `mouse=a` if `&term =~ 'xterm'`, else `nvi`. — [options.txt #'mouse'](https://vimhelp.org/options.txt.html#%27mouse%27), [defaults.vim](https://github.com/vim/vim/blob/master/runtime/defaults.vim)
  - Neovim: 'mouse' default `"nvi"`, 'mousemodel' default `"popup_setpos"`. — [Neovim options.txt](https://neovim.io/doc/user/options.html#%27mouse%27)

**Consolidated Neovim differences relevant to Visual mode** (from [vim_diff.txt](https://neovim.io/doc/user/vim_diff.html), [Neovim visual.txt](https://neovim.io/doc/user/visual.html), [pattern.txt](https://neovim.io/doc/user/pattern.html#v_star-default))
- Default mappings:
  - `{Visual}*` / `{Visual}#` search for the selection;
  - `{Visual}@` runs a macro on each line of a linewise selection;
  - `gc` comment toggle;
  - Normal-mode `Y` = `y$`, which does not affect Visual `Y`;
  - treesitter `v_an` / `v_in` and `]n` / `[n`.
- The Visual selection highlight includes the character at the cursor.
- ALT chords act as `<Esc>`+key when unmapped (`v_ALT`).
- The `gv` area and `'<` `'>` are not changed by operator-internal Visual selections (`cgn`, omap objects).
- HEAD only (news since 0.12): semantic `.` Visual repeat; `al` / `il` text objects; `Q` adds a multicursor.
- The core semantics of `v` / `V` / `CTRL-V`, o / O, I / A, block put, and the marks are documented identically in Neovim's visual.txt. A diff of the two files shows only wording and formatting changes outside the items above. (Diff performed on master copies of both files.)

### Inferences
- A web editor's mouse-drag selection should map to charwise Visual mode, since 'selectmode' does not contain mouse by default. Double/triple click should map to word/line Visual selections, and Alt-drag to block mode.
- Select mode is low priority for a Vim emulation, but `CTRL-G` toggling and "printable replaces" are easy to test.

### Gaps
- Mouse behavior was not testable in the headless harness. Everything about the mouse comes from the docs.
- I did not check the exact Neovim release in which `v_star-default` and `v_@-default` first appeared. They are present in current docs.
- I did not run Neovim itself. All Neovim statements come from its current master docs (fetched 2026-11-06), which may describe unreleased behavior where flagged.
