"""Wyciaga z PDF-ow arkuszy INF.03 wymagania do sprawdzarki (jak egzaminator):
zrzuty ekranu (nazwy + format), wymagane pliki, grafiki (wymiary, przezroczystosc, GIF, czas klatki),
kolory z sekcji CSS, teksty w cudzyslowach z opisu witryny, numer zdajacego w stopce
oraz ilustracje wygladu strony (public/sheets/<slug>/_wyglad*.jpg).
Wynik: src/data/sheet_reqs.json. Uzycie: python3 scripts/extract_reqs.py [katalog_cache_pdf]"""
import hashlib, json, os, re, subprocess, sys, tempfile, urllib.request

SHEETS = [s for s in json.load(open('src/data/sheets.json', encoding='utf-8')) if s['qualification'] == 'INF.03']
ASSETS = json.load(open('data/sheet_assets.json', encoding='utf-8'))
CACHE = sys.argv[1] if len(sys.argv) > 1 else '/tmp/inf03-pdfs'
os.makedirs(CACHE, exist_ok=True)

CSS_COLORS = 'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray grey green greenyellow honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen'.split()
POLISH_COLORS = {'biał': 'white', 'czarn': 'black'}
IMG = r'[\w\-]+\.(?:png|jpe?g|gif|webp|svg|bmp|ico)'
PAGE = r'[\w\-]+\.(?:html|php|css|js|txt)'
BUL = re.compile(r'^\s*[−‒–•\-]\s+', re.M)


def fetch(url):
    p = os.path.join(CACHE, hashlib.sha1(url.encode()).hexdigest()[:16] + '.pdf')
    if not os.path.exists(p):
        urllib.request.urlretrieve(url, p)
    return p


def text_of(pdf, layout=True):
    return subprocess.run(['pdftotext'] + (['-layout'] if layout else []) + [pdf, '-'], capture_output=True, text=True).stdout


def items(txt):
    """Punkty listy (wypunktowania) jako pojedyncze zdania, z polaczonymi liniami."""
    flat = re.sub(r'Strona \d+ z \d+', ' ', txt)
    parts = BUL.split(flat)
    return [re.sub(r'\s+', ' ', p).strip() for p in parts if p.strip()]


def section(txt, start, ends):
    m = re.search(start, txt, re.I | re.M)
    if not m: return ''
    rest = txt[m.start():]
    e = [x.start() for x in (re.search(p, rest[20:], re.I | re.M) for p in ends) if x]
    return rest[: min(e) + 20] if e else rest


NAME_STOP = {'zrzut', 'zrzuty', 'zapisz', 'nie', 'powinien', 'powinny', 'w', 'oraz', 'i', 'na', 'pod', 'z', 'format', 'formacie'}


def shots(txt):
    out, seen = [], set()
    for it in items(txt):
        if not re.search(r'zrzut', it, re.I): continue
        fmt = re.search(r'format(?:ie|u)?\s+(PNG|JPEG|JPG|GIF)', it, re.I)
        fmt = fmt.group(1).lower().replace('jpeg', 'jpg') if fmt else None
        whole = bool(re.search(r'ca[łl]y ekran|ca[łl]ego ekranu|nie kadruj', it, re.I))
        for m in re.finditer(r'nazw(?:ą|ami|ie|y|ach)\s+((?:[\w\-]+(?:\.(?:png|jpe?g))?(?:,\s*|\s+i\s+|\s+oraz\s+|\s*)){1,8})', it, re.I):
            for raw in re.split(r',\s*|\s+i\s+|\s+oraz\s+|\s+', m.group(1)):
                n = raw.strip(' .,;:„”"')
                if not n or n.lower() in NAME_STOP or not re.match(r'^[\w\-]+(\.(png|jpe?g))?$', n, re.I): break
                if out and not re.search(r'\d|_|import|klatk|parametr|przegl', n, re.I) and not re.search(r'nazw\w*\s+' + re.escape(n), it): break
                if re.match(r'^(numer|zdaj|należy|nadaj|im|odpowiednio|kolejno)', n, re.I): continue
                base, ext = (n.rsplit('.', 1) + [None])[:2] if '.' in n else (n, None)
                ext = (ext or fmt or 'png').lower().replace('jpeg', 'jpg')
                if base.lower() in seen: continue
                seen.add(base.lower())
                out.append({'name': base, 'ext': ext, 'whole': whole, 'import': 'import' in base.lower()})
    return out


