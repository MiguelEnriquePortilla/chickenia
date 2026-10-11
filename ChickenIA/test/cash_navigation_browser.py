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
  page.set_viewport_size({'width':1280,'height':850})
  page.goto(base+'/captura.html?mode=close&format=digital',wait_until='domcontentloaded')
  expect(page.locator('#fields input').first).to_be_visible()
  dialogs=[]
  page.on('dialog',lambda d:(dialogs.append(d.type),d.dismiss()))
  page.locator('.primary-navigation a[data-module-path="/supervision.html"]').click()
  page.wait_for_url('**/supervision.html*')
  assert not dialogs,dialogs
  page.goto(base+'/captura.html?mode=close&format=digital',wait_until='domcontentloaded')
  field=page.locator('#fields input[type=text]').first
  expect(field).to_be_visible();field.fill('Nancy')
  page.locator('.primary-navigation a[data-module-path="/produccion-diaria.html"]').click()
  page.wait_for_url('**/produccion-diaria.html*')
  assert not dialogs,dialogs
  page.goto(base+'/captura.html?mode=close&format=digital',wait_until='domcontentloaded')
  expect(page.locator('#fields input[type=text]').first).to_have_value('Nancy')
  browser.close()
 print('Cash empty navigation without dialog and save-before-navigation/reload passed')
finally:proc.terminate();proc.wait(timeout=10)
