import json
import os
import sys
import http.server
import socketserver
import threading
import functools

sys.path.insert(0, os.path.dirname(__file__))
from fixtures import LOCATIONS, AREAS, CHECKS, MOVEMENTS, build_summary

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8934

# --- Servidor HTTP simple que sirve los archivos estáticos reales del repo ---
Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
Handler.protocol_version = "HTTP/1.1"


class ReusableTCPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


httpd = ReusableTCPServer(("127.0.0.1", PORT), Handler)
thread = threading.Thread(target=httpd.serve_forever, daemon=True)
thread.start()

from playwright.sync_api import sync_playwright

OUT = os.path.join(os.path.dirname(__file__), "results", "legacy")
os.makedirs(OUT, exist_ok=True)


def mock_api(route):
    url = route.request.url
    if "/api/employees" in url or "/api/attendance" in url:
        return route.fulfill(status=200, content_type="application/json", body="[]")
    if "/api/locations" in url:
        return route.fulfill(status=200, content_type="application/json", body=json.dumps(LOCATIONS))
    if "/api/areas" in url:
        return route.fulfill(status=200, content_type="application/json", body=json.dumps(AREAS))
    if "/api/checks" in url:
        return route.fulfill(status=200, content_type="application/json", body=json.dumps(CHECKS))
    if "/api/summary" in url:
        return route.fulfill(status=200, content_type="application/json", body=json.dumps(build_summary()))
    if "/api/inventory-movements" in url:
        return route.fulfill(status=200, content_type="application/json", body=json.dumps(MOVEMENTS))
    return route.continue_()


with sync_playwright() as p:
    browser = p.chromium.launch(channel=os.environ.get("PLAYWRIGHT_CHANNEL", "msedge" if os.name == "nt" else None))
    page = browser.new_page(viewport={"width": 1000, "height": 1400})
    page.route("**/api/**", mock_api)

    errors = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.on("console", lambda msg: errors.append(f"console.{msg.type}: {msg.text}") if msg.type == "error" else None)

    # ---------- SUPERVISION ----------
    page.goto(f"http://localhost:{PORT}/supervision.html", wait_until="load")
    page.wait_for_timeout(400)
    page.screenshot(path=f"{OUT}/sup_01_initial.png", full_page=True)

    # abrir un área colapsada manualmente (cocina, sin crítico, debería estar cerrada)
    page.click('.area-block[data-area-code="cocina"] .accordion-header')
    page.wait_for_timeout(200)
    page.screenshot(path=f"{OUT}/sup_02_area_open.png", full_page=True)

    # abrir menú de la esquina
    page.click("#corner-menu-btn")
    page.wait_for_timeout(200)
    page.screenshot(path=f"{OUT}/sup_03_menu_open.png", full_page=True)

    # click en un chip (debe abrir esa área y scrollear)
    page.click('#corner-menu-btn')  # cerrar menu primero
    page.click('.area-badge[data-jump="caja"]')
    page.wait_for_timeout(300)
    page.screenshot(path=f"{OUT}/sup_04_chip_jump.png", full_page=True)

    # modo oscuro
    page.click("#corner-menu-btn")
    page.click("#menu-dark-toggle")
    page.wait_for_timeout(200)
    page.screenshot(path=f"{OUT}/sup_05_dark.png", full_page=True)

    # expandir todo en modo oscuro
    page.click("#corner-menu-btn")
    page.click("#menu-expand-all")
    page.wait_for_timeout(200)
    page.screenshot(path=f"{OUT}/sup_06_dark_expand_all.png", full_page=True)

    # reload para checar que persiste tema + áreas abiertas
    page.reload(wait_until="load")
    page.wait_for_timeout(400)
    page.screenshot(path=f"{OUT}/sup_07_reload_persisted.png", full_page=True)

    # ---------- DASHBOARD ----------
    page2 = browser.new_page(viewport={"width": 1000, "height": 1400})
    page2.set_default_timeout(60000)
    page2.route("**/api/**", mock_api)
    page2.on("pageerror", lambda exc: errors.append("DASH " + str(exc)))
    page2.on("console", lambda msg: errors.append(f"DASH console.{msg.type}: {msg.text}") if msg.type == "error" else None)

    page2.goto(f"http://localhost:{PORT}/dashboard.html", wait_until="load")
    page2.wait_for_timeout(300)
    page2.screenshot(path=f"{OUT}/dash_01_gate.png", full_page=True)

    page2.fill("#gate-password", "chickenia2026")
    page2.click('#gate-form button[type="submit"]')
    page2.wait_for_timeout(500)
    page2.screenshot(path=f"{OUT}/dash_02_unlocked.png", full_page=True)

    page2.click("#areas-toggle")
    page2.wait_for_timeout(200)
    page2.click("#movements-toggle")
    page2.wait_for_timeout(200)
    page2.screenshot(path=f"{OUT}/dash_03_expanded.png", full_page=True)

    page2.click("#corner-menu-btn")
    page2.wait_for_timeout(200)
    page2.screenshot(path=f"{OUT}/dash_04_menu.png", full_page=True)

    page2.click("#menu-dark-toggle")
    page2.wait_for_timeout(200)
    page2.screenshot(path=f"{OUT}/dash_05_dark.png", full_page=True)

    # cerrar sesión -> debe volver a mostrar el gate
    page2.click("#corner-menu-btn")
    page2.click("#menu-logout")
    page2.wait_for_timeout(400)
    page2.screenshot(path=f"{OUT}/dash_06_after_logout.png", full_page=True)

    browser.close()

httpd.shutdown()

print("ERRORS:", errors if errors else "none")
print("done")
