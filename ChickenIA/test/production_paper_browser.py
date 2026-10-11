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
  page.locator('summary').first.click();field=page.locator('.product input').first
  field.fill('2');field.press('Tab');expect(page.locator('#status')).to_have_text('Guardado')
  page.reload(wait_until='domcontentloaded');expect(page.locator('#areas details')).to_have_count(4);page.locator('summary').first.click();expect(page.locator('.product input').first).to_have_value('2')
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844})
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  browser.close()
 print('Name-only entry, redirect, real save/reload and responsive widths passed')
finally:proc.terminate();proc.wait(timeout=10)
