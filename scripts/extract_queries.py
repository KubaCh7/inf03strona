"""Wyciaga z arkuszy CKE: tresc zapytan SQL (z PDF) i zrzut bazy (.sql z archiwum).
Uzycie: python3 scripts/extract_queries.py <sciezka_do_klonu_repo_Chr1skyy> <katalog_wyjsciowy>
Wynik: <out>/queries.json (zadania + trudnosc) i <out>/dumps/<hash>.sql. Rozwiazan NIE zapisujemy."""
import hashlib, json, os, re, subprocess, sys, tempfile, zipfile

import py7zr
import zipfile_deflate64  # noqa: F401  (obsluga Deflate64 w zipfile)

REPO, OUT = sys.argv[1], sys.argv[2]
INDEX = json.load(open('data/raw/chr1skyy-data.json', encoding='utf-8'))
os.makedirs(os.path.join(OUT, 'dumps'), exist_ok=True)


def pdf_text(path):
    return subprocess.run(['pdftotext', '-layout', path, '-'], capture_output=True, text=True).stdout


def parse_tasks(text):
    tasks, cur, db = [], None, None
    m = re.search(r'na bazie\s+(?:danych\s+)?([\w_]+)', text)
    if m and m.group(1).lower() not in ('danych', 'mysql'):
        db = m.group(1)
    for ln in text.splitlines():
        s = ln.strip()
        mm = re.match(r'^[^\w\s]?\s*Zapytanie\s*(\d+)\s*[:.–-]\s*(.*)$', s, re.I)
        if mm:
            if cur: tasks.append(cur)
            cur = {'n': int(mm.group(1)), 'text': mm.group(2).strip()}
            continue
        if cur is None:
            continue
        if not s or re.match(r'^[^\w\s"„(]', s) or re.match(r'^(Strona \d+ z \d+|Więcej arkuszy)', s):
            tasks.append(cur); cur = None; continue
        cur['text'] += ' ' + s
    if cur: tasks.append(cur)
    seen, out = set(), []
    for t in tasks:
        t['text'] = re.sub(r'\s+', ' ', t['text']).strip()
        if t['n'] not in seen and len(t['text']) > 8:
            seen.add(t['n']); out.append(t)
    return out, db


def extract_sql(archive, password):
    files = {}
    with tempfile.TemporaryDirectory() as tmp:
        try:
            if archive.endswith('.7z'):
                with py7zr.SevenZipFile(archive, 'r', password=password) as z:
                    z.extractall(tmp)
            else:
                try:
                    with zipfile.ZipFile(archive) as z:
                        z.extractall(tmp, pwd=password.encode() if password else None)
                except NotImplementedError:
                    import pyzipper  # archiwa szyfrowane AES
                    with pyzipper.AESZipFile(archive) as z:
                        z.extractall(tmp, pwd=password.encode() if password else None)
        except Exception as e:
            return {}, str(e)[:80]
        for root, _, fs in os.walk(tmp):
            for f in fs:
                if f.lower().endswith('.sql'):
                    raw = open(os.path.join(root, f), 'rb').read()
                    for enc in ('utf-8', 'cp1250', 'latin2'):
                        try:
                            files[f] = raw.decode(enc); break
                        except UnicodeDecodeError:
                            pass
    return files, None


def solution_queries(folder):
    p = os.path.join(folder, 'rozwiazanie', 'kwerendy.txt')
    if not os.path.exists(p):
        return {}
    txt = open(p, encoding='utf-8', errors='replace').read()
    out = {}
    for m in re.finditer(r'(?m)^\s*(?:Zapytanie\s*)?(\d+)\s*[.):]\s*(.+?)(?=^\s*(?:Zapytanie\s*)?\d+\s*[.):]|\Z)', txt, re.S):
        out[int(m.group(1))] = m.group(2).strip()
    return out


