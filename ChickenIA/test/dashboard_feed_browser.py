"""Real inventory APIs and isolated PostgreSQL; dashboard-only mobile presentation."""
import os,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
NODE=os.environ.get('NODE_BINARY',str(Path.home()/'AppData/Local/Programs/Python312/Lib/site-packages/playwright/driver/node.exe'))
proc=subprocess.Popen([NODE,'test/protein-browser-server.js'],cwd=ROOT,env={**os.environ,'TEST_PROTEIN_DASHBOARD':'1'},stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
try:
 base=proc.stdout.readline().strip();assert base.startswith('http://127.0.0.1:')
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='msedge');page=browser.new_page(viewport={'width':390,'height':844});errors=[];writes=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda r:writes.append(r.url) if '/api/' in r.url and r.method=='POST' else None)
  page.route('https://**/*',lambda r:r.abort())
  # Evaluation shape is covered against its real handler by equipo_checklist_browser.
  page.route('**/api/summary?calibre=1*',lambda r:r.fulfill(json={'start':'2026-10-01','weekly':{'dates':['2026-10-'+str(i) for i in range(19,26)],'areas':[{'code':'cocina','name':'Cocina','days':[{'date':'2026-09-26','score':120,'done':14,'total':14}]}]}}))
  page.goto(base+'/dashboard.html?date=2026-09-26')
  host=page.locator('#protein-overview');expect(host.locator('.feed-card')).to_have_count(3)
  expect(host).to_contain_text('160');expect(host).to_contain_text('Destino: Móvil')
  expect(page.locator('#equipo-weekly .feed-card')).to_have_count(1)
  expect(page.locator('#equipo-weekly')).to_contain_text('120%')
  expect(host.locator('table')).to_have_count(0)
  page.locator('#resumen-proteins>summary').click()
  host.locator('summary').first.click();expect(host.locator('.feed-history').first).to_be_visible()
  expect(host.locator('.feed-history').first).to_contain_text('Llegó')
  page.locator('#resumen-proteins .summary-section-tools button').click()
  dialog=page.locator('.summary-share-dialog');expect(dialog).to_be_visible();expect(dialog.locator('pre')).to_contain_text('26/09/2026')
  expect(dialog.locator('pre')).to_contain_text('Destino: Móvil')
  href=dialog.locator('a').first.get_attribute('href');assert href.startswith('https://wa.me/?text=')
  dialog.locator('[data-image]').click();expect(dialog.locator('img')).to_be_visible();expect(dialog.locator('a[download]')).to_be_visible()
  dialog.locator('[data-close]').click()
  host.locator('[data-summary-report]').first.click();expect(dialog.locator('pre')).not_to_contain_text('Destino: Móvil');dialog.locator('[data-close]').click()
  for width in [320,390,1440]:
   page.set_viewport_size({'width':width,'height':844})
   page.wait_for_timeout(200)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
   if width<761:
    expect(page.locator('#app-content')).to_have_css('padding-left','0px')
    page.locator('.sidebar-toggle').click();expect(page.locator('.primary-navigation')).to_be_visible();page.locator('.summary-tree a').last.click();expect(page.locator('#resumen-cedis')).to_have_attribute('open','');expect(page.locator('#date-input')).to_have_value('2026-09-26')
   out=ROOT/'.local/dashboard-feed';out.mkdir(parents=True,exist_ok=True)
   page.evaluate('window.scrollTo(0,0)');page.screenshot(path=str(out/f'feed-{width}.png'))
  page.locator('#date-input').fill('2026-09-20');page.locator('#date-input').press('Tab');expect(host).to_contain_text('Sin captura')
  page.evaluate("document.documentElement.dataset.theme='dark'");page.screenshot(path=str(out/'feed-dark.png'))
  assert not errors,errors
  assert not writes,writes
  browser.close()
 print('PASS: vertical cards, both inventories, real balances, empty dates, week details, 320/390/1440, sidebar and dark theme. No production writes.')
finally:
 proc.terminate();proc.wait(timeout=15)
