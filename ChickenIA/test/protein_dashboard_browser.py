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
  expect(host.locator('.rw-kpi')).to_have_count(8)
  expect(host.locator('.rw-table')).to_have_count(2)
  expect(host.locator('.rw-table tbody tr')).to_have_count(14)
  expect(host).to_contain_text('Sali\u00f3 ma\u00f1ana')
  expect(host).to_contain_text('Sali\u00f3 mediod\u00eda')
  expect(host.locator('.pd-track')).to_have_count(0)
  expect(host.locator('.rw-kpi-remaining').first).to_contain_text('160')
  output=ROOT/'.local'/'dashboard-preview';output.mkdir(parents=True,exist_ok=True)
  host.screenshot(path=str(output/'rastro-desktop.png'))
  for width in [320,390]:
   page.set_viewport_size({'width':width,'height':844})
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   expect(host.locator('.rw-kpi')).to_have_count(8)
   host.screenshot(path=str(output/('rastro-'+str(width)+'.png')))
  page.evaluate("document.documentElement.setAttribute('data-theme','dark')")
  host.screenshot(path=str(output/'rastro-dark.png'))
  page.locator('#date-input').fill('2026-09-20');page.locator('#date-input').press('Tab')
  expect(host).to_contain_text('Sin captura')
  page.route('**/api/protein-inventory?**inventory=sucursal**',lambda route:route.fulfill(status=500,content_type='application/json',body='{"error":"Unavailable fixture"}'))
  page.locator('#date-input').fill('2026-09-26');page.locator('#date-input').press('Tab')
  expect(host.locator('[role="alert"]')).to_contain_text('No se pudo consultar Rastro')
  expect(host.locator('.rw-kpi')).to_have_count(0)
  assert not errors,errors
  print('PASS: Rastro cards, weekly rows, split deliveries, real isolated ledger, mobile, dark, no capture, network failure')
  browser.close()
finally:
 proc.terminate();proc.wait(timeout=10)
