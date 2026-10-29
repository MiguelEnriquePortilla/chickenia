import subprocess,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
NODE=str(Path.home()/'AppData/Local/Programs/Python312/Lib/site-packages/playwright/driver/node.exe')
proc=subprocess.Popen([NODE,'test/protein-browser-server.js'],cwd=ROOT,env={**os.environ,'TEST_PROTEIN_DASHBOARD':'1'},stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
try:
 base=proc.stdout.readline().strip();assert base.startswith('http://127.0.0.1:'),base
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='msedge');page=browser.new_page();errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('https://**/*',lambda r:r.abort())
  page.route('**/api/summary?calibre=1*',lambda r:r.fulfill(json={'start':'2026-09-21','weekly':{'dates':[],'areas':[]}}))
  out=ROOT/'.local/platform';out.mkdir(parents=True,exist_ok=True)
  for width in [320,390,1440]:
   page.set_viewport_size({'width':width,'height':844})
   for name in ['pedidos','dashboard','rastro','proteinas','proteinas-movil']:
    page.goto(base+'/'+name+'.html?date=2026-09-26');page.wait_for_timeout(300)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(name,width)
    assert not any(chr(c) in page.locator('body').inner_text() for c in [0x2192,0x2190,0x203a,0x25b8,0x25be]),(name,'direction glyph')
    expect(page.locator('h1:visible').first).to_be_visible()
    if width<761:
     expect(page.locator('.area-shell')).to_have_css('padding-left','0px')
     page.locator('.sidebar-toggle').click();expect(page.locator('.sidebar-backdrop')).to_be_visible()
     assert page.locator('main').first.evaluate('(el)=>el.inert')
     for _ in range(22):
      page.keyboard.press('Tab');assert page.evaluate("!!document.activeElement.closest('.area-sidebar')"),(name,width,'menu focus')
     page.keyboard.press('Escape');expect(page.locator('.sidebar-backdrop')).to_be_hidden()
    for theme in ['light','dark']:
     page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme)
     page.screenshot(path=str(out/f'{name}-{width}-{theme}.png'))
  assert not errors,errors
  browser.close()
 print('PASS shared platform: five active pages, 320/390/1440, both themes, headings and menu dismiss. Isolated data only.')
finally:
 proc.terminate();proc.wait(timeout=15)
