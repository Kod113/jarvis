import sys, os
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
mock = open(os.path.join(os.path.dirname(__file__), 'mock.js')).read()
out = os.environ.get('OUT', '/tmp/jarvis-preview'); os.makedirs(out, exist_ok=True)
def handler(route):
    url = route.request.url
    if 'supabase-js' in url:
        return route.fulfill(status=200, body=mock, headers={'content-type':'application/javascript'})
    if url.startswith('http://app.test/'):
        p = url[len('http://app.test/'):].split('?')[0] or 'index.html'
        fp = os.path.join(root, p)
        ct = {'js':'application/javascript','css':'text/css','html':'text/html','svg':'image/svg+xml','png':'image/png','webmanifest':'application/manifest+json'}.get(p.rsplit('.',1)[-1],'text/plain')
        if os.path.exists(fp):
            return route.fulfill(status=200, body=open(fp,'rb').read(), headers={'content-type':ct})
        return route.fulfill(status=404, body='nf')
    return route.continue_()
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, vw, vh, theme in [('mobile',390,1000,None),('desktop',1440,1000,None)]:
        pg = b.new_page(viewport={'width':vw,'height':vh})
        errs=[]
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.route('**/*', handler)
        pg.goto('http://app.test/index.html')
        pg.wait_for_timeout(800)
        pg.screenshot(path=f'{out}/{name}-oggi.png', full_page=True)
        # interazioni
        pg.click('[data-action="openSched"][data-id="t2"]'); pg.wait_for_timeout(100)
        pg.screenshot(path=f'{out}/{name}-sched.png', full_page=True)
        pg.click('[data-action="schedDay"]:nth-of-type(2)'); pg.click('[data-action="confirmSched"]'); pg.wait_for_timeout(100)
        pg.fill('#newTask', 'Comprare il latte'); pg.press('#newTask','Enter'); pg.wait_for_timeout(200)
        pg.click('#cap'); pg.fill('#cap', 'Ricordami di prenotare il dentista'); pg.wait_for_timeout(100)
        pg.screenshot(path=f'{out}/{name}-capture.png', full_page=False)
        pg.press('#cap','Enter'); pg.wait_for_timeout(200)
        pg.fill('#cap', 'come funziona OAuth?'); pg.press('#cap','Enter'); pg.wait_for_timeout(200)
        pg.screenshot(path=f'{out}/{name}-oggi2.png', full_page=True)
        for v in ['settimana','spese','mente'] + (['calendario'] if name=='desktop' else []):
            pg.click(f'[data-action="go"][data-id="{v}"] >> visible=true'); pg.wait_for_timeout(150)
            if v=='spese':
                pg.click('[data-action="addExpense"]'); pg.fill('#exAmount','24,90'); pg.fill('#exDesc','Amazon · libro'); pg.click('[data-action="exCat"][data-id="Tech"]'); pg.click('[data-action="saveExpense"]'); pg.wait_for_timeout(150)
            if v=='settimana':
                pg.click('[data-action="planCapture"] >> nth=0'); pg.wait_for_timeout(150)
            pg.screenshot(path=f'{out}/{name}-{v}.png', full_page=True)
        print(name, 'errors:', errs)
        pg.close()
    # login + dark
    pg = b.new_page(viewport={'width':390,'height':800})
    pg.add_init_script('window.__NOSESSION=true')
    pg.route('**/*', handler); pg.goto('http://app.test/index.html'); pg.wait_for_timeout(500)
    pg.screenshot(path=f'{out}/login.png')
    pg2 = b.new_page(viewport={'width':390,'height':1000})
    pg2.route('**/*', handler); pg2.goto('http://app.test/index.html'); pg2.wait_for_timeout(600)
    pg2.evaluate("document.documentElement.dataset.theme='dark'")
    pg2.screenshot(path=f'{out}/mobile-dark.png', full_page=True)
    b.close()
