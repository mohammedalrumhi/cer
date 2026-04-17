import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  API_ORIGIN,
  buildAssetUrl,
  fetchFonts,
  previewTemplate,
  updateTemplate,
  uploadFontFile,
  uploadTemplateDesign,
} from '../../api/client';
import CanvasStage from './CanvasStage';
import PropertiesPanel from './PropertiesPanel';
import ToolsSidebar from './ToolsSidebar';
import TopBar from './TopBar';
import { useHistory } from './useHistory';
import {
  normalizeTemplateMetadata,
  TemplateAudienceType,
  TemplateDetailLevel,
} from '../../utils/templateMetadata';

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 3;
const CANVAS_PADDING = 32;

const DEFAULT_FONT_OPTIONS = [{ value: 'Amiri-Regular', label: 'Amiri-Regular' }];
const PREVIEW_STUDENT = {
  name: 'الطالب النموذجي',
  issueDate: '١٨ / شوال / ١٤٤٧',
  recitalType: 'في استظهار الحصة السابعة (نصف ثمن القرآن)',
  surahRange: 'من سورة الملك إلى سورة الناس',
  programName: 'برنامج الحافظ المتقن',
  calendar: 'تفوق عال',
  mistakesCount: 'لا يوجد',
  teacherName: 'المُعلم : فيصل الرمحي',
};

function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      resolve({ width: image.width, height: image.height });
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => {
      reject(new Error('Invalid image file'));
      URL.revokeObjectURL(objectUrl);
    };
    image.src = objectUrl;
  });
}

