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
            "lines": [{"id": "MERPOL:0", "qty": 50}],
        })
        assert seed.ok, seed.text()

        url = BASE + "/rastro.html?view=capture"
        page.goto(url)
        expect(page.get_by_role("heading", name="¿Cuánto llegó de CEDIS?")).to_be_visible()
        quantity = page.locator("#cedis-content input").first
        quantity.fill("30")
        page.locator('main a[href="/chat-rastro.html?apartado=rastro"]').first.click()
        expect(page.locator("#cedis-status")).to_have_text("Guarda la llegada antes de salir.")
        expect(page).to_have_url(re.compile(r"/rastro\.html\?view=capture(?:&|$)"))
        expect(quantity).to_have_value("30")

        save = page.get_by_role("button", name="Guardar llegada")
        page.route("**/api/inventory?action=cedis", lambda route: route.fulfill(
            status=503, json={"error": "Error de prueba"}
        ) if route.request.method == "POST" else route.continue_())
        save.click()
        expect(page.locator("#cedis-status")).to_contain_text("Error de prueba")
        expect(quantity).to_have_value("30")
        page.unroute("**/api/inventory?action=cedis")

        save.click()
        expect(page.locator("#cedis-status")).to_contain_text("Llegada guardada")
        expect(page.locator("#cedis-content")).to_contain_text("30 pollos")
        saved = page.request.get(endpoint).json()
        assert saved["cedis"]["MERPOL:0"] == 20
        assert len(saved["orders"]) == 1
        assert saved["orders"][0]["receivedAtCapture"]
        page.reload()
        expect(page.locator("#cedis-content")).to_contain_text("30 pollos")
        page.locator('main a[href="/chat-rastro.html?apartado=rastro"]').first.click()
        expect(page).to_have_url(re.compile(r"/chat-rastro\.html\?apartado=rastro(?:&|$)"))
finally:
    server.terminate()
    server.wait(timeout=10)
