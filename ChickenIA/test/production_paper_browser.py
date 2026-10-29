import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1]
node=str(Path.home()/'AppData/Local/Programs/Python312/Lib/site-packages/playwright/driver/node.exe')
proc=subprocess.Popen([node,'test/production-paper-browser-server.js'],cwd=root,stdout=subprocess.PIPE,text=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
try:
 base=proc.stdout.readline().strip()
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='msedge');page=browser.new_page(viewport={'width':390,'height':844})
  page.route('**/*',lambda r:r.continue_() if base in r.request.url else r.abort())
  page.goto(base+'/produccion-diaria.html',wait_until='domcontentloaded')
  expect(page.locator('#login-form select')).to_be_visible()
  assert page.locator('input[type=password]').count()==0
  page.locator('#login-form select').select_option('nancy');page.locator('#login-form button').click()
  expect(page.locator('#person')).to_have_text('NANCY');expect(page.locator('#areas details')).to_have_count(4)
  page.locator('#areas summary').first.click();field=page.locator('.product input').first
  field.fill('2');field.press('Tab');expect(page.locator('#status')).to_have_text('Guardado')
  page.reload(wait_until='domcontentloaded');expect(page.locator('#areas details')).to_have_count(4);page.locator('#areas summary').first.click();expect(page.locator('.product input').first).to_have_value('2')
  page.goto(base+'/produccion-diaria.html?date=2026-10-20&area=cocina',wait_until='domcontentloaded')
  expect(page.locator('#date')).to_have_value('2026-10-20')
  expect(page.locator('#areas details')).to_have_count(4)
  assert page.locator('.product input').first.input_value() != '2'
  page.locator('#areas summary').first.click()
  page.route('**/api/inventory?action=paper-save',lambda r:r.fulfill(status=503,content_type='application/json',body='{"error":"Guardado temporalmente no disponible"}'))
  failed_field=page.locator('.product input').first
  failed_field.fill('7');failed_field.press('Tab')
  expect(page.get_by_role('button',name='Reintentar',exact=True)).to_be_visible()
  saved_url=page.url
  page.locator('#date').fill('2026-10-19');page.locator('#date').press('Tab')
  expect(page.locator('#date')).to_have_value('2026-10-20')
  assert page.url==saved_url and 'area=cocina' in page.url
  expect(page.get_by_role('button',name='Reintentar',exact=True)).to_be_visible()
  expect(failed_field).to_have_value('7')
  page.unroute('**/api/inventory?action=paper-save')
  page.get_by_role('button',name='Reintentar',exact=True).click()
  expect(page.locator('#status')).to_have_text('Guardado')
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844})
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  browser.close()
 print('Name-only entry, redirect, real save/reload and responsive widths passed')
finally:proc.terminate();proc.wait(timeout=10)