def graphics(txt, archive):
    """Sekcja o przygotowaniu grafiki/animacji: nazwy, wymiary, przezroczystosc, GIF."""
    sec = section(txt, r'^\s*(Przygotowanie grafik|Grafika|Operacje na grafice|Obróbka grafiki|Grafiki|Animacja|Wytyczne dotyczące (animacji|grafiki)|Przygotuj grafik|Wykonaj grafik|Przygotowanie animacji|Grafika na stronę)',
                  [r'^\s*(Cechy witryny|Witryna internetowa|Operacje na bazie|Styl CSS|Skrypt|Wygląd witryny|Witryna)'])
    if not sec: return []
    out = []
    full = re.sub(r'\s+', ' ', sec)
    parts = [x for x in re.split(r'(?=Przygotowanie (?:grafiki|animacji|obrazu)|Przygotuj (?:grafik|animac)|Wykonaj (?:grafik|animac))', full) if re.search(IMG, x)]
    for t in parts or [full]:
        g = one_graphic(t, archive)
        if g and (g['out'] or g['w'] or g['h']): out.append(g)
    return out


def one_graphic(t, archive):
    names = [n for n in dict.fromkeys(re.findall(IMG, t, re.I))]
    w = re.search(r'szeroko\w*\s*(?:grafiki|obrazu|obrazów)?\s*(?:dokładnie\s*)?(?:do\s*)?(\d{2,4})\s*px', t, re.I)
    h = re.search(r'wysoko\w*\s*(?:grafiki|obrazu|obrazów)?\s*(?:dokładnie\s*)?(?:do\s*)?(\d{2,4})\s*px', t, re.I)
    wh = re.search(r'(\d{2,4})\s*[x×]\s*(\d{2,4})\s*px', t)
    keep = bool(re.search(r'nie należy zmieniać', t, re.I))
    g = {
        'text': t.strip()[:900],
        'names': names,
        'w': int(w.group(1)) if w else (int(wh.group(1)) if wh else None),
        'h': int(h.group(1)) if h else (int(wh.group(2)) if wh else None),
        'ratio': bool(re.search(r'zachowaniem proporcji', t, re.I)),
        'transparent': bool(re.search(r'przezroczyst', t, re.I)) and not keep,
        'gif': bool(re.search(r'animac|\.gif|GIF', t)),
        'delay': int(m.group(1)) if (m := re.search(r'(\d{2,5})\s*ms', t)) else None,
        'loop': bool(re.search(r'zapętl|w pętli|nieskończon|powtarza', t, re.I)),
    }
    if keep: g['transparent'] = bool(re.search(r'przezroczyst', t, re.I))
    outs = [n for n in names if n not in archive]
    gif = [n for n in names if n.lower().endswith('.gif')]
    g['out'] = gif[0] if g['gif'] and gif else (outs[0] if outs else (names[0] if names else None))
    if g['out'] and g['out'].lower().endswith('.gif'): g['gif'] = True
    if g['ratio'] and g['w'] and g['h'] and not re.search(r'dokładnie|wykadr', t, re.I):
        # "do wysokosci 200 px z zachowaniem proporcji" -> tylko jeden wymiar wymagany
        if re.search(r'do\s+wysoko', t, re.I): g['w'] = None
        elif re.search(r'do\s+szeroko', t, re.I): g['h'] = None
    return g


def site_section(txt):
    m = re.search(r'^\s*(Witryna internetowa|Cechy witryny|Wygląd witryny|Witryna|Cechy wspólne)', txt, re.M)
    s = txt[m.start():] if m else txt
    e = re.search(r'^\s*(Styl CSS|Formatowanie CSS|Plik(?:i)? styl|Arkusz styl)', s, re.M)
    return s[: e.start()] if e else s


def css_section(txt):
    m = re.search(r'^\s*(Styl CSS|Formatowanie CSS|Plik(?:i)? styl|Arkusz styl\w* CSS)', txt, re.M)
    if not m: return ''
    s = txt[m.start():]
    e = re.search(r'^\s*(Skrypt|Skrypty|Działanie skryptu|Zarządzanie|UWAGA)', s[10:], re.M)
    return s[: e.start() + 10] if e else s


def colors(css):
    t = re.sub(r'\s+', ' ', css)
    out = [c.lower() for c in re.findall(r'#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b', t)]
    for w in re.findall(r'\b[A-Za-z]{3,22}\b', t):
        if w.lower() in CSS_COLORS and (w[0].isupper() or len(w) > 5): out.append(w.lower())
    return list(dict.fromkeys(out))


def quotes(site):
    t = re.sub(r'\s+', ' ', site)
    out = []
    for q in re.findall(r'„([^”"]{1,120})[”"]', t):
        q = q.strip()
        if not q or '<' in q or len(q) < 2: continue
        if re.search(r'\.(png|jpe?g|gif|php|html|css|js)$', q, re.I): continue
        out.append(q)
    return list(dict.fromkeys(out))[:40]


