'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = __dirname;
const configPath = path.join(ROOT, 'test-config.json');
const config = fs.existsSync(configPath)
  ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
  : {};

const localAppData = process.env.LOCALAPPDATA;
const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
if (!localAppData) throw new Error('LOCALAPPDATA is unavailable.');

const testRoot = path.join(localAppData, 'IWP-Community-Connections-Organizer-Chrome');
const testUserData = path.join(testRoot, 'User Data');
const readyPath = path.join(testRoot, 'organizer-profile.json');
const organizerUrl = config.organizerAppUrl ||
  'https://script.google.com/macros/s/AKfycbwpS3HKOEl1CfdikTZuhvqynJxAhUbIINdWfSP0Tcfd/dev';

function findChrome() {
  const candidates = [
    path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe')
  ];
  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}

const chromePath = findChrome();
if (!chromePath) {
  throw new Error('Google Chrome was not found on this computer.');
}

fs.mkdirSync(testUserData, { recursive: true });
fs.rmSync(readyPath, { force: true });

console.log('============================================================');
console.log('IWP COMMUNITY CONNECTIONS ORGANIZER PROFILE SETUP');
console.log('============================================================');
console.log('');
console.log('Your normal Chrome windows can stay open.');
console.log('A separate Chrome profile will open only for organizer testing.');
console.log('');
console.log('In the new Chrome window:');
console.log('  1. Sign into the approved organizer Google account.');
console.log('  2. Confirm Organizer Access appears in Community Connections.');
console.log('  3. Close only that separate Chrome window.');
console.log('');
console.log('Waiting for the organizer-test Chrome window to close...');

const result = spawnSync(chromePath, [
  `--user-data-dir=${testUserData}`,
  '--profile-directory=Default',
  '--no-first-run',
  '--no-default-browser-check',
  '--new-window',
  organizerUrl
], {
  stdio: 'inherit',
  windowsHide: false
});

if (result.error) throw result.error;
if (typeof result.status === 'number' && result.status !== 0) {
  throw new Error(`Chrome closed with exit code ${result.status}.`);
}

fs.writeFileSync(readyPath, JSON.stringify({
  createdAt: new Date().toISOString(),
  testUserDataDir: testUserData,
  profileDirectory: 'Default',
  organizerEmail: config.organizerEmail || '',
  setupMethod: 'dedicated-normal-chrome-profile'
}, null, 2));

console.log('');
console.log('ORGANIZER TEST PROFILE IS READY');
console.log('Your normal Chrome profile was not copied or changed.');
console.log('Run Run-V21-All-Tests.bat to test the Organizer Command Center.');
