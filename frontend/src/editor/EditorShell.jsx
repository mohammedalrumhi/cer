import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PanelLeftOpen } from 'lucide-react';
import {
  fetchStudents,
  fetchTemplate,
  previewTemplate,
  saveTemplate,
  uploadAsset,
  uploadFontFile,
  uploadTemplateDesign,
} from '../api/client';
import { S } from '../strings.ar';
import { IconButton } from '../ui/Button';
import { toast } from '../ui/toast';
import Canvas from './canvas/Canvas';
import { exportPageDataUrl } from './canvas/exportPage';
import { EditorDnd } from './dnd/EditorDnd';
import { dropAsset } from './dnd/drop';
import { EditorDataContext } from './EditorDataContext';
import { PageSetupDialog } from './dialogs/PageSetupDialog';
import { VersionHistoryDialog } from './dialogs/VersionHistoryDialog';
import { BottomBar } from './layout/BottomBar';
import { IconRail } from './layout/IconRail';
import { ShortcutsDialog } from './layout/ShortcutsDialog';
import { SidePanel } from './layout/SidePanel';
import { SAMPLE_STUDENT } from './model/sampleData';
import PropertiesPanel from './panels/PropertiesPanel';
import { PreviewBar } from './preview/PreviewBar';
import { addFontToKit, loadRenderKit } from './render/renderKit';
import { startAutosave } from './store/autosave';
import { createEditorStore } from './store/editorStore';
import { EditorStoreContext, useEditor, useEditorStoreApi } from './store/EditorStoreContext';
import { useKeyboardShortcuts } from './shortcuts';
import { ContextToolbar } from './toolbar/ContextToolbar';
import TopBar from './toolbar/TopBar';

const NARROW_QUERY = '(max-width: 1199px)';

function useNarrowLayout() {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(NARROW_QUERY).matches);
  useEffect(() => {
    const query = window.matchMedia?.(NARROW_QUERY);
    if (!query) return undefined;
    const update = (event) => setNarrow(event.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return narrow;
}

function readImageSize(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => { resolve({ width: image.width, height: image.height }); URL.revokeObjectURL(url); };
    image.onerror = () => { reject(new Error('invalid image')); URL.revokeObjectURL(url); };
    image.src = url;
  });
}

function pickFile(accept) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] || null);
    input.click();
  });
}

