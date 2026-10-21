import subprocess,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
NODE=str(Path.home()/'AppData/Local/Programs/Python312/Lib/site-packages/playwright/driver/node.exe')
proc=subprocess.Popen([NODE,'test/calibre-browser-server.js'],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
try:
 base=proc.stdout.readline().strip();assert base.startswith('http://127.0.0.1:')
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='msedge');page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce');errors=[]
  page.route('https://**/*',lambda r:r.abort());page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/supervision.html?date=2026-10-21&area=cocina',wait_until='domcontentloaded')
  expect(page).to_have_url(re.compile('evaluacion-equipo.html'))
  expect(page.locator('.equipo-point')).to_have_count(14)
  expect(page.locator('.area-sidebar')).to_be_visible()
  expect(page.locator('#equipo-sheet select')).to_have_count(0)
  expect(page.locator('#equipo-sheet button')).to_have_count(0)
  first=page.locator('.equipo-point').first
  first.locator('[type=checkbox]').check();expect(page.locator('#equipo-status')).to_have_text('\u00a1Guardado!')
  first.locator('[type=text]').fill('Nota conservada');expect(page.locator('#equipo-status')).to_have_text('\u00a1Guardado!')
  page.reload();expect(page.locator('.equipo-point').first.locator('[type=checkbox]')).to_be_checked()
  expect(page.locator('.equipo-point').first.locator('[type=text]')).to_have_value('Nota conservada')
  # A failed write must keep the local checkbox/note and offer a retry.
  page.route('**/api/summary?calibre=1*',lambda r:r.fulfill(status=503,content_type='application/json',body='{"error":"No se pudo guardar"}') if r.request.method=='POST' else r.continue_())
  page.locator('.equipo-point').nth(1).locator('[type=checkbox]').check();expect(page.locator('#equipo-retry')).to_be_visible();expect(page.locator('.equipo-point').nth(1).locator('[type=checkbox]')).to_be_checked()
  page.unroute('**/api/summary?calibre=1*');page.locator('#equipo-retry').click();expect(page.locator('#equipo-status')).to_have_text('\u00a1Guardado!')
  out=ROOT/'.local'/'equipo-checklist-preview';out.mkdir(parents=True,exist_ok=True)
  page.screenshot(path=str(out/'checklist-desktop.png'))
  for width in [320,390]:
   page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/f'checklist-{width}.png'))
  page.evaluate("document.documentElement.dataset.theme='dark'");page.screenshot(path=str(out/'checklist-dark.png'))
  page.set_viewport_size({'width':1440,'height':1000})
  page.goto(base+'/dashboard.html?date=2026-10-21',wait_until='domcontentloaded')
  expect(page.locator('.area-sidebar')).to_be_visible();expect(page.locator('#calibre-app')).to_have_count(0)
  table=page.locator('#equipo-weekly table');expect(table.locator('tbody tr')).to_have_count(8);expect(table.locator('tbody td')).to_have_count(56)
  cell=table.locator('a[href="/evaluacion-equipo.html?area=cocina&date=2026-10-21"]');expect(cell).to_contain_text('14.2%')
  empty=table.locator('a[href="/evaluacion-equipo.html?area=caja&date=2026-10-21"]');expect(empty).to_have_text('Sin revisi\u00f3n')
  expect(page.locator('#checklist-timeline')).to_be_hidden()
  page.screenshot(path=str(out/'dashboard-desktop.png'))
  for width in [320,390]:
   page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  cell.click();expect(page.locator('#equipo-area')).to_have_value('cocina');expect(page.locator('#calibre-date')).to_have_value('2026-10-21');expect(page.locator('.equipo-point').first.locator('[type=checkbox]')).to_be_checked()
  page.locator('#calibre-date').fill('2026-10-20');page.locator('#calibre-date').press('Tab');expect(page.locator('#equipo-status')).to_contain_text('hist\u00f3rico');expect(page.locator('.equipo-point').first.locator('[type=checkbox]')).to_be_disabled()
  assert not errors,errors;browser.close()
 print('PASS: simple checklist autosave/reload/retry, preserved note, read-only history, sidebar, 8x7 weekly table, no-review vs score, exact drilldown, mobile/dark. No real operations.')
finally:
 proc.terminate();proc.wait(timeout=15)
