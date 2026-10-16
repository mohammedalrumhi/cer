import { Link } from 'react-router-dom';
import { FileStack, MoreHorizontal, Palette, PenLine, Trash2 } from 'lucide-react';
import { buildAssetUrl } from '../api/client';
import { S } from '../strings.ar';
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from '../ui/Dropdown';
import { formatNumber } from '../ui/format';
import { getTemplateAudienceLabel, getTemplateDetailLabel } from '../utils/templateMetadata';

function orientationLabel(template) {
  if (Number(template.width) === Number(template.height)) return S.template.orientation.square;
  return template.orientation === 'portrait' ? S.template.orientation.portrait : S.template.orientation.landscape;
}

export function TemplateCard({ template, onDelete, thumbnail }) {
  const backgroundImage = buildAssetUrl(template.background?.imagePath);
  const ratio = (Number(template.width) || 1123) / (Number(template.height) || 794);
  const variants = template.availableBackgroundVariants?.length || 0;

  return (
    <article className="group card hover-lift flex flex-col overflow-hidden" data-testid="template-card">
      <Link to={`/templates/${template.id}/edit`} className="relative block bg-canvas p-4" aria-label={`${S.dashboard.editTemplate}: ${template.name}`}>
        <div className="mx-auto max-h-56 overflow-hidden rounded-xs shadow-md ring-1 ring-black/5" style={{ aspectRatio: ratio, maxWidth: ratio < 1 ? '62%' : '100%' }}>
          {thumbnail || (
            <div
              className="h-full w-full"
              style={{
                backgroundColor: template.background?.color || '#f8f4ea',
                backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          )}
        </div>
        {variants > 0 && (
          <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-surface/90 px-2 py-0.5 text-2xs font-semibold shadow-sm">
            <Palette size={12} aria-hidden /> {S.template.variants(formatNumber(variants))}
          </span>
        )}
      </Link>
      <div className="flex flex-1 items-start gap-2 p-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold">{template.name || S.template.untitled}</h3>
          <p className="mt-1 text-xs text-fg-muted">
            {[getTemplateDetailLabel(template), getTemplateAudienceLabel(template), orientationLabel(template)].join(' · ')}
          </p>
        </div>
        <Dropdown>
          <DropdownTrigger asChild>
            <button type="button" aria-label={S.common.edit} className="grid size-8 place-items-center rounded-sm text-fg-muted hover:bg-surface-2">
              <MoreHorizontal size={17} />
            </button>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownItem icon={PenLine} asChild><Link to={`/templates/${template.id}/edit`}>{S.dashboard.editTemplate}</Link></DropdownItem>
            <DropdownItem icon={FileStack} asChild><Link to={`/generate?template=${encodeURIComponent(template.id)}`}>{S.dashboard.useTemplate}</Link></DropdownItem>
            <DropdownSeparator />
            <DropdownItem icon={Trash2} danger onSelect={() => onDelete(template)}>{S.common.delete}</DropdownItem>
          </DropdownContent>
        </Dropdown>
      </div>
    </article>
  );
}
