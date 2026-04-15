import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginRequest, setAuthToken } from '../api/client';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setLoading(true);
      setError('');
      const result = await loginRequest({ username, password });
      setAuthToken(result?.token || '');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'بيانات الدخول غير صحيحة');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,#d1fae5_0,#f0fdf4_25%,#f8fafc_60%)]" dir="rtl">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-2xl lg:grid-cols-[1.15fr_1fr]">
          <section className="relative hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-700 p-10 text-white lg:block">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            <div className="relative z-10">
              <img src="/assets/logo.png" alt="Logo" className="mb-6 h-20 w-20 rounded-2xl bg-white/95 p-2" />
              <h1 className="text-4xl font-bold leading-tight">منصة إدارة الشهادات المدرسية</h1>
              <p className="mt-4 max-w-md text-emerald-50/90">
                تسجيل دخول آمن لإدارة القوالب والطلاب وإصدار الشهادات الاحترافية.
              </p>
              <div className="mt-10 rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-sm text-emerald-100">نصيحة:</p>
                <p className="mt-2 text-lg font-semibold">يمكنك تغيير المستخدمين من ملف backend/data/users.json</p>
              </div>
            </div>
          </section>

          <section className="p-6 sm:p-10">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8 text-center">
                <img src="/assets/logo.png" alt="Logo" className="mx-auto mb-4 h-16 w-16 rounded-xl bg-emerald-50 p-2 lg:hidden" />
                <h2 className="text-3xl font-bold text-slate-900">تسجيل الدخول</h2>
                <p className="mt-2 text-sm text-slate-500">أدخل اسم المستخدم وكلمة المرور</p>
              </div>

              {error && (
                <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block space-y-2 text-sm font-semibold text-slate-700">
                  اسم المستخدم
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    placeholder="admin"
                    autoComplete="username"
                    required
                  />
                </label>

                <label className="block space-y-2 text-sm font-semibold text-slate-700">
                  كلمة المرور
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-emerald-600 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'جاري التحقق...' : 'دخول'}
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
