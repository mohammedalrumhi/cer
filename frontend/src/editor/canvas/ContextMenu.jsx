import * as Menu from '@radix-ui/react-context-menu';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  BringToFront,
  ChevronLeft,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Crop,
  Eye,
  EyeOff,
  Group,
  Lock,
  LockOpen,
  MousePointerSquareDashed,
  Scissors,
  SendToBack,
  Trash2,
  Type,
  Ungroup,
} from 'lucide-react';
import { S } from '../../strings.ar';
import { shortcutLabel } from '../../ui/format';
import { menuContentClass, menuItemClass, menuSeparatorClass } from '../../ui/menuStyles';
import { hasClipboard, runAction, selectionInfo } from '../actions';
import { isTextElement } from '../model/elements';
import { useEditor, useEditorStoreApi } from '../store/EditorStoreContext';

const M = S.editor.menu;

function Item({ icon: Icon, label, shortcut, onSelect, disabled, danger }) {
  return (
    <Menu.Item className={`${menuItemClass} ${danger ? 'text-danger data-[highlighted]:bg-danger-bg' : ''}`} onSelect={onSelect} disabled={disabled}>
      <Icon size={16} aria-hidden className="shrink-0 opacity-80" />
      <span className="flex-1">{label}</span>
      {shortcut && <kbd dir="ltr" className="font-sans text-[11px] text-fg-subtle">{shortcutLabel(shortcut)}</kbd>}
    </Menu.Item>
  );
}

const Sep = () => <Menu.Separator className={menuSeparatorClass} />;

// In RTL "right" is the reading start, so it comes first.
const ALIGN = [
  { mode: 'right', icon: AlignEndVertical },
  { mode: 'centerH', icon: AlignCenterVertical },
  { mode: 'left', icon: AlignStartVertical },
  { mode: 'top', icon: AlignStartHorizontal },
  { mode: 'middle', icon: AlignCenterHorizontal },
  { mode: 'bottom', icon: AlignEndHorizontal },
];

/** Right-click menu for the canvas (Radix). Items follow the current selection. */
export default function CanvasContextMenu({ children, disabled }) {
  const store = useEditorStoreApi();
  useEditor((state) => state.selection.ids);
  useEditor((state) => state.document.elements);
  const state = store.getState();
  const info = selectionInfo(state);
  const run = (action, arg) => () => runAction(store, action, arg);

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger asChild disabled={disabled}>{children}</Menu.Trigger>
      <Menu.Portal>
        <Menu.Content className={menuContentClass} collisionPadding={8}>
          {info.count > 0 ? (
            <>
              {info.single && isTextElement(info.single) && <Item icon={Type} label={M.editText} shortcut="Enter" onSelect={run('editText')} disabled={info.anyLocked} />}
              {info.single && ['image', 'frame'].includes(info.single.type) && info.single.src && <Item icon={Crop} label={M.crop} onSelect={run('crop')} disabled={info.anyLocked} />}
              <Item icon={Copy} label={M.copy} shortcut="MOD+C" onSelect={run('copy')} />
              <Item icon={Scissors} label={M.cut} shortcut="MOD+X" onSelect={run('cut')} disabled={info.anyLocked} />
              <Item icon={ClipboardPaste} label={M.paste} shortcut="MOD+V" onSelect={run('paste')} disabled={!hasClipboard()} />
              <Item icon={CopyPlus} label={M.duplicate} shortcut="MOD+D" onSelect={run('duplicate')} />
              <Item icon={Trash2} label={M.delete} shortcut="Delete" onSelect={run('delete')} disabled={info.allLocked} danger />
              <Sep />
              <Item icon={BringToFront} label={M.bringForward} shortcut="MOD+]" onSelect={run('bringForward')} disabled={info.anyLocked} />
              <Item icon={BringToFront} label={M.bringToFront} shortcut="MOD+Shift+]" onSelect={run('bringToFront')} disabled={info.anyLocked} />
              <Item icon={SendToBack} label={M.sendBackward} shortcut="MOD+[" onSelect={run('sendBackward')} disabled={info.anyLocked} />
              <Item icon={SendToBack} label={M.sendToBack} shortcut="MOD+Shift+[" onSelect={run('sendToBack')} disabled={info.anyLocked} />
              <Sep />
              {info.units > 1 && <Item icon={Group} label={M.group} shortcut="MOD+G" onSelect={run('group')} />}
              {info.grouped && <Item icon={Ungroup} label={M.ungroup} shortcut="MOD+Shift+G" onSelect={run('ungroup')} />}
              <Item icon={info.allLocked ? LockOpen : Lock} label={info.allLocked ? M.unlock : M.lock} shortcut="MOD+Shift+L" onSelect={run('lock')} />
              <Item icon={info.allHidden ? Eye : EyeOff} label={info.allHidden ? M.show : M.hide} onSelect={run('hide')} />
              <Sep />
              <Menu.Sub>
                <Menu.SubTrigger className={menuItemClass} disabled={info.anyLocked}>
                  <AlignCenterVertical size={16} aria-hidden className="opacity-80" />
                  <span className="flex-1">{info.units > 1 ? M.align : M.alignToPage}</span>
                  <ChevronLeft size={15} aria-hidden />
                </Menu.SubTrigger>
                <Menu.Portal>
                  <Menu.SubContent className={menuContentClass} sideOffset={4} collisionPadding={8}>
                    {ALIGN.map(({ mode, icon }) => <Item key={mode} icon={icon} label={S.editor.alignModes[mode]} onSelect={run('align', mode)} />)}
                    {info.units > 2 && (
                      <>
                        <Sep />
                        <Item icon={AlignHorizontalDistributeCenter} label={M.distributeH} onSelect={run('distribute', 'horizontal')} />
                        <Item icon={AlignVerticalDistributeCenter} label={M.distributeV} onSelect={run('distribute', 'vertical')} />
                      </>
                    )}
                  </Menu.SubContent>
                </Menu.Portal>
              </Menu.Sub>
            </>
          ) : (
            <>
              <Item icon={ClipboardPaste} label={M.paste} shortcut="MOD+V" onSelect={run('paste')} disabled={!hasClipboard()} />
              <Item icon={MousePointerSquareDashed} label={M.selectAll} shortcut="MOD+A" onSelect={run('selectAll')} />
            </>
          )}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
