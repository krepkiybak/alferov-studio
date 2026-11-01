"""One-time asset preparation: python scripts/prepare-assets.py <directory-with-originals>."""
from pathlib import Path
import re
import sys
from urllib.request import Request, urlopen
from PIL import Image, ImageOps

source = Path(sys.argv[1])
target = Path(__file__).resolve().parent.parent / 'dist' / 'assets'
target.mkdir(parents=True, exist_ok=True)
files = {
    'Молочная футболка с акварельным поездом.png': 'milk-express.webp',
    'Чёрная футболка с Хогвартс-экспрессом-1.png': 'black-express.webp',
    'Чёрная футболка с акварельным пером.png': 'leviosa.webp',
    'photo_5237823088785821513_x.jpg': 'igor.webp',
}
for original, output in files.items():
    with Image.open(source / original) as img:
        img = ImageOps.exif_transpose(img).convert('RGB')
        img.thumbnail((1440, 1440), Image.Resampling.LANCZOS)
        img.save(target / output, 'WEBP', quality=89, method=6)
        print(f'{output}: {img.width}x{img.height}, {(target / output).stat().st_size // 1024} KB')

css_url = 'https://fonts.googleapis.com/css2?family=Golos+Text:wght@400..900&display=swap'
request = Request(css_url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'})
css = urlopen(request, timeout=30).read().decode()
for subset in ('cyrillic', 'latin'):
    block = re.search(r'/\* ' + subset + r' \*/\s*(@font-face\s*\{.*?\})', css, re.S)
    if not block:
        raise RuntimeError(f'Font subset missing: {subset}')
    font_url = re.search(r'url\((.*?)\)', block.group(1)).group(1)
    font = urlopen(font_url, timeout=30).read()
    if not font.startswith(b'wOF2'):
        raise RuntimeError('Expected WOFF2 font')
    (target / f'golos-{subset}.woff2').write_bytes(font)
    print(f'golos-{subset}.woff2: {len(font) // 1024} KB')

license_url = 'https://raw.githubusercontent.com/google/fonts/main/ofl/golostext/OFL.txt'
(target / 'OFL.txt').write_bytes(urlopen(license_url, timeout=30).read())
