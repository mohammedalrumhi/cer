import { ArrowRight, Download, Eye, FileCog, FileStack, FileText, History, ImageUp, MoreHorizontal, PanelLeft, PenLine, Redo2, Type, Undo2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { S } from '../../strings.ar';
import { IconButton } from '../../ui/Button';
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from '../../ui/Dropdown';
import { Segmented } from '../../ui/Segmented';
import { SaveStatus } from '../layout/SaveStatus';
import { selectCanRedo, selectCanUndo } from '../store/editorStore';
import { useEditor, useEditorStoreApi } from '../store/EditorStoreContext';

/** Top bar: back, name, undo/redo, design/preview, save status, file actions and "generate". */
export default function TopBar({ onBack, onPreviewPdf, previewing, onExportPng, onImportDesign, onUploadFont, saveHandlers }) {
  const store = useEditorStoreApi();
  const name = useEditor((state) => state.document.name);
  const id = useEditor((state) => state.document.id);
  const mode = useEditor((state) => state.ui.mode);
  const propertiesOpen = useEditor((state) => state.ui.propertiesOpen);
  const canUndo = useEditor(selectCanUndo);
  const canRedo = useEditor(selectCanRedo);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-3 shadow-xs" style={{ userSelect: 'none', zIndex: 40 }}>
      <IconButton icon={ArrowRight} label={S.editor.back} onClick={onBack} />
      <img src="/assets/logo.png" alt="" className="hidden size-8 rounded-sm bg-white object-contain p-0.5 ring-1 ring-black/5 sm:block" />
      <label className="group relative flex min-w-0 items-center">
        <input
          value={name || ''}
          onChange={(e) => store.getState().updateDocument({ name: e.target.value }, { label: 'اسم القالب', coalesceKey: 'doc:name' })}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') e.currentTarget.blur(); }}
          onBlur={() => store.getState().sealHistory()}
          aria-label={S.editor.rename}
          placeholder={S.editor.untitled}
          className="w-40 rounded-sm border border-transparent bg-transparent px-2 py-1 text-sm font-bold outline-none transition hover:border-border focus:border-primary lg:w-56"
          data-testid="editor-name"
        />
        <PenLine size={13} className="pointer-events-none absolute end-2 text-fg-subtle opacity-0 group-hover:opacity-100" aria-hidden />
      </label>
      <span className="mx-1 h-6 w-px bg-border" />
      <IconButton icon={Undo2} label={S.editor.undo} shortcut="MOD+Z" disabled={!canUndo} onClick={() => store.getState().undo()} data-testid="undo" />
      <IconButton icon={Redo2} label={S.editor.redo} shortcut="MOD+Shift+Z" disabled={!canRedo} onClick={() => store.getState().redo()} data-testid="redo" />
      <span className="mx-1 h-6 w-px bg-border" />
      <Segmented
        size="sm"
        label="وضع العرض"
        value={mode}
        onChange={(next) => {
          store.getState().setUi({ mode: next, editingTextId: null, cropId: null });
          if (next === 'preview') store.getState().clearSelection();
        }}
        options={[{ value: 'design', label: S.editor.design, icon: PenLine }, { value: 'preview', label: S.editor.preview, icon: Eye }]}
      />
      <div className="ms-auto flex items-center gap-2">
        <SaveStatus {...saveHandlers} />
        <Dropdown>
          <DropdownTrigger asChild>
            <button type="button" aria-label={S.editor.more} className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-border px-3 text-xs font-semibold hover:bg-surface-2" data-testid="editor-more">
              <MoreHorizontal size={16} /> <span className="hidden md:inline">{S.editor.more}</span>
            </button>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownItem icon={FileText} onSelect={onPreviewPdf} disabled={previewing}>{previewing ? S.editor.previewing : S.editor.previewPdf}</DropdownItem>
            <DropdownItem icon={Download} onSelect={onExportPng}>{S.editor.exportPng}</DropdownItem>
            <DropdownSeparator />
            <DropdownItem icon={FileCog} onSelect={() => store.getState().setUi({ dialog: 'pageSetup' })}>{S.editor.pageSetup}</DropdownItem>
            <DropdownItem icon={History} onSelect={() => store.getState().setUi({ dialog: 'versions' })}>{S.editor.versions}</DropdownItem>
            <DropdownSeparator />
            <DropdownItem icon={ImageUp} onSelect={onImportDesign}>{S.editor.importDesign}</DropdownItem>
            <DropdownItem icon={Type} onSelect={onUploadFont}>{S.editor.uploadFont}</DropdownItem>
            <DropdownSeparator />
            <DropdownItem icon={PanelLeft} onSelect={() => store.getState().setUi({ propertiesOpen: !propertiesOpen })}>{propertiesOpen ? S.editor.hideProperties : S.editor.showProperties}</DropdownItem>
          </DropdownContent>
        </Dropdown>
        <Link to={`/generate?template=${encodeURIComponent(id)}`} className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-gold px-3 text-xs font-bold text-white shadow-sm transition hover:-translate-y-px hover:shadow-md" data-testid="editor-generate">
          <FileStack size={16} /> <span className="hidden sm:inline">{S.editor.generate}</span>
        </Link>
      </div>
    </header>
  );
}
