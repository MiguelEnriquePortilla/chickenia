"""Real protein API and PostgreSQL in memory; other dashboard APIs are explicit fixtures."""
import os, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
NODE=os.environ['NODE_BINARY']
proc=subprocess.Popen([NODE,'test/protein-browser-server.js'],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
out=ROOT/'test/results/proteins';out.mkdir(parents=True,exist_ok=True)
try:
 base=proc.stdout.readline().strip()
 assert base.startswith('http://127.0.0.1:'),base
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='msedge')
  page=browser.new_page(viewport={'width':1280,'height':950});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/proteinas.html?date=2026-09-14');expect(page.locator('#action')).to_have_value('initial')
  expect(page.locator('#balances')).to_contain_text('Sin captura')
  def save(action,values):
   page.locator('#action').select_option(action)
   for key,value in values.items():
    el=page.locator('#'+key)
    if el.evaluate('(e)=>e.tagName')=='SELECT':el.select_option(str(value))
    else:el.fill(str(value))
   page.locator('#save').click()
   expect(page.locator('#status')).to_contain_text('Movimiento guardado correctamente')
   expect(page.locator('#error')).to_be_empty()
  save('initial',{'raw':232,'marinated':100})
  save('send',{'amount':60,'slot':'morning'})
  expect(page.locator('#balances .protein-card').first.locator('.protein-total')).to_contain_text('272')
  save('marinate',{'amount':10.125})
  save('receive',{'amount':59.5,'notes':'Falta medio pollo'})
  expect(page.locator('#shipments')).to_contain_text('-0.5')
  save('count',{'raw':221.875,'marinated':50.125})
  page.locator('#protein').select_option('cruji');save('initial',{'raw':180,'marinated':45});save('send',{'amount':30,'slot':'noon'})
  page.reload();expect(page.locator('#balances .protein-card').nth(1).locator('.protein-total')).to_contain_text('195')
  # A failing save retains input and never reports success.
  page.locator('#action').select_option('send');page.locator('#amount').fill('999');page.locator('#save').click()
  expect(page.locator('#error')).to_contain_text('supera');expect(page.locator('#amount')).to_have_value('999')
  page.on('dialog',lambda dialog:dialog.accept());page.locator('#reload').click();expect(page.locator('#error')).to_be_empty()
  for route in ['/proteinas.html?date=2026-09-14','/dashboard.html?date=2026-09-14','/supervision.html?area=supervision&date=2026-09-14']:
   page.goto(base+route)
   if route.startswith('/dashboard'):
    expect(page.locator('#protein-overview')).to_contain_text('272')
    expect(page.locator('#protein-overview')).to_contain_text('1 envíos pendientes')
    page.locator('#protein-overview summary').click();expect(page.locator('#protein-overview tfoot').first).to_contain_text('60')
   elif route.startswith('/supervision'):
    expect(page.locator('[data-report=proteins]')).to_have_attribute('href','/proteinas.html?date=2026-09-14')
   else:expect(page.locator('#balances')).to_contain_text('272')
   for theme in ['light','dark']:
    page.evaluate('(t)=>{document.documentElement.dataset.theme=t;localStorage.setItem("chickenia_theme",t)}',theme)
    for width in [390,1280]:
     page.set_viewport_size({'width':width,'height':950})
     page.wait_for_timeout(300)
     page.screenshot(path=str(out/(route.split('?')[0].strip('/').replace('.html','')+'-'+theme+'-'+str(width)+'.png')),full_page=True)
     assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(route,theme,width,page.evaluate('Array.from(document.querySelectorAll("body *")).filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>[e.tagName,e.id,e.className]).slice(0,10)'))
  # Historical date selection loads the selected date, with no future stock leakage.
  page.goto(base+'/dashboard.html?date=2026-09-13');expect(page.locator('#protein-overview')).to_contain_text('Sin captura')
  assert not errors,errors
  browser.close()
 print('PASS: real local protein saves, decimal balances, receipts, counts, errors, reload, dashboard, navigation, both themes and mobile/desktop.')
finally:
 proc.terminate();proc.wait(timeout=10)
