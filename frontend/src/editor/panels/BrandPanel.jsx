import { useRef } from 'react';
import { ImagePlus, Plus, Save, Trash2, Type } from 'lucide-react';
import { createElement } from '@shared/model/index.js';
import { buildAssetUrl, updateBranding, uploadLogo, uploadSignature, uploadStamp } from '../../api/client';
import { S } from '../../strings.ar';
import { Button } from '../../ui/Button';
import { toast } from '../../ui/toast';
import { ColorPicker } from '../color/ColorPicker';
import { DraggableTile } from '../dnd/EditorDnd';
import { useEditorData } from '../EditorDataContext';
import { isTextElement } from '../model/elements';
import { useEditor, useEditorStoreApi } from '../store/EditorStoreContext';

const ASSETS = [
  { field: 'logo', key: 'logoPath', label: S.branding.logo, upload: uploadLogo },
  { field: 'signature', key: 'signaturePath', label: S.branding.signature, upload: uploadSignature },
  { field: 'stamp', key: 'stampPath', label: S.branding.stamp, upload: uploadStamp },
];
const DEFAULTS = { logo: '/assets/logo.png', signature: '/assets/signture.png', stamp: '/assets/stamp.png' };
const STYLE_KEYS = ['fontFamily', 'fontSize', 'fontStyle', 'fill', 'lineHeight', 'letterSpacing', 'align', 'textDecoration', 'effects', 'kashida'];

function AssetTile({ asset, branding, onUploaded }) {
  const inputRef = useRef(null);
  const src = branding?.[asset.key] ? buildAssetUrl(branding[asset.key]) : DEFAULTS[asset.field];
  const preview = <img src={src} alt="" className="max-h-14 max-w-14 object-contain" />;
  return (
    <div className="flex flex-col gap-1">
      <DraggableTile id={`brand-${asset.field}`} label={asset.label} payload={{ make: () => createElement('dynamicImage', { field: asset.field }), preview }} className="grid aspect-square place-items-center rounded-md border border-border bg-white p-2 hover:border-primary/50">
        <img src={src} alt={asset.label} className="max-h-full max-w-full object-contain" />
      </DraggableTile>
      <button type="button" onClick={() => inputRef.current?.click()} className="text-2xs font-semibold text-primary hover:underline">{S.branding.replace} {asset.label}</button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          try {
            onUploaded(await asset.upload(file));
            toast.success(S.branding.uploadedOk(asset.label));
          } catch {
            toast.error(S.branding.uploadError);
          }
        }}
      />
    </div>
  );
}

/** Brand kit: logo, signature and stamp, brand colours and saved text styles. */
export default function BrandPanel() {
  const store = useEditorStoreApi();
  const { branding, setBranding } = useEditorData();
  const selected = useEditor((state) => state.document.elements.filter((el) => state.selection.ids.includes(el.id)));
  const colors = branding?.colors || [];
  const styles = branding?.textStyles || [];
  const selectedText = selected.find(isTextElement);

  async function save(patch, message) {
    try {
      const next = await updateBranding({ ...patch });
      setBranding(next);
      if (message) toast.success(message);
    } catch {
      toast.error(S.branding.saveError);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="mb-2 text-xs font-bold text-fg-subtle">الشعار والتوقيع والختم</h3>
        <p className="mb-3 text-xs text-fg-muted">انقر لإضافتها إلى الشهادة؛ تتحدث تلقائيًا في كل القوالب عند استبدالها.</p>
        <div className="grid grid-cols-3 gap-2">
          {ASSETS.map((asset) => <AssetTile key={asset.field} asset={asset} branding={branding} onUploaded={setBranding} />)}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-bold text-fg-subtle">ألوان الهوية</h3>
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => (
            <div key={color} className="group relative">
              <button
                type="button"
                title={color}
                aria-label={color}
                className="size-9 rounded-full border border-black/10 shadow-sm"
                style={{ background: color }}
                onClick={() => {
                  const ids = store.getState().selection.ids;
                  if (!ids.length) return;
                  store.getState().updateElements(ids, (el) => (['ornament', 'icon', 'qrcode', 'barcode'].includes(el.type) ? { ...el, color } : el.type === 'line' ? { ...el, stroke: color } : { ...el, fill: color }), { label: 'تلوين' });
                }}
              />
              <button type="button" aria-label="إزالة اللون" onClick={() => save({ colors: colors.filter((c) => c !== color) })} className="absolute -end-1 -top-1 hidden size-4 place-items-center rounded-full bg-surface text-danger shadow group-hover:grid">
                <Trash2 size={10} />
              </button>
            </div>
          ))}
          <ColorPicker label="إضافة لون للهوية" value="#0F6B52" onChange={(color) => typeof color === 'string' && !colors.includes(color) && save({ colors: [...colors, color] }, 'أُضيف اللون إلى الهوية')}>
            <button type="button" aria-label="إضافة لون للهوية" className="grid size-9 place-items-center rounded-full border border-dashed border-fg-subtle text-fg-muted hover:border-primary hover:text-primary">
              <Plus size={15} />
            </button>
          </ColorPicker>
        </div>
        <p className="mt-2 text-2xs text-fg-subtle">انقر لونًا لتطبيقه على العناصر المحددة.</p>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-bold text-fg-subtle">أنماط النص المحفوظة</h3>
        <div className="flex flex-col gap-2">
          {styles.map((style) => (
            <div key={style.id} className="group flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2">
              <button
                type="button"
                className="flex-1 truncate text-start text-sm font-semibold"
                style={{ color: typeof style.fill === 'string' ? style.fill : undefined }}
                onClick={() => {
                  const ids = store.getState().document.elements.filter((el) => store.getState().selection.ids.includes(el.id) && isTextElement(el)).map((el) => el.id);
                  if (ids.length) store.getState().updateElements(ids, (el) => ({ ...el, ...style.values }), { label: 'تطبيق نمط' });
                  else store.getState().addElements([createElement('text', { text: style.name, ...style.values })]);
                }}
              >
                {style.name}
              </button>
              <button type="button" aria-label="حذف النمط" onClick={() => save({ textStyles: styles.filter((item) => item.id !== style.id) })} className="text-fg-subtle opacity-0 hover:text-danger group-hover:opacity-100">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <Button
            size="sm"
            icon={selectedText ? Save : Type}
            disabled={!selectedText}
            onClick={() => {
              const values = Object.fromEntries(STYLE_KEYS.filter((key) => selectedText[key] !== undefined).map((key) => [key, selectedText[key]]));
              const name = `نمط ${styles.length + 1}`;
              save({ textStyles: [...styles, { id: `style-${Date.now()}`, name, values }] }, 'حُفظ نمط النص');
            }}
          >
            {selectedText ? 'حفظ نمط النص المحدد' : 'حدّد نصًا لحفظ نمطه'}
          </Button>
        </div>
      </section>
    </div>
  );
}
