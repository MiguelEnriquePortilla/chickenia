"""UI contract tests with explicitly simulated API data; no production access."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT=Path(__file__).parent/'results'/'chicken'
OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge')
    page=browser.new_page(viewport={'width':1440,'height':1050},device_scale_factor=1,reduced_motion='reduce')
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    calls=[]
    def api(route):
        from urllib.parse import urlparse,parse_qs
        query=parse_qs(urlparse(route.request.url).query)
        if query.get('action')==['session']:
            return route.fulfill(json={'user':{'id':'miguel','name':'Miguel'}})
        calls.append(query)
        return route.fulfill(json={'intent':'critical','date':query['date'][0],'area':query['area'][0],'areaName':'Cocina','title':'1 actividad crítica sin cumplimiento registrado.','lines':['Ejemplo de prueba de interfaz.'],'warnings':['Sin captura no demuestra incumplimiento.'],'rows':[['Cocina: cierre','Sin captura']],'columns':['Actividad','Estado'],'sources':[{'label':'Ver actividades de la fecha','href':'/supervision.html?area=cocina&date='+query['date'][0]}],'updatedAt':None,'consultedAt':'2026-09-11T18:00:00Z'})
    page.route('**/api/chicken-ia?*',api)
    page.goto('http://127.0.0.1:8952/preguntale.html')
    page.locator('#workspace').wait_for(state='visible')
    page.screenshot(path=str(OUT/'desktop.png'),full_page=True)
    page.get_by_role('button',name='02 Pendientes críticos Qué necesita revisión').click()
    page.locator('.chat-answer').wait_for()
    assert len(calls)==1
    assert 'Sin captura' in page.locator('.chat-answer').inner_text()
    page.locator('#period').select_option('yesterday')
    page.locator('#question').fill('¿y Cocina?')
    page.locator('#question').press('Enter')
    page.wait_for_function("document.querySelectorAll('.chat-answer').length===2")
    assert calls[-1]['previous']==['critical']
    page.locator('#new-chat').click()
    assert page.locator('.chat-answer').count()==0
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_function("document.getElementById('chat-shell').classList.contains('sidebar-compact')")
    page.evaluate('scrollTo(0,0)')
    page.screenshot(path=str(OUT/'mobile.png'),full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.locator('#theme').click()
    assert page.locator('html').get_attribute('data-theme')=='dark'
    page.screenshot(path=str(OUT/'dark-mobile.png'),full_page=True)
    # Text is inserted with textContent, including source-originated content.
    page.locator('#question').fill('<img src=x onerror=alert(1)>')
    page.locator('#question').press('Enter')
    page.locator('.chat-answer').wait_for()
    assert page.locator('.chat-user img').count()==0
    assert not errors,errors
    browser.close()
print('UI passed: shortcuts, follow-up context, dates, reset, mobile, dark theme, safe text. API responses simulated.')
