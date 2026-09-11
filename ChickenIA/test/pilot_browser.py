"""Real local sign-in and cross-module session. Dashboard reports alone use fixtures.
Start dev-inventory.js with PORT=8953 CHICKENIA_PILOT_ACCESS=1 in an isolated DEV_INSTANCE.
"""
from playwright.sync_api import sync_playwright,expect
from pathlib import Path
BASE='http://127.0.0.1:8953'
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge')
    page=browser.new_page(viewport={'width':1280,'height':900})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    # Supervision reports are outside the local inventory fixture; auth is never mocked.
    page.route('**/api/locations',lambda r:r.fulfill(json=[]))
    page.goto(BASE+'/dashboard.html')
    page.wait_for_url('**/inventario.html?next=*')
    page.locator('[name=username]').fill('Prueba Cocina')
    page.locator('[name=password]').fill('CHICKENIA2026')
    page.locator('#login-form button').click()
    page.wait_for_url('**/dashboard.html')
    expect(page.locator('#app-content')).to_be_visible()
    expect(page.locator('#password-gate')).to_be_hidden()
    page.goto(BASE+'/preguntale.html')
    expect(page.locator('#workspace')).to_be_visible()
    expect(page.locator('#login-panel')).to_be_hidden()
    page.locator('#question').fill('Hola')
    page.locator('#composer button').click()
    expect(page.locator('.chat-answer')).to_be_visible()
    page.goto(BASE+'/inventario.html?panel=nancy')
    expect(page.locator('#workspace')).to_be_visible()
    for tab in ['stock','catalog','sales','counts','kitchenPlanning','weeklyPurchases']:
        expect(page.locator('[data-tab="'+tab+'"]').first).to_be_visible()
    expect(page.locator('#identity')).to_contain_text('Prueba Cocina')
    page.locator('[data-tab=catalog]').click()
    expect(page.locator('#catalog-form')).to_be_visible()
    assert page.request.get(BASE+'/api/chicken-ia?action=session').status==200
    page.goto(BASE+'/dashboard.html')
    page.locator('#corner-menu-btn').click()
    page.locator('#menu-logout').click()
    page.wait_for_url('**/inventario.html?next=*')
    assert page.request.get(BASE+'/api/chicken-ia?action=session').status==401
    # Existing Nancy identity also has the full navigation during the pilot.
    page.goto(BASE+'/inventario.html?panel=nancy')
    page.locator('[name=username]').fill('Nancy')
    page.locator('[name=password]').fill('CHICKENIA2026')
    page.locator('#login-form button').click()
    expect(page.locator('#workspace')).to_be_visible()
    expect(page.locator('[data-tab=catalog]')).to_be_visible()
    assert page.request.get(BASE+'/api/chicken-ia?action=session').status==200
    assert not errors,errors
    browser.close()
print('PASS: real shared login, free name, Dashboard redirect, Chicken-IA, all inventory tabs, Nancy access, global logout.')
