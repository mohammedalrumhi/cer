# Certificate Studio Roadmap

The audit and the rendering decision are in [AUDIT.md](AUDIT.md). The studio rebuild (Lawha's editor brought
into cer) is planned feature by feature in [STUDIO_PLAN.md](STUDIO_PLAN.md). The Arabic guide for teachers is
[STUDIO_GUIDE.md](STUDIO_GUIDE.md). Screenshots for each phase are in `docs/screenshots/studio-phase-N/`.

## Foundation (done)
- [x] Repo hygiene, `shared/model` with schema versions and pure migrations, migrate-on-read in every storage
- [x] Zustand editor store with a 200-step command history (coalescing, named actions)
- [x] `shared/render`: font registry, HarfBuzz text engine, scene display list; Konva and PDFKit painters
- [x] Editor-vs-PDF visual regression suite

## Studio phase 1: design system and shell (done)
- [x] Emerald/gold/ivory tokens, light/dark/system themes, IBM Plex Sans Arabic self-hosted, motion with
      reduced-motion support
- [x] UI kit (tooltips with shortcuts, toasts, dialogs, confirm, menus, sliders, segmented controls,
      empty/error/loading states)
- [x] Whole app RTL; all UI strings in `frontend/src/strings.ar.js`; Arabic-Indic digits in the UI
- [x] Arabic only: the English preset is removed and Latin-only fonts are hidden

## Studio phase 2: the editor (done)
- [x] Schema v3; every vector (shapes, ornaments, icons, codes, text) as normalized path ops, so the canvas and
      the PDF draw identical curves (PDFKit's inexact quadratics fixed along the way)
- [x] New element types: dateField, polygon, star, shapes, Islamic ornaments, icons, frames, QR, barcode
- [x] Text: gradient fill, shadow, outline, highlight, strike, justify, vertical align, kashida, digit styles
- [x] Images: crop mode, fit, flip, filters (shared pixel code), radius, border
- [x] Layout: rail + panels (right), properties (left), context toolbar, bottom bar
- [x] Eight side panels; colour picker; snapping with guides and distance labels; rulers, grid, margin/bleed
      guides; marquee; groups; align/distribute; zoom 10–400 %; Radix context menu; full shortcut set
- [x] Autosave with retry, status pill, 409 conflicts, leave guard, version history, preview with real students,
      page setup

## Studio phase 3: templates (done)
- [x] 22 starter templates built only from editor elements, in 12 palettes, across eight categories
- [x] The master «شهادة إنجاز قرآنية» structure (from Certificate_09) as editable elements
- [x] Gallery with real thumbnails, filters, favourites, duplicate/rename/delete, save-as-template
- [x] Missing-background fix and flag; base64 images moved to upload files

## Studio phase 4: bulk generation (done)
- [x] One wizard (template → students → review → output); column mapping with custom fields; pasted lists
- [x] Review grid with gender toggles and layout-engine pre-flight checks; live preview
- [x] Merged PDF (1-up or 2-up on A4), ZIP of PDFs, ZIP of PNG/JPG; file-name patterns
- [x] Background jobs with progress, cancel and history (500 certificates ≈ 5 s)
- [x] Serials, QR `{{verifyUrl}}`, public `/verify/:serial`
- [x] Single field and metadata logic for frontend and backend (`shared/model`)

## Studio phase 5: quality (done)
- [x] e2e: snapping, multi-select + align, crop, 20-step undo/redo, autosave conflict, wizard with 200 rows,
      Arabic-only UI scan; backend test for 500 students (time, pages, memory)
- [x] Fidelity suite covers every element type, effect and starter (40 targets)
- [x] 1280×720 laptops; panels become overlays below 1200 px

## Next
- [ ] Security: bcrypt with migration of plaintext passwords, login rate limit, CORS allowlist, helmet, request
      validation, SVG sanitizing, upload size limits
- [ ] Roles (admin, teacher) and per-teacher student lists
- [x] Phone editor: bottom tab bar and sheets, tap/pan/pinch, larger touch handles, tap-to-add (long press drags)
- [ ] Phone editor: two-finger rotate, phone-specific context toolbar
- [x] Students vs adult learners per batch; `{{مذكر|مؤنث}}` and four-form wording; editable congratulation sentence
- [x] Islamic icon set (12 drawn icons) and ~70 more featured icons with Arabic keywords
- [ ] Curved text; glyph reuse (PDF form XObjects) to shrink very large merged PDFs
- [ ] Physical page sizes in PDFs (px → pt) for exact print scaling without "fit to page"
- [ ] PWA and code-splitting of the editor bundle
