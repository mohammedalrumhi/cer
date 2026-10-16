// All lucide icon geometries, bundled into this one lazily-loaded chunk. Alias files have no
// __iconNode of their own, so whole modules are imported and filtered at runtime.
const modules = import.meta.glob('../../../node_modules/lucide-react/dist/esm/icons/*.js', { eager: true });

export const ICON_NODES = Object.fromEntries(
  Object.entries(modules)
    .map(([file, mod]) => [file.split('/').pop().replace(/\.js$/, ''), mod.__iconNode])
    .filter(([, nodes]) => Array.isArray(nodes)),
);
