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
SLICES = 6

# Стык двор/пляж: тропинка нарисована на двух исходниках по-разному — у пляжа
# она на 19.6px правее и на пятую часть шире (102px против 85px). Сдвигом это
# не свести, поэтому пляж локально подтягиваем к двору: сдвиг и сжатие по
# горизонтали вокруг оси тропинки, затухающие и вниз по строкам, и вбок по x.
# Цифры сняты замером краёв тропинки по обе стороны шва.
SEAM_DX = -19.6     # насколько тропинка пляжа правее тропинки двора на шве
SEAM_SCALE = 0.83   # во сколько раз её надо сузить, чтобы совпала по ширине
SEAM_RAMP = 220     # за сколько строк подгонка сходит на нет
SEAM_R0 = 130.0     # ближе этого к оси тропинки правка полная
SEAM_R1 = 520.0     # дальше этого её нет совсем: песок остаётся нетронутым
SEAM_CX = 1059.9    # ось тропинки пляжа на шве, в координатах полотна
SEAM_CK = -0.433    # её наклон, пикселей на строку

# Лимон берём прямо из исходной иллюстрации, а не рисуем отдельной иконкой.
# Это правый лимон рядом с лежаком в третьем исходнике.
LEMON_BOX = (395, 135, 510, 235)

# Тропинка одной ломаной сразу в координатах готового полотна: она снята
# трассировкой со склеенного холста, а не с исходников. Поэтому её не надо
# сшивать из двух картинок и доводить сдвигом — но и пересчитывать её придётся
# заново, если поменяются исходники, FADE_* или CROP_C.
PATH_CANVAS = [
    [629.9, 3140.0], [631.7, 3164.0], [650.6, 3183.0], [784.5, 3237.0], [817.3, 3261.0],
    [815.2, 3275.0], [800.4, 3286.0], [646.7, 3355.0], [609.3, 3383.0], [603.7, 3404.0],
    [625.5, 3424.0], [666.7, 3445.0], [832.8, 3508.0], [863.6, 3526.0], [879.2, 3543.0],
    [882.9, 3564.0], [879.1, 3589.0], [795.8, 3706.0], [787.0, 3733.0], [787.9, 3760.0],
    [797.2, 3783.0], [817.0, 3808.0], [942.1, 3906.0], [967.2, 3933.0], [981.5, 3958.0],
    [988.4, 3996.0], [953.6, 4097.0], [952.9, 4147.0], [971.7, 4182.0], [1053.8, 4266.0],
    [1062.7, 4286.0], [1066.4, 4315.0], [1061.4, 4339.0], [1005.9, 4431.0], [1006.3,
    4460.0], [1029.0, 4506.0], [1115.7, 4609.0], [1136.8, 4663.0], [1136.2, 4699.0],
    [1124.0, 4749.0], [1021.6, 4990.0], [922.4, 5345.0],
]

# кораблик в координатах третьей картинки
BOAT_BOX = (606, 1222, 1004, 1668)
BOAT_FILL_DX = 380  # откуда берём чистое море, чтобы затянуть дырку


def smoothstep(t):
    return t * t * (3 - 2 * t)


def load(name):
    im = Image.open(os.path.join(REF, name)).convert('RGB')
    if im.width != W:
        im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
    return im


def fit_seam(im):
    """Подгоняем тропинку пляжа под тропинку двора на шве.

    Тянем каждую строку по горизонтали: у самой тропинки — на полный сдвиг
    и сжатие, дальше по x правка гаснет к нулю, а вниз по строкам сходит на
    нет за SEAM_RAMP. Песок вокруг ровный, поэтому растяжение на нём не
    читается, а тропинка проходит шов без ступеньки.
    """
    a = np.asarray(im, dtype=np.float32)
    h, w, _ = a.shape
    xs = np.arange(w, dtype=np.float32)
    out = a.copy()
    for i in range(min(SEAM_RAMP, h)):
        t = 1.0 - smoothstep(i / SEAM_RAMP)
        if t <= 0:
            continue
        cx = SEAM_CX + SEAM_CK * i
        # где брать пиксель, если подгонять тропинку целиком
        full = cx + (xs - cx - SEAM_DX * t) / (1.0 + (SEAM_SCALE - 1.0) * t)
        # ...и насколько эта подгонка действует на данном расстоянии от оси
        k = np.clip((SEAM_R1 - np.abs(xs - cx)) / (SEAM_R1 - SEAM_R0), 0.0, 1.0)
        src = xs + k * k * (3 - 2 * k) * (full - xs)
        for ch in range(3):
            out[i, :, ch] = np.interp(src, xs, a[i, :, ch])
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


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
    c = fit_seam(c.crop((0, CROP_C, W, c.height)))

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

    path = [list(p) for p in PATH_CANVAS]

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
