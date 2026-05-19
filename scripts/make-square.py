"""
make-square.py — приводит все PNG в edited/ к квадрату 1:1
Добавляет белые поля, продукт по центру, без обрезки

Запуск: python3 scripts/make-square.py
Один файл: python3 scripts/make-square.py edited/6502-B-19-blue-1.png
"""
import sys
import os
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
EDITED_DIR = ROOT / 'edited'

if len(sys.argv) > 1:
    files = [Path(sys.argv[1])]
else:
    files = sorted(EDITED_DIR.glob('*.png'))

print(f'\n🖼  make-square: {len(files)} file(s)\n')

ok = already = 0
for f in files:
    try:
        img = Image.open(f).convert('RGBA')
        w, h = img.size
        if w == h:
            already += 1
            continue

        size = max(w, h)
        canvas = Image.new('RGBA', (size, size), (255,255,255,255))
        canvas.paste(img, ((size-w)//2, (size-h)//2), img)

        result = Image.new('RGB', (size, size), (255,255,255))
        result.paste(canvas, mask=canvas.split()[3])
        result.save(f, 'PNG', optimize=True)
        print(f'  ✅ {f.name}: {w}x{h} → {size}x{size}')
        ok += 1
    except Exception as e:
        print(f'  ❌ {f.name}: {e}')

print(f'\n{"─"*50}')
print(f'✅ {ok} converted   ⏭  {already} already square\n')
