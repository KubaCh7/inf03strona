// Grafiki dodane w warsztacie (GIF, PNG, JPG…) zapisywane w IndexedDB per warsztat, jako data: URL.
// data: URL dziala w sandboxowanym podgladzie (blob: jest tam blokowany).
const DB = 'pracownia03-assets';
const STORE = 'assets';

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export async function loadAssets(key: string): Promise<Record<string, string>> {
  try {
    const db = await open();
    return await new Promise((res) => {
      const q = db.transaction(STORE).objectStore(STORE).get(key);
      q.onsuccess = () => res((q.result as Record<string, string>) ?? {});
      q.onerror = () => res({});
    });
  } catch { return {}; }
}

export async function saveAssets(key: string, assets: Record<string, string>) {
  try {
    const db = await open();
    await new Promise<void>((res) => {
      const tx = db.transaction(STORE, 'readwrite');
      if (Object.keys(assets).length) tx.objectStore(STORE).put(assets, key); else tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => res(); tx.onerror = () => res();
    });
  } catch { /* prywatne okno itp. – zostaje tylko w pamieci */ }
}

export const readAsDataUrl = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result));
  r.onerror = () => rej(r.error);
  r.readAsDataURL(f);
});

/** Podmienia odwolania do dodanych plikow w HTML/CSS podgladu: "a.gif", './a.gif', img/a.gif, url(a.gif). */
export function inlineAssets(doc: string, assets: Record<string, string>) {
  let d = doc;
  for (const [name, url] of Object.entries(assets)) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // w cudzyslowie / apostrofie, z dowolna sciezka wzgledna przed nazwa
    d = d.replace(new RegExp(`(["'])(?:\\./)?(?:[\\w\\-./]*/)?${esc}\\1`, 'g'), (_m, q) => `${q}${url}${q}`);
    // url(a.gif) bez cudzyslowow w CSS
    d = d.replace(new RegExp(`url\\(\\s*(?:\\./)?(?:[\\w\\-./]*/)?${esc}\\s*\\)`, 'g'), `url(${url})`); // bez cudzyslowow: dziala tez w atrybucie style="..."
  }
  return d;
}
