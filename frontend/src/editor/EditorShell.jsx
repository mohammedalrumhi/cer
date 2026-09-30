import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Maximize2, Redo2, Undo2 } from 'lucide-react';
import {
  previewTemplate,
  updateTemplate,
  uploadFontFile,
  uploadTemplateDesign,
} from '../api/client';
import Canvas from './canvas/Canvas';
import { exportPageDataUrl } from './canvas/exportPage';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { createElementAt } from './model/elements';
import { SAMPLE_STUDENT } from './model/sampleData';
import PropertiesPanel from './panels/PropertiesPanel';
import { addFontToKit, loadRenderKit } from './render/renderKit';
import { createEditorStore, selectCanRedo, selectCanUndo, selectIsDirty } from './store/editorStore';
import { EditorStoreContext, useEditor, useEditorStoreApi } from './store/EditorStoreContext';
import ToolsSidebar from './toolbar/ToolsSidebar';
import TopBar from './toolbar/TopBar';

const MOBILE_QUERY = '(max-width: 1023px)';

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      const image = new window.Image();
      image.onload = () => resolve({ src, width: image.width, height: image.height });
      image.onerror = () => reject(new Error('Invalid image file'));
      image.src = src;
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function useIsMobileLayout() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(MOBILE_QUERY).matches);
  useEffect(() => {
    const query = window.matchMedia?.(MOBILE_QUERY);
    if (!query) return undefined;
    const update = (event) => setIsMobile(event.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return isMobile;
}

function useFontOptions() {
  const [fonts, setFonts] = useState([]);
  useEffect(() => {
    let alive = true;
    loadRenderKit().then((kit) => { if (alive) setFonts(kit.fonts); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const options = useMemo(() => fonts.map(({ value, label }) => ({ value, label })), [fonts]);
  return [options, setFonts];
}

function useFlash() {
  const [flash, setFlash] = useState(null);
  const timer = useRef(null);
  const show = useCallback((type, text) => {
    clearTimeout(timer.current);
    setFlash({ type, text });
    timer.current = setTimeout(() => setFlash(null), type === 'error' ? 4000 : 3000);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [flash, show];
}

function EditorLayout({ templateId, branding }) {
  const navigate = useNavigate();
  const stageRef = useRef(null);
  const storeApi = useEditorStoreApi();
  const isMobile = useIsMobileLayout();
  const [fontOptions, setFonts] = useFontOptions();
  const [flash, showFlash] = useFlash();
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const document = useEditor((state) => state.document);
  const selectedIds = useEditor((state) => state.selection.ids);
  const tool = useEditor((state) => state.ui.tool);
  const zoom = useEditor((state) => state.viewport.zoom);
  const canUndo = useEditor(selectCanUndo);
  const canRedo = useEditor(selectCanRedo);
  const dirty = useEditor(selectIsDirty);
  const selectedElement = document.elements.find((el) => el.id === selectedIds[0]) || null;

  const handleSave = useCallback(async () => {
    const state = storeApi.getState();
    const snapshot = state.document;
    try {
      setSaving(true);
      await updateTemplate(templateId, snapshot);
      storeApi.getState().markSaved(snapshot);
      showFlash('success', 'تم الحفظ بنجاح');
    } catch {
      showFlash('error', 'تعذر حفظ القالب');
    } finally {
      setSaving(false);
    }
  }, [storeApi, templateId, showFlash]);

  useKeyboardShortcuts({ onSave: handleSave });

  // Debug/test handle (dev builds, or when localStorage "cer:debug" is set).
  useEffect(() => {
    let debug = import.meta.env.DEV;
    try { debug = debug || Boolean(window.localStorage.getItem('cer:debug')); } catch { /* ignore */ }
    if (!debug) return undefined;
    window.__cerEditor = {
      store: storeApi,
      branding,
      sampleStudent: SAMPLE_STUDENT,
      stage: () => stageRef.current,
      exportPage: (scale = 1) => exportPageDataUrl(stageRef.current, storeApi.getState().document, storeApi.getState().viewport, { scale }),
    };
    return () => { delete window.__cerEditor; };
  }, [storeApi, branding]);

  useEffect(() => {
    if (!isMobile || !selectedElement) setInspectorOpen(false);
  }, [isMobile, selectedElement]);

  function visibleCenter() {
    const { viewport } = storeApi.getState();
    return {
      x: (viewport.width / 2 - viewport.x) / viewport.zoom,
      y: (viewport.height / 2 - viewport.y) / viewport.zoom,
    };
  }

  function addElement(type, extra = {}) {
    const element = createElementAt(type, visibleCenter(), extra);
    const state = storeApi.getState();
    state.addElements([element]);
    state.setUi({ tool: 'select' });
    return element;
  }

  function startTextEditing(id) {
    storeApi.getState().setUi({ editingTextId: id });
  }

  function handleElementChange(id, patch) {
    storeApi.getState().updateElement(id, patch, { coalesceKey: `${id}:${Object.keys(patch).sort().join(',')}` });
  }

  async function handleUploadImage(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const { src, width, height } = await readImageFile(file);
      const scale = Math.min(1, 400 / width);
      addElement('image', { src, width: Math.round(width * scale), height: Math.round(height * scale) });
    } catch {
      showFlash('error', 'تعذر قراءة الصورة');
    }
  }

  async function handleImportDesign(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const [{ width, height }, uploaded] = await Promise.all([readImageFile(file), uploadTemplateDesign(file)]);
      storeApi.getState().updateDocument((doc) => ({
        ...doc,
        width,
        height,
        orientation: width >= height ? 'landscape' : 'portrait',
        background: {
          ...doc.background,
          type: 'image',
          color: doc.background?.color || '#ffffff',
          accentColor: doc.background?.accentColor || '#0f4a3c',
          imagePath: uploaded.path,
          customLayout: true,
        },
      }), { label: 'استيراد تصميم' });
      storeApi.getState().zoomToFit();
      showFlash('success', 'تم استيراد التصميم وتحديث أبعاد القالب');
    } catch (error) {
      showFlash('error', error?.response?.data?.message || 'تعذر استيراد التصميم');
    }
  }

  async function handleUploadFont(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const uploaded = await uploadFontFile(file);
      const kit = await addFontToKit(uploaded);
      setFonts([...kit.fonts]);
      showFlash('success', 'تم رفع الخط وإضافته إلى المحرر');
    } catch (error) {
      showFlash('error', error?.response?.data?.message || 'تعذر رفع الخط');
    }
  }

  async function handlePreview() {
    try {
      setPreviewing(true);
      const blob = await previewTemplate({
        template: storeApi.getState().document,
        students: [SAMPLE_STUDENT],
        branding,
      });
      window.open(URL.createObjectURL(blob), '_blank');
    } catch {
      showFlash('error', 'تعذر إنشاء المعاينة');
    } finally {
      setPreviewing(false);
    }
  }

  function handleExportPng() {
    const state = storeApi.getState();
    const link = window.document.createElement('a');
    link.download = `${state.document.name || 'certificate'}.png`;
    link.href = exportPageDataUrl(stageRef.current, state.document, state.viewport, { scale: 2 });
    link.click();
  }

  const updateMeta = (patch) => storeApi.getState().updateDocument(patch, { coalesceKey: `meta:${Object.keys(patch).join(',')}` });
  const panelProps = {
    element: selectedElement,
    fontOptions,
    onChange: handleElementChange,
    onRemove: (id) => storeApi.getState().removeElements([id]),
    onLayerOp: (action) => selectedElement && storeApi.getState().reorderElements([selectedElement.id], action),
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-100" style={{ direction: 'ltr', zIndex: 50 }}>
      <TopBar
        templateName={document.name}
        onNameChange={(name) => updateMeta({ name })}
        detailLevel={document.detailLevel}
        onDetailLevelChange={(detailLevel) => updateMeta({ detailLevel })}
        audienceType={document.audienceType}
        onAudienceTypeChange={(audienceType) => updateMeta({ audienceType })}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => storeApi.getState().undo()}
        onRedo={() => storeApi.getState().redo()}
        onSave={handleSave}
        saving={saving}
        onPreview={handlePreview}
        previewing={previewing}
        onExportPng={handleExportPng}
        zoom={zoom}
        onZoom={(value) => storeApi.getState().zoomTo(value)}
        onZoomFit={() => storeApi.getState().zoomToFit()}
        dirty={dirty}
        onBack={() => navigate('/')}
        onImportDesign={handleImportDesign}
        onUploadFont={handleUploadFont}
        isMobile={isMobile}
      />

      {flash && (
        <div
          role="status"
          className={`shrink-0 px-4 py-2 text-center text-sm font-semibold ${flash.type === 'error' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}
          style={{ direction: 'rtl' }}
        >
          {flash.text}
        </div>
      )}

      <div className={`flex min-h-0 flex-1 overflow-hidden ${isMobile ? 'flex-col' : ''}`}>
        {!isMobile && (
          <ToolsSidebar
            activeTool={tool}
            onToolChange={(nextTool) => storeApi.getState().setUi({ tool: nextTool })}
            onAddElement={addElement}
            onUploadImage={handleUploadImage}
          />
        )}

        <div className="relative min-h-0 min-w-0 flex-1">
          <Canvas stageRef={stageRef} branding={branding} onInsertText={startTextEditing} />
          {isMobile && (
            <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center">
              <div className="pointer-events-auto flex items-center gap-1 rounded-2xl bg-white/90 p-1 shadow-lg backdrop-blur">
                {[
                  { label: 'تراجع', icon: Undo2, onClick: () => storeApi.getState().undo(), disabled: !canUndo },
                  { label: 'إعادة', icon: Redo2, onClick: () => storeApi.getState().redo(), disabled: !canRedo },
                  { label: 'ملاءمة الصفحة', icon: Maximize2, onClick: () => storeApi.getState().zoomToFit() },
                ].map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      type="button"
                      aria-label={action.label}
                      title={action.label}
                      onClick={action.onClick}
                      disabled={action.disabled}
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 disabled:opacity-30"
                    >
                      <Icon size={18} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {isMobile && selectedElement && (
            <button
              type="button"
              onClick={() => setInspectorOpen((open) => !open)}
              className="absolute bottom-3 left-3 z-10 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-lg"
            >
              {inspectorOpen ? 'إخفاء الخصائص' : 'خصائص العنصر'}
            </button>
          )}
        </div>

        {isMobile ? (
          <ToolsSidebar
            activeTool={tool}
            onToolChange={(nextTool) => storeApi.getState().setUi({ tool: nextTool })}
            onAddElement={addElement}
            onUploadImage={handleUploadImage}
            isMobile
          />
        ) : (
          <div className="h-full" onBlurCapture={() => storeApi.getState().sealHistory()}>
            <PropertiesPanel {...panelProps} />
          </div>
        )}
      </div>

      {isMobile && inspectorOpen && selectedElement && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-slate-900/45 p-3 backdrop-blur-[2px]"
          onClick={() => setInspectorOpen(false)}
        >
          <div className="w-full max-w-lg" onClick={(event) => event.stopPropagation()} onBlurCapture={() => storeApi.getState().sealHistory()}>
            <PropertiesPanel {...panelProps} isMobile onClose={() => setInspectorOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Editor entry point: owns one store per mounted template.
 */
export default function EditorShell({ templateId, initialTemplate, initialBranding }) {
  const [store] = useState(() => createEditorStore(initialTemplate));
  return (
    <EditorStoreContext.Provider value={store}>
      <EditorLayout templateId={templateId} branding={initialBranding} />
    </EditorStoreContext.Provider>
  );
}
