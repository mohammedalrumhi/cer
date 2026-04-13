import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PenTool, Users, FileDown } from 'lucide-react';

const links = [
  { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { to: '/students', label: 'الطلاب', icon: Users },
  { to: '/generate', label: 'توليد الشهادات', icon: FileDown },
];

export function Layout({ children }) {
  return (
    <div className="min-h-screen bg-app-pattern text-slate-800" dir="rtl">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[230px_1fr] lg:px-8">
        <aside className="rounded-3xl border border-emerald-100 bg-white/90 p-4 shadow-soft backdrop-blur">
          <div className="mb-6 rounded-2xl bg-emerald-900 p-4 text-white">
            <p className="text-xs text-emerald-100">Dar Al-Itqan Al-Aali</p>
            <h1 className="mt-2 text-xl font-bold">دار الإتقان العالي</h1>
          </div>

          <nav className="space-y-2">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                    isActive
                      ? 'bg-emerald-800 text-white'
                      : 'text-slate-700 hover:bg-amber-50'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}

            <NavLink
              to="/templates/new"
              className="mt-3 flex items-center gap-3 rounded-xl bg-amber-200 px-3 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-amber-300"
            >
              <PenTool size={18} />
              قالب جديد
            </NavLink>
          </nav>
        </aside>

        <main className="rounded-3xl border border-amber-100 bg-white/90 p-5 shadow-soft backdrop-blur md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
