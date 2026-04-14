import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Stage, Layer, Rect, Text, Image as KonvaImage } from 'react-konva';
import { fetchBranding, fetchTemplate, previewTemplate, updateTemplate } from '../api/client';
import { TemplateElementEditor } from '../components/TemplateElementEditor';

function useLoadedImage(src, setter) {
  useEffect(() => {
    if (!src) {
      setter(null);
      return;
    }

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => setter(img);
    return () => {
      img.onload = null;
    };
  }, [src, setter]);
}

function getDynamicFieldLabel(field) {
  if (field === 'studentName') return 'اسم الطالب';
  if (field === 'date') return 'التاريخ';
  if (field === 'schoolName') return 'اسم المدرسة';
  return field;
}

function createElement(type) {
  const id = `${type}-${Date.now()}-${Math.round(Math.random() * 10000)}`;
  const base = {
    id,
    type,
    x: 560,
    y: 360,
    width: 900,
    fontSize: 26,
    fontWeight: '700',
    fill: '#0f172a',
    align: 'center',
  };

  if (type === 'text') {
    return {
      ...base,
      text: 'نص جديد',
    };
  }

  if (type === 'dynamicText') {
    return {
      ...base,
      field: 'studentName',
    };
  }

  return {
    ...base,
    type: 'dynamicImage',
    field: 'logo',
    width: 120,
    height: 60,
  };
}

