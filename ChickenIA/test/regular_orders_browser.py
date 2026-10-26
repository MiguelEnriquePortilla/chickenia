"""Isolated static UI: no purchases or external messages are sent."""
import subprocess, os, time, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
PYTHON=os.environ.get('PYTHON_BINARY',str(Path.home()/'AppData/Local/Programs/Python312/python.exe'))
server=subprocess.Popen([PYTHON,'-m','http.server','8952','--bind','127.0.0.1','--directory',str(ROOT/'public')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
try:
 for _ in range(50):
  try: urllib.request.urlopen('http://127.0.0.1:8952/pedidos.html'); break
  except Exception: time.sleep(.1)
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='msedge' if os.name=='nt' else None)
  context=browser.new_context(viewport={'width':390,'height':844})
  context.add_init_script("Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>window.copied=t}}); Object.defineProperty(navigator,'share',{value:async d=>window.shared=d}); window.open=(url)=>window.opened=url;")
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8952/pedidos.html')
  page.evaluate("localStorage.setItem('chickenia_orders_2026_v1',JSON.stringify({'CENTRAL DE ABASTOS':{6:'999',7:'5',11:'4',20:'15',stock:{7:'2',11:'3'},note:'Conservar'},peregrinaExpanded20261011:true}))")
  page.reload()
  expect(page.locator('.orders-row')).to_have_count(21)
  expect(page.locator('#copy')).to_be_disabled()
  inputs=page.locator('.orders-row .order-quantity');inputs.nth(0).fill('2.5');inputs.nth(1).fill('0');inputs.nth(18).fill('13')
  stock_inputs=page.locator('.order-stock');stock_inputs.nth(0).fill('0');stock_inputs.nth(1).fill('7.5')
  page.locator('#note').fill('Entregar el lunes')
  page.locator('#copy').click();copied=page.evaluate('window.copied')
  assert '*LISTA DE PEDIDOS*' in copied and '*SAMS*' in copied and '*2.5 garrafas*' in copied and 'Member' not in copied and 'Habitual' not in copied and 'Sabroseador' in copied and 'Salsa de soya' not in copied and 'Entregar el lunes' in copied
  stock_inputs.nth(0).fill('1.5');page.locator('#copy').click();assert 'Existencia: 1.5 garrafas' in page.evaluate('window.copied')
  stock_inputs.nth(0).fill('0');page.locator('#copy').click()
  page.locator('#share').click();assert page.evaluate('window.shared.text')==copied
  page.locator('#whatsapp').click();assert page.evaluate('window.opened').startswith('https://wa.me/?text=')
  assert 'Existencia: 0 garrafas' in copied and 'Existencia: sin conteo' in copied
  from urllib.parse import urlparse, parse_qs
  assert parse_qs(urlparse(page.evaluate('window.opened')).query)['text'][0]==copied
  page.reload();expect(page.locator('.order-stock').nth(0)).to_have_value('0');expect(page.locator('.order-stock').nth(1)).to_have_value('7.5');expect(page.locator('.orders-row .order-quantity').first).to_have_value('2.5')
  page.get_by_role('button',name='PEREGRINA',exact=True).click();expect(page.locator('.orders-row')).to_have_count(25)
  expect(page.locator('.orders-row .order-quantity').first).to_have_value('')
  page.locator('.orders-row .order-quantity').first.fill('1')
  page.get_by_role('button',name='PLÁSTICOS',exact=True).click();expect(page.locator('.orders-row')).to_have_count(20)
  page.get_by_role('button',name='CENTRAL DE ABASTOS',exact=True).click();expect(page.locator('.orders-row')).to_have_count(16)
  expect(page.locator('.orders-row .order-quantity').nth(5)).to_have_value('5');expect(page.locator('.order-stock').nth(5)).to_have_value('2');expect(page.locator('.orders-row .order-quantity').nth(6)).to_have_value('4');expect(page.locator('.order-stock').nth(6)).to_have_value('3');expect(page.locator('.orders-row .order-quantity').nth(15)).to_have_value('15');page.reload();expect(page.locator('.orders-row')).to_have_count(21);page.get_by_role('button',name='CENTRAL DE ABASTOS',exact=True).click();expect(page.locator('.orders-row .order-quantity').nth(5)).to_have_value('5');page.locator('.orders-row .order-quantity').first.fill('4');page.locator('#copy').click();central=page.evaluate('window.copied');assert 'Existencia: 2' in central and 'Existencia: 3' in central and 'Existencia: sin conteo' in central;page.locator('#preview').click()
  expect(page.locator('#capture')).to_be_visible();expect(page.locator('#products')).to_be_hidden()
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  Path(ROOT/'test/results').mkdir(exist_ok=True)
  page.screenshot(path=str(ROOT/'test/results/pedidos-mobile.png'),full_page=True)
  page.locator('#preview').click();page.get_by_role('button',name='SAMS',exact=True).click()
  expect(page.locator('.orders-row .order-quantity').first).to_have_value('2.5')
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  page.screenshot(path=str(ROOT/'test/results/pedidos-existencias-mobile.png'),full_page=True)
  page.set_viewport_size({'width':1280,'height':900});page.screenshot(path=str(ROOT/'test/results/pedidos-desktop.png'),full_page=True)
  page.evaluate("document.documentElement.dataset.theme='dark'");assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  page.on('dialog',lambda dialog:dialog.accept());page.locator('#clear').click();expect(page.locator('#copy')).to_be_disabled()
  expect(page.locator('.order-stock').nth(0)).to_have_value('0');expect(page.locator('.order-stock').nth(1)).to_have_value('7.5')
  assert not errors,errors
  browser.close()
 print('PASS: catalogs, decimals, zero exclusion, supplier separation, persistence, copy/share/WhatsApp, capture, clear, mobile/desktop.')
finally:server.terminate();server.wait()
