"""Fixed protein form against the real API and isolated in-memory PostgreSQL."""
import os, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
proc=subprocess.Popen([os.environ['NODE_BINARY'],'test/protein-browser-server.js'],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
try:
 base=proc.stdout.readline().strip()
 assert base.startswith('http://127.0.0.1:'),base
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='msedge')
  page=browser.new_page(viewport={'width':390,'height':844});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  dialog_handler=lambda d:d.accept()
  page.on('dialog',dialog_handler)
  page.goto(base+'/proteinas.html?date=2026-09-14')
  expect(page.locator('#balances')).to_contain_text('Sin captura')
  page.locator('#other-operations summary').click()
  def auxiliary(action,values):
   page.locator('#action').select_option(action)
   for key,value in values.items():page.locator('#'+key).fill(str(value))
   page.locator('#save').click()
   expect(page.locator('#status')).to_contain_text('guardado correctamente')
   expect(page.locator('#error')).to_be_empty()
  auxiliary('initial',{'raw':100,'marinated':40})
  page.locator('#protein').select_option('cruji')
  auxiliary('initial',{'raw':10,'marinated':0})
  def field(protein,key):return page.locator('[data-protein="'+protein+'"] [data-key="'+key+'"]')
  for key,value in [('entry',20),('marinate',30),('send',50)]:field('rosti',key).fill(str(value))
  field('cruji','marinate').fill('2.5');field('cruji','send').fill('3')
  expect(page.locator('[data-protein="rosti"] [data-result]')).to_contain_text('110 pollos')
  expect(page.locator('[data-protein="cruji"] [data-result]')).to_contain_text('No hay suficientes')
  page.locator('#save-movements').click()
  expect(page.locator('#error')).to_contain_text('supera')
  expect(field('rosti','entry')).to_have_value('20')
  field('cruji','send').fill('2.5')
  page.locator('#delivered-by').fill('Eliseo');page.locator('#received-by').fill('Nancy')
  page.locator('#save-movements').click()
  expect(page.locator('#status')).to_contain_text('Movimientos guardados correctamente')
  expect(field('rosti','entry')).to_have_value('')
  expect(page.locator('[data-protein="rosti"] [data-result]')).to_contain_text('110 pollos')
  page.reload()
  expect(page.locator('[data-protein="cruji"] [data-result]')).to_contain_text('7.5 pollos')
  page.locator('#other-operations summary').click()
  auxiliary('receive',{'amount':50})
  expect(page.locator('[data-protein="rosti"] [data-result]')).to_contain_text('110 pollos')
  auxiliary('count',{'raw':90,'marinated':20})
  page.locator('#rectify-shortcut').click()
  page.locator('#raw').fill('89.5');page.locator('#marinated').fill('20');page.locator('#notes').fill('Conteo revisado')
  page.locator('#save').click()
  expect(page.locator('#status')).to_contain_text('Inventario rectificado correctamente')
  expect(page.locator('[data-protein="rosti"] [data-result]')).to_contain_text('109.5 pollos')
  expect(page.locator('#reset-shortcut')).to_be_disabled()
  today=page.evaluate("new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City'}).format(new Date())")
  page.locator('#date').fill(today);page.locator('#date').press('Tab')
  expect(page.locator('#reset-shortcut')).to_be_enabled()
  page.remove_listener('dialog',dialog_handler)
  page.on('dialog',lambda d:d.accept('Arqueo de prueba' if d.type=='prompt' else ''))
  page.locator('#reset-shortcut').click()
  expect(page.locator('#status')).to_contain_text('reiniciadas en cero')
  for protein in ['rosti','cruji']:
   expect(page.locator('[data-protein="'+protein+'"] [data-result]')).to_contain_text('0 pollos')
  expect(page.locator('#shipments')).to_contain_text('0 envíos pendientes')
  page.reload()
  expect(page.locator('#reset-info')).to_contain_text('Ciclo reiniciado')
  page.locator('#rectify-shortcut').click()
  page.locator('#raw').fill('12.125');page.locator('#marinated').fill('0');page.locator('#notes').fill('Arqueo físico después del reinicio')
  page.locator('#save').click()
  try:expect(page.locator('#status')).to_contain_text('Inventario rectificado correctamente')
  except Exception:
   print('Errors:',errors,'API:',page.locator('#error').inner_text());raise
  expect(page.locator('[data-protein="rosti"] [data-result]')).to_contain_text('12.125 pollos')
  for width in [390,1280]:
   page.set_viewport_size({'width':width,'height':900})
   for theme in ['light','dark']:
    page.evaluate('(theme)=>document.documentElement.dataset.theme=theme',theme)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,theme)
  assert not errors,errors
  browser.close()
 print('PASS: fixed form, atomic failure, decimals, reload, receipt, count, correction, mobile and desktop')
finally:
 proc.terminate();proc.wait(timeout=15)
