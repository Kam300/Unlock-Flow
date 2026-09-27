const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_DIR = __dirname;
const MANIFEST_PATH = path.join(PROJECT_DIR, 'manifest.json');
const UPDATES_XML_PATH = path.join(PROJECT_DIR, 'updates.xml');
const VERSION_JSON_PATH = path.join(PROJECT_DIR, 'version.json');

// Check key location (prefer parent directory so it's not packed inside the crx)
let keyPath = path.resolve(PROJECT_DIR, '..', 'key.pem');
if (!fs.existsSync(keyPath)) {
  keyPath = path.join(PROJECT_DIR, 'key.pem');
}
if (!fs.existsSync(keyPath)) {
  console.error('Error: key.pem not found in parent directory or project root!');
  process.exit(1);
}

// Find Chrome executable
const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
];
const chromeExe = chromePaths.find(p => fs.existsSync(p));
if (!chromeExe) {
  console.error('Error: Google Chrome not found in standard paths!');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const version = manifest.version;
const appid = 'akgiidpcpkicfkcehmapljelahiohfhd';

console.log(`Packaging Unlock-Flow v${version}...`);

try {
  execSync(`"${chromeExe}" --pack-extension="${PROJECT_DIR}" --pack-extension-key="${keyPath}" --no-message-box`, {
    stdio: 'inherit'
  });
} catch (e) {
  console.error('Error while running chrome --pack-extension:', e.message);
  process.exit(1);
}

// Chrome puts the .crx in the parent directory by default
const parentCrx = path.resolve(PROJECT_DIR, '..', `${path.basename(PROJECT_DIR)}.crx`);
const targetCrx = path.join(PROJECT_DIR, 'Unlock-Flow.crx');

if (fs.existsSync(parentCrx)) {
  fs.copyFileSync(parentCrx, targetCrx);
  console.log(`Created: ${targetCrx}`);
} else if (fs.existsSync(targetCrx)) {
  console.log(`Updated: ${targetCrx}`);
}

// Create clean ZIP archive for GitHub Releases
const targetZip = path.join(PROJECT_DIR, 'Unlock-Flow.zip');
try {
  const distFiles = ['manifest.json', 'background.js', 'hook.js', 'status.js', 'popup.html', 'popup.css', 'popup.js', 'icons', 'README.txt'];
  const quotedFiles = distFiles.map(f => `'${path.join(PROJECT_DIR, f)}'`).join(',');
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path @(${quotedFiles}) -DestinationPath '${targetZip}' -Force"`);
  console.log(`Created: ${targetZip}`);
} catch (e) {
  console.warn('Warning: Could not create ZIP:', e.message);
}

// Update updates.xml
const xmlContent = `<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='${appid}'>
    <updatecheck codebase='https://raw.githubusercontent.com/Kam300/Unlock-Flow/main/Unlock-Flow.crx' version='${version}' />
  </app>
</gupdate>
`;
fs.writeFileSync(UPDATES_XML_PATH, xmlContent, 'utf8');
console.log(`Updated updates.xml to version ${version}`);

// Update version.json
if (fs.existsSync(VERSION_JSON_PATH)) {
  const vJson = JSON.parse(fs.readFileSync(VERSION_JSON_PATH, 'utf8'));
  vJson.version = version;
  fs.writeFileSync(VERSION_JSON_PATH, JSON.stringify(vJson, null, 2) + '\n', 'utf8');
  console.log(`Updated version.json to version ${version}`);
}

console.log('\n--- SUCCESS ---');
console.log(`App ID: ${appid}`);
console.log(`Version: ${version}`);
console.log(`Packages: Unlock-Flow.crx & Unlock-Flow.zip`);
console.log('Now you can run:');
console.log('  git add .');
console.log(`  git commit -m "Release v${version}"`);
console.log('  git push origin main');
