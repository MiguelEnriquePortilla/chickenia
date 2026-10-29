"""Static splash checks: no API calls, operational writes, or messages."""
import subprocess,sys,urllib.request,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
server=subprocess.Popen([sys.executable,'-m','http.server','8986','--bind','127.0.0.1','--directory',str(ROOT/'public')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
base='http://127.0.0.1:8986'
try:
 for _ in range(40):
  try:urllib.request.urlopen(base);break
  except Exception:time.sleep(.1)
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='msedge');page=browser.new_page();errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.route('https://**/*',lambda r:r.abort())
  out=ROOT/'.local/splash';out.mkdir(parents=True,exist_ok=True)
  for width in [320,390,1440]:
   page.set_viewport_size({'width':width,'height':844})
   page.goto(base,wait_until='domcontentloaded')
   splash=page.locator('#chicken-welcome');expect(splash).to_have_attribute('data-ready','true')
   page.wait_for_timeout(380);page.screenshot(path=str(out/f'splash-{width}.png'))
   assert not page.locator('.chicken-welcome__track').count()
   expect(page.locator('.chicken-welcome__pulse')).to_have_count(2)
   stage=page.locator('.chicken-welcome__stage').bounding_box();assert abs(stage['width']-stage['height'])<2
   assert float(page.locator('.chicken-welcome__pulse--one').evaluate('(el)=>getComputedStyle(el).opacity'))>0
   if width==390:
    ring_before=page.locator('.chicken-welcome__pulse--one').evaluate('(el)=>getComputedStyle(el).transform')
    page.wait_for_timeout(600)
    assert page.locator('.chicken-welcome__pulse--one').evaluate('(el)=>getComputedStyle(el).transform')!=ring_before
    expect(page.locator('.chicken-welcome__speech')).to_contain_text('VERY SABROSITO')
    phrase=page.locator('.chicken-welcome__speech');brand=page.locator('.chicken-welcome__brand')
    expect(phrase).to_have_css('white-space','nowrap')
    assert phrase.bounding_box()['height']<30
    assert phrase.evaluate('(el)=>el.scrollWidth')<=width-40
    assert phrase.evaluate('(el)=>getComputedStyle(el).backgroundColor')=='rgba(0, 0, 0, 0)'
    assert page.locator('.chicken-welcome__stage').bounding_box()['y']<phrase.bounding_box()['y']<brand.bounding_box()['y']
    page.screenshot(path=str(out/'speech-390.png'))
   assert page.locator('#chicken-home').evaluate('(el)=>el.inert')
   expect(splash).to_be_hidden(timeout=5400)
   assert not page.locator('#chicken-home').evaluate('(el)=>el.inert')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.goto(base,wait_until='domcontentloaded');page.locator('.chicken-welcome__skip').focus();page.keyboard.press('Enter')
  expect(page.locator('#chicken-welcome')).to_be_hidden();expect(page.locator('.home-primary')).to_be_focused()
  page.goto(base,wait_until='domcontentloaded');page.locator('.chicken-welcome__skip').focus();page.keyboard.press('Escape');expect(page.locator('#chicken-welcome')).to_be_hidden()
  page.emulate_media(reduced_motion='reduce');page.goto(base);expect(page.locator('#chicken-welcome')).to_be_hidden();assert not page.locator('#chicken-home').evaluate('(el)=>el.inert')
  page.emulate_media(reduced_motion='no-preference')
  page.evaluate("sessionStorage.setItem('chickenia_internal_home',String(Date.now()))");page.reload();expect(page.locator('#chicken-welcome')).to_be_hidden()
  page.route('**/icons/welcome-mascot.webp',lambda r:r.abort());page.goto(base);expect(page.locator('#chicken-welcome')).to_be_hidden();assert not page.locator('#chicken-home').evaluate('(el)=>el.inert');page.unroute('**/icons/welcome-mascot.webp')
  held=[];page.route('**/icons/welcome-mascot.webp',lambda r:held.append(r));page.goto(base,wait_until='domcontentloaded');expect(page.locator('#chicken-welcome')).to_be_hidden(timeout=7000);assert not page.locator('#chicken-home').evaluate('(el)=>el.inert')
  for route in held:route.abort()
  assert not errors,errors
  context=browser.new_context(java_script_enabled=False);nojs=context.new_page();nojs.goto(base);expect(nojs.locator('#chicken-welcome')).to_be_hidden();expect(nojs.locator('.home-primary')).to_be_visible();context.close();browser.close()
 print('PASS splash: 320/390/1440, short entrance/exit, skip and focus, Escape, reduced motion, internal return, failed/slow image, no JS. No API writes.')
finally:server.terminate();server.wait(timeout=10)
