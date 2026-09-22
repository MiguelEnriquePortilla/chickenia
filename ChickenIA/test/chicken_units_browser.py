"""Pollos capture through real local HTTP APIs and disposable PostgreSQL."""
import os,subprocess,uuid
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
proc=subprocess.Popen([os.environ['NODE_BINARY'],'test/protein-browser-server.js'],cwd=ROOT,env={**os.environ,'TEST_CHICKEN_UNITS':'1'},stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
out=ROOT/'test/results/chicken-units';out.mkdir(parents=True,exist_ok=True)
try:
 base=proc.stdout.readline().strip();assert base.startswith('http://127.0.0.1:'),proc.stderr.read()
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='msedge');page=browser.new_page(viewport={'width':390,'height':900});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/captura.html?mode=production&format=digital&date=2026-09-22')
  expect(page.locator('#save')).to_be_enabled();page.locator('#steps [data-step="1"]').click()
  expect(page.locator('[data-path="lines.20.unit"]')).to_have_value('pollos')
  page.locator('[data-path="lines.20.previousRaw"]').fill('10.125');page.locator('[data-path="lines.20.done1"]').fill('1.5')
  page.locator('#save').click();expect(page.locator('#save-status')).to_contain_text('Borrador guardado')
  page.locator('#stage').select_option('2');page.locator('[data-path="lines.20.done2"]').fill('0.25');page.locator('#save').click();expect(page.locator('#error')).to_be_empty()
  page.locator('#stage').select_option('third');page.locator('[data-path="lines.20.done3"]').fill('0');page.locator('#save').click()
  expect(page.locator('#save-status')).to_contain_text('Borrador guardado')
  page.locator('#steps [data-step="2"]').click();page.locator('#stage').select_option('1');page.locator('[data-path="lines.21.done1"]').fill('2.5');page.locator('#save').click()
  expect(page.locator('#save-status')).to_contain_text('Borrador guardado')
  page.locator('#stage').select_option('2');page.locator('[data-path="lines.21.done2"]').fill('0');page.locator('#save').click();expect(page.locator('#save-status')).to_contain_text('Borrador guardado')
  page.locator('#stage').select_option('third');page.locator('[data-path="lines.21.done3"]').fill('0');page.locator('#save').click();expect(page.locator('#save-status')).to_contain_text('Borrador guardado')
  page.locator('#steps [data-step="3"]').click();page.locator('summary').filter(has_text='Mermas,').click();page.locator('[data-add="losses"]').click();page.locator('[data-path="losses.0.quantity"]').fill('0.125');page.locator('[data-path="losses.0.reason"]').fill('Merma de prueba');expect(page.locator('[data-path="losses.0.unit"]')).to_have_value('pollos');page.locator('#save').click();expect(page.locator('#save-status')).to_contain_text('Borrador guardado')
  page.goto(base+'/dashboard.html?date=2026-09-22');expect(page.locator('#daily-captures')).to_contain_text('Pollo producido: 4.25 pollos')
  # Seed only the isolated old ledger, then exercise the pollos UI.
  api=base+'/api/inventory?chickenUnit=pollos'
  def operation(kind,**values):
   snap=page.request.get(api).json()
   r=page.request.post(api+'&action=operation',headers={'Origin':base},data={'id':str(uuid.uuid4()),'version':snap['version'],'type':kind,**values});assert r.status==200,r.text();return r.json()
  operation('initial',location='sucursal',lines=[{'item':'cruji-marinado','qty':2.125},{'item':'cruji-cocinado','qty':0},{'item':'rosti-cocinado','qty':0}])
  page.goto(base+'/inventario.html?tab=production');expect(page.locator('#production-form')).to_be_visible();page.locator('[name=recipe]').select_option('freir');page.locator('#production-form [name=qty]').fill('1.125');expect(page.locator('#production-preview')).to_contain_text('1.125 pollos CRUJI');page.locator('#production-form button').click();expect(page.locator('#production-form [name=qty]')).to_have_value('')
  page.goto(base+'/inventario.html?tab=sales');expect(page.locator('#sale-form')).to_be_visible();page.locator('#sale-form [name=item]').select_option('cruji-cocinado');page.locator('#sale-form [name=qty]').fill('0.5');page.locator('#sale-form button').click();expect(page.locator('#sale-form [name=qty]')).to_have_value('')
  assert page.request.get(api).json()['data']['balances']['sucursal:cruji-cocinado']==625
  page.screenshot(path=str(out/'sales-mobile.png'),full_page=True)
  page.goto(base+'/supervision.html?area=freidoras&date=2026-09-22');expect(page.locator('.qty-unit')).to_have_text('pollos');page.locator('#supervisor-input').fill('Prueba');page.locator('#supervisor-input').blur()
  page.locator('.qty').fill('1.125');page.locator('.qty').blur();page.wait_for_function("document.querySelector('.activity-row').classList.contains('just-saved')");page.reload();expect(page.locator('.qty')).to_have_value('1.125')
  r=page.request.get(base+'/api/checks?location_id=1&date=2026-09-22');assert r.json()[0]['quantity']==1.125,r.text()
  stale=page.request.post(base+'/api/checks',data={'activity_id':1,'location_id':1,'check_date':'2026-09-22','quantity':1,'checked_by':'Test'});assert stale.status==409
  page.screenshot(path=str(out/'supervision-mobile.png'),full_page=True)
  assert not errors,errors
  browser.close()
 print('PASS: daily production/losses/dashboard, decimal CRUJI cooking/sales and supervision save/reload through real local APIs.')
finally:
 proc.terminate();proc.wait(timeout=10)