def final_list(txt):
    """Koncowa lista z arkusza: 'W folderze z numerem ... powinny znajdowac sie pliki: a, b, c, ewentualnie inne'."""
    t = re.sub(r'\s+', ' ', txt)
    m = re.search(r'W folderze[^.]{0,160}?(?:powinn[oay]|należy)[^:]{0,80}pliki:\s*(.+?)(?:,?\s*ewentualnie|\.\s+Po nagraniu|\.\s+Nagraj)', t)
    if not m: return [], 0
    names = [x.strip(' .') for x in m.group(1).split(',')]
    n = re.search(r'(\d+)\s+plik\w*\s+z\s+grafik', t[max(0, m.start() - 40): m.end()])
    return [x for x in names if re.match(r'^[\w\-ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+\.\w{2,4}$', x)], int(n.group(1)) if n else 0


def appearance(pdf, code, dest_dir):
    """Strony PDF z ilustracja wygladu witryny -> najwiekszy obraz z tej strony jako JPG."""
    raw = text_of(pdf, layout=False)
    pages = raw.split('\f')
    hits = []
    for i, p in enumerate(pages):
        for m in re.finditer(r'(?:Ilustracja|Obraz)\s*(\d+)\.\s*([^\n]{0,120})', p):
            cap = m.group(2)
            if re.search(r'wygląd|strona|witryn|podstron|widok', cap, re.I) and not re.search(r'baz[ay]|tabel|układ bloków|relac|animac|klatk|grafik|logo|przed|po kadrowaniu|obraz\b', cap, re.I):
                hits.append((i + 1, int(m.group(1)), cap.strip()))
    if not hits: return []
    out = []
    with tempfile.TemporaryDirectory() as tmp:
        for page, num, cap in hits[:3]:
            subprocess.run(['pdfimages', '-f', str(page), '-l', str(page), '-png', pdf, os.path.join(tmp, f'p{page}')], capture_output=True)
            imgs = sorted((os.path.join(tmp, f) for f in os.listdir(tmp) if f.startswith(f'p{page}-')), key=os.path.getsize, reverse=True)
            if not imgs: continue
            best = imgs[0]
            dims = subprocess.run(['python3', '-c', f'from PIL import Image;i=Image.open({best!r});print(i.size[0],i.size[1])'], capture_output=True, text=True).stdout.split()
            if not dims or int(dims[0]) < 300: continue
            name = f'_wyglad{len(out) + 1}.jpg'
            from PIL import Image
            im = Image.open(best).convert('RGB')
            if im.width > 1000: im = im.resize((1000, round(im.height * 1000 / im.width)))
            im.save(os.path.join(dest_dir, name), 'JPEG', quality=72, optimize=True)
            for f in imgs: os.remove(f)
            out.append({'file': name, 'caption': f'Ilustracja {num}. {cap}'})
    return out


res = {}
for s in SHEETS:
    code = s['code']
    try:
        pdf = fetch(s['files']['pdfRaw'])
        txt = text_of(pdf)
        a = ASSETS.get(code, {'dir': None, 'files': []})
        archive = a.get('files', [])
        sh = shots(txt)
        site = site_section(txt)
        fl, ngraf = final_list(txt)
        if fl:
            # z listy koncowej: obrazy z nazwa zrzutu (kw1, import, zad1...) to zrzuty, z rozszerzeniem z listy
            known = {x['name'].lower(): x for x in sh}
            sh2 = []
            for f in fl:
                base, ext = f.rsplit('.', 1)
                if not re.match(r'^(png|jpe?g|gif|bmp)$', ext, re.I): continue
                if base.lower() in known or re.match(r'^(kw\d|kwerenda\d|zad\d|import|parametr|klatk|dane$|zrzut)', base, re.I):
                    k = known.get(base.lower(), {'whole': True})
                    sh2.append({'name': base, 'ext': ext.lower().replace('jpeg', 'jpg'), 'whole': k.get('whole', True), 'import': bool(re.match(r'^(import|zad1$|dane$)', base, re.I))})
            sh = sh2
        r = {
            'shots': sh,
            'files': fl,
            'graphicsCount': ngraf,
            'graphics': graphics(txt, archive),
            'colors': colors(css_section(txt)),
            'quotes': quotes(site),
            'author': bool(re.search(r'numer zdającego', site)),
            'looks': [],
        }
        if a.get('dir'):
            dest = 'public' + a['dir']; os.makedirs(dest, exist_ok=True)
            r['looks'] = appearance(pdf, code, dest)
        res[code] = r
        print(code, '| zrzuty', ','.join(x['name'] + '.' + x['ext'] for x in sh), '| pliki', ','.join(r['files']), r['graphicsCount'], '| graf', [(g['out'], g['w'], g['h'], g['gif'], g['delay'], g['transparent']) for g in r['graphics']], '| kolory', len(r['colors']), '| teksty', len(r['quotes']), '| wyglad', len(r['looks']), flush=True)
    except Exception as e:
        print(code, 'BLAD', e, file=sys.stderr, flush=True)
json.dump(res, open('src/data/sheet_reqs.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('arkuszy', len(res))
