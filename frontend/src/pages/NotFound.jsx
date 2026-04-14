import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="space-y-6 rounded-3xl border border-rose-100 bg-rose-50 p-8 text-center shadow-sm">
      <h1 className="text-3xl font-bold text-rose-900">صفحة غير موجودة</h1>
      <p className="text-slate-700">يبدو أن الرابط الذي دخلت إليه غير صالح.</p>
      <Link
        to="/"
        className="inline-flex items-center justify-center rounded-2xl bg-emerald-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
      >
        العودة إلى لوحة التحكم
      </Link>
    </div>
  );
}
