import os, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
NODE=str(Path.home()/'AppData/Local/Programs/Python312/Lib/site-packages/playwright/driver/node.exe')
proc=subprocess.Popen([NODE,'test/calibre-browser-server.js'],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
try:
 base=proc.stdout.readline().strip()
 assert base.startswith('http://127.0.0.1:'),base
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='msedge')
  page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce');errors=[]
  page.route('https://**/*',lambda route:route.abort())
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/supervision.html?date=2026-10-21',wait_until='domcontentloaded')
  expect(page.locator('.calibre-area')).to_have_count(8)
  caja=page.locator('[data-code="caja"]');caja.locator('details').first.locator('summary').click()
  first=caja.locator('[data-action="point"]').first
  first.locator('select').select_option('done');first.locator('button').click()
  expect(page.locator('#calibre-status')).to_contain_text('Guardado')
  page.reload();expect(page.locator('.calibre-area')).to_have_count(8)
  caja=page.locator('[data-code="caja"]');caja.locator('details').first.locator('summary').click()
  expect(caja.locator('[data-action="point"]').first.locator('select')).to_have_value('done')
  caja.locator('details').nth(1).locator('summary').click()
  sample=caja.locator('[data-action="sample"]');sample.locator('[name="total"]').fill('5');sample.locator('[name="passed"]').fill('4');sample.locator('textarea').fill('Forma de pago por corregir');sample.locator('button').click()
  expect(page.locator('#calibre-status')).to_contain_text('Guardado')
  expect(caja).to_contain_text('4/5')
  caja.locator('[data-action="sample"]').locator('[name="total"]').fill('5');caja.locator('[data-action="sample"]').locator('[name="passed"]').fill('5');caja.locator('[data-action="sample"]').locator('button').click()
  expect(caja.locator('[role="alert"]')).to_contain_text('original')
  page.once('dialog',lambda d:d.accept());page.locator('#calibre-reload').click();expect(page.locator('#calibre-status')).to_have_text('')
  page.locator('[data-share="caja"]').click();page.locator('#calibre-prepare').click()
  expect(page.locator('#calibre-message')).to_contain_text('AS')
  expect(page.get_by_role('link',name='Abrir WhatsApp')).to_have_attribute('href',__import__('re').compile(r'https://wa.me/\?text='))
  assert not page.locator('#calibre-message pre').inner_text().find('Forma de pago por corregir')>=0
  page.locator('#calibre-dialog-close').click();page.reload()
  page.locator('.calibre-history>summary').click();expect(page.locator('#calibre-history')).to_contain_text('AS')
  output=ROOT/'.local'/'calibre-preview';output.mkdir(parents=True,exist_ok=True)
  page.screenshot(path=str(output/'desktop.png'),full_page=True)
  for width in [320,390]:
   page.set_viewport_size({'width':width,'height':844})
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), page.evaluate('Array.from(document.querySelectorAll("body *")).filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width,text:e.textContent.slice(0,40)}))')
   page.screenshot(path=str(output/f'mobile-{width}.png'))
  page.evaluate("document.documentElement.dataset.theme='dark'");page.screenshot(path=str(output/'dark.png'))
  lavado=page.locator('[data-code="trastes"]')
  lavado.locator('details').first.locator('summary').click()
  for idx in range(7):
   form=lavado.locator('[data-action="point"]').nth(idx)
   form.locator('select').select_option('done');form.locator('button').click()
   expect(page.locator('#calibre-status')).to_contain_text('Guardado')
  lavado.locator('details').nth(1).locator('summary').click()
  for slot in ['arranque','comida','precierre']:
   form=lavado.locator('[data-action="sample"]');form.locator('[name="slot"]').select_option(slot)
   form.locator('[name="total"]').fill('1');form.locator('[name="passed"]').fill('1');form.locator('button').click()
   expect(page.locator('#calibre-status')).to_contain_text('Guardado')
  lavado.locator('[data-open="trastes:extra"]>summary').click()
  form=lavado.locator('[data-action="extra-plan"]');form.locator('[name="associate"]').fill('Asociado de prueba');form.locator('[name="expected"]').fill('Anticipar insertos para comida');form.locator('button').click()
  expect(page.locator('#calibre-status')).to_contain_text('Guardado')
  form=lavado.locator('[data-action="extra-verify"]');form.locator('[name="achieved"]').check();form.locator('[name="result"]').fill('Insertos disponibles antes de necesitarlos');form.locator('button').click()
  expect(page.locator('#calibre-status')).to_contain_text('Guardado')
  expect(lavado.locator('.calibre-result')).to_contain_text('120%')
  lavado.locator('[data-action="close"] button').click();expect(page.locator('#calibre-status')).to_contain_text('Guardado')
  page.reload();expect(page.locator('[data-code="trastes"] .calibre-result')).to_contain_text('Calibre Chicanito')
  page.locator('[data-share="trastes"]').click();page.locator('#calibre-kind').select_option('cierre');page.locator('#calibre-prepare').click()
  expect(page.locator('#calibre-message')).to_contain_text('120%')
  assert 'Provisional' not in page.locator('#calibre-message pre').inner_text()
  page.locator('#calibre-dialog-close').click()
  page.goto(base+'/dashboard.html?date=2026-10-21',wait_until='domcontentloaded')
  expect(page.locator('#calibre-app .calibre-area')).to_have_count(8)
  expect(page.locator('#calibre-app [data-code="trastes"]')).to_contain_text('120%')
  expect(page.locator('#areas-card')).to_be_hidden()
  page.route('**/api/summary?calibre=1*',lambda route:route.fulfill(status=503,content_type='application/json',body='{"error":"Prueba de red: reintenta"}'))
  page.locator('#calibre-reload').click();expect(page.locator('#calibre-status')).to_contain_text('Prueba de red')
  assert not errors,errors
  browser.close()
 print('PASS: real API + isolated PostgreSQL, save/reload, immutable samples, report preview/history, mobile, dark, network failure. No WhatsApp sent.')
finally:
 proc.terminate();proc.wait(timeout=15)
