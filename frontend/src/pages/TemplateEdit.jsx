import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchBranding, fetchTemplate } from '../api/client';
import CanvasEditor from '../components/editor/CanvasEditor';

export default function TemplateEdit() {
  const { id } = useParams();
  const [template, setTemplate] = useState(null);
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [tpl, brd] = await Promise.all([fetchTemplate(id), fetchBranding().catch(() => null)]);
        setTemplate(tpl);
        setBranding(brd);
      } catch {
        setError('تعذر تحميل القالب. تأكد من أن الرابط صحيح.');
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500" dir="rtl">
        جاري تحميل القالب...
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="flex h-screen items-center justify-center" dir="rtl">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-slate-700">
          {error || 'لم يتم العثور على القالب.'}
        </div>
      </div>
    );
  }

  return (
    <CanvasEditor
      templateId={id}
      initialTemplate={template}
      initialBranding={branding}
    />
  );
}
