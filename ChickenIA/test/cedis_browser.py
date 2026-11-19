"""Verify the CEDIS workflow through the shared UI and isolated database."""
import os
import subprocess
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

root = Path(__file__).resolve().parents[1]
node = os.environ.get("CHICKENIA_TEST_NODE", "node")
server = subprocess.Popen(
    [node, "test/production-paper-browser-server.js"], cwd=root,
    env={**os.environ, "CHICKENIA_TEST_CEDIS": "1"}, stdout=subprocess.PIPE, text=True,
    creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
)
try:
    base = server.stdout.readline().strip()
    assert base.startswith("http://127.0.0.1:")
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel="msedge" if os.name == "nt" else None)
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        page.route("**/*", lambda route: route.continue_() if route.request.url.startswith(base) else route.abort())
        dialogs = []
        page.on("dialog", lambda dialog: (dialogs.append(dialog.message), dialog.dismiss()))
        page.goto(base + "/cedis.html")
        page.get_by_role("combobox").select_option("ana")
        page.get_by_role("button", name="Continuar").click()
        page.get_by_label("Guardar conteo · Pollo para Rostizado (pollos)").fill("50")
        page.get_by_label("Guardar conteo · Pollo para Crujiente (pollos)").fill("0")
        page.get_by_role("button", name="Guardar conteo").click()
        expect(page.get_by_text("Conteo guardado.")).to_be_visible()
        page.get_by_role("button", name="Almacén", exact=True).click()
        page.get_by_label("Guardar conteo · Zanahoria (kg)").fill("0")
        page.get_by_role("button", name="Guardar conteo").click()
        expect(page.get_by_text("Hay 0 · Contado hoy")).to_be_visible()

        def visit(name):
            page.locator(".primary-navigation").get_by_role("link", name=name, exact=True).click()
            expect(page.locator(".unified-header")).to_be_visible()

        visit("Lista de Pedidos")
        page.get_by_role("button", name="MERPOL").click()
        page.get_by_label("Cantidad de Pollo para Rostizado en pollos").fill("75")
        page.get_by_role("button", name="Guardar pedido", exact=True).click()
        expect(page.get_by_text("Pedido guardado. Abre el pedido cuando llegue.")).to_be_visible()
        page.locator("#supplier-orders summary").first.click()
        expect(page.get_by_label("Guardar recepción · Pollo para Rostizado (pollos)")).to_have_value("75")
        page.get_by_role("button", name="Guardar recepción").click()
        expect(page.get_by_label("Existencia de Pollo para Rostizado en pollos")).to_have_value("125")

        visit("Pedido a Rastro")
        page.get_by_text("Nuevo pedido a Rastro", exact=True).click()
        page.get_by_label("Guardar pedido · Pollo para Rostizado (pollos)").fill("75")
        page.get_by_role("button", name="Guardar pedido", exact=True).click()
        expect(page.get_by_text("Pedido guardado.")).to_be_visible()
        page.locator("#cedis-content details").nth(1).locator("summary").click()
        expect(page.get_by_label("Guardar salida · Pollo para Rostizado (pollos)")).to_have_value("75")
        page.get_by_role("button", name="Guardar salida").click()
        expect(page.get_by_text("Salida guardada. Ya cuenta en Sucursal.")).to_be_visible()
        visit("Inventario Sucursal")
        expect(page.get_by_text("Pollo para Rostizado · 85 pollos · Llegó 75 pollos")).to_be_visible()
        visit("Producción Diaria")
        page.locator("#areas summary").first.click()
        field = page.locator(".product").first.get_by_label("Producción inicial")
        field.fill("30")
        field.press("Tab")
        expect(page.locator("#status")).to_have_text("Guardado")
        visit("Inventario Sucursal")
        expect(page.get_by_text("Pollo para Rostizado · 55 pollos · Llegó 75 pollos")).to_be_visible()
        expect(page.get_by_text("Zanahoria · Consumo sin registrar", exact=False)).to_be_visible()
        assert not dialogs, dialogs
        browser.close()
    print("Mercancía recibida, enviada y consumida desde la app con captura única.")
finally:
    server.terminate()
    server.wait(timeout=10)
