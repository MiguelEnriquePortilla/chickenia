import subprocess
from pathlib import Path
import playwright
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
NODE = str(Path(playwright.__file__).resolve().parent / 'driver/node.exe')
proc = subprocess.Popen([NODE, 'test/calibre-browser-server.js', '--today'], cwd=ROOT,
                        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                        creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
try:
    base = proc.stdout.readline().strip()
    assert base.startswith('http://127.0.0.1:')
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')
        page = browser.new_page(viewport={'width':390, 'height':844})
        page.route('https://**/*', lambda route: route.abort())
        page.goto(base + '/evaluacion-equipo.html?area=rastro')
        page.locator('#equipo-responsible-select').select_option(label='Nancy Rentería')
        page.locator('#equipo-assign').click()
        expect(page.locator('#equipo-responsible')).to_contain_text('Responsable del día: Nancy Rentería')
        page.locator('#equipo-area').select_option('supervision')
        nancy = page.locator('#equipo-responsible-select option[value="3"]')
        expect(nancy).to_have_count(1)
        expect(nancy).to_have_attribute('disabled', '')
        expect(nancy).to_contain_text('Rastro')
        page.locator('#equipo-responsible-select').select_option(label='Ana Lima')
        page.locator('#equipo-assign').click()
        expect(page.locator('#equipo-responsible')).to_contain_text('Responsable del día: Ana Lima')
        page.reload()
        expect(page.locator('#equipo-responsible')).to_contain_text('Responsable del día: Ana Lima')
        expect(page.locator('#equipo-responsible-select')).to_have_count(0)
        browser.close()
    print('PASS: Supervision shows assigned Nancy disabled with area, accepts available employee, locks assignment after reload. Isolated database.')
finally:
    proc.terminate()
    proc.wait(timeout=15)
