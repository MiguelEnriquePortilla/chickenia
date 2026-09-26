"""Dashboard filters and drilldown with real API, isolated PostgreSQL and fictional quantities."""
import os,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
NODE=os.environ.get('NODE_BINARY',str(Path.home()/'AppData/Local/Programs/Python312/Lib/site-packages/playwright/driver/node.exe'))
proc=subprocess.Popen([NODE,'test/protein-browser-server.js'],cwd=ROOT,env={**os.environ,'TEST_PROTEIN_DASHBOARD':'1'},stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
try:
 base=proc.stdout.readline().strip()
 assert base.startswith('http://127.0.0.1:'),base
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='msedge')
  page=browser.new_page(viewport={'width':1440,'height':1100},reduced_motion='reduce');errors=[]
  page.route('https://**/*',lambda route:route.abort())
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/dashboard.html?date=2026-09-26',wait_until='domcontentloaded')
  host=page.locator('#protein-overview')
  expect(host.locator('.pd-table tbody tr')).to_have_count(3)
  expect(host).to_contain_text('Última captura')
  expect(host.locator('.pd-pending')).to_have_count(2)
  host.locator('.pd-stock').first.click()
  expect(host.locator('[data-detail-panel]')).to_contain_text('29.5 recibidos (diferencia -0.5)')
  expect(host.locator('[data-detail-panel]')).to_contain_text('Recepción pendiente')
  host.locator('.pd-close').click()
  host.locator('[data-inventory]').select_option('movil')
  expect(host.locator('.pd-table tbody tr')).to_have_count(1)
  expect(host.locator('.pd-table')).not_to_contain_text('Crujiente')
  expect(host.locator('[data-product] option[value="cruji"]')).to_have_attribute('disabled','')
  host.locator('[data-day="2026-09-26"]').click()
  expect(host.locator('[data-detail-panel]')).to_contain_text('enviados 25')
  host.locator('[data-inventory]').select_option('all')
  host.locator('[data-product]').select_option('cruji')
  expect(host.locator('.pd-table tbody tr')).to_have_count(1)
  host.locator('[data-product]').select_option('all')
  # Label the review artifacts clearly; the production UI never receives demo data.
  page.evaluate("document.querySelector('.pd-eyebrow').textContent='VISTA PREVIA · DATOS FICTICIOS'")
  output=ROOT/'.local'/'dashboard-preview';output.mkdir(parents=True,exist_ok=True)
  host.screenshot(path=str(output/'desktop.png'))
  page.set_viewport_size({'width':390,'height':844})
  page.screenshot(path=str(output/'phone-page.png'),full_page=True)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), page.evaluate("Array.from(document.querySelectorAll('body *')).filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>[e.tagName,e.className,Math.round(e.getBoundingClientRect().width)]).slice(0,20)")
  expect(host.locator('.pd-table tbody tr')).to_have_count(3)
  host.screenshot(path=str(output/'mobile.png'))
  page.evaluate("document.documentElement.setAttribute('data-theme','dark')")
  host.screenshot(path=str(output/'mobile-dark.png'))
  # Earlier than the initial records must not appear as an inventory in zero.
  page.locator('#date-input').fill('2026-09-20');page.locator('#date-input').press('Tab')
  expect(host.locator('.pd-table')).to_contain_text('Sin captura')
  # Network failure for one inventory must preserve the other and disclose the failure.
  page.route('**/api/protein-inventory?**inventory=movil**',lambda route:route.fulfill(status=500,content_type='application/json',body='{"error":"Unavailable fixture"}'))
  page.locator('#date-input').fill('2026-09-26');page.locator('#date-input').press('Tab')
  expect(host.locator('.pd-table tbody tr')).to_have_count(2)
  host.locator('.pd-alerts summary').click()
  expect(host.locator('.pd-alerts')).to_contain_text('Móvil · Datos no disponibles')
  assert not errors,errors
  print('PASS: filters, shipments, decimal differences, day detail, mobile layout, historical no-capture and partial network failure')
  browser.close()
finally:
 proc.terminate();proc.wait(timeout=10)
