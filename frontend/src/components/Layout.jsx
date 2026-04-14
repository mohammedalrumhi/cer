import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PenTool, Users, FileText } from 'lucide-react';

const links = [
  { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { to: '/students', label: 'الطلاب', icon: Users },
  { to: '/generate', label: 'الشهادات', icon: FileText },
];

export function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50" dir="rtl">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-8">
        {/* Sidebar */}
        <aside className="w-full rounded-2xl border border-white/60 bg-white/80 p-5 shadow-lg backdrop-blur-md sm:w-80 lg:h-fit lg:sticky lg:top-6">
          {/* Logo/Header */}
          <div className="mb-8 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 p-5 text-white shadow-md">
            <p className="text-xs font-medium text-emerald-100">دار الإتقان العالي</p>
            <h1 className="mt-2 text-lg font-bold leading-tight">نظام الشهادات</h1>
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
