"""Wyciaga pytania z opublikowanych arkuszy pisemnych CKE (E.14, EE.09) + klucze odpowiedzi.

Uzycie: python3 scripts/extract_theory.py <katalog_z_pdf> <katalog_wyjsciowy>
  <katalog_z_pdf> zawiera pary: <x>-pisemny.pdf i <x>-pisemny-odpowiedzi.pdf (np. z arkusze.pl)
Wynik: <out>/cke_questions.json oraz <out>/img/<id>.webp (wyciete fragmenty z rysunkami/kodem).
Arkusze bez warstwy tekstowej (skany 2014-2017) sa czytane przez OCR (tesseract, jezyk pol).
"""
import glob, hashlib, html, io, json, os, re, subprocess, sys, tempfile
from PIL import Image

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(os.path.join(OUT, 'img'), exist_ok=True)
DPI = 130

NOISE = re.compile(r'^(Więcej arkuszy|Strona \d+ z \d+|Układ graficzny|© CKE|Arkusz zawiera|chronione do momentu|Wypełnia|Numer PESEL|Miejsce na naklejk|Czas trwania|EGZAMIN|Nazwa kwalifikacji|Oznaczenie|Wersja arkusza|Instrukcja dla|Powodzenia|Numer zadania|PODSTAWA PROGRAMOWA|Rok \d{4}|CZĘŚĆ PISEMNA|Godzina|Zadania egzaminacyjne)', re.I)


def lines_from_bbox(pdf):
    """Linie tekstu z pozycjami (w punktach PDF) z pdftotext -bbox-layout."""
    with tempfile.NamedTemporaryFile(suffix='.html') as t:
        subprocess.run(['pdftotext', '-bbox-layout', pdf, t.name], check=True)
        data = open(t.name, encoding='utf-8').read()
    out, pages = [], []
    for pi, pm in enumerate(re.finditer(r'<page width="([\d.]+)" height="([\d.]+)">(.*?)</page>', data, re.S)):
        pages.append((float(pm.group(1)), float(pm.group(2))))
        for lm in re.finditer(r'<line xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</line>', pm.group(3), re.S):
            words = re.findall(r'<word xMin="([\d.]+)" yMin="[\d.]+" xMax="([\d.]+)" yMax="[\d.]+">(.*?)</word>', lm.group(5))
            if not words:
                continue
            # odtworz odstepy miedzy kolumnami (duza przerwa = dwie spacje+)
            txt, last = '', None
            for x0, x1, w in words:
                x0, x1 = float(x0), float(x1)
                if last is not None:
                    txt += '    ' if x0 - last > 18 else ' '
                txt += html.unescape(w)
                last = x1
            out.append({'p': pi + 1, 'x0': float(lm.group(1)), 'y0': float(lm.group(2)), 'x1': float(lm.group(3)), 'y1': float(lm.group(4)), 't': txt})
    return out, pages, 72.0


def lines_from_ocr(pdf):
    """Dla skanow: OCR stron (tesseract TSV), linie z pozycjami w pikselach przy 300 dpi."""
    out, pages = [], []
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(['pdftoppm', '-r', '300', '-gray', '-png', pdf, os.path.join(tmp, 'p')], check=True)
        for i, png in enumerate(sorted(glob.glob(os.path.join(tmp, 'p-*.png')))):
            im = Image.open(png)
            pages.append(im.size)
            tsv = subprocess.run(['tesseract', png, '-', '-l', 'pol', '--psm', '4', 'tsv'], capture_output=True, text=True).stdout
            rows = [r.split('\t') for r in tsv.splitlines()[1:]]
            groups = {}
            for r in rows:
                if len(r) < 12 or r[0] != '5' or not r[11].strip():
                    continue
                key = (r[2], r[3], r[4])
                groups.setdefault(key, []).append((int(r[6]), int(r[7]), int(r[8]), int(r[9]), r[11]))
            for ws in groups.values():
                ws.sort()
                txt, last = '', None
                for x, y, w, h, s in ws:
                    if last is not None:
                        txt += '    ' if x - last > 75 else ' '
                    txt += s
                    last = x + w
                out.append({'p': i + 1, 'x0': min(w[0] for w in ws), 'y0': min(w[1] for w in ws), 'x1': max(w[0] + w[2] for w in ws), 'y1': max(w[1] + w[3] for w in ws), 't': txt})
    out.sort(key=lambda l: (l['p'], l['y0'], l['x0']))
    return out, pages, 300.0


