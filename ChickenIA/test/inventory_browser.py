"""Real UI + HTTP API + PostgreSQL; disposable local database, no production writes."""
import json
import os
from pathlib import Path
import subprocess
import time
import uuid
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
NODE = os.environ.get('NODE_BINARY', str(Path.home() / 'AppData/Local/Programs/Python312/Lib/site-packages/playwright/driver/node.exe'))
instance = 'browser-test-' + uuid.uuid4().hex
env = dict(os.environ, PORT='8941', DEV_INSTANCE=instance)
process = subprocess.Popen([NODE, str(ROOT/'scripts/dev-inventory.js')], cwd=ROOT, env=env,
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                           creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
BASE = 'http://127.0.0.1:8941'
OUT = ROOT/'test/results'
OUT.mkdir(exist_ok=True)
try:
    import urllib.request
    for _ in range(100):
        if process.poll() is not None:
            raise RuntimeError(process.stderr.read().decode())
        try:
            urllib.request.urlopen(BASE+'/inventario.html', timeout=1)
            break
        except Exception:
            time.sleep(.1)
    else:
        raise RuntimeError('Local server did not start')
    credentials = json.loads((ROOT/'.local'/instance/'dev-credentials.json').read_text())
    with sync_playwright() as p:
        browser = p.chromium.launch(channel=os.environ.get('PLAYWRIGHT_CHANNEL', 'msedge' if os.name == 'nt' else None))
        page = browser.new_page(viewport={'width':1100,'height':900})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE+'/inventario.html')
        page.locator('[name=username]').fill(credentials['username'])
        page.locator('[name=password]').fill(credentials['password'])
        page.locator('#login-form button').click()
        expect(page.locator('#workspace')).to_be_visible()
        def snap():
            res=page.request.get(BASE+'/api/inventory')
            assert res.status==200, res.text()
            return res.json()
        def command(kind, **values):
            res=page.request.post(BASE+'/api/inventory?action=operation',data={'id':str(uuid.uuid4()),'version':snap()['version'],'type':kind,**values})
            assert res.status==200,res.text()
            return res.json()
        # Explicit initial physical balances, isolated test database only.
        for loc in ['cedis','sucursal']:
            command('initial',location=loc,lines=[{'item':i['id'],'qty':0} for i in snap()['data']['items']])
        purchase=command('purchase',supplier='Proveedor test',lines=[{'item':'pollo-enhielado','qty':100}])
        command('supplier',location='cedis',purchase=purchase['event']['id'],lines=[{'item':'pollo-enhielado','qty':100}],note='Recepción test')
        command('prepare',recipe='rosti',qty=30)
        page.locator('#refresh').click()
        expect(page.locator('#message')).to_have_text('Datos actualizados.')
        page.locator('[data-tab=supply]').click()
        page.locator('#request-form [name="q:rosti-marinado"]').fill('20')
        page.locator('#request-form button').click()
        expect(page.locator('#message')).to_have_text('Registro guardado.')
        expect(page.locator('#send-form')).to_be_attached()
        page.get_by_text('Preparar envío · Lilian / Eliseo',exact=True).click()
        page.locator('#send-form [name="q:rosti-marinado"]').fill('20')
        page.locator('#send-form button').click()
        expect(page.locator('[data-shipment]')).to_be_attached()
        page.locator('summary').filter(has_text='En tránsito').click()
        receive=page.locator('[data-shipment]')
        receive.locator('[name="q:rosti-marinado"]').fill('18')
        receive.locator('[name=note]').fill('Dos pollos pendientes')
        receive.locator('button').click()
        expect(page.locator('#view')).to_contain_text('Disponible Sucursal')
        # Reload persistence, independent server transaction.
        page.reload()
        expect(page.locator('#workspace')).to_be_visible()
        assert snap()['data']['balances']['sucursal:rosti-marinado']==18000
        page.locator('[data-tab=production]').click()
        page.locator('#production-form [name=qty]').fill('10')
        page.locator('#production-form button').click()
        expect(page.locator('#production-form [name=qty]')).to_have_value('')
        page.locator('[data-tab=sales]').click()
        page.locator('[name=presentation]').select_option('medio')
        page.locator('#sale-form [name=qty]').fill('3')
        page.locator('#sale-form button').click()
        expect(page.locator('#sale-form [name=qty]')).to_have_value('')
        assert snap()['data']['balances']['sucursal:rosti-cocinado']==8500
        page.locator('#sale-form [name=qty]').fill('100')
        page.locator('#sale-form button').click()
        expect(page.locator('#message')).to_contain_text('Saldo insuficiente')
        page.locator('[data-tab=counts]').click()
        page.locator('#count-form [name="q:rosti-cocinado"]').fill('8')
        page.locator('#count-form [name=note]').fill('Recontar al cierre')
        page.locator('#count-form button').click()
        expect(page.locator('summary').filter(has_text='Diferencias pendientes')).to_be_attached()
        assert snap()['data']['balances']['sucursal:rosti-cocinado']==8500
        page.locator('[data-tab=opening]').click()
        page.locator('[name=task]').first.check()
        page.locator('#opening-form button').click()
        expect(page.locator('[name=task]').first).to_be_checked()
        # Every screen at phone and desktop widths; test theme contrast visually afterwards.
        for theme in ['light','dark']:
            page.evaluate('(theme)=>document.documentElement.dataset.theme=theme',theme)
            for width in [390,1100]:
                page.set_viewport_size({'width':width,'height':900})
                for tab in ['home','stock','supply','production','sales','counts','receipts','opening','history','catalog']:
                    page.locator('[data-tab='+tab+']').click()
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (tab,width)
                page.locator('[data-tab=sales]').click()
                page.screenshot(path=str(OUT/f'inventory-{theme}-{width}.png'),full_page=True)
        page.locator('#logout').click()
        expect(page.locator('#login-panel')).to_be_visible()
        assert page.request.get(BASE+'/api/inventory').status==401
        assert not errors, errors
        browser.close()
    print('PASS: UI + API + PostgreSQL; solicitud, envio parcial, recepcion, coccion, venta, conteo, apertura, persistencia, logout y 10 pantallas en movil/escritorio.')
finally:
    process.terminate()
    process.wait(timeout=10)
