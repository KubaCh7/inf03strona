"""Pobiera archiwa arkuszy (pliki do zadania) i wyciaga z nich grafiki/media oraz zrzut bazy .sql.
Wynik: public/sheets/<slug>/<plik> + data/sheet_assets.json { code: { dir, files: [...], sql: nazwa|null } }.
Uzycie: python3 scripts/extract_assets.py"""
import hashlib, json, os, sys, tempfile, urllib.request, zipfile
import py7zr

SHEETS = json.load(open('src/data/sheets.json', encoding='utf-8'))
OUT = 'public/sheets'
CACHE = os.environ.get('ARCH_CACHE', '/tmp/inf03-archives')
MAX = 2_500_000  # pojedynczy plik
MEDIA = ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico', '.mp4', '.webm', '.ogg', '.mp3', '.wav', '.txt', '.csv', '.json', '.js', '.css', '.html', '.htm')
os.makedirs(OUT, exist_ok=True); os.makedirs(CACHE, exist_ok=True)

def fetch(url):
    p = os.path.join(CACHE, hashlib.sha1(url.encode()).hexdigest()[:16] + os.path.splitext(url)[1])
    if not os.path.exists(p):
        urllib.request.urlretrieve(url, p)
    return p

def extract(arch, pw, dest):
    if arch.endswith('.7z'):
        with py7zr.SevenZipFile(arch, 'r', password=pw) as z: z.extractall(dest)
    else:
        try:
            with zipfile.ZipFile(arch) as z: z.extractall(dest, pwd=pw.encode() if pw else None)
        except (RuntimeError, NotImplementedError, zipfile.BadZipFile):
            import pyzipper
            with pyzipper.AESZipFile(arch) as z: z.extractall(dest, pwd=pw.encode() if pw else None)

result, total = {}, 0
for s in SHEETS:
    code, f = s['code'], s['files']
    slug = hashlib.sha1(code.encode()).hexdigest()[:10]
    try:
        arch = fetch(f['archiveUrl'])
        with tempfile.TemporaryDirectory() as tmp:
            extract(arch, f.get('archivePassword'), tmp)
            dest = os.path.join(OUT, slug); os.makedirs(dest, exist_ok=True)
            files, sql = [], None
            for root, _, names in os.walk(tmp):
                for n in sorted(names):
                    src = os.path.join(root, n); low = n.lower(); size = os.path.getsize(src)
                    if '__MACOSX' in root or n.startswith('.'): continue
                    if low.endswith('.sql'):
                        if sql is None or size > os.path.getsize(os.path.join(dest, sql)):
                            open(os.path.join(dest, n), 'wb').write(open(src, 'rb').read()); sql = n
                        continue
                    if low.endswith(MEDIA) and size <= MAX and n not in files:
                        open(os.path.join(dest, n), 'wb').write(open(src, 'rb').read()); files.append(n); total += size
            result[code] = {'dir': f'/sheets/{slug}', 'files': files, 'sql': sql}
            print(f'{code}: {len(files)} plikow, sql={sql}', flush=True)
    except Exception as e:
        print(f'{code}: BLAD {e}', file=sys.stderr, flush=True)
json.dump(result, open('data/sheet_assets.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('razem', len(result), 'arkuszy', round(total / 1e6, 1), 'MB')
