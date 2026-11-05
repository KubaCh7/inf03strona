const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' });
/** Data YYYY-MM-DD w strefie Europe/Warsaw */
export const today = (d: Date = new Date()) => fmt.format(d);
export const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const mmss = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); const m = Math.floor(s / 60); return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
export const weekStart = (iso: string) => { const d = new Date(iso + 'T12:00:00Z'); const wd = (d.getUTCDay() + 6) % 7; return addDays(iso, -wd); };
