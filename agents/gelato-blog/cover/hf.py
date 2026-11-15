#!/usr/bin/env python3
"""Обложки для блога GELATO в Higgsfield (Seedream 5.0 Lite, Unlimited, 16:9) через браузер.

Профиль браузера — постоянный (~/gelato-blog/hf-profile): владелец один раз входит в свой
аккаунт через noVNC (`hf.py login`), дальше `hf.py generate` работает без участия человека.

  hf.py login                 — поднять окно браузера с noVNC-ссылкой для входа (30 минут)
  hf.py shot <png>            — открыть страницу генерации и сохранить скриншот (отладка)
  hf.py generate --prompt-file P --out OUT.png
"""
from __future__ import annotations

import argparse
import os
import re
import secrets
import shutil
import string
import subprocess
import sys
import tempfile
import time
from pathlib import Path

BASE = Path.home() / "gelato-blog"
PROFILE = BASE / "hf-profile"
REFS = sorted((BASE / "cover" / "refs").glob("*"))
NOVNC_DIR = Path("/opt/x-pro/novnc")
# свои дисплей и порты, чтобы не спорить с окнами x-pro (:96/5903/6083) и threads-pro
DISPLAY = ":97"
VNC_PORT = 5907
WEB_PORT = 6087
URL = "https://higgsfield.ai/ai/image?model=seedream_v5_lite"
VIEWPORT = {"width": 1440, "height": 900}

procs: list[subprocess.Popen] = []


