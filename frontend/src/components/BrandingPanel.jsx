import { useRef } from 'react';
import { ImagePlus, PenLine, Stamp } from 'lucide-react';
import { buildAssetUrl } from '../api/client';
import { S } from '../strings.ar';
import { cx } from '../ui/cx';

const ASSETS = [
  { key: 'logo', path: 'logoPath', icon: ImagePlus, label: S.branding.logo },
  { key: 'signature', path: 'signaturePath', icon: PenLine, label: S.branding.signature },
  { key: 'stamp', path: 'stampPath', icon: Stamp, label: S.branding.stamp },
];

function AssetTile({ label, icon: Icon, src, onPick }) {
  const inputRef = useRef(null);
  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="group flex flex-col gap-2 rounded-md border border-border bg-surface p-2 text-start transition hover:border-primary/50 hover:shadow-sm"
    >
      <span className="grid h-20 place-items-center overflow-hidden rounded-sm bg-white ring-1 ring-black/5">
        {src ? <img src={src} alt={label} className="h-full w-full object-contain p-1" /> : <Icon size={22} className="text-fg-subtle" aria-hidden />}
      </span>
      <span className="flex items-center justify-between gap-1 px-0.5">
        <span className="text-xs font-semibold">{label}</span>
        <span className={cx('rounded-full px-1.5 text-2xs font-semibold', src ? 'bg-success-bg text-success' : 'bg-surface-2 text-fg-subtle')}>
          {src ? S.branding.uploaded : S.branding.notUploaded}
        </span>
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) onPick(file);
        }}
      />
    </button>
  );
}

/** School name, logo, signature and stamp. Uploads apply immediately; the name is saved by the parent. */
export function BrandingPanel({ branding, schoolName, onSchoolNameChange, onUpload, onSave, saving }) {
  return (
    <section className="card flex flex-col gap-4 p-5">
      <div>
        <h2 className="text-lg font-bold">{S.branding.title}</h2>
        <p className="text-xs text-fg-muted">{S.branding.hint}</p>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">{S.branding.schoolName}</span>
        <input className="field" value={schoolName} onChange={(event) => onSchoolNameChange(event.target.value)} placeholder={S.app.school} />
      </label>
      <div className="grid grid-cols-3 gap-2">
        {ASSETS.map((asset) => (
          <AssetTile
            key={asset.key}
            label={asset.label}
            icon={asset.icon}
            src={buildAssetUrl(branding?.[asset.path])}
            onPick={(file) => onUpload(asset.key, file)}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onSave}
        disabled={saving || schoolName === (branding?.schoolName || '')}
        className="h-10 rounded-sm bg-primary text-sm font-semibold text-primary-fg shadow-sm transition hover:bg-primary-600 disabled:opacity-50"
      >
        {saving ? S.common.saving : S.branding.save}
      </button>
    </section>
  );
}
