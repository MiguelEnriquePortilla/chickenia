"""Real KPI UI/API/PostgreSQL. All data isolated; no real reports or inventory movements."""
import os,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
NODE=os.environ.get('NODE_BINARY',str(Path.home()/'AppData/Local/Programs/Python312/Lib/site-packages/playwright/driver/node.exe'))
proc=subprocess.Popen([NODE,'test/kpi-browser-server.js'],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
try:
 base=proc.stdout.readline().strip();assert base.startswith('http://127.0.0.1:'),base
 out=ROOT/'test/results';out.mkdir(exist_ok=True)
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='msedge');page=browser.new_page(viewport={'width':1280,'height':900});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/supervision.html');expect(page.locator('.kpi-cut')).to_have_count(4)
  page.locator('[data-cut="apertura"]').click()
  expect(page.locator('[data-product]')).to_have_count(3)
  for field in page.locator('[data-check] select').all():field.select_option('ready')
  for product in page.locator('[data-product]').all():
   product.locator('summary').click();product.locator('[data-field="available"]').fill('20');product.locator('[data-field="quality"]').select_option('approved')
  page.locator('#kpi-form [type=submit]').click();expect(page.locator('#kpi-feedback')).to_contain_text('guardada')
  expect(page.locator('.kpi-cut').first).to_contain_text('Reporte completo')
  page.reload();expect(page.locator('.kpi-cut').first).to_contain_text('Nancy (prueba local)')
  page.locator('[data-cut="ajuste"]').click()
  page.locator('#kpi-form [type=submit]').click();expect(page.locator('#kpi-feedback')).to_contain_text('guardada')
  expect(page.locator('.kpi-cut').nth(2)).to_contain_text('Reporte incompleto')
  for field in page.locator('[data-check] select').all():field.select_option('ready')
  for product in page.locator('[data-product]').all():
   product.locator('summary').click()
   for key,val in [('available','4'),('inProcess','2'),('remainingDemand','6'),('additional','0')]:product.locator('[data-field="'+key+'"]').fill(val)
   product.locator('[data-field="quality"]').select_option('approved');product.locator('[data-field="decision"]').select_option('stop');product.locator('[data-field="note"]').fill('Hay suficiente para la venta restante')
  page.locator('#kpi-form [type=submit]').click();expect(page.locator('#kpi-feedback')).to_contain_text('guardada')
  expect(page.locator('.kpi-cut').nth(2)).to_contain_text('Reporte completo')
  # Existing digital cash capture now exposes the fields needed to demonstrate a balanced close.
  page.goto(base+'/captura.html?mode=close&format=digital')
  page.get_by_text('Datos para comprobar el cuadre de caja',exact=True).click()
  for key in ['opening','cashSales','otherIn','refunds','withdrawals']:
   page.locator('[data-path="cash.'+key+'"]').fill('0')
  page.locator('#save').click();expect(page.locator('#save-status')).to_contain_text('guardado')
  page.locator('[data-step="3"]').click()
  page.get_by_text('Ventas y comprobación para el cierre de las 19:00',exact=True).click()
  page.locator('[data-path="salesTotal"]').fill('0')
  for key in ['cash','credit','debit','transfer','other']:
   page.locator('[data-path="payments.'+key+'.expected"]').fill('0')
   page.locator('[data-path="payments.'+key+'.confirmed"]').fill('0')
  page.locator('#save').click();expect(page.locator('#save-status')).to_contain_text('guardado')
  for route in ['/supervision.html','/dashboard.html']:
   page.goto(base+route);expect(page.locator('.kpi-cut')).to_have_count(4)
   for width in [390,1280]:
    page.set_viewport_size({'width':width,'height':900})
    for theme in ['light','dark']:
     page.evaluate('(theme)=>document.documentElement.dataset.theme=theme',theme)
     page.wait_for_function('document.documentElement.scrollWidth<=innerWidth',timeout=3000)
     page.screenshot(path=str(out/('kpi-'+route[1:-5]+'-'+str(width)+'-'+theme+'.png')),full_page=True)
  assert not errors,errors
  browser.close()
 print('PASS: real authenticated saves, product quality, 16:00 decisions, digital cash fields, reload, both pages and four layout variants')
finally:
 proc.terminate();proc.wait(timeout=15)
