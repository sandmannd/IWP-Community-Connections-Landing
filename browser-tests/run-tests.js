'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = __dirname;
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'test-config.json'), 'utf8'));
const reportsDir = path.join(ROOT, 'reports');
const screenshotsDir = path.join(ROOT, 'screenshots');
fs.mkdirSync(reportsDir, { recursive: true });
fs.mkdirSync(screenshotsDir, { recursive: true });

const results = [];
const consoleErrors = [];
const startedAt = Date.now();
let browser;
let context;

function addResult(group, name, status, details = '', durationMs = 0) {
  results.push({ group, name, status, details, durationMs });
  const icon = status === 'PASS' ? 'PASS' : status === 'WARN' ? 'WARN' : status === 'SKIP' ? 'SKIP' : 'FAIL';
  console.log(`[${icon}] ${group}: ${name}${details ? ' | ' + details : ''}`);
}

async function check(group, name, fn, options = {}) {
  const began = Date.now();
  try {
    const detail = await fn();
    addResult(group, name, 'PASS', typeof detail === 'string' ? detail : '', Date.now() - began);
    return detail;
  } catch (error) {
    const status = options.warning ? 'WARN' : options.skip ? 'SKIP' : 'FAIL';
    addResult(group, name, status, error && error.message ? error.message : String(error), Date.now() - began);
    return null;
  }
}

async function savePageDiagnostic(page, label) {
  const safe = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const stamp = Date.now();
  await page.screenshot({ path: path.join(screenshotsDir, `${safe}-${stamp}.png`), fullPage: true }).catch(() => {});
  const html = await page.content().catch(() => '');
  if (html) fs.writeFileSync(path.join(reportsDir, `${safe}-${stamp}.html`), html);
  const title = await page.title().catch(() => '');
  const body = await page.locator('body').innerText().catch(() => '');
  return `URL: ${page.url()} | Title: ${title || '(none)'} | Body: ${(body || '').replace(/\s+/g, ' ').slice(0, 500)}`;
}

async function getAppFrame(page) {
  const deadline = Date.now() + config.timeoutMs;
  const selectors = ['#loading', '#entryPortalView', '#homeView'];

  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      try {
        for (const selector of selectors) {
          if (await frame.locator(selector).count()) return frame;
        }
      } catch (_) {}
    }
    await page.waitForTimeout(250);
  }

  return null;
}

async function waitForApp(page) {
  await page.waitForLoadState('domcontentloaded');
  const frame = await getAppFrame(page);

  if (!frame) {
    const diagnostic = await savePageDiagnostic(page, 'app-frame-not-found');
    const frameUrls = page.frames().map(item => item.url()).join(' | ');
    throw new Error(`Community Connections iframe was not found. Frames: ${frameUrls || '(none)'} | ${diagnostic}`);
  }

  try {
    await frame.waitForFunction(() => {
      const loading = document.getElementById('loading');
      const portal = document.getElementById('entryPortalView');
      const home = document.getElementById('homeView');
      const ready = (portal && !portal.classList.contains('hidden')) || (home && !home.classList.contains('hidden'));
      const failed = loading && /could not|error|failed/i.test(loading.textContent || '');
      return ready || failed;
    }, null, { timeout: config.timeoutMs });
  } catch (error) {
    const diagnostic = await savePageDiagnostic(page, 'app-load-failure');
    const frameBody = await frame.locator('body').innerText().catch(() => '');
    throw new Error(`${error.message} | App frame body: ${(frameBody || '').replace(/\s+/g, ' ').slice(0, 500)} | ${diagnostic}`);
  }

  return frame;
}


async function getRegressionSummary(frame) {
  return frame.evaluate(() => new Promise((resolve, reject) => {
    if (!window.google || !google.script || !google.script.run) {
      reject(new Error('google.script.run is unavailable on the loaded app page.'));
      return;
    }
    google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(error => reject(new Error(error && error.message ? error.message : String(error))))
      .getRegressionSummaryForBrowserTest();
  }));
}

