import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageUp, LayoutTemplate, Sparkles } from 'lucide-react';
import { createTemplate, uploadTemplateDesign } from '../api/client';
import { defaultTemplatePayload, templatePresets } from '../data/presets';
import { S } from '../strings.ar';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';
import { Field, PageHeader } from '../ui/Field';
import { Segmented } from '../ui/Segmented';
import { Banner } from '../ui/States';
import { TemplateAudienceType, TemplateDetailLevel } from '../utils/templateMetadata';

function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => { resolve({ width: image.width, height: image.height }); URL.revokeObjectURL(objectUrl); };
    image.onerror = () => { reject(new Error('invalid image')); URL.revokeObjectURL(objectUrl); };
    image.src = objectUrl;
  });
}

export default function TemplateNew() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [orientation, setOrientation] = useState(defaultTemplatePayload.orientation);
  const [detailLevel, setDetailLevel] = useState(TemplateDetailLevel.SIMPLE);
  const [audienceType, setAudienceType] = useState(TemplateAudienceType.STUDENT);
  const [presetId, setPresetId] = useState(templatePresets[0].id);
  const [designFile, setDesignFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setProcessing(true);
      setError('');
      let payload;
      if (designFile) {
        const [{ width, height }, uploaded] = await Promise.all([readImageDimensions(designFile), uploadTemplateDesign(designFile)]);
        payload = {
          name: name.trim() || S.template.untitled,
          width,
          height,
          orientation: width >= height ? 'landscape' : 'portrait',
          detailLevel,
          audienceType,
          background: { type: 'image', color: '#ffffff', accentColor: '#0f4a3c', imagePath: uploaded.path, customLayout: true },
          elements: [],
        };
      } else {
        const preset = templatePresets.find((item) => item.id === presetId) || templatePresets[0];
        payload = { ...preset.payload, name: name.trim() || preset.label, orientation, detailLevel, audienceType };
      }
      const template = await createTemplate(payload);
      navigate(`/templates/${template.id}/edit`);
    } catch {
      setError(S.newTemplate.createError);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <PageHeader eyebrow={S.newTemplate.eyebrow} title={S.newTemplate.title} />
      {error && <Banner tone="danger">{error}</Banner>}

      <section className="card flex flex-col gap-4 p-5">
        <div>
          <h2 className="text-lg font-bold">{S.newTemplate.choosePreset}</h2>
          <p className="text-sm text-fg-muted">{S.newTemplate.choosePresetHint}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" role="radiogroup">
          {templatePresets.map((preset) => {
            const active = !designFile && presetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => { setPresetId(preset.id); setDesignFile(null); }}
                className={cx('flex items-center gap-3 rounded-md border p-3 text-start transition', active ? 'border-primary bg-primary-50 ring-2 ring-primary/20' : 'border-border bg-surface hover:border-border-strong')}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-sm" style={{ background: preset.payload.background?.color, color: preset.payload.background?.accentColor }}>
                  <LayoutTemplate size={18} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{preset.label}</span>
                  <span className="block text-xs text-fg-muted">{preset.payload.orientation === 'portrait' ? S.template.orientation.portrait : S.template.orientation.landscape}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card grid gap-5 p-5 md:grid-cols-2">
        <Field label={S.newTemplate.name} className="md:col-span-2">
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder={S.newTemplate.namePlaceholder} />
        </Field>
        <Field label={S.newTemplate.orientation}>
          <Segmented
            value={orientation}
            onChange={setOrientation}
            fullWidth
            options={[{ value: 'landscape', label: S.template.orientation.landscape }, { value: 'portrait', label: S.template.orientation.portrait }]}
          />
        </Field>
        <Field label={S.newTemplate.audience}>
          <Segmented
            value={audienceType}
            onChange={setAudienceType}
            fullWidth
            options={[{ value: TemplateAudienceType.STUDENT, label: S.template.audience.student }, { value: TemplateAudienceType.ADULT, label: S.template.audience.adult }]}
          />
        </Field>
        <Field label={S.newTemplate.detailLevel}>
          <Segmented
            value={detailLevel}
            onChange={setDetailLevel}
            fullWidth
            options={[{ value: TemplateDetailLevel.SIMPLE, label: S.template.detail.simple }, { value: TemplateDetailLevel.DETAILED, label: S.template.detail.detailed }]}
          />
        </Field>
        <Field label={`${S.newTemplate.designImage} (${S.common.optional})`} hint={S.newTemplate.designImageHint}>
          <label className="flex h-10 cursor-pointer items-center gap-2 rounded-sm border border-dashed border-border-strong px-3 text-sm text-fg-muted transition hover:border-primary hover:text-primary">
            <ImageUp size={16} aria-hidden />
            <span className="truncate">{designFile ? designFile.name : S.newTemplate.chooseImage}</span>
            <input type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => setDesignFile(e.target.files?.[0] || null)} />
          </label>
        </Field>
      </section>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="lg" icon={Sparkles} loading={processing}>
          {processing ? S.newTemplate.creating : S.newTemplate.create}
        </Button>
      </div>
    </form>
  );
}
