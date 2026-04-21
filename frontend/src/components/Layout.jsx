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
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-emerald-50" dir="rtl" style={{ fontFamily: 'var(--font-layout-ui)' }}>
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-3 py-3 sm:px-4 sm:py-5 lg:flex-row lg:gap-6 lg:px-8 lg:py-6">
        {/* Sidebar */}
        <aside className="w-full rounded-2xl border border-white/60 bg-white/85 p-4 shadow-lg backdrop-blur-md sm:p-5 lg:h-fit lg:w-80 lg:shrink-0 lg:sticky lg:top-6">
          {/* Logo/Header */}
          <div className="mb-5 rounded-xl bg-linear-to-r from-emerald-600 to-emerald-700 p-4 text-white shadow-md sm:mb-6 sm:p-5">
            <div className="flex items-center gap-3">
              <img
                src="/assets/logo.png"
                alt="شعار الموقع"
                className="h-12 w-12 rounded-xl bg-white/95 object-contain p-1.5 shadow-sm sm:h-14 sm:w-14"
              />
              <div>
                <p className="text-xs font-normal text-emerald-100">دار الإتقان العالي</p>
                <h1 className="mt-1 text-lg font-bold leading-tight sm:text-xl">نظام الشهادات</h1>
              </div>
            </div>
          </div>

          {/* Main Navigation */}
          <nav className="mb-5 grid grid-cols-2 gap-2 sm:mb-6 lg:grid-cols-1">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `group relative flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all sm:px-4 ${
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
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-amber-400 to-amber-500 px-4 py-3 text-sm font-semibold text-amber-900 shadow-md transition-all hover:shadow-lg hover:from-amber-500 hover:to-amber-600"
          >
            <PenTool size={18} />
            قالب جديد
          </NavLink>

          {/* Footer Info */}
          <div className="mt-5 border-t border-slate-200 pt-4 text-xs text-slate-500 sm:mt-6">
            <button
              type="button"
              onClick={handleLogout}
              className="mb-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              <LogOut size={14} />
              تسجيل الخروج
            </button>
            <p>v1.0 • نظام إدارة الشهادات</p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 flex-1 rounded-2xl border border-white/60 bg-white/90 p-4 shadow-lg backdrop-blur-md sm:p-5 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
