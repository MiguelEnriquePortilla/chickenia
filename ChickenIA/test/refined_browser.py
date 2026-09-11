"""Layout regression checks. Local inventory session; dashboard API uses explicit fixtures."""
import json, os, subprocess, time, urllib.request, uuid
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
NODE=os.environ.get('NODE_BINARY',str(Path.home()/'AppData/Local/Programs/Python312/Lib/site-packages/playwright/driver/node.exe'))
instance='refined-'+uuid.uuid4().hex
proc=subprocess.Popen([NODE,'scripts/dev-inventory.js'],cwd=ROOT,env=dict(os.environ,PORT='8943',DEV_INSTANCE=instance,DEV_USER='miguel'),stdout=subprocess.PIPE,stderr=subprocess.PIPE,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
base='http://127.0.0.1:8943';out=ROOT/'test/results';out.mkdir(exist_ok=True)
try:
 for _ in range(100):
  try:urllib.request.urlopen(base,timeout=1);break
  except Exception:time.sleep(.1)
 creds=json.loads((ROOT/'.local'/instance/'dev-credentials.json').read_text())
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='msedge' if os.name=='nt' else None)
  page=browser.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/inventario.html');page.locator('[name=username]').fill(creds['username']);page.locator('[name=password]').fill(creds['password']);page.locator('#login-form button').click();page.locator('.area-sidebar').wait_for()
  page.route('**/api/locations',lambda r:r.fulfill(json=[{'id':1,'name':'Jojutla','type':'tienda'}]))
  page.route('**/api/summary?*',lambda r:r.fulfill(json={'location':{'id':1},'date':'2026-09-11','overall_score':48,'areas':[{'area_code':'cocina','area_name':'Cocina','score':48,'done_items':4,'total_items':8}],'critical_pending':[],'cross_check':None}))
  page.route('**/api/inventory-movements?*',lambda r:r.fulfill(json=[]))
  for endpoint in ['employees','attendance?*','areas?*','checks?*']:
   page.route('**/api/'+endpoint,lambda r:r.fulfill(json=[]))
  for route in ['/', '/inventario.html', '/dashboard.html','/supervision.html','/preguntale.html']:
   page.goto(base+route)
   if route!='/':page.locator('.area-sidebar').wait_for()
   if route=='/preguntale.html':expect(page.locator('#workspace')).to_be_visible()
   for theme in ['light','dark']:
    if page.evaluate("document.documentElement.dataset.theme||'light'")!=theme:page.locator('.theme-control').click()
    expect(page.locator('.theme-control svg')).to_be_visible()
    for width in [1440,390]:
     page.set_viewport_size({'width':width,'height':1000})
     page.wait_for_timeout(250)
     assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(route,theme,width)
     assert '?' not in page.locator('.sidebar-brand').inner_text() if route!='/' else True
     if route=='/dashboard.html':
      page.locator('#areas-toggle').click();expect(page.locator('#areas')).to_contain_text('Cocina')
      assert page.locator('#areas-toggle').evaluate('(e)=>getComputedStyle(e).color')==page.locator('body').evaluate('(e)=>getComputedStyle(e).color')
      page.locator('#areas-toggle').click()
      page.locator('.account-menu > summary').click();page.locator('#menu-expand-all').click();expect(page.locator('#movements-toggle')).to_have_attribute('aria-expanded','true')
      page.locator('.account-menu > summary').click();page.keyboard.press('Escape');assert not page.locator('.account-menu').evaluate('(e)=>e.open')
     page.screenshot(path=str(out/((route.strip('/').replace('.html','') or 'home')+'-'+theme+'-'+str(width)+'.png')))
  page.set_viewport_size({'width':1440,'height':1000});page.goto(base+'/preguntale.html');expect(page.locator('#workspace')).to_be_visible()
  page.locator('[data-question]').first.click();expect(page.locator('.chat-answer')).to_be_visible(timeout=20000)
  page.locator('#new-chat').click();expect(page.locator('#welcome')).to_be_visible()
  page.goto(base+'/inventario.html?area=cocina&tab=sales');expect(page.locator('#sale-form')).to_be_visible()
  assert not errors,errors
  browser.close()
 print('PASS: five routes, both themes, desktop/mobile, dashboard expansion/menu keyboard and real local chat query.')
finally:
 proc.terminate();proc.wait(timeout=10)
