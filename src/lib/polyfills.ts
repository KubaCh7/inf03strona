/* Latki dla starszych przegladarek (np. Safari < 17.4), potrzebne pdf.js. */
/* eslint-disable @typescript-eslint/no-explicit-any */
const P = Promise as any;
if (typeof P.withResolvers !== 'function') {
  P.withResolvers = function () { let resolve: any, reject: any; const promise = new Promise((res, rej) => { resolve = res; reject = rej; }); return { promise, resolve, reject }; };
}
if (typeof P.try !== 'function') {
  P.try = function (fn: (...a: unknown[]) => unknown, ...args: unknown[]) { return new Promise((res) => res(fn(...args))); };
}
const MP = Map.prototype as any;
if (typeof MP.getOrInsert !== 'function') MP.getOrInsert = function (k: unknown, v: unknown) { if (!this.has(k)) this.set(k, v); return this.get(k); };
if (typeof MP.getOrInsertComputed !== 'function') MP.getOrInsertComputed = function (k: unknown, f: (k: unknown) => unknown) { if (!this.has(k)) this.set(k, f(k)); return this.get(k); };
const WMP = WeakMap.prototype as any;
if (typeof WMP.getOrInsertComputed !== 'function') WMP.getOrInsertComputed = function (k: object, f: (k: object) => unknown) { if (!this.has(k)) this.set(k, f(k)); return this.get(k); };
const U8 = Uint8Array as any;
if (typeof U8.prototype.toHex !== 'function') U8.prototype.toHex = function () { return Array.from(this as Uint8Array, (b) => b.toString(16).padStart(2, '0')).join(''); };
if (typeof U8.prototype.toBase64 !== 'function') U8.prototype.toBase64 = function () { let s = ''; for (const b of this as Uint8Array) s += String.fromCharCode(b); return btoa(s); };
if (typeof U8.fromBase64 !== 'function') U8.fromBase64 = function (str: string) { const bin = atob(str); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; };
const RS = (globalThis as any).ReadableStream;
if (RS && !RS.prototype[Symbol.asyncIterator]) {
  RS.prototype[Symbol.asyncIterator] = async function* () { const r = this.getReader(); try { while (true) { const { done, value } = await r.read(); if (done) return; yield value; } } finally { r.releaseLock(); } };
}
if (typeof (Array as any).fromAsync !== 'function') {
  (Array as any).fromAsync = async function (it: any) { const out = []; for await (const x of it) out.push(x); return out; };
}
export {};
