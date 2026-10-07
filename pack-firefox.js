// Builds dist/Unlock-Flow-Firefox-v<version>.zip from the shared sources.
// Firefox only needs a different manifest (manifest.firefox.json); no signing key is required.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PROJECT_DIR = __dirname;
const DIST_DIR = path.join(PROJECT_DIR, 'dist');
const STAGE_DIR = path.join(PROJECT_DIR, '_ff_stage');

const files = [
  'background.js',
  'hook.js',
  'status.js',
  'popup.html',
  'popup.css',
  'popup.js',
  'fx.css',
  'fx.js',
  'fonts',
  'icons',
  'README.txt'
];

// Keep the Firefox version in sync with the Chrome manifest.
const { version } = JSON.parse(fs.readFileSync(path.join(PROJECT_DIR, 'manifest.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(PROJECT_DIR, 'manifest.firefox.json'), 'utf8'));
manifest.version = version;

fs.rmSync(STAGE_DIR, { recursive: true, force: true });
fs.mkdirSync(STAGE_DIR, { recursive: true });
fs.mkdirSync(DIST_DIR, { recursive: true });
for (const item of files) {
  fs.cpSync(path.join(PROJECT_DIR, item), path.join(STAGE_DIR, item), {
    recursive: true,
    filter: src => path.basename(src) !== 'logo.png'
  });
}
fs.writeFileSync(path.join(STAGE_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

// bsdtar (bundled with Windows 10+, macOS) writes ZIPs with forward-slash paths,
// which Firefox requires. PowerShell's Compress-Archive does not.
const zipName = `Unlock-Flow-Firefox-v${version}.zip`;
const target = path.join(DIST_DIR, zipName);
fs.rmSync(target, { force: true });
const tar = process.platform === 'win32'
  ? path.join(process.env.SystemRoot || 'C:\Windows', 'System32', 'tar.exe')
  : 'bsdtar';
execFileSync(tar, ['-a', '-c', '-f', target, '-C', STAGE_DIR, 'manifest.json', ...files], { stdio: 'inherit' });
fs.rmSync(STAGE_DIR, { recursive: true, force: true });
console.log(`Created Firefox ZIP: dist/${zipName} (${(fs.statSync(target).size / 1024).toFixed(1)} KB)`);
