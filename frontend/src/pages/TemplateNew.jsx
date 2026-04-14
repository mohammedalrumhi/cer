import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTemplate } from '../api/client';
import { defaultTemplatePayload, templatePresets } from '../data/presets';

export default function TemplateNew() {
  const navigate = useNavigate();
  const [name, setName] = useState('قالب جديد');
  const [orientation, setOrientation] = useState(defaultTemplatePayload.orientation);
  const [presetId, setPresetId] = useState(templatePresets[0].id);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setProcessing(true);
      setError('');
      const selectedPreset = templatePresets.find((item) => item.id === presetId) || defaultTemplatePayload;
      const template = await createTemplate({
        ...selectedPreset.payload,
        name: name.trim() || selectedPreset.payload.name || 'قالب جديد',
        orientation,
      });
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
          <p className="text-sm text-slate-500">ابدأ بسرعة من أحد الأنماط المصممة مسبقًا.</p>
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
              className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none ring-emerald-300 focus:ring"
            >
              <option value="landscape">عرضي</option>
              <option value="portrait">طولي</option>
            </select>
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
