"""Indeks plikow rozwiazan (tylko nazwy) z repo Chr1skyy dla INF.03: src/data/solution_files.json.
Tresc pobiera przegladarka z raw.githubusercontent (nie kopiujemy rozwiazan do aplikacji).
Uzycie: python3 scripts/index_solutions.py <sciezka_do_sklonowanego_repo>"""
import json, os, sys
repo = sys.argv[1]
out = {}
for s in json.load(open('src/data/sheets.json', encoding='utf-8')):
    u = s['files'].get('solutionUrl') or ''
    if s['qualification'] != 'INF.03' or '/tree/main/' not in u: continue
    path = u.split('/tree/main/')[1]
    base = os.path.join(repo, path)
    if not os.path.isdir(base): continue
    files = []
    for root, _, names in os.walk(base):
        for n in sorted(names):
            if n.lower().endswith(('.html', '.htm', '.php', '.css', '.js', '.txt')):
                files.append(os.path.relpath(os.path.join(root, n), base).replace(os.sep, '/'))
    out[s['code']] = {'path': path, 'files': sorted(files)}
json.dump(out, open('src/data/solution_files.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'arkuszy')
