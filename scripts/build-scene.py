#!/usr/bin/env python3
"""Сборка полотна главной сцены.

Три исходные иллюстрации из reference/ склеиваются в одно вертикальное полотно
(1600px по ширине), из него вырезается спрайт кораблика, дырка на его месте
затягивается морем. Готовое полотно режется на слайсы (для ленивой загрузки)
и жмётся в AVIF+WebP. Координаты для оверлеев уезжают в manifest.json.

Запуск: python3 scripts/build-scene.py
"""
import json
import os
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(ROOT, 'reference')
OUT = os.path.join(ROOT, 'public', 'scene')

SRC = [
    'hf_20260826_083613_8e38e8c5-0c53-44d0-ab70-211bb99b9b16.png',  # фасад
    'hf_20260826_095012_c13fcf6b-996c-433b-8a40-bce3c7ff87b0.png',  # двор
    'hf_20260826_103956_99daa37c-2ab2-40d9-b90d-0561c18e4f45.png',  # море
]

W = 1600            # ширина полотна
FADE_AB = 200       # растворение фасада во двор: земля переходит в брусчатку
FADE_BC = 110       # растворение двора в пляж
CROP_C = 780        # у третьей картинки срезаем дубликат лежака и лишний песок
WARP_DX = -8        # тропинка на стыке B/C не совпадала по x — доводим сдвигом
WARP_LEN = 700      # длина затухания сдвига
SLICES = 6

# Лимон берём прямо из исходной иллюстрации, а не рисуем отдельной иконкой.
# Это правый лимон рядом с лежаком в третьем исходнике.
LEMON_BOX = (395, 135, 510, 235)

# исходные точки тропинки (в координатах своих картинок), снятые трассировкой
PATH_B = [[754.6, 935], [771.5, 1018], [769.9, 1101], [660.0, 1184], [715.1, 1267],
          [862.2, 1350], [856.5, 1433], [796.7, 1516], [805.9, 1600], [902.4, 1683],
          [979.8, 1766], [980.0, 1849], [953.4, 1932], [995.2, 2015], [1060.8, 2098],
          [1036.5, 2181], [1007.8, 2265], [1054.6, 2348], [1117.6, 2431], [1133.0, 2514],
          [1114.7, 2597], [1077.7, 2680], [1037.3, 2763], [1005.3, 2847]]
PATH_C = [[1082.9, 276], [1139.0, 354], [1182.3, 432], [1179.3, 511], [1154.0, 589],
          [1137.0, 668], [1107.6, 746], [1066.9, 825], [1029.7, 903], [1014.7, 982],
          [995.7, 1060], [974.2, 1139]]

# кораблик в координатах третьей картинки
BOAT_BOX = (606, 1222, 1004, 1668)
BOAT_FILL_DX = 380  # откуда берём чистое море, чтобы затянуть дырку


def smoothstep(t):
    return t * t * (3 - 2 * t)


def warp_shift(i):
    """Горизонтальный сдвиг строки i у третьей картинки."""
    t = min(1.0, i / WARP_LEN)
    return WARP_DX * (1 - smoothstep(t))


def load(name):
    im = Image.open(os.path.join(REF, name)).convert('RGB')
    if im.width != W:
        im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
    return im


def warp_rows(im):
    """Сдвигаем верхние строки по x, чтобы тропинка сошлась на стыке."""
    a = np.asarray(im).copy()
    for i in range(min(WARP_LEN, a.shape[0])):
        dx = int(round(warp_shift(i)))
        if dx == 0:
            continue
        row = a[i]
        a[i] = np.roll(row, dx, axis=0)
        if dx < 0:
            a[i, dx:] = row[-1]
        else:
            a[i, :dx] = row[0]
    return Image.fromarray(a)