export default function TemplateEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [success, setSuccess] = useState('');
  const [branding, setBranding] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState('');
  const [logoImage, setLogoImage] = useState(null);
  const [signatureImage, setSignatureImage] = useState(null);
  const [previewScale, setPreviewScale] = useState(1);
  const autosaveTimer = useRef(null);

  const apiOrigin = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

  useEffect(() => {
    async function loadTemplate() {
      try {
        setLoading(true);
        const data = await fetchTemplate(id);
        setTemplate(data);
      } catch (err) {
        setError('تعذر تحميل القالب. تأكد من أن الرابط صحيح.');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadTemplate();
    }
  }, [id]);

  useEffect(() => {
    async function loadBranding() {
      try {
        const data = await fetchBranding();
        setBranding(data);
      } catch {
        setBranding(null);
      }
    }

    loadBranding();
  }, []);

  const logoUrl = branding?.logoPath ? `${apiOrigin}/${branding.logoPath}` : '';
  const signatureUrl = branding?.signaturePath ? `${apiOrigin}/${branding.signaturePath}` : '';
  useLoadedImage(logoUrl, setLogoImage);
  useLoadedImage(signatureUrl, setSignatureImage);

  useEffect(() => {
    if (!template) {
      return;
    }

    const scale = Math.min(280 / template.width, 1);
    setPreviewScale(scale);
  }, [template]);

  const revokePreviewUrl = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
  };

  useEffect(() => {
    return () => {
      revokePreviewUrl();
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!template || loading || saving) {
      return;
    }

    if (!dirty) {
      return;
    }

    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
    }

    autosaveTimer.current = setTimeout(async () => {
      try {
        setSaving(true);
        await updateTemplate(template.id, template);
        setSuccess('تم حفظ التغييرات تلقائيًا.');
        setDirty(false);
      } catch {
        setError('فشل الحفظ التلقائي. حاول الحفظ يدويًا.');
      } finally {
        setSaving(false);
      }
    }, 1500);

    return () => clearTimeout(autosaveTimer.current);
  }, [template, dirty, loading, saving]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!template) return;

    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await updateTemplate(template.id, template);
      setSuccess('تم حفظ التغييرات بنجاح.');
      setDirty(false);
    } catch (err) {
      setError('حدث خطأ أثناء حفظ القالب. حاول مرة أخرى.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    if (!template) return;

    try {
      setPreviewError('');
      setPreviewLoading(true);
      setSuccess('');

      const previewBlob = await previewTemplate({
        template,
        branding,
        students: ['طالب تجريبي'],
      });

      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }

      const url = window.URL.createObjectURL(previewBlob);
      setPreviewUrl(url);
    } catch (err) {
      setPreviewError('فشل إنشاء المعاينة. حاول مرة أخرى.');
    } finally {
      setPreviewLoading(false);
    }
  }

  function updateField(field, value) {
    revokePreviewUrl();
    setTemplate((prev) => ({
      ...prev,
      [field]: value,
    }));
    setDirty(true);
  }

  function updateBackground(key, value) {
    revokePreviewUrl();
    setTemplate((prev) => ({
      ...prev,
      background: {
        ...prev.background,
        [key]: value,
      },
    }));
    setDirty(true);
  }

  function updateElement(id, changes) {
    revokePreviewUrl();
    setTemplate((prev) => ({
      ...prev,
      elements: prev.elements.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    }));
    setDirty(true);
  }

  function removeElement(id) {
    revokePreviewUrl();
    setTemplate((prev) => ({
      ...prev,
      elements: prev.elements.filter((item) => item.id !== id),
    }));
    setDirty(true);
  }

  function addElement(type) {
    revokePreviewUrl();
    setTemplate((prev) => ({
      ...prev,
      elements: [...(prev.elements || []), createElement(type)],
    }));
    setDirty(true);
  }

  function handleStageMouseDown(event) {
    if (event.target === event.target.getStage()) {
      setSelectedElementId('');
    }
  }

  function handleDragMove(id) {
    return (event) => {
      const scale = previewScale || 1;
      const nextX = Math.max(0, Math.round(event.target.x() / scale));
      const nextY = Math.max(0, Math.round(event.target.y() / scale));
      updateElement(id, { x: nextX, y: nextY });
    };
  }

  const selectedElement = template?.elements?.find((item) => item.id === selectedElementId);

  if (loading) {
    return <div className="text-slate-500">جاري تحميل القالب...</div>;
  }

  if (!template) {
    return <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 text-slate-700">لم يتم العثور على القالب.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">تحرير قالب الشهادة</p>
        <h1 className="text-3xl font-bold text-slate-900">{template.name}</h1>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{success}</div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <label className="mb-4 block text-sm font-semibold text-slate-700">
              اسم القالب
              <input
                value={template.name}
                onChange={(event) => updateField('name', event.target.value)}
                className="mt-2 w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none ring-emerald-300 focus:ring"
              />
            </label>

            <label className="mb-4 block text-sm font-semibold text-slate-700">
              الاتجاه
              <select
                value={template.orientation}
                onChange={(event) => updateField('orientation', event.target.value)}
                className="mt-2 w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none ring-emerald-300 focus:ring"
              >
                <option value="landscape">عرضي</option>
                <option value="portrait">طولي</option>
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                اللون الخلفي
                <input
                  type="color"
                  value={template.background?.color || '#f8f4ea'}
                  onChange={(event) => updateBackground('color', event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-amber-200 bg-white px-3 py-2"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                لون التمييز
                <input
                  type="color"
                  value={template.background?.accentColor || '#0f4a3c'}
                  onChange={(event) => updateBackground('accentColor', event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-amber-200 bg-white px-3 py-2"
                />
              </label>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                العرض
                <input
                  type="number"
                  value={template.width}
                  onChange={(event) => updateField('width', Number(event.target.value))}
                  className="mt-2 w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none ring-emerald-300 focus:ring"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                الارتفاع
                <input
                  type="number"
                  value={template.height}
                  onChange={(event) => updateField('height', Number(event.target.value))}
                  className="mt-2 w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none ring-emerald-300 focus:ring"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-emerald-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ القالب'}
              </button>
              <button
                type="button"
                onClick={handlePreview}
                disabled={previewLoading}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {previewLoading ? 'جاري المعاينة...' : 'معاينة PDF'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                العودة للوحة
              </button>
            </div>
          </form>

          <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">عناصر القالب</h2>
                <p className="text-sm text-slate-500">تحكم بنقاط النص والصور الديناميكية.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addElement('text')}
                  className="rounded-2xl border border-emerald-700 bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600"
                >
                  إضافة نص ثابت
                </button>
                <button
                  type="button"
                  onClick={() => addElement('dynamicText')}
                  className="rounded-2xl border border-amber-700 bg-amber-200 px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-300"
                >
                  إضافة نص ديناميكي
                </button>
                <button
                  type="button"
                  onClick={() => addElement('dynamicImage')}
                  className="rounded-2xl border border-slate-700 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-200"
                >
                  إضافة صورة ديناميكية
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {(template.elements || []).length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                  لا توجد عناصر بعد. أضف عنصرًا للبدء.
                </div>
              ) : (
                template.elements.map((element) => (
                  <TemplateElementEditor
                    key={element.id}
                    element={element}
                    onChange={updateElement}
                    onRemove={removeElement}
                  />
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          {previewError && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{previewError}</div>}
          {previewUrl ? (
            <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-900">معاينة PDF</h2>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    فتح في نافذة جديدة
                  </a>
                  <a
                    href={previewUrl}
                    download="certificate-preview.pdf"
                    className="rounded-2xl border border-emerald-700 bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600"
                  >
                    تنزيل PDF
                  </a>
                </div>
              </div>
              <iframe
                title="معاينة الشهادة"
                src={previewUrl}
                className="h-[420px] w-full rounded-3xl border border-slate-200"
              />
            </section>
          ) : (
            <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-slate-900">معاينة سريعة</h2>
              <p className="mb-4 text-xs text-slate-500">انقر واسحب أي عنصر لتغيير موضعه مباشرة في العرض.</p>
              <div className="mx-auto overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <Stage
                  width={Math.max(260, (template.width || 800) * previewScale)}
                  height={Math.max(180, (template.height || 600) * previewScale)}
                  onMouseDown={handleStageMouseDown}
                  style={{ background: template.background?.color, border: `1px solid ${template.background?.accentColor || '#0f4a3c'}` }}
                >
                  <Layer>
                    <Rect
                      x={0}
                      y={0}
                      width={(template.width || 800) * previewScale}
                      height={(template.height || 600) * previewScale}
                      fill={template.background?.color || '#f8f4ea'}
                    />

                    {(template.elements || []).map((element) => {
                      const x = Math.max(0, element.x || 0) * previewScale;
                      const y = Math.max(0, element.y || 0) * previewScale;
                      const width = Math.max(40, (element.width || 100) * previewScale);
                      const fontSize = Math.max(10, (element.fontSize || 24) * previewScale);
                      const isSelected = selectedElementId === element.id;

                      if (element.type === 'dynamicImage') {
                        const image = element.field === 'signature' ? signatureImage : logoImage;
                        return (
                          <KonvaImage
                            key={element.id}
                            image={image}
                            x={x}
                            y={y}
                            width={(element.width || 120) * previewScale}
                            height={(element.height || 60) * previewScale}
                            draggable
                            onDragMove={handleDragMove(element.id)}
                            onMouseDown={() => setSelectedElementId(element.id)}
                            stroke={isSelected ? '#0f9d58' : undefined}
                            strokeWidth={isSelected ? 2 : 0}
                          />
                        );
                      }

                      return (
                        <Text
                          key={element.id}
                          text={element.type === 'text' ? element.text || '' : getDynamicFieldLabel(element.field)}
                          x={x}
                          y={y}
                          width={width}
                          fontSize={fontSize}
                          align={element.align || 'center'}
                          fill={element.fill || '#0f172a'}
                          draggable
                          onDragMove={handleDragMove(element.id)}
                          onMouseDown={() => setSelectedElementId(element.id)}
                          stroke={isSelected ? '#0f9d58' : undefined}
                          strokeWidth={isSelected ? 1 : 0}
                        />
                      );
                    })}
                  </Layer>
                </Stage>
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
