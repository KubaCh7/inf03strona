import { PRACTICE } from '../../src/data/practice.ts';
import { parseHTML } from 'linkedom';
const by: Record<string, number> = {};
let bad = 0;
for (const t of PRACTICE) {
  by[t.topic] = (by[t.topic] ?? 0) + 1;
  const html = t.solution['index.html'] ?? Object.values(t.solution).find((v) => v.includes('<')) ?? '';
  const { document } = parseHTML(html);
  for (const c of t.checks) {
    let ok = false;
    if (c.kind === 'regex') ok = new RegExp(c.pattern, c.flags ?? '').test(t.solution[c.file] ?? '');
    else if (c.kind === 'dom') {
      let els: Element[] = []; try { els = Array.from(document.querySelectorAll(c.selector)); } catch (e) { console.log('BADSEL', t.id, c.selector); }
      const m = c.textIncludes ? els.filter((e) => e.textContent?.toLowerCase().includes(c.textIncludes!.toLowerCase())) : els;
      ok = m.length >= (c.min ?? 1);
    }
    if (!ok) { bad++; console.log('FAIL', t.id, c.label); }
  }
  // starter nie moze juz przechodzic wszystkich testow
  const sh = t.starter['index.html'] ?? '';
  const sd = parseHTML(sh).document;
  const passAll = t.checks.every((c) => c.kind === 'regex' ? new RegExp(c.pattern, c.flags ?? '').test(t.starter[c.file] ?? '') : (() => { try { return sd.querySelectorAll(c.selector).length >= (c.min ?? 1); } catch { return false; } })());
  if (passAll) console.log('STARTER PASSES', t.id);
}
console.log(by, 'fails:', bad, 'ids unique:', new Set(PRACTICE.map((t) => t.id)).size === PRACTICE.length);
