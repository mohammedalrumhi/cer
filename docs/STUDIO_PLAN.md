# Studio plan: Lawha's editor in cer

Date: 2026-10-16 · Branch: `studio` · Reference: Lawha (`report-desinger`), read-only.

This plan maps every Lawha editor feature to the cer files it touches, in the order of the five phases.
It also records the Lawha features that are skipped, and why.

## Ground rules carried into every phase

- **One render pipeline.** Every new element type or effect is described once in `shared/render/scene.js`
  and painted by `frontend/src/editor/render/paintOps.js` (Konva and plain canvas) and
  `backend/src/services/scenePdfRenderer.js` (PDFKit). Text is always HarfBuzz glyph outlines.
- **New painting model.** Shapes, text, icons, ornaments, QR codes and barcodes all become *path ops*:
  an SVG path string in element-local coordinates, plus a paint (solid, linear or radial gradient), a stroke,
  dash and caps. `Path2D` and PDFKit's `doc.path()` read the same SVG path syntax, so both painters reduce
  to "set transform, set paint, fill/stroke the path". Text is turned into one outline path per op
  (`shared/render/outline.js`), so gradients, outlines and shadows work on text exactly as on shapes.
- **Schema v3**, added by a migration in `shared/model/migrations.js`. It is purely additive: v2 templates gain
  `digits: 'keep'` (render numbers as typed, as before), `page: { margins, bleed }` and `version: 1`. No
  element changes, so every stored template prints the same.
- **Arabic only.** All UI strings live in `frontend/src/strings.ar.js`. The app root is `dir="rtl"`.
- **History** stays on cer's `history.js` (immutable documents, coalescing, 200 steps, named actions).
  Immer is not needed, because documents are already immutable with structural sharing.

## Coordinate convention (differs from Lawha)

