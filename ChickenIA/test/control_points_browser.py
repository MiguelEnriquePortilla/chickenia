"""Mobile-first controls using the real API with an isolated PostgreSQL fixture."""
import subprocess,os,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1]
node=str(Path.home()/'AppData/Local/Programs/Python312/Lib/site-packages/playwright/driver/node.exe')
proc=subprocess.Popen([node,'test/checklist-timeline-browser-server.js'],cwd=root,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
try:
 base=proc.stdout.readline().strip();assert base.startswith('http'),base
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='msedge');page=browser.new_page(viewport={'width':390,'height':844});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/supervision.html',wait_until='domcontentloaded')
  expect(page.locator('.points-area')).to_have_count(10)
  expect(page.locator('.points-tabs button')).to_have_count(4)
  expect(page.locator('.points-tabs button:disabled')).to_have_count(3)
  expect(page.locator('#point-clock')).not_to_be_empty()
  expect(page.locator('#point-window')).to_contain_text('Antes de 10:00')
  assert not page.locator('#point-attendance').evaluate('(e)=>e.open')
  page.locator('.points-tabs button').first.click()
  page.locator('.points-area').first.locator('summary').click()
  checkbox=page.locator('.points-area').first.locator('input').first
  checkbox.check();expect(page.locator('#point-status')).to_have_text(re.compile('Guardado|Corrección guardada'))
  page.reload(wait_until='domcontentloaded');expect(page.locator('.points-area')).to_have_count(10)
  page.locator('.points-tabs button').first.click();page.locator('.points-area').first.locator('summary').click()
  expect(page.locator('.points-area').first.locator('input').first).to_be_checked()
  out=root/'test/results';out.mkdir(exist_ok=True)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844})
   for theme in ['light','dark']:
    page.evaluate('(theme)=>document.documentElement.dataset.theme=theme',theme)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(out/f'points-supervision-{width}-{theme}.png'),full_page=True)
  page.goto(base+'/dashboard.html',wait_until='domcontentloaded')
  expect(page.locator('.points-dashboard')).to_be_visible()
  expect(page.locator('.points-dashboard > .points-bar-row .points-track')).to_have_count(10)
  expect(page.locator('#areas-card')).not_to_be_visible()
  expect(page.locator('#checklist-timeline table')).to_have_count(0)
  page.locator('.points-history summary').click()
  expect(page.locator('.points-history')).to_contain_text('85%')
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844})
   for theme in ['light','dark']:
    page.evaluate('(theme)=>document.documentElement.dataset.theme=theme',theme)
    page.wait_for_timeout(300)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(out/f'points-dashboard-{width}-{theme}.png'),full_page=True)
  page.goto(base+'/dashboard.html?date=2026-10-06',wait_until='domcontentloaded')
  expect(page.locator('.points-dashboard')).to_contain_text('Checklist anterior')
  expect(page.locator('#checklist-timeline table')).to_have_count(0)
  assert not errors,errors
  browser.close()
 print('PASS: real API save/reload, four cuts, charts without grid, history, 320/390/1280 mobile/desktop and both themes')
finally:
 proc.terminate();proc.wait(timeout=15)



