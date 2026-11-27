// Play-test for Deal Radar: drives headless Chromium over CDP with plain
// WebSocket, checks console errors / external requests / failed requests,
// exercises search/filter/sort, takes 4 screenshots into screenshots/.
// Run: node playtest.mjs  (serve.ts must be running on :8080 first)

import { writeFileSync, mkdirSync } from 'node:fs';

const PORT = 9222;
const BASE = 'http://127.0.0.1:8080/index.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // Attach to the existing about:blank page target.
  let pageWs = null;
  for (let i = 0; i < 20 && !pageWs; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) pageWs = page.webSocketDebuggerUrl;
    } catch { /* retry */ }
    if (!pageWs) await sleep(500);
  }
  if (!pageWs) throw new Error('no page target found');

  const ws = new WebSocket(pageWs);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result ?? d.error); pending.delete(d.id); }
    else if (d.method) events.push(d);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const i = ++id;
    pending.set(i, resolve);
    ws.send(JSON.stringify({ id: i, method, params }));
    setTimeout(() => { if (pending.has(i)) { pending.delete(i); reject(new Error('timeout ' + method)); } }, 20000);
  });
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (r?.exceptionDetails) throw new Error('page JS error: ' + JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r?.result?.value;
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: BASE });
  await sleep(2500);

  const report = {};
  report.initialCards = await evalJs(`document.querySelectorAll('#deal-grid .card').length`);
  report.resultCountText = await evalJs(`document.getElementById('result-count').textContent`);
  report.statDeals = await evalJs(`document.getElementById('stat-deals').textContent`);
  report.statSaved = await evalJs(`document.getElementById('stat-saved').textContent`);
  report.spotlightCount = await evalJs(`document.querySelectorAll('#spotlight-list .spot').length`);
  report.compareCount = await evalJs(`document.querySelectorAll('#compare-list .compare').length`);
  report.searchDysonCards = await evalJs(`(() => { const i = document.getElementById('search'); i.value = 'dyson'; i.dispatchEvent(new Event('input', { bubbles: true })); return document.querySelectorAll('#deal-grid .card').length; })()`);
  report.tvsCards = await evalJs(`(() => { const i = document.getElementById('search'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); [...document.querySelectorAll('#category-bar button')].find(b => b.dataset.cat === 'TVs').click(); return document.querySelectorAll('#deal-grid .card').length; })()`);
  report.sortPriceFirst = await evalJs(`(() => { [...document.querySelectorAll('#category-bar button')].find(b => b.dataset.cat === 'All').click(); const s = document.getElementById('sort'); s.value = 'price'; s.dispatchEvent(new Event('change', { bubbles: true })); return document.querySelector('#deal-grid .card h3')?.textContent; })()`);
  report.min50Cards = await evalJs(`(() => { const s = document.getElementById('sort'); s.value = 'pct'; s.dispatchEvent(new Event('change', { bubbles: true })); const m = document.getElementById('min-discount'); m.value = '50'; m.dispatchEvent(new Event('change', { bubbles: true })); return document.querySelectorAll('#deal-grid .card').length; })()`);
  await evalJs(`(() => { const m = document.getElementById('min-discount'); m.value = '0'; m.dispatchEvent(new Event('change', { bubbles: true })); window.scrollTo(0, 0); return true; })()`);
  await sleep(400);

  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 });
    writeFileSync(`screenshots/${name}`, Buffer.from(r.data, 'base64'));
  };
  mkdirSync('screenshots', { recursive: true });
  await shot('01-cover-desktop.jpg');
  await evalJs(`(() => { const i = document.getElementById('search'); i.value = 'airpods'; i.dispatchEvent(new Event('input', { bubbles: true })); document.getElementById('deals-h').scrollIntoView(); return true; })()`);
  await sleep(300);
  await shot('02-search-airpods.jpg');
  await evalJs(`(() => { const i = document.getElementById('search'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(500);
  await shot('03-phone.jpg');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await evalJs(`document.querySelector('.compare-section').scrollIntoView(); window.scrollBy(0, -10);`);
  await sleep(400);
  await shot('04-compare-desktop.jpg');

  const consoleErrors = events.filter(
    (e) => e.method === 'Runtime.exceptionThrown' ||
      (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error'),
  );
  const requests = [...new Set(events.filter((e) => e.method === 'Network.requestWillBeSent').map((e) => e.params.request.url))];
  const external = requests.filter((u) => !u.startsWith('http://127.0.0.1:8080') && !u.startsWith('data:') && !u.startsWith('blob:'));
  const failed = events.filter((e) => e.method === 'Network.loadingFailed' && !e.params.canceled).map((e) => e.params.errorText);
  const badResponses = events.filter((e) => e.method === 'Network.responseReceived' && e.params.response.status >= 400)
    .map((e) => `${e.params.response.status} ${e.params.response.url}`);

  report.consoleErrors = consoleErrors.length;
  report.consoleErrorDetail = consoleErrors.slice(0, 3).map((e) => JSON.stringify(e.params).slice(0, 300));
  report.totalRequests = requests.length;
  report.requests = requests;
  report.externalRequests = external;
  report.failedRequests = failed;
  report.badResponses = badResponses;
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

main().catch((e) => { console.error('PLAYTEST FAILED:', e.message); process.exit(1); });
