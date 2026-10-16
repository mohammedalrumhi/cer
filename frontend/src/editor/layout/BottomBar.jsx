import { Eye, Keyboard, Maximize, Minus, Plus } from 'lucide-react';
import { S } from '../../strings.ar';
import { IconButton } from '../../ui/Button';
import { Dropdown, DropdownCheckItem, DropdownContent, DropdownTrigger } from '../../ui/Dropdown';
import { formatNumber } from '../../ui/format';
import { Slider } from '../../ui/Slider';
import { Tooltip } from '../../ui/Tooltip';
import { useEditor, useEditorStoreApi } from '../store/EditorStoreContext';
import { ZOOM_MAX, ZOOM_MIN } from '../store/editorStore';
import { useViewPrefs } from '../store/viewPrefs';

function ViewMenu() {
  const prefs = useViewPrefs();
  return (
    <Dropdown>
      <Tooltip content={S.editor.view} side="top">
        <DropdownTrigger asChild>
          <button type="button" aria-label={S.editor.view} className="grid size-8 place-items-center rounded-sm text-fg-muted hover:bg-surface-2 hover:text-fg">
            <Eye size={17} />
          </button>
        </DropdownTrigger>
      </Tooltip>
      <DropdownContent side="top" align="start">
        {['rulers', 'grid', 'guides', 'snapping'].map((key) => (
          <DropdownCheckItem key={key} checked={prefs[key]} onCheckedChange={() => prefs.toggle(key)}>{S.editor.viewOptions[key]}</DropdownCheckItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}

/** Bottom bar: zoom (steps, slider, fit), view options and the shortcuts sheet. */
export function BottomBar() {
  const store = useEditorStoreApi();
  const zoom = useEditor((state) => state.viewport.zoom);
  const count = useEditor((state) => state.document.elements.length);
  const selected = useEditor((state) => state.selection.ids.length);
  return (
    <footer className="flex h-11 shrink-0 items-center gap-2 border-t border-border bg-surface px-3 text-xs">
      <span className="hidden text-fg-subtle sm:inline">
        {selected ? S.editor.types.multiple(formatNumber(selected)) : `${formatNumber(count)} عنصرًا`}
      </span>
      <div className="ms-auto flex items-center gap-1">
        <ViewMenu />
        <IconButton icon={Keyboard} label={S.editor.shortcuts} shortcut="?" tooltipSide="top" onClick={() => store.getState().setUi({ shortcutsOpen: true })} />
        <span className="mx-1 h-5 w-px bg-border" />
        <IconButton icon={Minus} label={S.editor.zoomOut} shortcut="MOD+-" tooltipSide="top" onClick={() => store.getState().stepZoom(-1)} />
        <Slider className="w-32" label={S.editor.zoom} min={ZOOM_MIN * 100} max={ZOOM_MAX * 100} value={Math.round(zoom * 100)} onChange={(value) => store.getState().zoomTo(value / 100)} />
        <IconButton icon={Plus} label={S.editor.zoomIn} shortcut="MOD+=" tooltipSide="top" onClick={() => store.getState().stepZoom(1)} />
        <Tooltip content={S.editor.zoom100} shortcut="MOD+1" side="top">
          <button type="button" onClick={() => store.getState().zoomTo(1)} className="h-8 min-w-14 rounded-sm px-2 font-semibold tabular-nums hover:bg-surface-2" data-testid="zoom-level">
            {formatNumber(Math.round(zoom * 100))}٪
          </button>
        </Tooltip>
        <IconButton icon={Maximize} label={S.editor.zoomFit} shortcut="MOD+0" tooltipSide="top" onClick={() => store.getState().zoomToFit(null, { padding: 48 })} />
      </div>
    </footer>
  );
}
