"""Visual/navigation checks with catalogues from the real JS module and simulated checks."""
import functools,http.server,json,os,subprocess,threading
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
catalogs=json.loads(subprocess.check_output([os.environ.get('NODE_BINARY','node'),'-e',"console.log(JSON.stringify(require('./lib/supervision/rastro-sucursal-routines').build(require('./lib/supervision/db').SEED_ACTIVITIES)))"],cwd=ROOT))
names={'rastro':'Rastro','sucursal_apertura':'Apertura de Sucursal','supervision':'Supervisión'}
areas=[dict(id=i+1,code=code,name=names[code],activities=[dict(id=(i+1)*1000+j,area_id=i+1,name=r[0],criticality=r[1],weight=3,requires_quantity=r[2],unit=r[3],indicator_type=r[4],target=r[5],routine_block=r[6],frequency='daily') for j,r in enumerate(rows)]) for i,(code,rows) in enumerate(catalogs.items())]
server=http.server.ThreadingHTTPServer(('127.0.0.1',8954),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(ROOT/'public')))
threading.Thread(target=server.serve_forever,daemon=True).start()
out=ROOT/'test/results/rastro';out.mkdir(parents=True,exist_ok=True)
def api(route):
    path=route.request.url.split('/api/')[1].split('?')[0]
    data={'locations':[dict(id=1,code='jojutla',name='Jojutla',type='tienda')],'areas':areas,'checks':[],'employees':[],'attendance':[]}.get(path,[])
    route.fulfill(json=data)
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='msedge')
        page=browser.new_page(viewport={'width':1280,'height':900},reduced_motion='reduce')
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('**/api/**',api)
        for code in names:
            page.goto('http://127.0.0.1:8954/supervision.html?area='+code)
            expect(page.locator('#selected-area-title')).to_have_text(names[code])
            content=page.locator('#checklist').inner_text()
            if code=='rastro':assert '6:00' in content
            if code=='sucursal_apertura':assert 'pelotero' in content
            for width in [390,1280]:
                page.set_viewport_size({'width':width,'height':900})
                page.wait_for_timeout(250)
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                page.screenshot(path=str(out/f'{code}-{width}.png'),full_page=True)
        page.goto('http://127.0.0.1:8954/entrenamiento.html')
        expect(page.locator('.sheet-title').filter(has_text='Apertura de Sucursal')).to_be_visible()
        assert not errors,errors
        browser.close()
finally:server.shutdown()
print('PASS: three distinct areas, responsive navigation and synchronized training sheet; API checks simulated.')
