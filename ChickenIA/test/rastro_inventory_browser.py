"""Rastro UI against real API and isolated PostgreSQL; never production data."""
import os, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
proc=subprocess.Popen([os.environ['NODE_BINARY'],'test/protein-browser-server.js'],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
out=ROOT/'test/results/rastro';out.mkdir(parents=True,exist_ok=True)
try:
 base=proc.stdout.readline().strip();assert base.startswith('http://127.0.0.1:')
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='msedge');page=browser.new_page(viewport={'width':390,'height':844})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  accept={'yes':True};page.on('dialog',lambda d:d.accept() if accept['yes'] else d.dismiss())
  page.goto(base+'/rastro.html?date=2026-09-14');expect(page.locator('#save')).to_be_enabled()
  card=page.locator('[data-id="1"]');card.locator('[data-key="initial"]').fill('10');card.locator('[data-key="entry"]').fill('5');card.locator('[data-key="exit"]').fill('3')
  page.locator('#save').click();expect(card.locator('[data-balance]')).to_have_text('12 kg')
  page.locator('#rectify').click();page.locator('#correct-item').select_option('1');page.locator('#correct-quantity').fill('9.5');page.locator('#correct-notes').fill('Salida capturada como entrada')
  expect(page.locator('#correct-preview')).to_contain_text('9.5 kg')
  accept['yes']=False;page.locator('#correction-form button[type=submit]').click();expect(page.locator('#correct-quantity')).to_have_value('9.5')
  accept['yes']=True
  page.screenshot(path=str(out/'correction-mobile.png'),full_page=True)
  page.locator('#correction-form button[type=submit]').click();expect(page.locator('#status')).to_contain_text('rectificado correctamente');expect(card.locator('[data-balance]')).to_have_text('9.5 kg')
  page.reload();expect(card.locator('[data-balance]')).to_have_text('9.5 kg')
  page.locator('#rectify').click();page.locator('#correct-item').select_option('1');page.locator('#correct-quantity').fill('9.5');page.locator('#correct-notes').fill('Misma cantidad');page.locator('#correction-form button[type=submit]').click()
  expect(page.locator('#correct-error')).to_contain_text('igual');expect(page.locator('#correct-quantity')).to_have_value('9.5');page.locator('#correct-cancel').click()
  for date,key,quantity,balance in [('2026-09-15','entry','2','11.5 kg'),('2026-09-16','exit','1','10.5 kg')]:
   page.locator('#date').fill(date);page.locator('#date').dispatch_event('change');expect(page.locator('#status')).to_contain_text(date)
   card.locator('[data-key="'+key+'"]').fill(quantity);page.locator('#save').click();expect(card.locator('[data-balance]')).to_have_text(balance)
  page.goto(base+'/dashboard.html?date=2026-09-16');host=page.locator('#rastro-overview');expect(host).to_contain_text('10.5 kg')
  expect(host.locator('thead th')).to_have_count(4);expect(host).to_contain_text('9.5 kg');expect(host).to_contain_text('11.5 kg');expect(host).to_contain_text('Salida capturada como entrada')
  for width in [390,1280]:
   page.set_viewport_size({'width':width,'height':950})
   for theme in ['light','dark']:
    page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    host.screenshot(path=str(out/('history-'+theme+'-'+str(width)+'.png')))
  page.goto(base+'/dashboard.html?date=2026-09-13');expect(host).to_contain_text('Sin captura');expect(host).not_to_contain_text('9.5 kg')
  assert not errors,errors
  browser.close()
 print('PASS: Rastro correction, cancellation, no-op, persistence, 3-day history, mobile and both themes.')
finally:
 proc.terminate();proc.wait(timeout=10)
