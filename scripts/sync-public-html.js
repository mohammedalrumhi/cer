const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const sourceDir = path.join(projectRoot, 'frontend', 'dist');
const targetDir = path.resolve(process.env.PUBLIC_HTML_DIR || path.join(projectRoot, 'public_html'));
const preservedEntries = new Set(['.htaccess', '.well-known']);
const ignoredEntries = new Set(['.DS_Store']);

function ensureSourceExists() {
  if (!fs.existsSync(path.join(sourceDir, 'index.html'))) {
    throw new Error(`Frontend build output not found at ${sourceDir}. Run the build first.`);
  }
}

function ensureTargetDir() {
  fs.mkdirSync(targetDir, { recursive: true });
}

function emptyTargetDir() {
  for (const entry of fs.readdirSync(targetDir)) {
    if (preservedEntries.has(entry)) continue;
    fs.rmSync(path.join(targetDir, entry), { recursive: true, force: true });
  }
}

function copyEntry(sourcePath, targetPath) {
  const entryName = path.basename(sourcePath);
  if (ignoredEntries.has(entryName)) return;

  const stats = fs.statSync(sourcePath);
  if (stats.isDirectory()) {
    fs.mkdirSync(targetPath, { recursive: true });
    for (const child of fs.readdirSync(sourcePath)) {
      copyEntry(path.join(sourcePath, child), path.join(targetPath, child));
    }
    return;
  }

  fs.copyFileSync(sourcePath, targetPath);
}

function copyBuildOutput() {
  for (const entry of fs.readdirSync(sourceDir)) {
    copyEntry(path.join(sourceDir, entry), path.join(targetDir, entry));
  }
}

function main() {
  ensureSourceExists();
  ensureTargetDir();
  emptyTargetDir();
  copyBuildOutput();
  console.log(`Synced frontend build from ${sourceDir} to ${targetDir}`);
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}