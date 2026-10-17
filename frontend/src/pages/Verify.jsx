import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BadgeCheck, ShieldX } from 'lucide-react';
import { verifyCertificate } from '../api/client';
import { formatDateTime } from '../ui/format';
import { LoadingState } from '../ui/States';
import { ThemeToggle } from '../ui/ThemeToggle';

/** Public verification page opened from a certificate's QR code: /verify/:serial. */
export default function Verify() {
  const { serial } = useParams();
  const [state, setState] = useState({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    verifyCertificate(serial).then(
      (result) => { if (alive) setState({ status: result.valid ? 'valid' : 'invalid', result }); },
      () => { if (alive) setState({ status: 'error' }); },
    );
    return () => { alive = false; };
  }, [serial]);

  return (
    <div className="relative grid min-h-screen place-items-center bg-bg p-4">
      <div className="absolute end-4 top-4"><ThemeToggle /></div>
      <main className="card w-full max-w-md overflow-hidden" data-testid="verify-card" data-status={state.status}>
        <div className="flex items-center gap-3 bg-brand p-5 text-white">
          <span className="grid size-12 place-items-center rounded-md bg-white p-1"><img src="/assets/logo.png" alt="" className="size-full object-contain" /></span>
          <div>
            <p className="text-xs text-white/75">دار الإتقان العالي</p>
            <h1 className="text-lg font-bold">التحقق من الشهادة</h1>
          </div>
        </div>
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          {state.status === 'loading' && <LoadingState label="جارٍ التحقق…" />}
          {state.status === 'valid' && (
            <>
              <BadgeCheck size={56} className="text-success" />
              <h2 className="text-xl font-bold text-success">شهادة صحيحة وموثّقة</h2>
              <dl className="grid w-full grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-start text-sm">
                <dt className="text-fg-muted">الاسم</dt><dd className="font-bold">{state.result.studentName}</dd>
                {state.result.templateName && <><dt className="text-fg-muted">الشهادة</dt><dd>{state.result.templateName}</dd></>}
                {state.result.programName && <><dt className="text-fg-muted">البرنامج</dt><dd>{state.result.programName}</dd></>}
                <dt className="text-fg-muted">الجهة</dt><dd>{state.result.schoolName}</dd>
                <dt className="text-fg-muted">تاريخ الإصدار</dt><dd>{formatDateTime(state.result.issuedAt)}</dd>
                <dt className="text-fg-muted">الرقم التسلسلي</dt><dd dir="ltr" className="text-end font-mono">{state.result.serial}</dd>
              </dl>
            </>
          )}
          {(state.status === 'invalid' || state.status === 'error') && (
            <>
              <ShieldX size={56} className="text-danger" />
              <h2 className="text-xl font-bold text-danger">{state.status === 'invalid' ? 'لم نجد شهادة بهذا الرقم' : 'تعذّر التحقق الآن'}</h2>
              <p className="text-sm text-fg-muted">{state.status === 'invalid' ? 'تأكّد من الرقم أو امسح رمز QR مرة أخرى. إن استمر الأمر فقد تكون الشهادة غير صادرة من الدار.' : 'حاول مرة أخرى بعد قليل.'}</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