async function registerFontFace(font) {
  const alreadyLoaded = Array.from(document.fonts).some((face) =>
    face.family.replace(/['"]/g, '') === font.value
  );

  if (alreadyLoaded) return;

  const fontUrl = buildAssetUrl(font.url);
  const face = new FontFace(font.value, `url(${fontUrl})`, {
    style: 'normal',
    weight: '400',
  });
  await face.load();
  document.fonts.add(face);
}

/* ── defaults per element type ───────────────────────────────────────── */
function makeElement(type, extra = {}) {
  const id = `${type}-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
  const x = extra.x ?? 200;
  const y = extra.y ?? 200;
  const base = { id, type, x, y, rotation: 0, opacity: 1, locked: false, visible: true };

  switch (type) {
    case 'text':
      return { ...base, width: 300, text: 'نص جديد', fontFamily: 'Amiri-Regular', fontSize: 28, fontStyle: 'normal', textDecoration: '', fill: '#0f172a', align: 'center', lineHeight: 1.4, letterSpacing: 0, growDirection: 'right' };
    case 'dynamicText':
      return { ...base, width: 400, field: extra.field || 'studentName', fontFamily: 'Amiri-Regular', fontSize: 36, fontStyle: 'bold', textDecoration: '', fill: '#0f172a', align: 'center', lineHeight: 1.4, letterSpacing: 0, growDirection: 'right' };
    case 'rect':
      return { ...base, width: 200, height: 120, fill: '#e2e8f0', stroke: '#94a3b8', strokeWidth: 2, cornerRadius: 0 };
    case 'circle':
      return { ...base, width: 120, height: 120, fill: '#e2e8f0', stroke: '#94a3b8', strokeWidth: 2 };
    case 'line':
      return { ...base, width: 300, height: 4, stroke: '#0f172a', strokeWidth: 3 };
    case 'dynamicImage':
      {
        const field = extra.field || 'logo';
        const defaults = field === 'signature'
          ? { width: 113, height: 60 }
          : { width: 113, height: 113 };
        return {
          ...base,
          field,
          width: extra.width ?? defaults.width,
          height: extra.height ?? defaults.height,
        };
      }
    case 'image':
      return { ...base, src: extra.src || '', width: extra.imgW || 200, height: extra.imgH || 150 };
    default:
      return base;
  }
}

/* ── image loader hook ────────────────────────────────────────────────── */
function useBrandingImages(branding) {
  const [logoImg, setLogoImg] = useState(null);
  const [signatureImg, setSignatureImg] = useState(null);
  const [stampImg, setStampImg] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!branding?.logoPath) {
      const t = setTimeout(() => setLogoImg(null), 0);
      return () => clearTimeout(t);
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { if (alive) setLogoImg(img); };
    img.src = buildAssetUrl(branding.logoPath);
    return () => { alive = false; };
  }, [branding?.logoPath]);

  useEffect(() => {
    let alive = true;
    if (!branding?.signaturePath) {
      const t = setTimeout(() => setSignatureImg(null), 0);
      return () => clearTimeout(t);
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { if (alive) setSignatureImg(img); };
    img.src = buildAssetUrl(branding.signaturePath);
    return () => { alive = false; };
  }, [branding?.signaturePath]);

  useEffect(() => {
    let alive = true;
    const stampSrc = branding?.stampPath ? buildAssetUrl(branding.stampPath) : '/assets/stamp.jpeg';
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { if (alive) setStampImg(img); };
    img.onerror = () => { if (alive) setStampImg(null); };
    img.src = stampSrc;
    return () => { alive = false; };
  }, [branding?.stampPath]);

  return { logoImg, signatureImg, stampImg };
}

/* ── CanvasEditor ─────────────────────────────────────────────────────── */
export default function CanvasEditor({ templateId, initialTemplate, initialBranding }) {
  const navigate = useNavigate();
  const stageRef = useRef();
  const canvasContainerRef = useRef(null);
  const panStateRef = useRef({ active: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 });
  const normalizedInitialTemplate = normalizeTemplateMetadata(initialTemplate);

  // Template meta (name, size, background) separate from elements
  const [meta, setMeta] = useState({
    name: normalizedInitialTemplate.name || 'قالب جديد',
    width: normalizedInitialTemplate.width || 1123,
    height: normalizedInitialTemplate.height || 794,
    orientation: normalizedInitialTemplate.orientation || 'landscape',
    background: normalizedInitialTemplate.background || { color: '#ffffff' },
    detailLevel: normalizedInitialTemplate.detailLevel || TemplateDetailLevel.SIMPLE,
    audienceType: normalizedInitialTemplate.audienceType || TemplateAudienceType.STUDENT,
  });

  const { elements, setElements, undo, redo, canUndo, canRedo } = useHistory(
    normalizedInitialTemplate.elements || []
  );

  const [selectedIds, setSelectedIds] = useState([]);
  const [tool, setTool] = useState('select');
  const [zoom, setZoom] = useState(0.7);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [clipboard, setClipboard] = useState(null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fontOptions, setFontOptions] = useState(DEFAULT_FONT_OPTIONS);

  const { logoImg, signatureImg, stampImg } = useBrandingImages(initialBranding);
  const backgroundImageSrc = buildAssetUrl(meta.background?.imagePath);
  const scaledWidth = meta.width * zoom;
  const scaledHeight = meta.height * zoom;
  const shouldCenterHorizontally = scaledWidth + CANVAS_PADDING * 2 <= viewportSize.width;
  const shouldCenterVertically = scaledHeight + CANVAS_PADDING * 2 <= viewportSize.height;

  useEffect(() => {
    if (!canvasContainerRef.current) return undefined;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setViewportSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });

    observer.observe(canvasContainerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadFonts() {
      try {
        const fonts = await fetchFonts();
        if (!alive || fonts.length === 0) return;

        await Promise.allSettled(
          fonts.map((font) => registerFontFace(font))
        );

        if (alive) {
          setFontOptions(fonts.map(({ value, label }) => ({ value, label })));
        }
      } catch {
        if (alive) {
          setFontOptions(DEFAULT_FONT_OPTIONS);
        }
      }
    }

    loadFonts();
    return () => { alive = false; };
  }, []);

  const selectedElement = elements.find((el) => el.id === selectedIds[0]) || null;

  /* mark dirty whenever elements or meta change (after initial mount) */
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    setDirty(true);
  }, [elements, meta]);

  /* ── keyboard shortcuts ─────────────────────────────────────────────── */
  useEffect(() => {
    function handleKey(e) {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setSpacePressed(true);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) { e.preventDefault(); setZoom((value) => Math.min(ZOOM_MAX, Number((value + 0.1).toFixed(2)))); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); setZoom((value) => Math.max(ZOOM_MIN, Number((value - 0.1).toFixed(2)))); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); setZoom(1); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedIds.length > 0) {
          const el = elements.find((x) => x.id === selectedIds[0]);
          if (el) setClipboard({ ...el });
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (clipboard) {
          const id = `${clipboard.type}-${Date.now()}`;
          setElements((prev) => [...prev, { ...clipboard, id, x: clipboard.x + 20, y: clipboard.y + 20 }]);
          setSelectedIds([id]);
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (selectedIds.length > 0) duplicateElement(selectedIds[0]);
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          setElements((prev) => prev.filter((el) => !selectedIds.includes(el.id)));
          setSelectedIds([]);
        }
        return;
      }
      if (e.key === 'Escape') { setSelectedIds([]); setTool('select'); return; }

      /* nudge with arrow keys */
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedIds.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        setElements((prev) =>
          prev.map((el) => selectedIds.includes(el.id) ? { ...el, x: el.x + dx, y: el.y + dy } : el)
        );
      }
    }

    function handleKeyUp(e) {
      if (e.code !== 'Space') return;
      setSpacePressed(false);
      setIsPanning(false);
      panStateRef.current.active = false;
    }

    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKeyUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, elements, clipboard, canUndo, canRedo]);

  /* ── wheel zoom on canvas container ────────────────────────────────── */
  function handleWheel(e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z - e.deltaY * 0.001)));
  }

  function handleZoomChange(nextZoom) {
    setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(nextZoom) || 1)));
  }

  function fitCanvasToViewport() {
    if (!viewportSize.width || !viewportSize.height) return;
    const availableWidth = Math.max(120, viewportSize.width - CANVAS_PADDING * 2);
    const availableHeight = Math.max(120, viewportSize.height - CANVAS_PADDING * 2);
    const horizontalScale = availableWidth / meta.width;
    const verticalScale = availableHeight / meta.height;
    handleZoomChange(Math.min(horizontalScale, verticalScale));
  }

  function handleCanvasMouseDown(event) {
    if (!spacePressed || event.button !== 0 || !canvasContainerRef.current) return;
    event.preventDefault();
    panStateRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: canvasContainerRef.current.scrollLeft,
      scrollTop: canvasContainerRef.current.scrollTop,
    };
    setIsPanning(true);
  }

  useEffect(() => {
    function handleMouseMove(event) {
      if (!panStateRef.current.active || !canvasContainerRef.current) return;
      const deltaX = event.clientX - panStateRef.current.startX;
      const deltaY = event.clientY - panStateRef.current.startY;
      canvasContainerRef.current.scrollLeft = panStateRef.current.scrollLeft - deltaX;
      canvasContainerRef.current.scrollTop = panStateRef.current.scrollTop - deltaY;
    }

    function handleMouseUp() {
      if (!panStateRef.current.active) return;
      panStateRef.current.active = false;
      setIsPanning(false);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  /* ── element helpers ────────────────────────────────────────────────── */
  function addElement(type, extra = {}) {
    const el = makeElement(type, extra);
    setElements((prev) => [...prev, el]);
    setSelectedIds([el.id]);
    setTool('select');
    return el;
  }

  function updateElement(id, changes) {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...changes } : el)));
  }

  function removeElement(id) {
    setElements((prev) => prev.filter((el) => el.id !== id));
    setSelectedIds((prev) => prev.filter((s) => s !== id));
  }

  function duplicateElement(id) {
    const el = elements.find((x) => x.id === id);
    if (!el) return;
    const newId = `${el.type}-${Date.now()}`;
    setElements((prev) => [...prev, { ...el, id: newId, x: el.x + 20, y: el.y + 20 }]);
    setSelectedIds([newId]);
  }

  function layerOp(action, id) {
    setElements((prev) => {
      const idx = prev.findIndex((el) => el.id === id);
      if (idx === -1) return prev;
      const arr = [...prev];
      const [item] = arr.splice(idx, 1);
      if (action === 'bringToFront') arr.push(item);
      else if (action === 'bringForward') arr.splice(Math.min(arr.length, idx + 1), 0, item);
      else if (action === 'sendBackward') arr.splice(Math.max(0, idx - 1), 0, item);
      else if (action === 'sendToBack') arr.unshift(item);
      return arr;
    });
  }

  function handleContextAction(action, id) {
    if (action === 'duplicate') duplicateElement(id);
    else if (action === 'delete') removeElement(id);
    else layerOp(action, id);
  }

  /* ── image upload ───────────────────────────────────────────────────── */
  function handleUploadImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target.result;
      const img = new window.Image();
      img.onload = () => {
        const maxW = 400;
        const scale = img.width > maxW ? maxW / img.width : 1;
        addElement('image', { src, imgW: Math.round(img.width * scale), imgH: Math.round(img.height * scale) });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleImportDesign(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const [{ width, height }, uploaded] = await Promise.all([
        readImageDimensions(file),
        uploadTemplateDesign(file),
      ]);

      setMeta((current) => ({
        ...current,
        width,
        height,
        orientation: width >= height ? 'landscape' : 'portrait',
        background: {
          ...current.background,
          type: 'image',
          color: current.background?.color || '#ffffff',
          accentColor: current.background?.accentColor || '#0f4a3c',
          imagePath: uploaded.path,
          customLayout: true,
        },
      }));

      setSuccess('تم استيراد التصميم وتحديث أبعاد القالب');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error?.response?.data?.message || 'تعذر استيراد التصميم');
      setTimeout(() => setError(''), 4000);
    }
  }

  async function handleUploadFont(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const uploadedFont = await uploadFontFile(file);
      await registerFontFace(uploadedFont);
      setFontOptions((prev) => {
        const next = [...prev.filter((font) => font.value !== uploadedFont.value), uploadedFont]
          .map((font) => ({ value: font.value, label: font.label }))
          .sort((a, b) => a.label.localeCompare(b.label, 'ar'));
        return next;
      });
      setSuccess('تم رفع الخط وإضافته إلى المحرر');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error?.response?.data?.message || 'تعذر رفع الخط');
      setTimeout(() => setError(''), 4000);
    }
  }

  /* ── save ───────────────────────────────────────────────────────────── */
  async function handleSave() {
    try {
      setSaving(true);
      await updateTemplate(templateId, { ...meta, elements });
      setSuccess('تم الحفظ بنجاح');
      setDirty(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('تعذر حفظ القالب');
      setTimeout(() => setError(''), 4000);
    } finally {
      setSaving(false);
    }
  }

  /* ── preview PDF ────────────────────────────────────────────────────── */
  async function handlePreview() {
    try {
      setPreviewing(true);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const blob = await previewTemplate({
        template: { ...meta, elements },
        students: [PREVIEW_STUDENT],
        branding: initialBranding,
      });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      window.open(url, '_blank');
    } catch {
      setError('تعذر إنشاء المعاينة');
      setTimeout(() => setError(''), 4000);
    } finally {
      setPreviewing(false);
    }
  }

  /* ── export PNG ─────────────────────────────────────────────────────── */
  function handleExportPng() {
    if (!stageRef.current) return;
    const oldScale = { x: stageRef.current.scaleX(), y: stageRef.current.scaleY() };
    stageRef.current.scale({ x: 1, y: 1 });
    const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 });
    stageRef.current.scale(oldScale);
    const a = document.createElement('a');
    a.download = `${meta.name || 'certificate'}.png`;
    a.href = dataUrl;
    a.click();
  }

  /* ── render ─────────────────────────────────────────────────────────── */
  return (
    <div
      className="fixed inset-0 flex flex-col bg-slate-100"
      style={{ direction: 'ltr', zIndex: 50 }}
    >
      {/* Top bar */}
      <TopBar
        templateName={meta.name}
        onNameChange={(v) => setMeta((m) => ({ ...m, name: v }))}
        detailLevel={meta.detailLevel}
        onDetailLevelChange={(value) => setMeta((current) => ({ ...current, detailLevel: value }))}
        audienceType={meta.audienceType}
        onAudienceTypeChange={(value) => setMeta((current) => ({ ...current, audienceType: value }))}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onSave={handleSave}
        saving={saving}
        onPreview={handlePreview}
        previewing={previewing}
        onExportPng={handleExportPng}
        zoom={zoom}
        onZoom={handleZoomChange}
        onZoomFit={fitCanvasToViewport}
        dirty={dirty}
        onBack={() => navigate('/')}
        onImportDesign={handleImportDesign}
        onUploadFont={handleUploadFont}
      />

      {/* Toast messages */}
      {(error || success) && (
        <div
          className={`shrink-0 px-4 py-2 text-center text-sm font-semibold ${error ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}
          style={{ direction: 'rtl' }}
        >
          {error || success}
        </div>
      )}

      {/* Editor body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: tools */}
        <ToolsSidebar
          activeTool={tool}
          onToolChange={setTool}
          onAddElement={addElement}
          onUploadImage={handleUploadImage}
        />

        {/* Center: canvas */}
        <div
          ref={canvasContainerRef}
          className="relative flex flex-1 overflow-auto bg-slate-200"
          onWheel={handleWheel}
          onMouseDown={handleCanvasMouseDown}
          style={{ cursor: isPanning ? 'grabbing' : spacePressed ? 'grab' : tool !== 'select' ? 'crosshair' : 'default' }}
        >
          {/* Grid toggle */}
          <button
            onClick={() => setShowGrid((g) => !g)}
            title="شبكة"
            className={`absolute right-3 top-3 z-10 rounded-lg border px-2 py-1 text-xs font-semibold shadow-sm transition ${showGrid ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            شبكة
          </button>

          <div
            className="flex min-h-full min-w-full"
            style={{
              minWidth: shouldCenterHorizontally ? '100%' : `${scaledWidth + CANVAS_PADDING * 2}px`,
              minHeight: shouldCenterVertically ? '100%' : `${scaledHeight + CANVAS_PADDING * 2}px`,
              justifyContent: shouldCenterHorizontally ? 'center' : 'flex-start',
              alignItems: shouldCenterVertically ? 'center' : 'flex-start',
              padding: CANVAS_PADDING,
            }}
          >
            <div
              className="shadow-2xl"
              style={{ background: meta.background?.color || '#ffffff' }}
            >
              <CanvasStage
                stageRef={stageRef}
                template={meta}
                backgroundImageSrc={backgroundImageSrc}
                elements={elements}
                selectedIds={selectedIds}
                tool={tool}
                zoom={zoom}
                showGrid={showGrid}
                logoImg={logoImg}
                signatureImg={signatureImg}
                stampImg={stampImg}
                isPanMode={spacePressed || isPanning}
                onSelectIds={setSelectedIds}
                onElementChange={updateElement}
                onAddElement={addElement}
                onContextAction={handleContextAction}
              />
            </div>
          </div>
        </div>

        {/* Right: properties */}
        <PropertiesPanel
          element={selectedElement}
          fontOptions={fontOptions}
          onChange={updateElement}
          onRemove={removeElement}
          onLayerOp={(action) => selectedElement && layerOp(action, selectedElement.id)}
        />
      </div>
    </div>
  );
}