def blend_paste(canvas, im, top, fade, transition=None):
    """Вклеиваем im в canvas на y=top с линейным растворением верхних fade строк."""
    a = np.asarray(canvas, dtype=np.float32)
    b = np.asarray(im, dtype=np.float32)
    h = b.shape[0]
    alpha = np.ones((h, 1, 1), dtype=np.float32)
    if transition is None:
        alpha[:fade, 0, 0] = np.linspace(0, 1, fade)
    else:
        # На стыке двор/пляж обе картинки содержат одну и ту же дорожку,
        # но с немного разной перспективой. Длинный crossfade показывал оба
        # пунктира одновременно. Оставляем тот же нахлёст, но переключаемся
        # между кадрами на коротком мягком шве.
        transition = min(transition, fade)
        # Начинаем переход сразу у верхнего края нахлёста: там геометрия
        # дорожки в двух исходниках совпадает лучше всего.
        start = 0
        alpha[:start, 0, 0] = 0
        alpha[start:start + transition, 0, 0] = np.linspace(0, 1, transition)
        alpha[start + transition:fade, 0, 0] = 1
    a[top:top + h] = a[top:top + h] * (1 - alpha) + b * alpha
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def keep_blobs(mask, min_area=3000):
    """Оставляем только крупные связные области — мелкие блики моря выкидываем."""
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    out = np.zeros_like(mask, dtype=bool)
    for sy in range(h):
        for sx in range(w):
            if not mask[sy, sx] or seen[sy, sx]:
                continue
            stack = [(sy, sx)]
            seen[sy, sx] = True
            blob = []
            while stack:
                y, x = stack.pop()
                blob.append((y, x))
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
            if len(blob) >= min_area:
                for y, x in blob:
                    out[y, x] = True
    return out


def largest_blob(mask):
    """Оставляем один самый большой связный объект."""
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    largest = []
    for sy, sx in zip(*np.where(mask)):
        if seen[sy, sx]:
            continue
        stack = [(sy, sx)]
        seen[sy, sx] = True
        blob = []
        while stack:
            y, x = stack.pop()
            blob.append((y, x))
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        if len(blob) > len(largest):
            largest = blob

    out = np.zeros_like(mask, dtype=bool)
    for y, x in largest:
        out[y, x] = True
    return out


def cut_lemon(im, box):
    """Вырезаем настоящий нарисованный лимон из третьего исходника."""
    patch = np.asarray(im.crop(box))
    # Ярко-жёлтая мякоть — надёжный seed; тень под фруктом другого оттенка
    # и в крупнейшую связную область не попадает.
    yellow = ((patch[:, :, 0] > 175) & (patch[:, :, 1] > 175) &
              (patch[:, :, 2] < 130))
    seed = largest_blob(yellow)
    near = np.asarray(
        Image.fromarray((seed * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(17))) > 0
    dark_outline = patch.max(axis=2) < 150
    mask = seed | (near & dark_outline)
    alpha = (Image.fromarray((mask * 255).astype(np.uint8))
             .filter(ImageFilter.MaxFilter(3))
             .filter(ImageFilter.GaussianBlur(0.65)))
    sprite = Image.fromarray(
        np.dstack([patch, np.asarray(alpha)]).astype(np.uint8), 'RGBA')
    bounds = sprite.getchannel('A').getbbox()
    pad = 4
    return sprite.crop((max(0, bounds[0] - pad), max(0, bounds[1] - pad),
                        min(sprite.width, bounds[2] + pad), min(sprite.height, bounds[3] + pad)))


def cut_boat(canvas, box):
    """Вырезаем кораблик по маске «тёплое на голубом» и затягиваем море."""
    x0, y0, x1, y1 = box
    a = np.asarray(canvas).astype(np.int16)
    patch = a[y0:y1, x0:x1]
    # море — насыщенный циан (R сильно меньше B), парус/корпус/пена — тёплые и белые
    mask = keep_blobs((patch[:, :, 0] - patch[:, :, 2]) > -70)
    m = Image.fromarray((mask * 255).astype(np.uint8))
    m = m.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(3))
    m = m.filter(ImageFilter.GaussianBlur(1.2))
    alpha = np.asarray(m).astype(np.float32) / 255.0

    sprite = Image.fromarray(
        np.dstack([patch.astype(np.uint8), (alpha * 255).astype(np.uint8)]), 'RGBA')

    # дырка: построчно тянем цвет от левого края бокса к правому и слегка
    # размываем заплатку по вертикали — иначе одна яркая строка воды
    # растягивается в прямую полосу через всё пятно.
    a = a.astype(np.float32)
    left = a[y0:y1, x0 - 12:x0].mean(axis=1)
    right = a[y0:y1, x1:x1 + 12].mean(axis=1)
    t = np.linspace(0, 1, x1 - x0, dtype=np.float32)[None, :, None]
    fill = left[:, None, :] * (1 - t) + right[:, None, :] * t
    fill = np.stack([
        np.asarray(Image.fromarray(fill[:, :, c].astype(np.uint8))
                   .filter(ImageFilter.GaussianBlur(9)), dtype=np.float32)
        for c in range(3)
    ], axis=-1)

    # мягкие поля по всем четырём краям бокса, чтобы заплатка не имела границы
    def ramp(n, pad):
        return np.clip(np.minimum(np.arange(n), n - 1 - np.arange(n)) / pad, 0, 1)

    mask = (ramp(y1 - y0, 26)[:, None] * ramp(x1 - x0, 16)[None, :]).astype(np.float32)
    a[y0:y1, x0:x1] = a[y0:y1, x0:x1] * (1 - mask[:, :, None]) + fill * mask[:, :, None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)), sprite