cer rotates elements around their origin `(x, y)` (Konva's default), while Lawha rotates around the centre.
Changing this would move every rotated element in stored templates, so cer keeps its convention. The
snapping, align and marquee code (ported from Lawha) works on axis-aligned bounds computed with
origin rotation (`frontend/src/editor/canvas/geometry.js`).

---

## Phase 1: design system and app shell

| Feature | Lawha source | cer files |
|---|---|---|
| Design tokens (emerald, gold, ivory), light and dark | `styles/tokens.css` | `frontend/src/styles/tokens.css`, `index.css` (Tailwind 4 `@theme` maps tokens to `bg-surface`, `text-fg`…) |
| Theme toggle (light, dark, system, in localStorage) | `components/ThemeToggle.tsx` | `frontend/src/ui/theme.js`, `ui/ThemeToggle.jsx` |
| IBM Plex Sans Arabic, self-hosted, with a type scale | `@fontsource-variable/cairo` | `@fontsource/ibm-plex-sans-arabic` (400/500/600/700); Google Fonts link removed from `index.html` |
| Tooltip with shortcut | `components/Tooltip.tsx` | `frontend/src/ui/Tooltip.jsx` (Radix) |
| Toasts | `toast.tsx`, `toastStore.ts` | `ui/toast.js` (zustand), `ui/Toaster.jsx` |
| Modal, confirm dialog | `Modal.tsx` | `ui/Dialog.jsx`, `ui/confirm.jsx` (promise-based `confirm()`) |
| Dropdown, popover, slider, segmented control | Radix wrappers in panels | `ui/Dropdown.jsx`, `ui/Popover.jsx`, `ui/Slider.jsx`, `ui/Segmented.jsx` |
| Empty state, skeleton, error state | dashboard pages | `ui/EmptyState.jsx`, `ui/Skeleton.jsx`, `ui/ErrorState.jsx` |
| Motion: panel slide-in, hover, selection glow, smooth zoom, reduced motion | `index.css` animations | `index.css` keyframes, `@media (prefers-reduced-motion)` |
| RTL everywhere, `DirectionProvider` | i18n direction | `index.html` `lang="ar" dir="rtl"`, `main.jsx` wraps the app in Radix `DirectionProvider dir="rtl"`; forced `direction: 'ltr'` removed from `EditorShell.jsx`, `TopBar.jsx`, `ToolsSidebar.jsx` |
| One string file | i18next JSON | `frontend/src/strings.ar.js` |
| Arabic-Indic digits in the UI | `latinDigits` | `frontend/src/ui/format.js` (`toArabicDigits`, `formatNumber`) |
| App shell and every screen (loading, empty, error) | `pages/dashboard/*` | `components/Layout.jsx` (new sidebar), `pages/*` |
| Remove the English preset and English-only fonts | — | `data/presets.js` (`english-recognition` removed), `backend/src/routes/fonts.js` returns `arabic` coverage and an Arabic label; pickers hide fonts without Arabic |

## Phase 2: the editor

### Layout (mirrored)

| Feature | Lawha | cer |
|---|---|---|
| Icon rail + slide-in side panel on the right | `layout/IconRail.tsx`, `SidePanel.tsx` | `editor/layout/IconRail.jsx`, `editor/layout/SidePanel.jsx` (first children in an RTL flex row sit on the right) |
| Properties panel on the left | `layout/PropertiesPanel.tsx`, `ElementProperties.tsx` | `editor/panels/PropertiesPanel.jsx` (rewritten: document, page, element and multi-selection views) |
| Context toolbar above the canvas | `toolbar/ContextToolbar.tsx` | `editor/toolbar/ContextToolbar.jsx` (text, shape, line, image, icon, QR, barcode, multi-select) |
| Top bar: back, name, undo/redo, page setup, design/preview toggle, save status, export | `layout/TopBar.tsx` | `editor/toolbar/TopBar.jsx` (rewritten) |
| Bottom bar: zoom slider and steps, fit, view menu, shortcuts | `layout/BottomBar.tsx` | `editor/layout/BottomBar.jsx` |

### Side panels

| Panel | Lawha | cer |
|---|---|---|
| القوالب: gallery, apply with confirmation, replace colors/background only | `pages/dashboard` + `panels` | `editor/panels/TemplatesPanel.jsx`, `shared/templates/palette.js` (`applyPalette`) |
| العناصر: shapes, lines, frames, ornaments, icons | `panels/ElementsPanel.tsx`, `iconSearch.ts` | `editor/panels/ElementsPanel.jsx`, `shared/assets/ornaments.js` (Islamic SVG set), `editor/panels/iconSearch.js` (lucide `__iconNode`, converted to paths with `shared/render/svgShapes.js`) |
| النصوص: heading/subheading/body, combinations, Quranic and du'a phrases | `panels/TextPanel.tsx` | `editor/panels/TextPanel.jsx`, `editor/model/textPresets.js` |
| الحقول: field chips, drop to create or insert `{{field}}`, custom columns | `panels/DataPanel.tsx`, `dnd/drop.ts` | `editor/panels/FieldsPanel.jsx`, `editor/dnd/*` |
| الرفع: assets on the server, delete with confirmation | `panels/UploadsPanel.tsx` | `editor/panels/UploadsPanel.jsx`, `backend/src/routes/assets.js`, storage `listAssets/addAsset/deleteAsset` |
| الهوية: logo, stamp, signature, brand colors, saved text styles | `panels/BrandPanel.tsx`, `libraryStores.ts` | `editor/panels/BrandPanel.jsx`; branding gains `colors` and `textStyles` |
| الطبقات: drag reorder, rename, lock/hide, group color | `panels/LayersPanel.tsx`, `SortableList.tsx` | `editor/panels/LayersPanel.jsx` (dnd-kit) |
| الخلفيات: solid, gradient, image, the 48 colour variants | page background controls | `editor/panels/BackgroundsPanel.jsx`; backgrounds gain `fill` paint (gradient) |

### Element types, effects and painting

| Feature | Lawha | cer |
|---|---|---|
| polygon, star (badge, seal) | `konvaPaint.ts#polygonPoints` | `shared/render/shapes.js` → path op |
| arrow/divider heads, dash, cap, swap | `LineShape` | `line` gains `startHead`, `endHead`, `dash`, `lineCap`; heads become path ops |
| icon (lucide) | `IconShape` | `icon` element stores `paths` (24-unit viewBox), so the backend needs no icon library |
| frame (image masked to a shape) | `ImageShape` with `frame` | `frame` element: clip path + image + crop |
| QR code, barcode (bindable) | `qrcode-generator`, `jsbarcode` | `shared/render/qr.js` (wraps injected `qrcode-generator`), `shared/render/code128.js` (pure, no DOM); both become path ops |
| ornament (SVG) | — | `ornament` element → path ops from `shared/assets/ornaments.js` |
| dateField (Hijri/Gregorian) | `dateField` | `dateField` element: text resolved by `shared/model/fields.js#formatDate` |
| Gradient fills (linear/radial) | `konvaPaint.ts#fillAttrs` | paint objects resolved to box coordinates in `scene.js`; Konva `createLinearGradient`, PDFKit `linearGradient` |
| Text: strike, justify, vertical align, gradient fill, shadow, outline, highlight, kashida | `TextShape` | `textEngine.js` (justify, strike, vertical offset, kashida insertion), `outline.js` (one path per text), effects painted identically |
| Image: crop mode, fit, flip, filters, radius, border | `crop.ts`, `CropOverlay.tsx`, `ImageShape` | `scene.js` computes the drawn rect + clip; filters run on pixels in `shared/render/filters.js` on both sides (editor canvas, backend pngjs/jpeg-js) |
| Color picker | `color/*` | `editor/color/ColorPicker.jsx`, `colorMath.js`, `colorStores.js` + a certificate palette |

### Canvas interaction

| Feature | Lawha | cer |
|---|---|---|
| Snapping to page edges, centre, margins, elements; red guides; distance labels; Alt disables | `canvas/snapping.ts` | `editor/canvas/snapping.js` (port), wired into `Canvas.jsx` drag and transformer anchors |
| Rulers, grid, margin and bleed guides; View menu; localStorage | `Rulers.tsx`, `viewPrefs.ts` | `editor/canvas/Rulers.jsx`, `editor/store/viewPrefs.js` |
| Marquee, Shift add, hover outline, 3 px drag threshold | `PageStage.tsx` | `Canvas.jsx` (pointer sessions replace Konva's built-in drag) |
| Groups (click selects group, double-click selects member) | `align.ts#expandToGroups` | `groupId` on elements; store `groupSelection`/`ungroupSelection` |
| Rotation snapping 0/90/180/270, 15° with Shift; aspect lock | `PageStage.tsx` | `Canvas.jsx` transformer |
| Align ×6 (page or selection), distribute | `canvas/align.ts` | `editor/canvas/align.js`, store `alignSelection`/`distributeSelection` |
| Zoom 10–400 % with steps, fit, Ctrl+wheel at pointer, Space+drag | `editorUi.ts` | `editorStore.js` (`ZOOM_STEPS`, `stepZoom`) |
| Context menu (Radix) with align submenu | `CanvasContextMenu.tsx` | `editor/canvas/ContextMenu.jsx` (rewritten on Radix) |
| Full shortcut list, `?` cheat sheet, shortcuts in tooltips | `shortcuts.ts`, `ShortcutsDialog.tsx` | `editor/shortcuts.js`, `editor/layout/ShortcutsDialog.jsx` |

### Saving, versions, preview, page setup

| Feature | Lawha | cer |
|---|---|---|
| Autosave 1 s after the last edit, with retry | `store/autosave.ts` | `editor/store/autosave.js` |
| Status pill and 409 conflict dialog (optimistic versioning) | `SaveStatus.tsx` | `editor/layout/SaveStatus.jsx`; `PUT /templates/:id` takes `baseVersion` and answers 409 |
| `beforeunload` guard | `EditorPage` | `EditorShell.jsx` |
| Version history: named versions, preview, restore | `versions/*` | `editor/versions/VersionHistoryDialog.jsx`; `GET/POST /templates/:id/versions`, `POST …/restore` |
| Design / preview with real students, step through, jump to a name | preview mode | `editor/preview/PreviewBar.jsx`; `useSceneOps` takes the active student |
| Page setup: A4, A5, Letter, square, custom; margins, bleed; resize | `PageToolbar` | `editor/panels/PageSetupDialog.jsx`, `shared/model/pageSizes.js` |

## Phase 3: templates

- Gallery on the dashboard and in the editor (`components/gallery/TemplateGallery.jsx`) with categories,
  filters (category, orientation, audience, detail) and search. The Generate / GenerateSimple split goes away.
- **Real thumbnails**: `components/gallery/TemplateThumbnail.jsx` paints the shared scene with sample data onto a
  canvas, using the same `paintOps.js` as the editor. Rendered lazily with `IntersectionObserver` and cached.
- **20+ new templates** built only from editor elements in `shared/templates/` (builders that take a palette).
  Each has a `category`, a `palette` and supports every colour variant through `applyPalette`.
- "حفظ كقالب", duplicate, rename, delete and favourite. `normalizeTemplateMetadata` stops overwriting user names
  (it currently replaces every name with a generated label).
- Fix the template with the missing background (`06914781…`): the background becomes an editable ornament
  frame, and the missing path is kept in `background.missingImagePath`. The API flags any missing background.
- Base64 images move to asset files on save (`backend/src/storage/withTemplateMigrations.js`) and with the
  script `backend/scripts/extractInlineImages.js`. (The stored templates currently have none.)

## Phase 4: bulk generation

- One wizard at `/generate` (`pages/generate/*`): template → students → review → output; `/generate-simple`
  redirects there.
- Students: saved, Excel/CSV, or a pasted list (one per line, no comma splitting). The column-mapping step uses
  `shared/model/studentFields.js` (Arabic aliases, shared with the backend). Custom columns are kept as fields
  (`routes/students.js` normalizer fixed; MySQL `students.extra_json`). Duplicates are removed, and the count is correct.
- Review: an editable grid with a gender toggle per row, pre-flight checks (overflow and auto-shrink from the real
  layout engine, missing fields, duplicates) and a live preview of the selected row.
- Output: merged PDF, ZIP of PDFs, ZIP of PNG/JPG; a file-name pattern; 2-up on A4. PDFs are made by a background
  job on the server (`backend/src/services/jobs.js`, persisted in storage, real progress, cancel, history).
  PNG/JPG are painted in the browser from the same scene and zipped with a small built-in ZIP writer
  (no server-side rasteriser is available on Hostinger without native libraries).
- Verification: serial per certificate, a QR bound to `{{verifyUrl}}`, public `GET /api/verify/:serial` and
  `/verify/:serial`.
- Remove duplicated logic: the backend uses `shared/model/fields.js` and a single `shared/model/templateMetadata.js`.

## Phase 5: quality and acceptance

- New e2e tests: snapping, multi-select + align, crop, undo/redo across 20 actions, autosave conflict, bulk
  wizard with 200 rows, and a scan for Latin-letter UI strings. A 500-student job test runs on the backend.
- Fidelity tests extended with a fixture template that contains every new element type and effect.
- 1280×720 laptop layout; panels collapse into overlays below 1024 px.
- `docs/ROADMAP.md`, `AGENTS.md`, and `docs/STUDIO_GUIDE.md` (Arabic guide for teachers).

---

## Lawha features skipped, and why

| Lawha feature | Why it is skipped |
|---|---|
| Tables and the table data editor | Certificates have no tabular data; one student per page. |
| Charts (ECharts) | No numeric series on a certificate. |
| Multi-page documents, page strip, pages panel, `repeatFor` | A certificate is one page; bulk generation repeats it per student instead. The bottom bar keeps zoom and view controls only. |
| Word (.docx) and PowerPoint (.pptx) export | Teachers print PDFs; editable Office output cannot match the shared renderer. |
| Data JSON editor (Monaco), datasets, expression engine, `visibleIf` | Data comes from the student list; fields are simple `{{placeholders}}`. |
| REST SDK, embeddable viewer, API keys, share dialog | No integration with other apps is planned. |
| Page numbers | One page per certificate. |
| i18n and language switcher | The product is Arabic only by requirement. |
| Folders, trash | Categories and favourites cover the need for a small school library. |
| Lawha's centre-origin rotation | Would move every rotated element in stored templates (see above). |

## Decisions worth confirming

1. PNG/JPG bulk output is produced in the browser (with progress and cancel), PDFs on the server.
2. Text shadows: PDF has no blur, so a soft shadow is drawn the same way on both sides as a few translucent,
   offset copies. It looks like a soft shadow and prints identically.
3. Templates migrated from v2 keep numbers as typed (`digits: 'keep'`). New templates use Arabic-Indic digits.
4. File-format names (PDF, PNG, JPG, ZIP, Excel, CSV) stay in Latin letters; the "no English" test allows only these.
