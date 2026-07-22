'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = __dirname;
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'test-config.json'), 'utf8'));
const profileDir = path.join(process.env.LOCALAPPDATA || ROOT, 'IWP-Community-Connections-Organizer-Test-Profile');
const readyFile = path.join(profileDir, '.organizer-profile-ready');
const organizerUrl = config.organizerAppUrl || 'https://script.google.com/macros/s/AKfycbwpS3HKOEl1CfdikTZuhvqynJxAhUbIINdWfSP0Tcfd/dev';

async function getAppFrame(page, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      try {
        if (await frame.locator('#organizerPortalChoice').count()) return frame;
      } catch (_) {}
    }
    await page.waitForTimeout(300);
  }
  return null;
}

(async () => {
  fs.mkdirSync(profileDir, { recursive: true });
  if (fs.existsSync(readyFile)) fs.unlinkSync(readyFile);

  console.log('============================================================');
  console.log('IWP COMMUNITY CONNECTIONS ORGANIZER TEST LOGIN SETUP');
  console.log('============================================================');
  console.log('A dedicated Chrome window is opening.');
  console.log('Sign into the approved Google organizer account if prompted.');
  console.log('Leave the window open until this script confirms Organizer Access.');
  console.log('No password is stored by the project. Chrome keeps the signed-in session locally.');
  console.log('');

  const context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1440, height: 1000 },
    ignoreHTTPSErrors: true
  });
  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(120000);
  console.log('Opening the organizer-only Apps Script test URL...');
  console.log(organizerUrl);
  await page.goto(organizerUrl, { waitUntil: 'domcontentloaded' });

  const deadline = Date.now() + (5 * 60 * 1000);
  let found = false;
  while (Date.now() < deadline) {
    const frame = await getAppFrame(page, 5000);
    if (frame) {
      const choice = frame.locator('#organizerPortalChoice');
      if (await choice.isVisible().catch(() => false)) {
        found = true;
        break;
      }
    }
    await page.waitForTimeout(1000);
  }

  if (!found) {
    console.error('Organizer Access was not detected within 5 minutes.');
    console.error('Confirm this Google account is active in the Admins sheet, then run setup again.');
    await context.close();
    process.exitCode = 1;
    return;
  }

  fs.writeFileSync(readyFile, new Date().toISOString());
  console.log('Organizer Access detected. The authenticated test profile is ready.');
  console.log('Future V21 test runs will use this dedicated profile automatically.');
  await page.waitForTimeout(1500);
  await context.close();
})();
