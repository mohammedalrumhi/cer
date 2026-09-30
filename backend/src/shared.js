const path = require('path');
const { pathToFileURL } = require('url');

// The shared model/render code is ESM (it is also bundled by Vite for the editor).
// CommonJS can load it with dynamic import(), which works on every supported Node version.
const sharedRoot = path.resolve(__dirname, '../../shared');
const cache = new Map();

function loadSharedModule(relativePath) {
  if (!cache.has(relativePath)) {
    cache.set(relativePath, import(pathToFileURL(path.join(sharedRoot, relativePath)).href));
  }
  return cache.get(relativePath);
}

function loadModel() {
  return loadSharedModule('model/index.js');
}

module.exports = {
  loadModel,
  loadSharedModule,
};
