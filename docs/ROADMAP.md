# Certificate Studio Roadmap

Each phase ends with commits on the `studio` branch, desktop and mobile screenshots in `docs/screenshots/phase-N/`,
and a short report: what changed, known issues, and what's next. The audit and the rendering decision are in [AUDIT.md](AUDIT.md).

## Phase 1: Foundation
- [ ] Repo hygiene: untrack the committed `backend/node_modules` and fix the baseline ESLint errors
- [ ] `shared/model`: `schemaVersion`, pure and idempotent `migrateTemplate()` (v1 → v2), element factories, validation
- [ ] Backend: migrate on read and write for every storage type; MySQL `extra_json` column so new top-level fields survive
- [ ] Editor store (zustand): document, selection, viewport, ui, command history (coalescing, 200 steps)
- [ ] Split `CanvasEditor.jsx` into `EditorShell`, `Canvas`, `SelectionLayer`, `panels/*`, `toolbar/*`, `hooks/*`, `model/*`
- [ ] `shared/render`: font registry, HarfBuzz text engine, scene display list
- [ ] Konva painter (editor) and PDFKit vector painter (backend) driven by the same display list
- [ ] Visual regression harness (editor snapshot vs rasterized PDF). PoC passes at ≥ 0.97 ink IoU
- [ ] Vitest for store, history and migrations; node:test for migrations and routes

## Phase 2: Canva core
- [ ] Snapping engine: canvas center and edges, element edges and centers, equal spacing, pink guides with distance readout
- [ ] Marquee and shift/tap multi-select; group and ungroup; align ×6, distribute, match size
- [ ] Lock, hide, duplicate, cross-template copy and paste, nudge, z-order; rotation snapping; image crop in frame
- [ ] Zoom to fit or selection, wheel and pinch zoom, space-drag pan; rulers and grid
- [ ] Context menu (right-click and long-press); floating contextual toolbar; layers panel (dnd-kit)
- [ ] Keyboard shortcuts; autosave with status indicator; draft recovery; guard against leaving with unsaved changes

## Phase 3: Mobile editor
- [ ] Below 768 px: compact top bar, full-bleed canvas, bottom toolbar, and draggable sheets (half and full)
- [ ] Contextual bottom toolbar for the selection; 44 px transformer handles; safe areas
- [ ] Gestures: pinch or rotate the element, pinch or pan the canvas, double-tap to edit; keyboard-safe text overlay
- [ ] Performance: layer caching, throttled transforms, lazy fonts; test matrix for 4 viewports in 2 orientations

## Phase 4: Content
- [ ] Rich text with inline `{{chips}}`, sample-student switcher, and a "longest name" stress preview
- [ ] Auto-fit, gradient, stroke, shadow, curved text, direction override
- [ ] Shapes: star, polygon, arrow, dividers, dash, gradient fills
- [ ] Image filters, flip, radius, and circle and arch masks
- [ ] Islamic SVG asset library (recolorable, searchable, categorized)
- [ ] 12 premium starter templates (A4 and Letter, portrait and landscape)
- [ ] Brand kit, palette swap, duplicate, save as new, version history

## Phase 5: Generation
- [ ] Stepper (template → students → preview → generate), paste from Excel, and column mapping with validation
- [ ] Pre-flight checks: missing fields, overflow (offer auto-shrink), duplicates
- [ ] Outputs: single, merged, ZIP, PNG or JPG, print-ready with bleed, file-name patterns
- [ ] Background jobs for 200+ students with a progress bar, persisted in storage; Web Share on mobile

## Phase 6: Pro
- [ ] Serial numbers, QR element, public `/verify/:serial`, `certificates` table
- [ ] bcrypt (migrating plaintext passwords), login rate limit, CORS allowlist, helmet, zod validation, SVG sanitizing, upload limits
- [ ] Roles: admin and teacher
- [ ] Design tokens, IBM Plex Sans Arabic, skeleton loaders, empty states, toasts, dialogs, dark mode, accessibility
- [ ] Code-split the editor, preload fonts, WebP thumbnails, PWA
- [ ] Playwright E2E (desktop and mobile) and the full visual regression suite
- [ ] Remove stray root files, update `.gitignore`, and update AGENTS.md and README.md
