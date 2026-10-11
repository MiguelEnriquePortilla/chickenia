import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1]
proc=subprocess.Popen(['python','-m','http.server','8769','--bind','127.0.0.1','--directory','public'],cwd=root,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='msedge');page=browser.new_page(viewport={'width':1280,'height':850})
  page.route('**/*',lambda r:r.continue_() if '127.0.0.1:8769' in r.request.url else r.abort())
  for route in ['produccion-diaria.html','supervision.html','proteinas.html','proteinas-movil.html','rastro.html','captura.html','preguntale.html']:
   page.goto('http://127.0.0.1:8769/'+route,wait_until='networkidle')
   expect(page.locator('.area-sidebar')).to_have_count(1)
   if route=='captura.html':
    assert page.locator('.area-sidebar').evaluate('(el)=>getComputedStyle(el).position')=='fixed'
    page.screenshot(path=str(root/'public/cash-navigation-review.png'))
   links=page.locator('.primary-navigation a').evaluate_all('(links)=>links.map(a=>new URL(a.href).pathname)')
   assert links==['/','/supervision.html','/produccion-diaria.html','/rastro.html','/proteinas.html','/proteinas-movil.html','/captura.html','/dashboard.html'],links
   for dest in ['/supervision.html','produccion-diaria.html','/dashboard.html','/proteinas.html','/proteinas-movil.html','/rastro.html','/captura.html']:
    assert '/'+dest.lstrip('/') in links,(route,dest)
   for width in [320,390,1280]:
    page.set_viewport_size({'width':width,'height':850});page.wait_for_timeout(250)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(route,width,page.evaluate('Array.from(document.querySelectorAll("*")).filter(e=>e.getBoundingClientRect().right>innerWidth).map(e=>[e.tagName,e.className,e.getBoundingClientRect().right]).slice(0,12)'))
  page.goto('http://127.0.0.1:8769/')
  expect(page.locator('#chicken-welcome')).to_be_visible()
  page.locator('.chicken-welcome__skip').click()
  expect(page.locator('#chicken-home')).to_be_visible()
  assert page.locator('a[href="/preguntale.html"]').count()==0
  page.goto('http://127.0.0.1:8769/produccion-diaria.html')
  page.locator('.primary-navigation a').first.click()
  expect(page.locator('#chicken-welcome')).to_be_hidden()
  page.reload();expect(page.locator('#chicken-welcome')).to_be_visible()
  page.close()
  page=browser.new_page()
  page.route('**/*',lambda r:r.continue_() if '127.0.0.1:8769' in r.request.url else r.abort())
  page.goto('http://127.0.0.1:8769/')
  expect(page.locator('#chicken-welcome')).to_be_visible()
  browser.close()
 print('Shared navigation, direct destinations, mobile widths and no repeated splash passed')
finally:proc.terminate();proc.wait(timeout=10)
