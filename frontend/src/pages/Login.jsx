import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockKeyhole, User } from 'lucide-react';
import { loginRequest, setAuthToken } from '../api/client';
import { S } from '../strings.ar';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Banner } from '../ui/States';
import { ThemeToggle } from '../ui/ThemeToggle';

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
      setError(err?.response ? S.auth.invalid : S.common.networkError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-bg">
      <div className="absolute end-4 top-4 z-10"><ThemeToggle /></div>
      <div className="mx-auto grid min-h-screen max-w-6xl items-center px-4 py-10 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
        <section className="relative hidden overflow-hidden rounded-xl bg-brand p-10 text-white shadow-lg lg:block">
          <div className="islamic-pattern absolute inset-0 opacity-60" aria-hidden />
          <div className="relative">
            <span className="mb-8 grid size-20 place-items-center rounded-lg bg-white p-2 shadow-md">
              <img src="/assets/logo.png" alt={S.app.school} className="size-full object-contain" />
            </span>
            <p className="text-sm font-medium text-white/75">{S.app.school}</p>
            <h1 className="mt-2 text-3xl font-bold leading-snug">{S.auth.heroTitle}</h1>
            <p className="mt-4 max-w-md text-white/80">{S.auth.heroBody}</p>
            <div className="mt-10 rounded-md border border-white/20 bg-white/10 p-5 text-sm backdrop-blur-sm">{S.auth.tip}</div>
          </div>
        </section>

        <section className="card mx-auto w-full max-w-md p-6 sm:p-8">
          <div className="mb-8 text-center">
            <img src="/assets/logo.png" alt="" className="mx-auto mb-4 size-16 rounded-md bg-white p-2 shadow-sm lg:hidden" />
            <h2 className="text-2xl font-bold">{S.auth.title}</h2>
            <p className="mt-1 text-sm text-fg-muted">{S.auth.subtitle}</p>
          </div>
          {error && <Banner tone="danger" className="mb-5">{error}</Banner>}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label={S.auth.username} htmlFor="username">
              <div className="relative">
                <User size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden />
                <input id="username" className="field ps-9" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={S.auth.usernamePlaceholder} autoComplete="username" required />
              </div>
            </Field>
            <Field label={S.auth.password} htmlFor="password">
              <div className="relative">
                <LockKeyhole size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden />
                <input id="password" type="password" className="field ps-9" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
              </div>
            </Field>
            <Button type="submit" variant="primary" size="lg" loading={loading} className="mt-2 w-full">
              {loading ? S.auth.submitting : S.auth.submit}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