def difficulty(sql, text):
    """1-10: liczone z rozwiazania (jesli jest) albo z tresci zadania."""
    s = (sql or '').upper()
    t = text.lower()
    score = 1
    if not s:
        s = ''
        if 'relacj' in t: s += ' JOIN '
        if 'zgrupowan' in t or 'dla każdego' in t: s += ' GROUP BY '
        if re.search(r'średni|sum|liczb|minimaln|maksymaln|najwięk|najmniej', t): s += ' COUNT( '
        if 'sortowan' in t or 'posortowan' in t: s += ' ORDER BY '
        if 'aktualizuj' in t or 'zmieniając' in t: s += ' UPDATE '
        if 'dodając' in t or 'wstawiając' in t: s += ' INSERT '
        if 'usuwając' in t: s += ' DELETE '
        if 'użytkownik' in t: s += ' CREATE USER '
        if 'uprawnie' in t: s += ' GRANT '
        if 'kolumn' in t and ('dodając' in t or 'dodające' in t): s += ' ALTER TABLE '
    if 'WHERE' in s: score += 1
    if ' AND ' in s or ' OR ' in s: score += 1
    if 'LIKE' in s or 'BETWEEN' in s or ' IN (' in s: score += 1
    if 'ORDER BY' in s: score += 1
    if re.search(r'\b(COUNT|SUM|AVG|MIN|MAX)\s*\(', s): score += 2
    if 'GROUP BY' in s: score += 2
    if 'HAVING' in s: score += 1
    if 'JOIN' in s or re.search(r'FROM\s+\w+\s*,\s*\w+', s): score += 3
    if s.count('SELECT') > 1: score += 2
    if 'UPDATE' in s or 'INSERT' in s or 'DELETE' in s: score += 1
    if 'ALTER TABLE' in s or 'CREATE TABLE' in s: score += 2
    if 'CREATE USER' in s or 'GRANT' in s: score += 1
    if 'CREATE VIEW' in s: score += 2
    return max(1, min(10, score))


def kind(sql, text):
    s = (sql or '').upper().strip()
    t = text.lower()
    if s.startswith('CREATE USER') or ('użytkownik' in t and 'utworz' in t) or 'tworzące użytkownika' in t: return 'user'
    if s.startswith('GRANT') or s.startswith('REVOKE') or 'uprawnie' in t: return 'grant'
    if s.startswith(('UPDATE', 'INSERT', 'DELETE', 'ALTER', 'CREATE', 'DROP', 'TRUNCATE')): return 'modify'
    if not s and re.search(r'aktualizuj|dodając|wstawiając|usuwając|zmieniając|dodające|tworzące', t): return 'modify'
    return 'select'


result, dumps, stats = [], {}, {'sheets': 0, 'tasks': 0, 'nodump': [], 'notasks': []}
for r in INDEX:
    folder = os.path.join(REPO, r['links']['mainFolder'].lstrip('/'))
    pdf = os.path.join(folder, r['links']['examSheet'])
    if not os.path.exists(pdf):
        stats['notasks'].append(r['codeName']); continue
    tasks, db = parse_tasks(pdf_text(pdf))
    if not tasks:
        stats['notasks'].append(r['codeName']); continue
    arch = os.path.join(folder, r['links']['archive']) if r['links'].get('archive') else None
    sqls, err = extract_sql(arch, r.get('archive_password') or '') if arch and os.path.exists(arch) else ({}, 'brak archiwum')
    dump_id = None
    if sqls:
        # najwiekszy plik .sql = zrzut bazy
        name, body = max(sqls.items(), key=lambda kv: len(kv[1]))
        dump_id = hashlib.sha1(body.encode()).hexdigest()[:12]
        if dump_id not in dumps:
            open(os.path.join(OUT, 'dumps', dump_id + '.sql'), 'w', encoding='utf-8').write(body)
            dumps[dump_id] = name
    else:
        stats['nodump'].append(f"{r['codeName']} ({err})")
    sol = solution_queries(folder)
    items = []
    for t in tasks:
        q = sol.get(t['n'])
        items.append({'n': t['n'], 'text': t['text'], 'difficulty': difficulty(q, t['text']), 'kind': kind(q, t['text']), 'hasSolution': q is not None})
    result.append({'code': r['codeName'], 'db': (dumps.get(dump_id) or '').rsplit('.', 1)[0] or db, 'dump': dump_id, 'dumpName': dumps.get(dump_id), 'solutionPath': r['links']['mainFolder'] + '/' + (r['links'].get('solution') or 'rozwiazanie') + '/kwerendy.txt', 'tasks': items})
    stats['sheets'] += 1; stats['tasks'] += len(items)

json.dump(result, open(os.path.join(OUT, 'queries.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print(json.dumps({k: (v if not isinstance(v, list) else len(v)) for k, v in stats.items()}), 'dumps:', len(dumps))
print('bez zrzutu:', stats['nodump'][:12])
print('bez zadan:', stats['notasks'][:12])
