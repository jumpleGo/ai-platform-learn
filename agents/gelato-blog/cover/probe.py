import sys, json
sys.path.insert(0, '.')
import hf
from playwright.sync_api import sync_playwright
hf.start_xvfb()
L = hf.BASE / "logs"
def dump(page, tag):
    page.screenshot(path=str(L / f"probe-{tag}.png"))
    info = page.evaluate("""() => [...document.querySelectorAll('button,[role=switch],[role=option],[role=menuitem],input,textarea,[contenteditable=true]')]
      .filter(e => e.offsetParent !== null)
      .map(e => [e.tagName, e.getAttribute('role'), e.getAttribute('aria-label'), e.getAttribute('aria-checked'), e.getAttribute('type'), (e.innerText||e.placeholder||'').slice(0,40).replace(/\\n/g,' | ')])""")
    print('==', tag); [print(i) for i in info if any(i[2:]) and i[1]!='checkbox']
with sync_playwright() as pw:
    ctx = hf.browser(pw)
    page = ctx.pages[0] if ctx.pages else ctx.new_page()
    page.goto(hf.URL); page.wait_for_timeout(7000)
    page.get_by_role("button", name="References").click(); page.wait_for_timeout(1500)
    print("file inputs:", page.locator("input[type=file]").count())
    dump(page, "refs")
    ctx.close()
hf.cleanup()
