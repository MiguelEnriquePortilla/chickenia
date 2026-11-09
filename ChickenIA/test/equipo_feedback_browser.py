import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
import pymupdf
ROOT=Path(__file__).resolve().parents[1]
NODE=r'C:/Users/hp/AppData/Local/Programs/Python312/Lib/site-packages/playwright/driver/node.exe'
proc=subprocess.Popen([NODE,'test/calibre-browser-server.js','--today'],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,creationflags=subprocess.CREATE_NO_WINDOW)
try:
 base=proc.stdout.readline().strip();assert base.startswith('http://127.0.0.1:')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe');page=browser.new_page(viewport={'width':390,'height':844});errors=[]
  page.route('https://**/*',lambda r:r.abort());page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/evaluacion-equipo.html?area=cocina')
  page.locator('#equipo-responsible-select').select_option(label='Ana Lima');page.locator('#equipo-assign').click();expect(page.locator('#equipo-responsible')).to_contain_text('Ana Lima')
  page.locator('#feedback-close').click();expect(page.locator('#equipo-status')).to_contain_text('Completa la observación')
  page.locator('[data-point]').first.locator('[type=checkbox]').check();expect(page.locator('#equipo-status')).to_have_text('¡Guardado!')
  page.locator('#feedback-observation').fill('Preparó las guarniciones antes de abrir.');page.locator('#feedback-recommendation').fill('Mantener la preparación anticipada.');expect(page.locator('#equipo-status')).to_have_text('¡Guardado!')
  page.locator('#feedback-close').click();expect(page.locator('#feedback-state')).to_contain_text('Evaluación cerrada')
  page.reload();expect(page.locator('#feedback-observation')).to_have_value('Preparó las guarniciones antes de abrir.');expect(page.locator('#feedback-state')).to_contain_text('Evaluación cerrada')
  page.locator('[data-point]').first.locator('[type=checkbox]').uncheck();expect(page.locator('#equipo-status')).to_have_text('¡Guardado!');expect(page.locator('#feedback-state')).to_have_text('Retroalimentación pendiente')
  page.locator('#feedback-close').click();expect(page.locator('#feedback-state')).to_contain_text('Evaluación cerrada')
  hist=page.locator('#equipo-person-history');hist.locator('summary').first.click();hist.locator('select').select_option(label='Ana Lima');hist.locator('button').click();expect(hist).to_contain_text('Mantener la preparación anticipada.')
  for width in [320,390,1440]:
   page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  date=page.locator('#calibre-date').input_value();page.goto(base+'/evaluacion-semanal.html?date='+date+'&area=cocina');expect(page.locator('.report-page')).to_have_count(1);expect(page.locator('.feedback-table')).to_contain_text('Mantener la preparación anticipada.');expect(page.locator('.feedback-table')).to_contain_text('Ana Lima')
  # Worst-case print layout using 180 characters in both fields on every day of all eight areas.
  page.locator('#weekly-area').select_option('all');expect(page.locator('.report-page')).to_have_count(8)
  page.evaluate("""()=>{for(const row of document.querySelectorAll('.feedback-table tbody tr')){row.children[2].textContent='Observación concreta de desempeño y resultado. '.repeat(5).slice(0,180);row.children[3].textContent='Recomendación para mejorar y mantener el resultado. '.repeat(5).slice(0,180);}}""")
  out=ROOT/'.local'/'feedback-check';out.mkdir(parents=True,exist_ok=True)
  page.pdf(path=str(out/'weekly.pdf'),prefer_css_page_size=True,print_background=True)
  pdf=pymupdf.open(out/'weekly.pdf');assert len(pdf)==8,len(pdf)
  for i,pdfpage in enumerate(pdf):
   text=pdfpage.get_text();assert 'Acuerdo:' in text and 'Fuente:' in text,(i,text[-200:])
  pdf[4].get_pixmap(matrix=pymupdf.Matrix(1.3,1.3)).save(str(out/'weekly.png'))
  page.goto(base+'/evaluacion-equipo.html?area=cocina&date=2026-11-08');expect(page.locator('#feedback-close')).to_have_count(0);expect(page.locator('[data-point]').first.locator('[type=checkbox]')).to_be_disabled()
  assert not errors,errors;browser.close()
 print('PASS: required feedback, save/reload, closure, edit reopens, person history, mobile widths, legacy read-only, weekly content, 8-page maximum-length print.')
finally:
 proc.terminate();proc.wait(timeout=15)
