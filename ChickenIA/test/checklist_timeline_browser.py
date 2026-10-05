"""Single checklist, actual checks API/journal, and isolated timeline chart on mobile/desktop."""
import os, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
NODE=os.environ.get('NODE_BINARY',str(Path.home()/'AppData/Local/Programs/Python312/Lib/site-packages/playwright/driver/node.exe'))
proc=subprocess.Popen([NODE,'test/checklist-timeline-browser-server.js'],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
try:
 base=proc.stdout.readline().strip();assert base.startswith('http://127.0.0.1:'),base
 out=ROOT/'test/results';out.mkdir(exist_ok=True)
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='msedge');page=browser.new_page(viewport={'width':1280,'height':900});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/supervision.html?area=general',wait_until='domcontentloaded')
  expect(page.locator('#checklist-timeline')).to_contain_text('no hay otra lista')
  expect(page.locator('#kpi-panel, #kpi-form, #daily-checkpoints')).to_have_count(0)
  page.locator('#supervisor-input').fill('Nancy prueba');page.locator('#supervisor-input').blur()
  row=page.locator('[data-activity-id="1"]')
  header=page.locator('[data-area-code="cocina"] .accordion-header')
  if header.get_attribute('aria-expanded')!='true':header.click()
  row.locator('.chk').check()
  expect(row.locator('.chk')).to_be_checked()
  expect(row).to_have_class('activity-row done just-saved')
  page.reload(wait_until='domcontentloaded');expect(page.locator('[data-activity-id="1"] .chk')).to_be_checked()
  page.goto(base+'/dashboard.html?date=2026-10-06',wait_until='domcontentloaded')
  expect(page.locator('.timeline-segment')).to_have_count(12)
  expect(page.locator('[data-area="caja"][data-index="0"]')).to_contain_text('0%')
  expect(page.locator('[data-area="caja"][data-index="1"]')).to_contain_text('100%')
  expect(page.locator('[data-area="ventas_barras"][data-index="1"]')).to_contain_text('75%')
  expect(page.locator('[data-area="ventas_barras"][data-index="2"]')).to_contain_text('100%')
  expect(page.locator('[data-area="cocina"][data-index="3"]')).to_contain_text('En curso')
  page.locator('[data-area="caja"][data-index="0"]').click()
  expect(page.locator('#timeline-detail')).to_contain_text('Fondo de caja')
  page.locator('.timeline-history summary').click();expect(page.locator('.timeline-history')).to_contain_text('7 días')
  page.once('dialog',lambda d:d.accept('Prueba de día sin operación'))
  page.locator('[data-calendar]').click();expect(page.locator('#checklist-timeline')).to_contain_text('Día sin operación: excluido')
  page.once('dialog',lambda d:d.accept('Restablecer día de prueba'))
  page.locator('[data-calendar]').click();expect(page.locator('[data-calendar]')).to_contain_text('Marcar día sin operación')
  for route in ['/supervision.html?area=general','/dashboard.html?date=2026-10-06']:
   page.goto(base+route,wait_until='domcontentloaded');expect(page.locator('#checklist-timeline')).not_to_contain_text('Cargando')
   for width in [390,1280]:
    page.set_viewport_size({'width':width,'height':900})
    for theme in ['light','dark']:
     page.evaluate('(theme)=>document.documentElement.dataset.theme=theme',theme)
     page.wait_for_timeout(250)  # Wait for the existing sidebar padding transition after resizing.
     page.wait_for_function('document.documentElement.scrollWidth<=innerWidth',timeout=3000)
     page.screenshot(path=str(out/('timeline-'+route[1:].split('.')[0]+'-'+str(width)+'-'+theme+'.png')),full_page=True)
  assert not errors,errors
  browser.close()
 print('PASS: one checklist, actual save/reload, historical cuts, recurring checks, audited calendar and mobile/desktop light/dark layouts')
finally:
 proc.terminate();proc.wait(timeout=15)
