"""Sales metrics and authorized partial close, real API with disposable PostgreSQL."""
import os, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
env={**os.environ,'TEST_OPERATIONAL_ADJUSTMENTS':'1'}
proc=subprocess.Popen([os.environ['NODE_BINARY'],'test/protein-browser-server.js'],cwd=ROOT,env=env,stdout=subprocess.PIPE,text=True)
try:
 base=proc.stdout.readline().strip()
 assert base.startswith('http://127.0.0.1:'),base
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='msedge')
  page=browser.new_page(viewport={'width':390,'height':844});errors=[];dialogs=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
  page.goto(base+'/supervision.html?area=ventas_barras')
  page.locator('#supervisor-input').fill('Nancy');page.locator('#supervisor-input').press('Tab')
  row=lambda text:page.locator('.activity-row').filter(has=page.locator('.check-label',has_text=text))
  # Expand the sales area if its accordion is collapsed.
  heading=page.locator('[data-area-code="ventas_barras"]')
  if not page.locator('.quality-score').first.is_visible():
   page.get_by_role('button',name='ventas_barras').last.click()
  expect(row('Organizar barras')).to_contain_text('Cruji · Papas gajo · Campesina')
  percent=row('Mantener productos hidratados')
  percent.locator('.quality-score').fill('75');percent.locator('.quality-score').press('Tab')
  percent.locator('.chk').check()
  expect(percent).to_have_class('activity-row done just-saved')
  promo=row('Promo del día');promo.locator('.chk').check()
  expect(promo.locator('.chk')).not_to_be_checked()
  assert any('promo del día' in d for d in dialogs)
  promo.locator('.notes').fill('Promo de prueba');promo.locator('.notes').press('Tab');promo.locator('.chk').check()
  close=row('Cierre parcial de barra')
  for field in close.locator('[data-leftover]').all():field.fill('0')
  close.locator('[data-leftover="cruji"]').fill('2.125')
  close.locator('.authorize-closure').check();close.locator('.save-closure').click()
  expect(close.locator('.closure-receipt')).to_contain_text('Administrador de prueba')
  page.reload()
  if not page.locator('.quality-score').first.is_visible():page.get_by_role('button',name='ventas_barras').last.click()
  expect(row('Mantener productos hidratados').locator('.quality-score')).to_have_value('75')
  expect(row('Cierre parcial de barra').locator('[data-leftover="cruji"]')).to_have_value('2.125')
  screenshots=ROOT/'.local'/'adjustments-review';screenshots.mkdir(parents=True,exist_ok=True)
  for width in [390,1280]:
   page.set_viewport_size({'width':width,'height':900})
   for theme in ['light','dark']:
    page.evaluate('(theme)=>document.documentElement.dataset.theme=theme',theme)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,theme)
    row('Cierre parcial de barra').scroll_into_view_if_needed()
    page.screenshot(path=str(screenshots/f'bar-{width}-{theme}.png'))
  assert not errors,errors
  browser.close()
 print('PASS: percentage, required promotion, authorized leftover counts, reload, mobile and desktop')
finally:
 proc.terminate();proc.wait(timeout=15)