def start_xvfb() -> None:
    for pat in (f"Xvfb {DISPLAY} ", f"x11vnc -display {DISPLAY} ", f"websockify --web {NOVNC_DIR} {WEB_PORT}",
                f"cloudflared tunnel --url http://localhost:{WEB_PORT}"):
        subprocess.run(["pkill", "-9", "-f", pat], stderr=subprocess.DEVNULL, check=False)
    time.sleep(1)
    n = DISPLAY[1:]
    for stale in (Path(f"/tmp/.X{n}-lock"), Path(f"/tmp/.X11-unix/X{n}")):
        if stale.exists() and not stale.is_symlink():
            stale.unlink()
    procs.append(subprocess.Popen(["Xvfb", DISPLAY, "-screen", "0", "1460x1040x24", "-nolisten", "tcp"],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
    time.sleep(2)
    os.environ["DISPLAY"] = DISPLAY


def start_vnc() -> tuple[str, str]:
    password = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
    fd, pwfile = tempfile.mkstemp(prefix="hfvnc_")
    os.write(fd, password.encode())
    os.close(fd)
    procs.append(subprocess.Popen(["x11vnc", "-display", DISPLAY, "-rfbport", str(VNC_PORT), "-localhost",
                                   "-forever", "-shared", "-passwdfile", pwfile, "-quiet"],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
    time.sleep(1)
    os.unlink(pwfile)
    procs.append(subprocess.Popen(["websockify", "--web", str(NOVNC_DIR), str(WEB_PORT), f"localhost:{VNC_PORT}"],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
    tunnel = subprocess.Popen(["cloudflared", "tunnel", "--url", f"http://localhost:{WEB_PORT}", "--no-autoupdate"],
                              stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
    procs.append(tunnel)
    deadline = time.time() + 60
    assert tunnel.stderr is not None
    while time.time() < deadline:
        line = tunnel.stderr.readline()
        m = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", line or "")
        if m:
            return m.group(0) + "/vnc.html?autoconnect=1&resize=scale", password
    raise RuntimeError("cloudflared не выдал адрес туннеля")


def cleanup() -> None:
    for p in reversed(procs):
        if p.poll() is None:
            p.terminate()
    time.sleep(1)
    for p in reversed(procs):
        if p.poll() is None:
            p.kill()


def browser(pw):
    # headful под Xvfb: headless Higgsfield может не пустить
    return pw.chromium.launch_persistent_context(
        str(PROFILE), headless=False, viewport=VIEWPORT, accept_downloads=True,
        args=["--disable-blink-features=AutomationControlled", "--window-size=1440,1000"],
    )


def cmd_login(minutes: int) -> None:
    from playwright.sync_api import sync_playwright
    start_xvfb()
    url, password = start_vnc()
    print(f"VNC_URL {url}", flush=True)
    print(f"VNC_PASSWORD {password}", flush=True)
    with sync_playwright() as pw:
        ctx = browser(pw)
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto("https://higgsfield.ai/")
        end = time.time() + minutes * 60
        while time.time() < end and ctx.pages:
            time.sleep(5)
        ctx.close()
    print("LOGIN_WINDOW_CLOSED", flush=True)


def cmd_import(state_file: str) -> None:
    # сессия из окна на Маке (login_local.py): куки и localStorage переносим в постоянный профиль
    import json
    from playwright.sync_api import sync_playwright
    state = json.loads(Path(state_file).read_text())
    start_xvfb()
    with sync_playwright() as pw:
        ctx = browser(pw)
        ctx.add_cookies(state.get("cookies", []))
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        for origin in state.get("origins", []):
            page.goto(origin["origin"])
            page.evaluate("items => items.forEach(i => localStorage.setItem(i.name, i.value))",
                          origin.get("localStorage", []))
        page.goto(URL)
        page.wait_for_timeout(8000)
        page.screenshot(path=str(BASE / "logs" / "import.png"))
        ctx.close()
    print(f"IMPORTED {len(state.get('cookies', []))} cookies")


def cmd_shot(out: str) -> None:
    from playwright.sync_api import sync_playwright
    start_xvfb()
    with sync_playwright() as pw:
        ctx = browser(pw)
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto(URL)
        page.wait_for_timeout(8000)
        page.screenshot(path=out)
        Path(out + ".html").write_text(page.content())
        ctx.close()


def cmd_generate(prompt: str, out: str) -> None:
    # Higgsfield показал капчу IP сервера — генерация на паузе, пока лежит этот файл
    if (BASE / "cover" / "PAUSED").exists():
        raise SystemExit("PAUSED: Higgsfield требует капчу с IP сервера")
    from playwright.sync_api import sync_playwright
    start_xvfb()
    with sync_playwright() as pw:
        ctx = browser(pw)
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        try:
            _generate(page, prompt, out)
        except BaseException:
            # скриншот момента сбоя — чтобы понять, где сломался сценарий
            page.screenshot(path=str(BASE / "logs" / "gen-fail.png"))
            raise
        finally:
            ctx.close()
    print(f"OK {out}")


def _generate(page, prompt: str, out: str) -> None:
    if True:
        page.goto(URL)
        page.wait_for_timeout(6000)
        if page.get_by_role("button", name=re.compile("Log in|Sign in|Get started", re.I)).count() and \
                not page.get_by_role("switch", name="Unlimited mode").count():
            raise SystemExit("NOT_LOGGED_IN")

        # Unlimited — обязательно: без него генерация уходит в кредиты
        sw = page.get_by_role("switch", name="Unlimited mode")
        if sw.get_attribute("aria-checked") != "true":
            # панель настроек прокручивается вбок: переключатель может быть за краем
            sw.scroll_into_view_if_needed()
            page.wait_for_timeout(400)
            sw.click()
            page.wait_for_timeout(500)
        if sw.get_attribute("aria-checked") != "true":
            raise SystemExit("UNLIMITED_OFF")

        # соотношение 16:9
        ar = page.get_by_role("button", name="Aspect ratio")
        ar.scroll_into_view_if_needed()
        ar.click()
        page.wait_for_timeout(500)
        page.get_by_text("16:9", exact=True).last.click()
        page.wait_for_timeout(500)

        # чистим старые вложения и прикрепляем референсы Gelato
        clear = page.get_by_role("button", name="Clear all")
        if clear.count():
            clear.first.click()
            page.wait_for_timeout(800)
        # «+» открывает библиотеку медиа, загрузка — через «Upload media»
        page.get_by_role("button", name="References").click()
        page.wait_for_timeout(1500)
        with page.expect_file_chooser(timeout=15000) as fc:
            page.get_by_text("Upload media", exact=True).click()
        fc.value.set_files([str(p) for p in REFS])
        page.wait_for_timeout(3000)
        for _ in range(40):
            if not page.get_by_text("Uploading...").count():
                break
            page.wait_for_timeout(2000)
        page.wait_for_timeout(2000)
        # свежезагруженные — первые в «Recent»: отмечаем три верхние плитки
        # плитки — соседи «Upload media» в одной сетке
        row = page.get_by_text("Upload media", exact=True).locator(
            "xpath=ancestor::div[contains(concat(' ', @class, ' '), ' grid ')][1]")
        # в ряду бывают невидимые служебные узлы — берём только плитки с размером
        boxes = [b for b in (t.bounding_box() for t in row.locator(":scope > *").all())
                 if b and b["width"] > 50]
        for bb in boxes[1:len(REFS) + 1]:
            page.mouse.click(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2)
            page.wait_for_timeout(800)
        page.screenshot(path=str(BASE / "logs" / "gen-refs.png"))
        if os.environ.get("HF_DRY") == "refs":
            raise SystemExit("DRY_REFS")
        page.keyboard.press("Escape")
        page.wait_for_timeout(800)
        if page.get_by_text("Upload media", exact=True).is_visible():
            page.mouse.click(5, 450)
            page.wait_for_timeout(800)

        box = page.get_by_role("textbox").filter(has_not=page.locator("[placeholder='Search...']")).last
        box.click()
        page.keyboard.press("Control+A")
        page.keyboard.insert_text(prompt)

        before = set(page.locator("img[src*='cloudfront'], img[src*='higgs']").evaluate_all(
            "els => els.map(e => e.currentSrc || e.src)"))
        gen = page.get_by_role("button", name=re.compile("^(Unlimited|Generate)", re.I)).last
        label = gen.inner_text()
        if re.search(r"\d", label) and "unlimited" not in label.lower():
            raise SystemExit(f"GENERATE_COSTS_CREDITS: {label!r}")
        page.screenshot(path=str(BASE / "logs" / "gen-before.png"))
        if os.environ.get("HF_DRY") == "gen":
            raise SystemExit(f"DRY_GEN {label!r}")
        gen.click()

        # ждём новую картинку (до 4 минут)
        new_src = None
        for _ in range(48):
            page.wait_for_timeout(5000)
            now = page.locator("img[src*='cloudfront'], img[src*='higgs']").evaluate_all(
                "els => els.filter(e => e.naturalWidth > 300).map(e => e.currentSrc || e.src)")
            fresh = [s for s in now if s not in before]
            if fresh:
                new_src = fresh[0]
                break
        if not new_src:
            raise SystemExit("NO_RESULT")
        page.wait_for_timeout(3000)

        # скачиваем через кнопку Download у новой карточки
        card = page.locator(f"img[src='{new_src}']").first
        card.hover()
        page.wait_for_timeout(800)
        with page.expect_download(timeout=90000) as dl:
            page.locator("button:visible").filter(has=page.locator("svg")).locator(
                "xpath=//button[@aria-label='Download' or .//*[name()='title' and text()='Download']]").first.click()
        dl.value.save_as(out)


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    lg = sub.add_parser("login")
    lg.add_argument("--minutes", type=int, default=30)
    sh = sub.add_parser("shot")
    sh.add_argument("out")
    im = sub.add_parser("import")
    im.add_argument("state")
    gn = sub.add_parser("generate")
    gn.add_argument("--prompt-file", required=True)
    gn.add_argument("--out", required=True)
    a = ap.parse_args()
    try:
        if a.cmd == "login":
            cmd_login(a.minutes)
        elif a.cmd == "import":
            cmd_import(a.state)
        elif a.cmd == "shot":
            cmd_shot(a.out)
        else:
            cmd_generate(Path(a.prompt_file).read_text().strip(), a.out)
    finally:
        cleanup()


if __name__ == "__main__":
    sys.exit(main())
