import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PenTool, Users, FileText, LogOut } from 'lucide-react';
import { clearAuthToken } from '../api/client';

const links = [
  { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { to: '/students', label: 'الطلاب', icon: Users },
  { to: '/generate', label: 'الشهادات المفصلة', icon: FileText },
  { to: '/generate-simple', label: 'الشهادات السريعة', icon: FileText },
];

export function Layout({ children }) {
  const navigate = useNavigate();

  function handleLogout() {
    clearAuthToken();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50" dir="rtl" style={{ fontFamily: 'var(--font-layout-ui)' }}>
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-8">
        {/* Sidebar */}
        <aside className="w-full rounded-2xl border border-white/60 bg-white/80 p-5 shadow-lg backdrop-blur-md sm:w-80 lg:h-fit lg:sticky lg:top-6">
          {/* Logo/Header */}
          <div className="mb-8 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 p-5 text-white shadow-md">
            <div className="flex items-center gap-3">
              <img
                src="/assets/logo.png"
                alt="شعار الموقع"
                className="h-14 w-14 rounded-xl bg-white/95 object-contain p-1.5 shadow-sm"
              />
              <div>
                <p className="text-xs font-normal text-emerald-100">دار الإتقان العالي</p>
                <h1 className="mt-1 text-xl font-bold leading-tight">نظام الشهادات</h1>
              </div>
            </div>
          </div>

          {/* Main Navigation */}
          <nav className="mb-8 space-y-2">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* New Template Button */}
          <NavLink
            to="/templates/new"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-3 text-sm font-semibold text-amber-900 shadow-md transition-all hover:shadow-lg hover:from-amber-500 hover:to-amber-600"
          >
            <PenTool size={18} />
            قالب جديد
          </NavLink>

          {/* Footer Info */}
          <div className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
            <button
              type="button"
              onClick={handleLogout}
              className="mb-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              <LogOut size={14} />
              تسجيل الخروج
            </button>
            <p>v1.0 • نظام إدارة الشهادات</p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 rounded-2xl border border-white/60 bg-white/90 p-6 shadow-lg backdrop-blur-md md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
