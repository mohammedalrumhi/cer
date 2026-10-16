import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchBranding, fetchTemplate } from '../api/client';
import EditorShell from '../editor/EditorShell';
import { S } from '../strings.ar';
import { ErrorState, LoadingState } from '../ui/States';

export default function TemplateEdit() {
  const { id } = useParams();
  const [template, setTemplate] = useState(null);
  const [branding, setBranding] = useState(null);
  const [status, setStatus] = useState('loading');

  const load = useCallback(() => Promise.all([fetchTemplate(id), fetchBranding().catch(() => null)]).then(
    ([tpl, brd]) => {
      setTemplate(tpl);
      setBranding(brd);
      setStatus('ready');
    },
    (error) => setStatus(error?.response?.status === 404 ? 'missing' : 'error'),
  ), [id]);

  useEffect(() => { if (id) load(); }, [id, load]);

  if (status === 'loading') {
    return <div className="grid h-screen place-items-center bg-bg"><LoadingState label={S.editorLoading.loading} /></div>;
  }
  if (status !== 'ready' || !template) {
    return (
      <div className="grid h-screen place-items-center bg-bg p-4">
        <div className="flex w-full max-w-lg flex-col items-center gap-4">
          <ErrorState title={status === 'missing' ? S.editorLoading.notFound : S.states.errorTitle} body={S.editorLoading.error} onRetry={status === 'error' ? () => { setStatus('loading'); load(); } : undefined} className="w-full" />
          <Link to="/" className="text-sm font-semibold text-primary hover:underline">{S.notFound.home}</Link>
        </div>
      </div>
    );
  }
  return <EditorShell templateId={id} initialTemplate={template} initialBranding={branding} />;
}
