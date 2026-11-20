// Przeniesienie pracy z warsztatu na pulpit egzaminacyjny (tryb realistyczny).
import { Vfs, HTDOCS, join, dropAttempt } from './vfs';
import { MysqlServer } from './mysqlServer';

export type ExportOpts = {
  attempt: string;
  files?: Record<string, string>;   // pliki tekstowe z warsztatu -> C:\xampp\htdocs
  images?: Record<string, string>;  // grafiki (data URL) -> C:\xampp\htdocs
  db?: { name: string; sql: string } | null; // gotowa baza w MySQL
  wipe?: boolean;                   // wyczysc wczesniejszy stan pulpitu tej proby
};

export async function exportToVm(o: ExportOpts) {
  if (o.wipe) await dropAttempt(o.attempt);
  const v = new Vfs(`vfs:${o.attempt}`); await v.load();
  for (const [n, t] of Object.entries(o.files ?? {})) v.write(join(HTDOCS, n.replace(/\\/g, '/')), t);
  for (const [n, d] of Object.entries(o.images ?? {})) v.write(join(HTDOCS, n.replace(/\\/g, '/')), d, true);
  v.flush();
  if (o.db) {
    const s = new MysqlServer(`mysql:${o.attempt}`); await s.load();
    if (!s.get(o.db.name)) await s.create(o.db.name, 'utf8mb4_unicode_ci');
    s.importSql(o.db.name, o.db.sql);
    await s.save();
  }
}
