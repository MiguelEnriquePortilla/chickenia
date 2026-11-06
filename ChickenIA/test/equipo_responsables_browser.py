import subprocess,re
from pathlib import Path
import playwright
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
NODE=str(Path(playwright.__file__).resolve().parent/'driver/node.exe')
proc=subprocess.Popen([NODE,'test/calibre-browser-server.js','--today'],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
try:
 base=proc.stdout.readline().strip();assert base.startswith('http://127.0.0.1:')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe');page=browser.new_page(viewport={'width':390,'height':844});errors=[]
  page.route('https://**/*',lambda r:r.abort());page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/evaluacion-equipo.html?area=rastro')
  expect(page.locator('[data-point]').first.locator('[type=checkbox]')).to_be_disabled()
  page.locator('#equipo-responsible-select').select_option(label='Ana Lima');page.locator('#equipo-assign').click()
  expect(page.locator('#equipo-responsible')).to_contain_text('Responsable del día: Ana Lima')
  expect(page.locator('#equipo-responsible-select')).to_have_count(0)
  first=page.locator('[data-point]').first;first.locator('[type=checkbox]').check();expect(page.locator('#equipo-status')).to_have_text('¡Guardado!')
  first.locator('[type=text]').fill('Observación de Ana');expect(page.locator('#equipo-status')).to_have_text('¡Guardado!')
  page.reload();expect(page.locator('#equipo-responsible')).to_contain_text('Ana Lima');expect(page.locator('[data-point]').first.locator('[type=text]')).to_have_value('Observación de Ana')
  date=page.locator('#calibre-date').input_value()
  history=page.locator('#equipo-person-history');history.locator('summary').first.click();history.locator('select').select_option(label='Ana Lima');history.locator('button').click()
  expect(history.locator('.person-history-result')).to_contain_text('1 días evaluados');expect(history.locator('.person-history-result')).to_contain_text('Rastro')
  history.locator('.person-history-entry summary').click();expect(history).to_contain_text('Observación de Ana')
  page.locator('#equipo-area').select_option('rosticero');expect(page.locator('#equipo-responsible-select option')).to_have_count(3)
  assert 'Ana Lima' not in page.locator('#equipo-responsible-select').inner_text()
  # Simulate a lost response after the server committed: retry must be idempotent.
  def lost_response(route):
   if route.request.method=='POST' and route.request.post_data_json.get('action')=='assign':
    route.fetch();route.fulfill(status=503,content_type='application/json',body='{"error":"Respuesta perdida"}')
   else: route.continue_()
  page.route('**/api/summary?calibre=1*',lost_response)
  page.locator('#equipo-responsible-select').select_option(label='Maurilio Salgado');page.locator('#equipo-assign').click();expect(page.locator('#equipo-status')).to_contain_text('Respuesta perdida')
  page.unroute('**/api/summary?calibre=1*');page.locator('#equipo-assign').click();expect(page.locator('#equipo-responsible')).to_contain_text('Maurilio Salgado')
  # Server rejects a direct attempt to replace the immutable assignment.
  result=page.evaluate("""async d=>{const r=await fetch('/api/summary?calibre=1&date='+d,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:d,action:'assign',area:'rosticero',employeeId:3})});return r.status;}""",date)
  assert result==409,result
  page.goto(base+'/dashboard.html?date='+date)
  expect(page.locator('#equipo-weekly')).to_contain_text('Responsable: Ana Lima')
  h=page.locator('#dashboard-person-history');h.locator('summary').first.click();h.locator('select').select_option(label='Ana Lima');h.locator('button').click();expect(h).to_contain_text('1 días evaluados')
  out=ROOT/'.local'/'equipo-responsables-preview';out.mkdir(parents=True,exist_ok=True)
  for width in [320,390,1440]:
   page.set_viewport_size({'width':width,'height':900})
   for theme in ['light','dark']:
    page.evaluate("document.documentElement.dataset.theme="+repr(theme));assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/f'historial-{width}-{theme}.png'),full_page=True)
  page.goto(base+'/evaluacion-equipo.html?area=rastro&date='+date)
  for width in [320,390,1440]:
   page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.locator('#calibre-date').fill('2026-01-01');page.locator('#calibre-date').press('Tab');expect(page.locator('#equipo-responsible')).to_contain_text('sin identificar');expect(page.locator('[data-point]').first.locator('[type=checkbox]')).to_be_disabled();expect(page.locator('#equipo-assign')).to_have_count(0)
  assert not errors,errors;browser.close()
 print('PASS: daily assignment, immutable/reload, personal history and notes, no double area, lost-response retry, API rejection, legacy read-only, dashboard, mobile/dark. Isolated database only.')
finally:
 proc.terminate();proc.wait(timeout=15)