async function run() {
  console.log('============================================================');
  console.log('IWP COMMUNITY CONNECTIONS V20.6 AUTOMATED REGRESSION');
  console.log('============================================================');

  browser = await chromium.launch({
    channel: 'chrome',
    headless: Boolean(config.headless)
  });
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();
  page.setDefaultTimeout(config.timeoutMs);
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => consoleErrors.push(error.message));

  await check('Landing Page', 'Production landing page loads', async () => {
    const response = await page.goto(config.landingUrl, { waitUntil: 'domcontentloaded' });
    if (!response || !response.ok()) throw new Error(`HTTP ${response ? response.status() : 'no response'}`);
    await page.locator('h1').waitFor({ state: 'visible' });
  });

  await check('Landing Page', 'Brand and hero content render', async () => {
    await page.getByText('IWP COMMUNITY CONNECTIONS', { exact: true }).first().waitFor({ state: 'visible' });
    await page.getByRole('heading', { level: 1 }).waitFor({ state: 'visible' });
  });

  await check('Landing Page', 'Launch links point to production app', async () => {
    const hrefs = await page.locator('[data-launch-app]').evaluateAll(nodes => nodes.map(node => node.href));
    if (!hrefs.length) throw new Error('No launch links were found.');
    const bad = hrefs.filter(href => !/script\.google\.com\/macros\/s\/.+\/exec/i.test(href));
    if (bad.length) throw new Error(`Invalid launch URL: ${bad[0]}`);
  });

  await check('Landing Page', 'Live featured adventure finishes loading', async () => {
    await page.waitForFunction(() => {
      const el = document.getElementById('featuredAdventureContent');
      return el && !el.querySelector('.featured-loading');
    }, null, { timeout: 15000 });
  });

  await check('Landing Page', 'No broken visible images', async () => {
    await page.waitForTimeout(1500);
    const broken = await page.locator('img:visible').evaluateAll(images => images
      .filter(img => !img.complete || img.naturalWidth === 0)
      .map(img => img.src));
    if (broken.length) throw new Error(`Broken image: ${broken[0]}`);
  });

  await check('Backend Regression', 'Apps Script regression suite passes', async () => {
    await page.goto(config.publicAppUrl, { waitUntil: 'domcontentloaded' });
    const app = await waitForApp(page);
    const report = await getRegressionSummary(app);
    if (!report || !report.exists) {
      throw new Error('No saved server-side regression report exists. Run runFullRegressionTest from Test.gs once.');
    }
    if (!report.success || report.failed !== 0 || report.warnings !== 0) {
      throw new Error(`Last server baseline: passed ${report.passed}; failed ${report.failed}; warnings ${report.warnings}`);
    }
    return `Last server baseline clean: ${report.passed} passed, 0 failed, 0 warnings`;
  });

  await check('Public App', 'Public app loads without Google login', async () => {
    await page.goto(config.publicAppUrl, { waitUntil: 'domcontentloaded' });
    const app = await waitForApp(page);
    await app.locator('#homeView').waitFor({ state: 'visible' });
  });

  await check('Public App', 'Adventure cards render', async () => {
    const app = await getAppFrame(page);
    if (!app) throw new Error('Community Connections iframe is unavailable.');
    await app.waitForFunction(() => document.querySelectorAll('#eventCards .event-card, #eventCards article, #eventCards > *').length > 0, null, { timeout: config.timeoutMs });
  });

  await check('Public App', 'Search filter responds', async () => {
    const app = await getAppFrame(page);
    if (!app) throw new Error('Community Connections iframe is unavailable.');
    const input = app.locator('#eventSearchInput');
    await input.fill('zzzz-no-matching-adventure-zzzz');
    await page.waitForTimeout(300);
    const countText = await app.locator('#eventFilterCount').textContent();
    if (!countText) throw new Error('Filter count did not update.');
    await input.fill('');
  });

  await check('Public App', 'Category filter is available', async () => {
    const app = await getAppFrame(page);
    if (!app) throw new Error('Community Connections iframe is unavailable.');
    const select = app.locator('#eventTypeFilter');
    await select.waitFor({ state: 'visible' });
    await app.waitForFunction(() => {
      const select = document.getElementById('eventTypeFilter');
      return select && select.options && select.options.length >= 2;
    }, null, { timeout: 15000 });
    const options = await select.locator('option').count();
    if (options < 2) throw new Error('Category options were not loaded.');
  });

  let detailsHref = null;
  await check('Public App', 'View Details opens an adventure', async () => {
    const app = await getAppFrame(page);
    if (!app) throw new Error('Community Connections iframe is unavailable.');
    const detailLink = app.getByRole('button', { name: /view details|details/i }).first().or(app.getByRole('link', { name: /view details|details/i }).first());
    await detailLink.waitFor({ state: 'visible' });
    await detailLink.click();
    await app.locator('#eventDetailView').waitFor({ state: 'visible' });
    await app.locator('#eventDetailContent').waitFor({ state: 'visible' });
    detailsHref = page.url();
    const text = (await app.locator('#eventDetailContent').innerText()).trim();
    if (!text || /Could not load adventure details/i.test(text)) throw new Error('Adventure details did not load.');
  });

  await check('Public App', 'Registration page opens from an adventure', async () => {
    const app = await getAppFrame(page);
    if (!app) throw new Error('Community Connections iframe is unavailable.');
    const register = app.getByRole('button', { name: /register|join waitlist/i }).first().or(app.getByRole('link', { name: /register|join waitlist/i }).first());
    await register.waitFor({ state: 'visible' });
    await register.click();
    await app.locator('#registrationView').waitFor({ state: 'visible' });
    await app.locator('#registrationFormCard').waitFor({ state: 'visible' });
  }, { warning: true });

  await check('Public App', 'Public view hides organizer controls', async () => {
    const app = await getAppFrame(page);
    if (!app) throw new Error('Community Connections iframe is unavailable.');
    const visibleAdminButtons = await app.locator('#createEventBtn:visible, #commandCenter:visible, #organizerPortalChoice:visible').count();
    if (visibleAdminButtons) throw new Error('Organizer-only controls are visible in forced public mode.');
  });

  await check('Mobile', 'Landing page mobile menu opens', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(config.landingUrl, { waitUntil: 'domcontentloaded' });
    const button = page.locator('.mobile-menu-button');
    await button.click();
    const expanded = await button.getAttribute('aria-expanded');
    if (expanded !== 'true') throw new Error('Mobile navigation did not open.');
  });

  await check('Mobile', 'Public app has no horizontal overflow', async () => {
    await page.goto(config.publicAppUrl, { waitUntil: 'domcontentloaded' });
    const app = await waitForApp(page);
    const overflow = await app.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 3) throw new Error(`Horizontal overflow detected: ${overflow}px`);
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await check('Organizer', 'Organizer Command Center loads for approved account', async () => {
    await page.goto(config.appUrl, { waitUntil: 'domcontentloaded' });
    const app = await waitForApp(page);
    const choice = app.locator('#organizerPortalChoice');
    if (!(await choice.isVisible())) throw new Error('Approved organizer session not detected. This check is skipped until the test Chrome profile is signed into the approved Google account.');
    await choice.click();
    await app.locator('#commandCenter').waitFor({ state: 'visible' });
  }, { warning: true });

  await check('Browser Health', 'No unexpected JavaScript errors', async () => {
    const meaningful = [...new Set(consoleErrors)].filter(text => !/favicon|ResizeObserver loop|third-party cookie/i.test(text));
    if (meaningful.length) throw new Error(meaningful.slice(0, 3).join(' | '));
  });

  await page.screenshot({ path: path.join(screenshotsDir, 'last-run-final-page.png'), fullPage: true }).catch(() => {});
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function writeReports() {
  const finishedAt = Date.now();
  const counts = results.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, { PASS: 0, FAIL: 0, WARN: 0, SKIP: 0 });
  const requiredPassed = counts.FAIL === 0;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const payload = {
    version: 'V20.5',
    generatedAt: new Date().toISOString(),
    durationMs: finishedAt - startedAt,
    result: requiredPassed ? 'PASSED' : 'FAILED',
    counts,
    results
  };
  fs.writeFileSync(path.join(reportsDir, `${timestamp}.json`), JSON.stringify(payload, null, 2));
  fs.writeFileSync(path.join(reportsDir, 'latest-report.json'), JSON.stringify(payload, null, 2));

  const rows = results.map(item => `<tr class="${item.status.toLowerCase()}"><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.group)}</td><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.details)}</td><td>${item.durationMs} ms</td></tr>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>IWP V20 Test Report</title><style>
body{font-family:Arial,sans-serif;background:#0f172a;color:#f8fafc;margin:0;padding:32px}.wrap{max-width:1200px;margin:auto}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:24px 0}.card{background:#1f2937;border:1px solid #334155;border-radius:12px;padding:18px}.card strong{display:block;font-size:30px}.passed{color:#4ade80}.failed{color:#f87171}.warned{color:#fbbf24}table{width:100%;border-collapse:collapse;background:#111827;border-radius:12px;overflow:hidden}th,td{text-align:left;padding:12px;border-bottom:1px solid #334155;vertical-align:top}th{background:#1f2937}.pass td:first-child{color:#4ade80}.fail td:first-child{color:#f87171}.warn td:first-child,.skip td:first-child{color:#fbbf24}.meta{color:#cbd5e1}</style></head><body><div class="wrap"><h1>IWP Community Connections V20.6 Test Report</h1><h2 class="${requiredPassed ? 'passed' : 'failed'}">${payload.result}</h2><p class="meta">${escapeHtml(payload.generatedAt)} · ${payload.durationMs} ms</p><div class="summary"><div class="card"><strong>${counts.PASS}</strong>Passed</div><div class="card"><strong>${counts.FAIL}</strong>Failed</div><div class="card"><strong>${counts.WARN}</strong>Warnings</div><div class="card"><strong>${counts.SKIP}</strong>Skipped</div></div><table><thead><tr><th>Status</th><th>Area</th><th>Test</th><th>Details</th><th>Time</th></tr></thead><tbody>${rows}</tbody></table></div></body></html>`;
  fs.writeFileSync(path.join(reportsDir, `${timestamp}.html`), html);
  fs.writeFileSync(path.join(reportsDir, 'latest-report.html'), html);
  console.log('\n============================================================');
  console.log(`Result: ${payload.result}`);
  console.log(`Passed: ${counts.PASS} | Failed: ${counts.FAIL} | Warnings: ${counts.WARN} | Skipped: ${counts.SKIP}`);
  console.log('Report: browser-tests\\reports\\latest-report.html');
  console.log('============================================================');
  return requiredPassed;
}

(async () => {
  try {
    await run();
  } catch (error) {
    addResult('Test Runner', 'Runner completed', 'FAIL', error && error.stack ? error.stack : String(error));
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    const passed = writeReports();
    process.exitCode = passed ? 0 : 1;
  }
})();