ANS_SPLIT = re.compile(r'(?:^|\s{2,})([A-D])[.)]\s+')
FIG_WORDS = re.compile(r'rysun|obraz|przedstawion|zamieszczon|ilustracj|schemat|zrzut|okn[oa]|listing|Kod \d|Kształt|na podstawie|poniższ|zaprezentowan|widocz|tabel[ia]|diagram|symbol|ikon|grafik|fragment|zapis|kodu|skryptu|wyniku działania|w wyniku|efekt', re.I)


def parse(lines):
    qs, cur = [], None
    for l in lines:
        t = l['t'].strip()
        if not t or NOISE.match(t):
            continue
        m = re.match(r'^Zadanie\s*(\d{1,2})\s*[.,:]?\s*(.*)$', t)
        if m and 1 <= int(m.group(1)) <= 40:
            if cur:
                qs.append(cur)
            cur = {'n': int(m.group(1)), 'lines': [], 'start': l}
            if m.group(2).strip():
                cur['lines'].append(dict(l, t=m.group(2)))
            continue
        if cur:
            cur['lines'].append(dict(l, t=t))
    if cur:
        qs.append(cur)
    result = []
    for q in qs:
        stem, answers, cur_ans, first_ans_line = [], {}, None, None
        for l in q['lines']:
            parts = ANS_SPLIT.split(l['t'])
            if len(parts) > 1 and (parts[0].strip() == '' or cur_ans):
                if first_ans_line is None:
                    first_ans_line = l
                if parts[0].strip() and cur_ans:
                    answers[cur_ans] += ' ' + parts[0].strip()
                for i in range(1, len(parts), 2):
                    cur_ans = parts[i]
                    answers[cur_ans] = parts[i + 1].strip()
            elif cur_ans:
                if len(l['t']) < 140:
                    answers[cur_ans] += ' ' + l['t'].strip()
            else:
                stem.append(l)
        result.append({'n': q['n'], 'start': q['start'], 'stem': stem, 'answers': answers, 'first_ans': first_ans_line, 'all': q['lines']})
    return result


def crop(pdf, q, pages, unit, full=False):
    """Wycina z arkusza fragment pytania (od 'Zadanie N.' do odpowiedzi) jako WebP."""
    s = q['start']
    page = s['p']
    end_line = None
    if not full and q['first_ans'] is not None and q['first_ans']['p'] == page:
        end_y = q['first_ans']['y0'] - 2 * unit / 72
    else:
        same = [l for l in q['all'] if l['p'] == page]
        end_y = (max(l['y1'] for l in same) if same else s['y1']) + 4 * unit / 72
    top = s['y1'] + 1 * unit / 72
    if end_y - top < 12 * unit / 72:
        return None
    pw, ph = pages[page - 1]
    sc = DPI / unit
    x, y, w, h = int(40 * unit / 72 * sc), int(top * sc), int((pw - 40 * unit / 72 - 30 * unit / 72) * sc), int((end_y - top) * sc)
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(['pdftoppm', '-r', str(DPI), '-f', str(page), '-l', str(page), '-x', str(x), '-y', str(y), '-W', str(w), '-H', str(h), '-gray', '-png', pdf, os.path.join(tmp, 'c')], check=True)
        f = glob.glob(os.path.join(tmp, 'c*.png'))[0]
        im = Image.open(f).convert('L')
    # przytnij biale marginesy
    inv = Image.eval(im, lambda v: 255 - v)
    bb = inv.point(lambda v: 255 if v > 30 else 0).getbbox()
    if not bb:
        return None
    im = im.crop((max(0, bb[0] - 8), max(0, bb[1] - 6), min(im.width, bb[2] + 8), min(im.height, bb[3] + 6)))
    if im.height < 18:
        return None
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=72, method=6)
    return buf.getvalue()


