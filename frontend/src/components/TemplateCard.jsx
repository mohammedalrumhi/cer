import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, FileStack, Heart, MoreHorizontal, Palette, PenLine, TextCursorInput, Trash2 } from 'lucide-react';
import { S } from '../strings.ar';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from '../ui/Dropdown';
import { formatNumber, formatRelativeTime } from '../ui/format';
import { getTemplateAudienceLabel, getTemplateDetailLabel } from '../utils/templateMetadata';
import { categoryLabel } from './gallery/filterModel';
import { TemplateThumbnail } from './gallery/TemplateThumbnail';

function RenameDialog({ open, onOpenChange, template, onRename }) {
  const [name, setName] = useState(template.name || '');
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      icon={TextCursorInput}
      title="إعادة تسمية القالب"
      size="sm"
      footer={(
        <>
          <Button onClick={() => onOpenChange(false)}>{S.common.cancel}</Button>
          <Button variant="primary" disabled={!name.trim()} onClick={() => onRename(name.trim())}>{S.common.save}</Button>
        </>
      )}
    >
      <input className="field" autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onRename(name.trim()); }} aria-label="اسم القالب" />
    </Dialog>
  );
}

/** A saved template with a real rendered thumbnail and its library actions. */
export function TemplateCard({ template, branding, onDelete, onDuplicate, onRename, onFavorite }) {
  const [renaming, setRenaming] = useState(false);
  const variants = template.availableBackgroundVariants?.length || 0;
  const meta = [categoryLabel(template.category), getTemplateDetailLabel(template), getTemplateAudienceLabel(template)].filter(Boolean).join(' · ');

  return (
    <article className="group card hover-lift flex flex-col overflow-hidden" data-testid="template-card">
      <Link to={`/templates/${template.id}/edit`} className="relative block bg-canvas p-3" aria-label={`${S.dashboard.editTemplate}: ${template.name}`}>
        <TemplateThumbnail template={template} branding={branding} className="mx-auto max-h-56 rounded-xs shadow-md ring-1 ring-black/5" />
        {variants > 0 && (
          <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-surface/90 px-2 py-0.5 text-2xs font-semibold shadow-sm">
            <Palette size={12} aria-hidden /> {S.template.variants(formatNumber(variants))}
          </span>
        )}
      </Link>
      <div className="flex flex-1 items-start gap-1 p-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold">{template.name || S.template.untitled}</h3>
          <p className="truncate text-2xs text-fg-muted">{meta}</p>
          {template.updatedAt && <p className="text-2xs text-fg-subtle">{`عُدّل ${formatRelativeTime(template.updatedAt)}`}</p>}
        </div>
        <button type="button" onClick={() => onFavorite(template, !template.favorite)} aria-label={template.favorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'} aria-pressed={Boolean(template.favorite)} className={`grid size-8 place-items-center rounded-sm hover:bg-surface-2 ${template.favorite ? 'text-danger' : 'text-fg-subtle'}`}>
          <Heart size={16} fill={template.favorite ? 'currentColor' : 'none'} />
        </button>
        <Dropdown>
          <DropdownTrigger asChild>
            <button type="button" aria-label="إجراءات القالب" className="grid size-8 place-items-center rounded-sm text-fg-muted hover:bg-surface-2" data-testid="template-menu">
              <MoreHorizontal size={17} />
            </button>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownItem icon={PenLine} asChild><Link to={`/templates/${template.id}/edit`}>{S.dashboard.editTemplate}</Link></DropdownItem>
            <DropdownItem icon={FileStack} asChild><Link to={`/generate?template=${encodeURIComponent(template.id)}`}>{S.dashboard.useTemplate}</Link></DropdownItem>
            <DropdownSeparator />
            <DropdownItem icon={Copy} onSelect={() => onDuplicate(template)}>{S.common.duplicate}</DropdownItem>
            <DropdownItem icon={TextCursorInput} onSelect={() => setRenaming(true)}>{S.common.rename}</DropdownItem>
            <DropdownSeparator />
            <DropdownItem icon={Trash2} danger onSelect={() => onDelete(template)}>{S.common.delete}</DropdownItem>
          </DropdownContent>
        </Dropdown>
      </div>
      {renaming && <RenameDialog open onOpenChange={setRenaming} template={template} onRename={(name) => { setRenaming(false); onRename(template, name); }} />}
    </article>
  );
}
