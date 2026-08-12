'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const failures = [];
const notes = [];

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function firstPartyFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'reports' || entry.name === 'screenshots') return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? firstPartyFiles(full) : [full];
  });
}

const files = firstPartyFiles(root);
for (const file of files.filter((item) => /\.(?:html|js|css|json|md|txt)$/i.test(item))) {
  const text = fs.readFileSync(file, 'utf8');
  if (/^(<{7}|={7}|>{7})/m.test(text)) failures.push(`Conflict marker found: ${path.relative(root, file)}`);
}

for (const htmlFile of files.filter((item) => /\.html$/i.test(item) && !item.includes(`${path.sep}browser-tests${path.sep}`))) {
  const html = fs.readFileSync(htmlFile, 'utf8');
  for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
    const url = match[1];
    if (/^(?:https?:|\/\/|#|mailto:|tel:|javascript:|data:)/i.test(url)) continue;
    const local = url.split(/[?#]/)[0].replace(/^\//, '');
    if (!local) continue;
    if (!fs.existsSync(path.join(root, local))) failures.push(`${path.relative(root, htmlFile)} references missing local file: ${url}`);
  }
}

const activeScripts = new Set();
for (const htmlFile of files.filter((item) => /\.html$/i.test(item) && path.dirname(item) === root)) {
  const html = fs.readFileSync(htmlFile, 'utf8');
  for (const match of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) {
    const url = match[1];
    if (/^https?:/i.test(url)) continue;
    const local = url.split(/[?#]/)[0].replace(/^\//, '');
    if (local.endsWith('.js')) activeScripts.add(local);
  }
}
for (const file of files.filter((item) => item.startsWith(path.join(root, 'functions', 'api')) && /\.js$/i.test(item))) {
  activeScripts.add(path.relative(root, file));
}
for (const relative of activeScripts) {
  try { execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' }); }
  catch (error) { failures.push(`JavaScript syntax error: ${relative}`); }
}

const index = read('index.html');
const site = read('site-m64.js');
if (!index.includes('id="browse-adventures"')) failures.push('Landing category results section is missing.');
if (!site.includes('renderLandingCategoryResults')) failures.push('Active site-m64.js is missing category browsing logic.');
if (!site.includes('landingUpcomingEvents')) failures.push('Active site-m64.js is not retaining upcoming events for category browsing.');

[
  'organizer.html',
  'organizer-adventures.html',
  'organizer-builder.html',
  'organizer-registrations.html',
  'organizer-checkin.html',
  'organizer-analytics.html',
  'adventure.html',
  'register.html'
].forEach((relative) => {
  if (!fs.existsSync(path.join(root, relative))) failures.push(`Required page missing: ${relative}`);
});

notes.push(`${files.length} first-party files scanned.`);
notes.push(`${activeScripts.size} active JavaScript/Cloudflare files syntax-checked.`);
notes.push('Local HTML asset references checked.');
notes.push('M6.22 active category browsing wiring checked.');

if (failures.length) {
  console.error(`LANDING STATIC VALIDATION: FAIL (${failures.length})`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('LANDING STATIC VALIDATION: PASS');
notes.forEach((note) => console.log(`- ${note}`));