def save_variants(im, base, widths, has_alpha=False):
    out = []
    for w in widths:
        if w > im.width:
            continue
        r = im if w == im.width else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        avif = f'{base}-{w}.avif'
        webp = f'{base}-{w}.webp'
        r.save(os.path.join(OUT, avif), quality=58, speed=4)
        r.save(os.path.join(OUT, webp), quality=78, method=6)
        out.append({'w': w, 'avif': avif, 'webp': webp})
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    a, b, c = (load(n) for n in SRC)
    lemon = cut_lemon(c, LEMON_BOX)
    c = warp_rows(c.crop((0, CROP_C, W, c.height)))

    top_b = a.height - FADE_AB
    top_c = top_b + b.height - FADE_BC
    height = top_c + c.height

    canvas = Image.new('RGB', (W, height), (247, 236, 214))
    canvas.paste(a, (0, 0))
    canvas = blend_paste(canvas, b, top_b, FADE_AB)
    canvas = blend_paste(canvas, c, top_c, FADE_BC, transition=12)

    # кораблик: координаты бокса переводим из третьей картинки в полотно
    bx0, by0, bx1, by1 = BOAT_BOX
    box = (bx0, top_c + by0 - CROP_C, bx1, top_c + by1 - CROP_C)
    canvas, boat = cut_boat(canvas, box)

    # тропинка одной ломаной в координатах полотна
    path = [[x, top_b + y] for x, y in PATH_B if y < b.height - FADE_BC / 2]
    path += [[x + warp_shift(y - CROP_C), top_c + y - CROP_C]
             for x, y in PATH_C if y > CROP_C]

    # слайсы с перекрытием в 1px — чтобы между ними не было волосяной щели
    bounds = [round(height * i / SLICES) for i in range(SLICES + 1)]
    slices = []
    for i in range(SLICES):
        y0, y1 = bounds[i], bounds[i + 1]
        part = canvas.crop((0, y0, W, y1 + (1 if i < SLICES - 1 else 0)))
        slices.append({
            'y': y0, 'h': part.height,
            'srcs': save_variants(part, f'panel-{i + 1}', (800, 1200, 1600)),
        })

    boat_srcs = save_variants(boat, 'boat', (boat.width,), has_alpha=True)
    lemon_name = 'lemon.webp'
    lemon.save(os.path.join(OUT, lemon_name), lossless=True, method=6)

    manifest = {
        'width': W, 'height': height,
        'slices': slices,
        'boat': {'x': box[0], 'y': box[1], 'w': boat.width, 'h': boat.height, 'srcs': boat_srcs},
        'lemon': {'w': lemon.width, 'h': lemon.height, 'src': lemon_name},
        'path': [[round(x, 1), round(y, 1)] for x, y in path],
        'marks': {
            'facadeBottom': a.height,
            'courtyardTop': top_b,
            'beachTop': top_c,
        },
    }
    # манифест лежит в src — его импортирует компонент сцены
    with open(os.path.join(ROOT, 'src', 'lib', 'scene-manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=1)

    print(f'полотно {W}x{height}, слайсов {SLICES}')
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print(f'итого в public/scene: {total / 1024 / 1024:.2f} MB')


if __name__ == '__main__':
    main()
