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
env = dict(os.environ, PORT='8941', DEV_INSTANCE=instance, DEV_USER='miguel')
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
        page.locator('[data-nav-area=rosticero]').click()
        expect(page.locator('#selected-area-title')).to_have_text('Rosticero')
        assert 'CRUJI cocinado' not in page.locator('#view').inner_text()
        assert 'ROSTI cocinado' in page.locator('#view').inner_text()
        page.locator('[data-tab=counts]').click()
        assert page.locator('#count-form [name^="q:"]').count()==2
        page.locator('[data-nav-area=almacen]').click()
        assert 'Br\u00f3coli' in page.locator('#view').inner_text()
        expect(page.locator('#location')).to_have_value('cedis')
        page.locator('[data-nav-area=general]').click()
        # Prepare a real delivery before entering Nancy's basic panel.
        req=command('request',due=snap()['today'],lines=[{'item':'rosti-marinado','qty':1}])
        command('send',request=req['event']['id'],lines=[{'item':'rosti-marinado','qty':1}])
        page.locator('#logout').click()
        expect(page.locator('#login-panel')).to_be_visible()
        page.locator('[name=username]').fill('nancy')
        page.locator('[name=password]').fill(credentials['password'])
        page.locator('#login-form button').click()
        expect(page.locator('#page-title')).to_have_text('Panel de Nancy')
        assert page.locator('#nav [data-tab]').count()==7
        page.locator('[data-tab=incoming]').click()
        form=page.locator('[data-basic-shipment]').last
        form.locator('[name="q:rosti-marinado"]').fill('1')
        form.locator('button').click()
        expect(page.locator('#save-feedback')).to_contain_text('Recepción guardada')
        page.locator('[data-tab=requestForm]').click()
        page.locator('#protein-request [name="q:rosti-marinado"]').fill('2')
        page.locator('#protein-request button').click()
        expect(page.locator('#save-feedback')).to_contain_text('Solicitud guardada')
        page.locator('[data-tab=proteins]').click()
        page.locator('#location').select_option('sucursal')
        balance=snap()['data']['balances']['sucursal:rosti-marinado']/1000
        page.locator('#start-protein-count').click()
        assert not page.get_by_text('Existencias · Sucursal',exact=True).is_visible()
        page.locator('#protein-count [name="q:rosti-marinado"]').fill(str(balance))
        page.locator('#protein-count [name=note]').fill('Conteo físico de apertura')
        page.locator('#protein-count button').click()
        expect(page.locator('#save-feedback')).to_contain_text('Existencia verificada')
        report=page.request.get(BASE+'/api/inventory?action=proteins').json()
        assert report['nancy']['verified']==1
        assert report['nancy']['receiptsToday']==1
        assert snap()['data']['balances']['sucursal:rosti-marinado']==balance*1000
        page.locator('#start-protein-count').click()
        page.locator('#protein-count [name="q:rosti-marinado"]').fill(str(balance-1))
        page.locator('#protein-count [name=note]').fill('Diferencia real detectada')
        page.locator('#protein-count button').click()
        expect(page.locator('#save-feedback')).to_contain_text('Diferencia registrada')
        assert snap()['data']['balances']['sucursal:rosti-marinado']==balance*1000
        for width in [390,1100]:
            page.set_viewport_size({'width':width,'height':900})
            page.wait_for_timeout(300)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.screenshot(path=str(OUT/f'nancy-proteinas-{width}.png'),full_page=True)
        page.locator('[data-tab=kitchenPlanning]').click()
        plan_response=page.request.get(BASE+'/api/kitchen-plan')
        assert plan_response.status==200, plan_response.text()
        expect(page.locator('[data-plan-id]')).to_have_count(24)
        planned=page.locator('[data-plan-id]').filter(has_text='Adobo de tres chiles')
        planned.locator('input').fill('3.25')
        planned.locator('button').click()
        expect(page.locator('#save-feedback')).to_contain_text('Producción programada')
        assert any(float(a.get('kg') or 0)==3.25 for a in page.request.get(BASE+'/api/kitchen-plan').json()['activities'])
        page.locator('[data-tab=kitchenProduction]').click()
        expect(page.locator('#view')).to_contain_text('Arroz blanco')
        page.locator('#kitchen-transform [name=note]').fill('Pesaje de prueba')
        page.locator('#kitchen-inputs').locator('xpath=..').locator('summary').click()
        page.locator('#kitchen-inputs [name="q:cebolla"]').fill('0')
        # Procurement request is not an approval; manager authorizes separately.
        page.locator('[data-tab=weeklyPurchases]').click()
        page.locator('#weekly-request details summary').click()
        page.locator('#weekly-request [name="q:leche-litros"]').fill('2')
        page.locator('#weekly-request button').click()
        expect(page.locator('#view')).to_contain_text('Pendiente de autorización')
        assert page.locator('[data-approve-purchase]').count()==0
        page.locator('#logout').click()
        page.locator('[name=username]').fill('miguel')
        page.locator('[name=password]').fill(credentials['password'])
        page.locator('#login-form button').click()
        expect(page.locator('#workspace')).to_be_visible()
        page.locator('[data-tab=weeklyPurchases]').click()
        page.locator('[data-approve-purchase]').last.click()
        expect(page.locator('[data-weekly-receipt]')).to_be_visible()
        receipt=page.locator('[data-weekly-receipt]').last
        receipt.locator('[name="q:leche-litros"]').fill('2')
        receipt.locator('[name=receipt]').fill('3B-ticket-test')
        receipt.locator('[name=amount]').fill('50')
        receipt.locator('[name=paymentSource]').select_option('caja')
        receipt.locator('[name=note]').fill('Compra semanal')
        receipt.locator('button').click()
        expect(page.locator('#view')).to_contain_text('3B-ticket-test')
        assert snap()['data']['balances']['sucursal:leche-litros']==2000
        for width in [390,1100]:
            page.set_viewport_size({'width':width,'height':900})
            page.wait_for_timeout(300)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.screenshot(path=str(OUT/f'compras-semanales-{width}.png'),full_page=True)
        # Initial 100% never celebrates; only a confirmed transition does.
        page.evaluate("ChickenFeedback.summary({location:{id:'test'},date:'test1',overall_score:100,areas:[]})")
        assert page.locator('.celebration-layer').count()==0
        page.evaluate("ChickenFeedback.summary({location:{id:'test'},date:'test2',overall_score:50,areas:[]});ChickenFeedback.summary({location:{id:'test'},date:'test2',overall_score:100,areas:[]})")
        assert page.locator('.celebration-layer span').count()==24
        page.evaluate("document.querySelector('.celebration-layer').remove();ChickenFeedback.summary({location:{id:'test'},date:'test2',overall_score:50,areas:[]});ChickenFeedback.summary({location:{id:'test'},date:'test2',overall_score:100,areas:[]})")
        assert page.locator('.celebration-layer').count()==0
        page.emulate_media(reduced_motion='reduce')
        page.evaluate("ChickenFeedback.celebrate('reduced-test','Completado',true)")
        assert page.locator('.celebration-layer').count()==0
        page.locator('#logout').click()
        expect(page.locator('#login-panel')).to_be_visible()
        assert page.request.get(BASE+'/api/inventory').status==401
        assert not errors, errors
        browser.close()
    print('PASS: UI + API + PostgreSQL; solicitud, envio parcial, recepcion, coccion, venta, conteo, apertura, persistencia, logout y 10 pantallas en movil/escritorio.')
finally:
    process.terminate()
    process.wait(timeout=10)
