import { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { PALETTES, buildStarter } from '@shared/templates/index.js';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { categoryLabel } from './filterModel';
import { TemplateThumbnail } from './TemplateThumbnail';

/** A starter template with its colourways: pick a palette, then use it. */
export function StarterCard({ starter, branding, onUse, busy }) {
  const [paletteKey, setPaletteKey] = useState(PALETTES[0].key);
  const template = useMemo(() => ({ ...buildStarter(starter.id, paletteKey), id: `starter:${starter.id}:${paletteKey}` }), [starter.id, paletteKey]);
  return (
    <article className="card hover-lift flex flex-col overflow-hidden" data-testid="starter-card" data-starter={starter.id}>
      <button type="button" onClick={() => onUse(starter, paletteKey)} className="block bg-canvas p-3" aria-label={`استخدام ${starter.name}`}>
        <TemplateThumbnail template={template} branding={branding} className="mx-auto max-h-56 rounded-xs shadow-md ring-1 ring-black/5" />
      </button>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div>
          <h3 className="line-clamp-1 text-sm font-bold">{starter.name}</h3>
          <p className="text-2xs text-fg-muted">{categoryLabel(starter.category)}</p>
        </div>
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="الألوان">
          {PALETTES.map((palette) => (
            <button
              key={palette.key}
              type="button"
              role="radio"
              aria-checked={palette.key === paletteKey}
              title={palette.label}
              aria-label={palette.label}
              onClick={() => setPaletteKey(palette.key)}
              className={cx('size-5 rounded-full border-2 transition hover:scale-110', palette.key === paletteKey ? 'border-fg ring-2 ring-primary/30' : 'border-white shadow-sm')}
              style={{ background: `linear-gradient(135deg, ${palette.primary} 55%, ${palette.secondary} 55%)` }}
            />
          ))}
        </div>
        <Button size="sm" variant="primary" icon={Sparkles} loading={busy} onClick={() => onUse(starter, paletteKey)} className="mt-auto" data-testid="use-starter">استخدام القالب</Button>
      </div>
    </article>
  );
}
