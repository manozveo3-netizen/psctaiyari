"""Regenerate Android launcher resources from the approved logo (Pillow required)."""
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[1]
source = ImageOps.exif_transpose(Image.open(root / 'branding/launcher-source.jpg')).convert('RGB')
res = root / 'launcher-res'
for density, scale in [('mdpi', 1), ('hdpi', 1.5), ('xhdpi', 2), ('xxhdpi', 3), ('xxxhdpi', 4)]:
    folder = res / ('mipmap-' + density)
    folder.mkdir(parents=True, exist_ok=True)
    # Preserve the entire supplied image and its aspect ratio, including the seal.
    size = round(48 * scale)
    legacy = ImageOps.pad(source, (size, size), method=Image.Resampling.LANCZOS, color='white')
    for name in ['ic_launcher', 'ic_launcher_round']:
        legacy.save(folder / (name + '.png'), optimize=True)
    # Android's 108dp adaptive canvas has a central 66dp guaranteed safe zone.
    size, safe = round(108 * scale), round(66 * scale)
    logo = ImageOps.contain(source, (safe, safe), Image.Resampling.LANCZOS)
    foreground = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    foreground.paste(logo, ((size-logo.width)//2, (size-logo.height)//2))
    foreground.save(folder / 'ic_launcher_foreground.png', optimize=True)
