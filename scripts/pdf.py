"""Génère le PDF du Guide du Vibe Coding depuis le site (mode impression : planches et laboratoires figés).
Usage : python3 scripts/pdf.py [--ch ch01,ch05] [--prenom Ludovic] [--sortie dist/Guide.pdf]
Nécessite Playwright (pip install playwright && playwright install chromium)."""
import argparse, asyncio, functools, http.server, os, threading, urllib.parse
from playwright.async_api import async_playwright

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def serveur():
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=RACINE)
    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    h = functools.partial(H, directory=RACINE)
    s = http.server.ThreadingHTTPServer(("127.0.0.1", 0), h)
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return s

async def main(a):
    s = serveur()
    q = "auto=0" + (f"&ch={a.ch}" if a.ch else "") + (f"&prenom={urllib.parse.quote(a.prenom)}" if a.prenom else "")
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 900, "height": 1200})
        await pg.route("**/i.ytimg.com/**", lambda r: r.abort())
        await pg.goto(f"http://127.0.0.1:{s.server_port}/index.html#imprimer?{q}")
        await pg.wait_for_function("document.body.dataset.pret === '1'", timeout=240000)
        await pg.emulate_media(media="print")
        await pg.wait_for_timeout(1500)
        os.makedirs(os.path.dirname(a.sortie) or ".", exist_ok=True)
        pied = '<div style="width:100%;font:8px Inter,sans-serif;color:#8A8D96;padding:0 15mm;display:flex;justify-content:space-between"><span>Guide du Vibe Coding</span><span class="pageNumber"></span></div>'
        await pg.pdf(path=a.sortie, format="A4", print_background=True, display_header_footer=True,
                     header_template="<span></span>", footer_template=pied, margin={"top": "16mm", "bottom": "18mm", "left": "15mm", "right": "15mm"})
        await b.close()
    print("PDF :", a.sortie, round(os.path.getsize(a.sortie) / 1e6, 1), "Mo")

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--ch", default=""); ap.add_argument("--prenom", default="")
    ap.add_argument("--sortie", default=os.path.join(RACINE, "dist", "Guide-du-Vibe-Coding.pdf"))
    asyncio.run(main(ap.parse_args()))