def key_for(pdf_odp):
    txt = subprocess.run(['pdftotext', '-layout', pdf_odp, '-'], capture_output=True, text=True).stdout
    if len(txt.strip()) < 80:
        with tempfile.TemporaryDirectory() as tmp:
            subprocess.run(['pdftoppm', '-r', '300', '-gray', '-png', pdf_odp, os.path.join(tmp, 'k')], check=True)
            txt = '\n'.join(subprocess.run(['tesseract', p, '-', '-l', 'pol', '--psm', '6'], capture_output=True, text=True).stdout for p in sorted(glob.glob(os.path.join(tmp, 'k-*.png'))))
    key = {}
    for m in re.finditer(r'(?<!\d)(\d{1,2})\s+([ABCD])(?![A-Za-z])', txt):
        n = int(m.group(1))
        if 1 <= n <= 40 and n not in key:
            key[n] = m.group(2)
    return key


def clean(s):
    s = re.sub(r'\s{2,}', ' ', s).strip()
    s = re.sub(r'\s+([.,;:?])', r'\1', s)
    return s


CAT_RULES = [
    ('bhp', r'BHP|porażen|ergonom|stanowisk\w* (komputerow|prac)|monitor\w* ekranow|gaśnic|pożar|pierwsz\w* pomoc|przerw\w* w pracy|kręgosłup|oczu|ochron\w* (przeciw|oczu)'),
    ('angielski', r'\b(the|is|of|and|which|what|you|your|when|error|warning)\b.*\b(the|is|of|and)\b|tłumaczen|po angielsku|w języku angielskim|termin(?:em)? „[A-Za-z ]+”'),
    ('kompetencje', r'zespoł|komunikac|asertyw|konflikt|stres|motywac|negocjac|burz\w* mózgów|SMART|zarządzani\w* czasem|kreatywn|empati|etyk|przedsiębiorcz|klient\w* (niezadowol|skarg)'),
    ('bazy', r'\bSQL\b|SELECT|INSERT|UPDATE|DELETE|ALTER|CREATE|GRANT|REVOKE|JOIN|GROUP BY|kwerend|tabel\w* (bazy|w bazie)|baz\w* danych|klucz\w* (główn|obc|podstaw)|relacj|normaliz|indeks|MySQL|MariaDB|phpMyAdmin|rekord|transakcj|DBMS|SZBD|widok|wyzwalacz|procedur\w* składowan|postaci normalnej|mysqldump'),
    ('aplikacje', r'PHP|\$_|mysqli|echo|JavaScript|\bJS\b|var |let |function|document\.|getElementById|innerHTML|zdarzen|pętl|tablic|zmienn|funkcj|C\+\+|algorytm|sortowan|rekurenc|obiekt|klas[ay]? |kompilator|interpreter|debug|zmiennoprzecink|typ\w* danych|operator|instrukcj|skrypt|framework|biblioteka|jQuery|AJAX|JSON|cookie|ciasteczk|sesj'),
    ('strony', r'HTML|CSS|znacznik|selektor|atrybut|<[a-z]+|witryn|stron\w* (internetow|WWW)|przeglądark|W3C|walidac|responsyw|margin|padding|border|font|kolor|style?|formularz|hiperłącz|link|CMS|SEO|meta|favicon|DOCTYPE'),
    ('podstawy', r'grafik|obraz|piksel|rozdzielczo|RGB|CMYK|JPEG|PNG|GIF|SVG|kompresj|dźwięk|wideo|MP3|multimedi|licencj|prawo autorsk|GNU|freeware|shareware|kopi\w* zapasow|protokół|HTTP|FTP|DNS|serwer|domena|port|IP|sieć|hosting|przeglądark|format pliku|kodowani|UTF|ASCII|system\w* liczbow|binarn|szesnastkow'),
]


def category(text):
    for cat, rx in CAT_RULES:
        if re.search(rx, text, re.I if cat != 'angielski' else 0):
            return cat
    return 'podstawy'


def norm(s):
    return re.sub(r'[^0-9a-ząćęłńóśźż]+', '', s.lower())


