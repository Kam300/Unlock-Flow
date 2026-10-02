const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_DIR = __dirname;
const DIST_DIR = path.join(PROJECT_DIR, 'dist');
const MANIFEST_PATH = path.join(PROJECT_DIR, 'manifest.json');
const UPDATES_XML_PATH = path.join(PROJECT_DIR, 'updates.xml');
const VERSION_JSON_PATH = path.join(PROJECT_DIR, 'version.json');

// Ensure dist directory exists
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// Check key location (prefer parent directory so it's never committed or packed)
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

// Clean up old archives from project root if any remain
['Unlock-Flow.crx', 'Unlock-Flow.zip'].forEach(file => {
  const rootFile = path.join(PROJECT_DIR, file);
  if (fs.existsSync(rootFile)) {
    fs.unlinkSync(rootFile);
    console.log(`Removed root artifact: ${file}`);
  }
});

// Clean distribution files list (ONLY files required to run the extension in Chrome)
const extensionFiles = [
  'manifest.json',
  'background.js',
  'hook.js',
  'status.js',
  'popup.html',
  'popup.css',
  'popup.js',
  'icons',
  'README.txt'
];

// 1. Stage clean extension files for CRX packaging
const stageDir = path.join(PROJECT_DIR, '_crx_stage');
if (fs.existsSync(stageDir)) {
  fs.rmSync(stageDir, { recursive: true, force: true });
}
fs.mkdirSync(stageDir, { recursive: true });

for (const item of extensionFiles) {
  const src = path.join(PROJECT_DIR, item);
  const dest = path.join(stageDir, item);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
  }
}

// Pack clean stage with Chrome
try {
  execSync(`"${chromeExe}" --pack-extension="${stageDir}" --pack-extension-key="${keyPath}" --no-message-box`, {
    stdio: 'inherit'
  });
} catch (e) {
  console.error('Error while running chrome --pack-extension:', e.message);
  process.exit(1);
}

// Move generated CRX to dist/Unlock-Flow.crx
const stageCrx = path.resolve(stageDir, '..', `${path.basename(stageDir)}.crx`);
const targetCrx = path.join(DIST_DIR, 'Unlock-Flow.crx');
if (fs.existsSync(stageCrx)) {
  fs.copyFileSync(stageCrx, targetCrx);
  fs.unlinkSync(stageCrx);
}
// Clean up stage folder
fs.rmSync(stageDir, { recursive: true, force: true });
console.log(`Created clean CRX: dist/Unlock-Flow.crx (${(fs.statSync(targetCrx).size / 1024).toFixed(1)} KB)`);

// 2. Create clean ZIP archive for GitHub Releases in dist/
const targetZip = path.join(DIST_DIR, 'Unlock-Flow.zip');
try {
  const quotedFiles = extensionFiles.map(f => `'${path.join(PROJECT_DIR, f)}'`).join(',');
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path @(${quotedFiles}) -DestinationPath '${targetZip}' -Force"`);
  console.log(`Created clean ZIP: dist/Unlock-Flow.zip (${(fs.statSync(targetZip).size / 1024).toFixed(1)} KB)`);
} catch (e) {
  console.warn('Warning: Could not create ZIP:', e.message);
}

// 3. Update updates.xml
const xmlContent = `<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='${appid}'>
    <updatecheck codebase='https://raw.githubusercontent.com/Kam300/Unlock-Flow/main/dist/Unlock-Flow.crx' version='${version}' />
  </app>
</gupdate>
`;
fs.writeFileSync(UPDATES_XML_PATH, xmlContent, 'utf8');
console.log(`Updated updates.xml to version ${version}`);

// 4. Update version.json
if (fs.existsSync(VERSION_JSON_PATH)) {
  const vJson = JSON.parse(fs.readFileSync(VERSION_JSON_PATH, 'utf8'));
  vJson.version = version;
  vJson.crxUrl = 'https://raw.githubusercontent.com/Kam300/Unlock-Flow/main/dist/Unlock-Flow.crx';
  vJson.crxVersion = version;
  vJson.zipUrl = 'https://raw.githubusercontent.com/Kam300/Unlock-Flow/main/dist/Unlock-Flow.zip';
  if (!vJson.changelog) vJson.changelog = `Версия ${version}`;
  fs.writeFileSync(VERSION_JSON_PATH, JSON.stringify(vJson, null, 2) + '\n', 'utf8');
  console.log(`Updated version.json to version ${version}`);
}

console.log('\n--- BUILD FINISHED ---');
console.log(`App ID: ${appid}`);
console.log(`Version: ${version}`);
console.log(`Dist artifacts in: dist/`);
console.log('Now you can run:');
console.log('  git add .');
console.log(`  git commit -m "Release v${version}"`);
console.log('  git push origin main');
