import { Keyboard } from 'lucide-react';
import { S } from '../../strings.ar';
import { Dialog } from '../../ui/Dialog';
import { shortcutLabel } from '../../ui/format';
import { SHORTCUT_GROUPS } from '../shortcuts';
import { useEditor, useEditorStoreApi } from '../store/EditorStoreContext';

/** Keyboard shortcut cheat sheet, opened with `?`. */
export function ShortcutsDialog() {
  const store = useEditorStoreApi();
  const open = useEditor((state) => state.ui.shortcutsOpen);
  return (
    <Dialog open={open} onOpenChange={(next) => store.getState().setUi({ shortcutsOpen: next })} icon={Keyboard} title={S.editor.shortcuts} size="lg">
      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        {SHORTCUT_GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="mb-2 text-xs font-bold text-fg-subtle">{group.title}</h3>
            <ul className="flex flex-col gap-1.5">
              {group.items.map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-4 text-sm">
                  <span>{item.label}</span>
                  <span className="flex shrink-0 gap-1" dir="ltr">
                    {item.keys.map((key) => <kbd key={key} className="kbd">{shortcutLabel(key)}</kbd>)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