all_q, by_norm, stats = [], {}, []
for pdf in sorted(glob.glob(os.path.join(SRC, '*-pisemny.pdf'))):
    base = os.path.basename(pdf).replace('-egzamin-zawodowy-pisemny.pdf', '')
    m = re.match(r'(e14|ee09|inf03)-(\d{4})-(\w+)', base)
    qual = {'e14': 'E.14', 'ee09': 'EE.09', 'inf03': 'INF.03'}[m.group(1)]
    session = f'{qual} {m.group(3)} {m.group(2)}'
    odp = pdf.replace('-pisemny.pdf', '-pisemny-odpowiedzi.pdf')
    key = key_for(odp) if os.path.exists(odp) else {}
    txt_len = len(subprocess.run(['pdftotext', pdf, '-'], capture_output=True, text=True).stdout)
    scanned = txt_len < 2000
    lines, pages, unit = (lines_from_ocr(pdf) if scanned else lines_from_bbox(pdf))
    parsed = parse(lines)
    ok = 0
    for q in parsed:
        if q['n'] not in key:
            continue
        stem_txt = clean(' '.join(l['t'] for l in q['stem']))
        answers = {k: clean(v) for k, v in q['answers'].items()}
        if not stem_txt or len(answers) < 4 and not scanned:
            continue
        letters = ['A', 'B', 'C', 'D']
        ans_list = [answers.get(k, '') for k in letters]
        FIGREF = r'(Kształt|Kod|Rysunek|Obraz|Ilustracja|Schemat|Wykres|Tabela|Zapis|Listing|Grafika|Okno|Formularz|Strona|Wynik)\s*\d+\.?'
        weak_answers = any(len(a) < 1 for a in ans_list) or sum(1 for a in ans_list if re.match(FIGREF, a or '')) >= 2
        if weak_answers:
            ans_list = [re.match(FIGREF, a).group(0) if re.match(FIGREF, a or '') else a for a in ans_list]
        indented = sum(1 for l in q['stem'] if (l['x0'] / unit * 72) > 75)
        gaps = 0
        st = sorted(q['stem'], key=lambda l: (l['p'], l['y0']))
        for a, b in zip(st, st[1:]):
            if a['p'] == b['p'] and (b['y0'] - a['y1']) / unit * 72 > 26:
                gaps += 1
        first_gap = st and q['start']['p'] == st[0]['p'] and (st[0]['y0'] - q['start']['y1']) / unit * 72 > 26
        needs_fig = scanned or weak_answers or indented >= 2 or gaps > 0 or first_gap or bool(re.search(r'Kształt \d|Kod \d|na rysunku|na obrazie|przedstawion\w* na|zamieszczon\w*|na ilustracji|na schemacie|na zrzucie', stem_txt))
        img = crop(pdf, q, pages, unit, full=(weak_answers or scanned)) if needs_fig else None
        qid = hashlib.sha1((norm(stem_txt) + '|' + '|'.join(sorted(norm(a) for a in ans_list))).encode()).hexdigest()[:12]
        correct = letters.index(key[q['n']])
        nk = norm(stem_txt)[:160] + '|' + '|'.join(sorted(norm(a) for a in ans_list))
        if nk in by_norm:
            by_norm[nk]['sources'].append(session)
            continue
        if img:
            open(os.path.join(OUT, 'img', qid + '.webp'), 'wb').write(img)
        item = {
            'id': 'c' + qid, 'category': category(stem_txt + ' ' + ' '.join(ans_list)), 'text': stem_txt,
            'answers': [a if a else f'Odpowiedź {letters[i]}' for i, a in enumerate(ans_list)], 'correct': correct,
            'explanation': None, 'source': 'cke', 'sources': [session], 'image': ('/q/' + 'c' + qid + '.webp') if img else None,
            'ocr': scanned, 'imageAnswers': bool(img) and (weak_answers or scanned),
        }
        if img:
            os.rename(os.path.join(OUT, 'img', qid + '.webp'), os.path.join(OUT, 'img', 'c' + qid + '.webp'))
        by_norm[nk] = item
        all_q.append(item)
        ok += 1
    stats.append(f'{session}: {len(parsed)} znalezionych, {len(key)} w kluczu, {ok} nowych{" (OCR)" if scanned else ""}')

json.dump(all_q, open(os.path.join(OUT, 'cke_questions.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print('\n'.join(stats))
print('RAZEM unikalnych:', len(all_q), 'z obrazkiem:', sum(1 for q in all_q if q['image']))
from collections import Counter
print(Counter(q['category'] for q in all_q))
