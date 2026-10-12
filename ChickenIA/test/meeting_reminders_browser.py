"""Check calendar reminders against isolated API responses; no real records or messages."""
import json, os, subprocess, urllib.parse
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[1]
node = str(Path.home() / 'AppData/Local/Programs/Python312/Lib/site-packages/playwright/driver/node.exe')
proc = subprocess.Popen([node, 'test/checklist-timeline-browser-server.js'], cwd=root,
    stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
    creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
try:
    base = proc.stdout.readline().strip()
    assert base.startswith('http'), base
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge')
        page = browser.new_page(viewport={'width':320, 'height':844})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        def summary(route):
            date = urllib.parse.parse_qs(urllib.parse.urlparse(route.request.url).query)['date'][0]
            script = "const c=require('./lib/supervision/control-points');const d=process.argv[1],now=new Date(d+'T15:00:00-06:00');process.stdout.write(JSON.stringify({date:d,serverTime:now.toISOString(),activeCut:2,start:c.START,active:true,location:{id:1,type:'tienda'},revision:0,actor:'Prueba',canWrite:true,cuts:c.evaluate(d,c.catalogForDate(d),[],now),records:[],periods:[]}));"
            body = subprocess.check_output([node, '-e', script, date], cwd=root, text=True, encoding='utf-8')
            route.fulfill(status=200, content_type='application/json', body=body)
        page.route('**/api/summary?points=1**', summary)
        page.goto(base+'/supervision.html', wait_until='domcontentloaded')
        for date, orders, wash in [
            ('2026-10-12',False,True), ('2026-10-13',True,False),
            ('2026-10-14',False,True), ('2026-10-15',False,False),
            ('2026-10-16',True,True), ('2026-10-17',False,False),
            ('2026-10-18',True,False), ('2026-10-11',False,False)]:
            page.locator('#point-date').fill(date)
            expect(page.locator('.points-tabs [aria-selected=true]')).to_have_text('16:30' if date>='2026-10-11' else '16:00')
            area = page.locator('[data-area=supervision]')
            expect(area.locator('.points-reminder')).to_have_count(1 if date>='2026-10-12' else 0)
            if date>='2026-10-12':
                text = area.locator('.points-reminder').text_content()
                assert ('Contar las proteínas' in text) == orders
                assert 'horario de entrada de mañana' in text
            page.locator('[data-cut="0"]').click()
            opening = page.locator('[data-area=sucursal_apertura]')
            if date>='2026-10-12':
                text = opening.locator('.points-reminder').text_content()
                assert 'peloteros todos los días' in text
                assert ('lavar la banqueta' in text) == wash
                assert 'horario de entrada de mañana' not in area.text_content()
                expect(page.locator('[data-area=ventas_barras]')).to_contain_text('25%')
                page.locator('[data-cut="1"]').click()
                expect(page.locator('[data-area=ventas_barras]')).to_contain_text('75%')
            else:
                expect(opening.locator('.points-reminder')).to_have_count(0)
        page.locator('#point-date').fill('2026-10-16')
        expect(page.locator('[data-area=supervision] .points-reminder')).to_contain_text('Contar las proteínas')
        page.locator('[data-area=supervision] summary').first.click()
        for width in [320,390,1280]:
            page.set_viewport_size({'width':width,'height':844})
            for theme in ['light','dark']:
                page.evaluate('(v)=>document.documentElement.dataset.theme=v', theme)
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert not errors, errors
        out=root/'test/results';out.mkdir(exist_ok=True)
        page.screenshot(path=str(out/'meeting-reminders.png'), full_page=True)
        browser.close()
    print('PASS: seven weekdays, historical date, correct areas and cuts, Barra tandas, mobile/desktop, themes.')
finally:
    proc.terminate();proc.wait(timeout=15)