function EditorLayout({ templateId, branding: initialBranding }) {
  const navigate = useNavigate();
  const stageRef = useRef(null);
  const store = useEditorStoreApi();
  const narrow = useNarrowLayout();
  const [branding, setBranding] = useState(initialBranding || {});
  const [fonts, setFonts] = useState([]);
  const [students, setStudents] = useState([]);
  const [assetsVersion, setAssetsVersion] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const autosaveRef = useRef(null);

  const mode = useEditor((state) => state.ui.mode);
  const previewIndex = useEditor((state) => state.ui.previewIndex);
  const activePanel = useEditor((state) => state.ui.activePanel);
  const propertiesOpen = useEditor((state) => state.ui.propertiesOpen);

  useEffect(() => {
    let alive = true;
    loadRenderKit().then((kit) => { if (alive) setFonts(kit.fonts); }).catch(() => {});
    fetchStudents().then((list) => { if (alive) setStudents(Array.isArray(list) ? list : []); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Autosave 1 s after the last edit, with retry and conflict detection.
  useEffect(() => {
    const controller = startAutosave(store, {
      save: (doc, baseVersion) => saveTemplate(templateId, doc, baseVersion),
    });
    autosaveRef.current = controller;
    return () => controller.stop();
  }, [store, templateId]);

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    const guard = (event) => {
      if (!autosaveRef.current?.isDirty()) return;
      autosaveRef.current.flush();
      event.preventDefault();
      event.returnValue = S.editor.leaveWarning;
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, []);

  const flush = useCallback(() => autosaveRef.current?.flush(), []);
  useKeyboardShortcuts({ onSave: flush });

  const fontOptions = useMemo(() => fonts.filter((font) => font.arabic !== false).map(({ value, label }) => ({ value, label })), [fonts]);
  const customFields = useMemo(() => {
    const keys = new Set();
    for (const student of students) for (const key of Object.keys(student.fields || {})) keys.add(key);
    return [...keys];
  }, [students]);
  const previewStudent = mode === 'preview' && students.length ? students[Math.min(previewIndex, students.length - 1)] : null;

  // Debug/test handle (dev builds, or when localStorage "cer:debug" is set).
  useEffect(() => {
    let debug = import.meta.env.DEV;
    try { debug = debug || Boolean(window.localStorage.getItem('cer:debug')); } catch { /* ignore */ }
    if (!debug) return undefined;
    window.__cerEditor = {
      store,
      branding,
      sampleStudent: SAMPLE_STUDENT,
      stage: () => stageRef.current,
      exportPage: (scale = 1) => exportPageDataUrl(stageRef.current, store.getState().document, store.getState().viewport, { scale }),
      flush,
      // Tests that rewrite the document for measurement must not save it.
      stopAutosave: () => autosaveRef.current?.stop(),
    };
    return () => { delete window.__cerEditor; };
  }, [store, branding, flush]);

  const handleFiles = useCallback(async (files, point) => {
    for (const file of files) {
      try {
        const asset = await uploadAsset(file);
        dropAsset(store, asset, point);
      } catch {
        toast.error('تعذّر رفع الصورة.');
      }
    }
    setAssetsVersion((v) => v + 1);
  }, [store]);

  async function handleImportDesign() {
    const file = await pickFile('.png,.jpg,.jpeg,.webp');
    if (!file) return;
    try {
      const [{ width, height }, uploaded] = await Promise.all([readImageSize(file), uploadTemplateDesign(file)]);
      store.getState().updateDocument((doc) => ({
        ...doc,
        width,
        height,
        orientation: width >= height ? 'landscape' : 'portrait',
        background: { ...doc.background, type: 'image', imagePath: uploaded.path, customLayout: true },
      }), { label: S.editor.importDesign });
      store.getState().zoomToFit(null, { padding: 48 });
      toast.success(S.editor.designImported);
    } catch {
      toast.error(S.editor.designImportError);
    }
  }

  async function handleUploadFont() {
    const file = await pickFile('.ttf,.otf');
    if (!file) return;
    try {
      const uploaded = await uploadFontFile(file);
      const kit = await addFontToKit(uploaded);
      setFonts([...kit.fonts]);
      toast.success(S.editor.fontUploaded);
    } catch {
      toast.error(S.editor.fontUploadError);
    }
  }

  async function handlePreviewPdf() {
    try {
      setPreviewing(true);
      const blob = await previewTemplate({ template: store.getState().document, students: [previewStudent || SAMPLE_STUDENT], branding });
      window.open(URL.createObjectURL(blob), '_blank');
    } catch {
      toast.error(S.editor.previewError);
    } finally {
      setPreviewing(false);
    }
  }

  function handleExportPng() {
    const state = store.getState();
    const link = window.document.createElement('a');
    link.download = `${state.document.name || 'شهادة'}.png`;
    link.href = exportPageDataUrl(stageRef.current, state.document, state.viewport, { scale: 2 });
    link.click();
  }

  const saveHandlers = {
    onRetry: flush,
    onKeepMine: () => autosaveRef.current?.keepMine(),
    onReload: async () => {
      try {
        const fresh = await fetchTemplate(templateId);
        store.getState().loadDocument(fresh);
        autosaveRef.current?.stop();
        autosaveRef.current = startAutosave(store, { save: (doc, baseVersion) => saveTemplate(templateId, doc, baseVersion) });
        toast.info('حُمّلت النسخة الأحدث.');
      } catch {
        toast.error(S.common.networkError);
      }
    },
  };

  const data = {
    branding,
    setBranding,
    fontOptions,
    students,
    customFields,
    assetsVersion,
    bumpAssets: () => setAssetsVersion((v) => v + 1),
  };

  return (
    <EditorDataContext.Provider value={data}>
      <EditorDnd>
        <div className="fixed inset-0 z-50 flex flex-col bg-bg" data-testid="editor">
          <TopBar
            onBack={async () => { await flush(); navigate('/'); }}
            onPreviewPdf={handlePreviewPdf}
            previewing={previewing}
            onExportPng={handleExportPng}
            onImportDesign={handleImportDesign}
            onUploadFont={handleUploadFont}
            saveHandlers={saveHandlers}
          />
          <div className="relative flex min-h-0 flex-1">
            <IconRail />
            {activePanel && <SidePanel overlay={narrow} />}
            <main className="relative flex min-w-0 flex-1 flex-col">
              {mode === 'preview' ? <PreviewBar /> : <ContextToolbar />}
              <div className="relative min-h-0 flex-1">
                <Canvas stageRef={stageRef} branding={branding} previewStudent={previewStudent} onFilesDropped={handleFiles} />
                {!propertiesOpen && (
                  <div className="absolute end-3 top-3 z-20">
                    <IconButton icon={PanelLeftOpen} variant="secondary" label={S.editor.showProperties} onClick={() => store.getState().setUi({ propertiesOpen: true })} />
                  </div>
                )}
              </div>
              <BottomBar />
            </main>
            {propertiesOpen && <PropertiesPanel overlay={narrow} />}
          </div>
          <ShortcutsDialog />
          <PageSetupDialog />
          <VersionHistoryDialog flush={flush} />
        </div>
      </EditorDnd>
    </EditorDataContext.Provider>
  );
}

/** Editor entry point: owns one store per mounted template. */
export default function EditorShell({ templateId, initialTemplate, initialBranding }) {
  const [store] = useState(() => {
    const narrow = typeof window !== 'undefined' && window.matchMedia?.(NARROW_QUERY).matches;
    const created = createEditorStore(initialTemplate);
    if (narrow) created.getState().setUi({ activePanel: null, propertiesOpen: false });
    return created;
  });
  return (
    <EditorStoreContext.Provider value={store}>
      <EditorLayout templateId={templateId} branding={initialBranding} />
    </EditorStoreContext.Provider>
  );
}
