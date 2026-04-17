import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTemplate, uploadTemplateDesign } from '../api/client';
import { defaultTemplatePayload, templatePresets } from '../data/presets';
import {
  TEMPLATE_AUDIENCE_OPTIONS,
  TEMPLATE_DETAIL_OPTIONS,
  TemplateAudienceType,
  TemplateDetailLevel,
} from '../utils/templateMetadata';

function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      resolve({ width: image.width, height: image.height });
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => {
      reject(new Error('Invalid image file'));
      URL.revokeObjectURL(objectUrl);
    };
    image.src = objectUrl;
  });
}

export default function TemplateNew() {
  const navigate = useNavigate();
  const [name, setName] = useState('قالب جديد');
  const [orientation, setOrientation] = useState(defaultTemplatePayload.orientation);
  const [detailLevel, setDetailLevel] = useState(defaultTemplatePayload.detailLevel || TemplateDetailLevel.SIMPLE);
  const [audienceType, setAudienceType] = useState(defaultTemplatePayload.audienceType || TemplateAudienceType.STUDENT);
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
        const [{ width, height }, uploaded] = await Promise.all([
          readImageDimensions(designFile),
          uploadTemplateDesign(designFile),
        ]);

        payload = {
          name: name.trim() || 'قالب من تصميم خارجي',
          width,
          height,
          orientation: width >= height ? 'landscape' : 'portrait',
          detailLevel,
          audienceType,
          background: {
            type: 'image',
            color: '#ffffff',
            accentColor: '#0f4a3c',
            imagePath: uploaded.path,
            customLayout: true,
          },
          elements: [],
        };
      } else {
        const selectedPreset = templatePresets.find((item) => item.id === presetId) || defaultTemplatePayload;
        payload = {
          ...selectedPreset.payload,
          name: name.trim() || selectedPreset.payload.name || 'قالب جديد',
          orientation,
          detailLevel,
          audienceType,
        };
      }

      const template = await createTemplate(payload);
      navigate(`/templates/${template.id}/edit`);
    } catch (err) {
      setError('فشل إنشاء القالب. حاول مرة أخرى.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">إضافة قالب جديد</p>
        <h1 className="text-3xl font-bold text-slate-900">قالب جديد</h1>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      <div className="grid gap-6 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">اختر قالبًا جاهزًا</h2>
          <p className="text-sm text-slate-500">ابدأ بسرعة من أحد الأنماط المصممة مسبقًا أو ارفع تصميمك كصورة.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {templatePresets.map((preset) => (
            <label
              key={preset.id}
              className={`cursor-pointer rounded-3xl border px-4 py-4 text-sm transition ${presetId === preset.id ? 'border-emerald-700 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-200'}`}
            >
              <input
                type="radio"
                name="preset"
                value={preset.id}
                checked={presetId === preset.id}
                onChange={() => setPresetId(preset.id)}
                className="sr-only"
              />
              <div className="font-semibold text-slate-900">{preset.label}</div>
              <div className="mt-2 text-xs text-slate-500">{preset.payload.orientation === 'portrait' ? 'طولي' : 'عرضي'}</div>
            </label>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6">
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            اسم القالب
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none ring-emerald-300 focus:ring"
              placeholder="أدخل اسم القالب"
            />
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-700">
            الاتجاه
            <select
              value={orientation}
              onChange={(event) => setOrientation(event.target.value)}
              disabled={Boolean(designFile)}
              className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none ring-emerald-300 focus:ring"
            >
              <option value="landscape">عرضي</option>
              <option value="portrait">طولي</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-700">
            مستوى القالب
            <select
              value={detailLevel}
              onChange={(event) => setDetailLevel(event.target.value)}
              className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none ring-emerald-300 focus:ring"
            >
              {TEMPLATE_DETAIL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-700">
            فئة القالب
            <select
              value={audienceType}
              onChange={(event) => setAudienceType(event.target.value)}
              className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none ring-emerald-300 focus:ring"
            >
              {TEMPLATE_AUDIENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-700">
            تصميم خارجي اختياري
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              onChange={(event) => setDesignFile(event.target.files?.[0] || null)}
              className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none ring-emerald-300 file:me-4 file:rounded-xl file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-emerald-700 focus:ring"
            />
            <p className="text-xs font-normal text-slate-500">
              عند رفع صورة تصميم سيتم إنشاء القالب بأبعاد الصورة نفسها وستصبح الصورة خلفية القالب.
            </p>
          </label>

          <button
            type="submit"
            disabled={processing}
            className="rounded-2xl bg-emerald-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {processing ? 'جارٍ الإنشاء...' : 'إنشاء القالب'}
          </button>
        </form>
      </div>
    </div>
  );
}
