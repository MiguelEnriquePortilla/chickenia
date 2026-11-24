"""Verify the single-step arrival against a disposable local inventory."""
import json
import os
import re
from pathlib import Path
import socket
import subprocess
import time
import urllib.request
import uuid

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
NODE = os.environ.get("NODE_BINARY", str(Path.home() / "AppData/Local/Programs/Python312/Lib/site-packages/playwright/driver/node.exe"))
with socket.socket() as listener:
    listener.bind(("127.0.0.1", 0))
    port = listener.getsockname()[1]
BASE = f"http://127.0.0.1:{port}"
INSTANCE = "arrival-test-" + uuid.uuid4().hex
(ROOT / ".local" / INSTANCE).mkdir(parents=True)
subprocess.run(
    [NODE, "-e", '''
    const {PGlite} = require('@electric-sql/pglite');
    const {today} = require('./lib/inventory-domain');
    const db = new PGlite(process.argv[1]);
    (async () => {
      await db.exec(`
        CREATE TABLE locations(id int, code text);
        CREATE TABLE inventory_items(id int, sku text, name text, unit text, active boolean);
        CREATE TABLE inventory_movements(id int, item_id int, location_id int, movement_type text,
          quantity numeric, movement_date date, notes text);
        CREATE TABLE cedis_inventory(id int PRIMARY KEY, revision int, data jsonb);
      `);
      await db.exec('CREATE TABLE production_paper_days(date date, data jsonb)');
      const state = {day:today(new Date()), cutover:[], openingBranch:{}, cedis:{}, counted:{},
        orders:[], requests:[], almacenRecovered:true};
      await db.query('INSERT INTO cedis_inventory VALUES (1,0,$1)',[JSON.stringify(state)]);
      await db.close();
    })().catch(error => { console.error(error); process.exitCode = 1; });
    ''', str(ROOT / ".local" / INSTANCE / "inventory-pg")],
    cwd=ROOT, check=True,
)
server = subprocess.Popen(
    [NODE, str(ROOT / "scripts/dev-inventory.js")],
    cwd=ROOT,
    env=dict(os.environ, PORT=str(port), DEV_INSTANCE=INSTANCE),
)
try:
    for _ in range(100):
        try:
            urllib.request.urlopen(BASE + "/rastro.html", timeout=1).close()
            break
        except OSError:
            if server.poll() is not None:
                raise RuntimeError("Inventory server exited")
            time.sleep(.1)
    else:
        raise RuntimeError("Inventory server did not start")

    credentials = json.loads((ROOT / ".local" / INSTANCE / "dev-credentials.json").read_text())
    endpoint = BASE + "/api/inventory?action=cedis"
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel=os.environ.get("PLAYWRIGHT_CHANNEL", "msedge" if os.name == "nt" else None))
        page = browser.new_page(viewport={"width": 390, "height": 844})
        assert page.request.post(BASE + "/api/inventory?action=login", data=credentials).ok
        response = page.request.get(endpoint)
        assert response.ok, response.text()
        model = response.json()
        seed = page.request.post(endpoint, data={
            "action": "count", "revision": model["revision"], "requestId": str(uuid.uuid4()),
            "lines": [{"id": "MERPOL:0", "qty": 50}, {"id": "CENTRAL DE ABASTOS:4", "qty": 10}, {"id": "CENTRAL DE ABASTOS:1", "qty": 8}],
        })
        assert seed.ok, seed.text()

        page.goto(BASE + "/chat-rastro.html")
        expect(page.get_by_role("textbox", name="Mensaje")).to_be_visible()
        expect(page.locator("main button")).to_have_count(1)
        expect(page.locator("main #chat-nav, main #inventory-actions")).to_have_count(0)
        toggle = page.locator(".sidebar-toggle")
        toggle.click()
        sidebar = page.locator(".area-sidebar")
        sidebar.get_by_role("link", name="Preguntas frecuentes").click()
        expect(page.get_by_role("heading", name="Preguntas frecuentes")).to_be_visible()
        page.get_by_text("¿Cómo anoto un conteo en CEDIS?", exact=True).click()
        expect(page.get_by_text("El conteo actualiza CEDIS.", exact=False)).to_be_visible()

        toggle.click()
        sidebar.locator("summary").get_by_text("Inventario", exact=True).click()
        sidebar.get_by_role("link", name="Contar mercancía en CEDIS").click()
        expect(page.get_by_role("heading", name="Contar mercancía en CEDIS")).to_be_visible()
        expect(page.get_by_role("button", name="Guardar conteo en CEDIS")).to_be_visible()
        expect(page.get_by_role("button", name="Guardar llegada")).to_have_count(0)
        page.get_by_role("spinbutton", name=re.compile("Crujiente", re.I)).fill("12")
        page.get_by_role("button", name="Guardar conteo en CEDIS").click()
        expect(page.locator("#cedis-status")).to_contain_text("Conteo guardado en CEDIS")
        counted = page.request.get(endpoint).json()
        assert counted["cedis"]["MERPOL:1"] == 12
        assert not counted["orders"]
        assert not next(item for item in counted["branch"] if item["id"] == "MERPOL:1")["arrivals"]


        toggle.click()
        sidebar.get_by_role("link", name="Registrar llegada a Sucursal").click()
        expect(page.get_by_role("heading", name="Registrar llegada a Sucursal")).to_be_visible()
        expect(toggle).to_have_attribute("aria-expanded", "false")
        page.get_by_role("button", name="Guardar llegada").click()
        expect(page.locator("#cedis-status")).to_contain_text("Escribe la cantidad de pollos")
        crujiente = page.get_by_role("spinbutton", name=re.compile("Crujiente", re.I))
        crujiente.fill("13")
        page.get_by_role("button", name="Guardar llegada").click()
        expect(page.locator("#cedis-status")).to_contain_text("CEDIS tiene 12 pollos")
        expect(crujiente).to_have_value("13")
        assert not page.request.get(endpoint).json()["orders"]
        crujiente.fill("")
        quantity = page.locator("#cedis-content input").first
        quantity.fill("30")
        page.locator('main a[href="/chat-rastro.html?apartado=rastro"]').first.click()
        expect(page.locator("#cedis-status")).to_have_text("Guarda la llegada antes de salir.")
        expect(page).to_have_url(re.compile(r"/rastro\.html\?view=capture(?:&|$)"))
        expect(quantity).to_have_value("30")

        save = page.get_by_role("button", name="Guardar llegada")
        def lose_confirmation(route):
            if route.request.method != "POST":
                route.continue_()
                return
            response = route.fetch()
            assert response.ok, response.text()
            route.fulfill(status=503, json={"error": "Error de prueba"})

        page.route("**/api/inventory?action=cedis", lose_confirmation)
        save.click()
        expect(page.locator("#cedis-status")).to_contain_text("Error de prueba")
        expect(quantity).to_have_value("30")
        page.unroute("**/api/inventory?action=cedis")

        save.click()
        expect(page.locator("#cedis-status")).to_contain_text("Llegada guardada en Sucursal · " + model["day"] + " · 30 pollos")
        expect(page.locator("#cedis-content")).to_contain_text("30 pollos")
        saved = page.request.get(endpoint).json()
        assert saved["cedis"]["MERPOL:0"] == 20
        assert len(saved["orders"]) == 1
        assert saved["orders"][0]["receivedAtCapture"]
        page.locator("summary").get_by_text("Vegetales (kg)", exact=True).click()
        page.get_by_role("spinbutton", name=re.compile("Zanahoria", re.I)).fill("2.125")
        page.get_by_role("spinbutton", name=re.compile("Papa Alfa", re.I)).fill("1.5")
        save.click()
        expect(page.locator("#cedis-status")).to_contain_text("2.125 kg")
        vegetable_state = page.request.get(endpoint).json()
        assert vegetable_state["cedis"]["CENTRAL DE ABASTOS:4"] == 10
        assert vegetable_state["cedis"]["CENTRAL DE ABASTOS:1"] == 8
        carrot = next(item for item in vegetable_state["branch"] if item["id"] == "CENTRAL DE ABASTOS:4")
        assert carrot["arrivals"][-1]["qty"] == 2.125
        page.reload()
        expect(page.locator("#cedis-content")).to_contain_text("30 pollos")
        page.locator('main a[href="/chat-rastro.html?apartado=rastro"]').first.click()
        expect(page).to_have_url(re.compile(r"/chat-rastro\.html\?apartado=rastro(?:&|$)"))
        expect(page.get_by_role("textbox", name="Mensaje")).to_be_visible()
        toggle.click()
        sidebar.locator("summary").get_by_text("Inventario", exact=True).click()
        sidebar.get_by_role("link", name="Ver existencias").click()
        expect(page.locator("main")).to_contain_text("Llegó hoy a Sucursal: 30 pollos")
        expect(page.get_by_role("heading", name="Vegetales")).to_be_visible()
        page.goto(BASE + "/rastro.html?view=capture")
        page.locator("#cedis-content input[type=number]").first.fill("3")
        page.get_by_role("checkbox", name=re.compile("conteo de Rastro")).check()
        page.get_by_role("button", name="Guardar llegada").click()
        expect(page.locator("#cedis-status")).to_contain_text("3 pollos")
        recorded = page.request.get(endpoint).json()
        assert recorded["cedis"]["MERPOL:0"] == 20
        assert recorded["orders"][0]["noCedisDebit"] == ["MERPOL:0"]
        assert recorded["orders"][0]["actual"]["MERPOL:0"] == 3

        toggle.click()
        sidebar.get_by_text("Abastecimiento", exact=True).click()
        sidebar.get_by_role("link", name="Pedido a CEDIS", exact=True).click()
        expect(page.get_by_role("heading", name=re.compile("Pedido de hoy"))).to_be_visible()
        expect(page.get_by_role("spinbutton", name=re.compile("Rostizado"))).to_have_count(0)
        expect(page.locator("#cedis-content details")).to_have_count(0)
        vegetable = page.get_by_role("spinbutton", name=re.compile("Zanahoria.*kg"))
        expect(vegetable).to_be_visible()
        vegetable.fill("1.25")
        page.get_by_role("button", name="Guardar pedido", exact=True).click()
        expect(page.locator("#cedis-status")).to_contain_text("Pedido guardado")
        order = page.request.get(endpoint).json()
        assert order["cedis"]["CENTRAL DE ABASTOS:4"] == 10
        assert order["orders"][0]["actual"] == {"CENTRAL DE ABASTOS:4": 1.25}

        toggle.click()
        sidebar.get_by_role("link", name="Historial de pedidos", exact=True).click()
        expect(page.get_by_role("heading", name="Historial de pedidos")).to_be_visible()
        expect(page.get_by_role("button", name="Guardar pedido", exact=True)).to_have_count(0)
        page.locator("#cedis-content summary").first.click()
        expect(page.locator("#cedis-content")).to_contain_text("Zanahoria")
        expect(page.locator("#cedis-content")).to_contain_text("1.25 kg")

        toggle.click()
        sidebar.get_by_role("link", name="Pedido a Rastro", exact=True).click()
        expect(page.get_by_role("heading", name="Pedido a Rastro")).to_be_visible()
        expect(page.get_by_role("spinbutton")).to_have_count(2)
        expect(page.get_by_role("spinbutton", name=re.compile("Rostizado"))).to_be_visible()
        assert page.evaluate("document.documentElement.scrollWidth === window.innerWidth")



finally:
    server.terminate()
    server.wait(timeout=10)
