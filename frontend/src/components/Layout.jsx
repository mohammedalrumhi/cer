import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FileStack, LayoutDashboard, LogOut, Menu, Plus, Sparkles, Users, X } from 'lucide-react';
import { clearAuthToken } from '../api/client';
import { S } from '../strings.ar';
import { cx } from '../ui/cx';
import { ThemeToggle } from '../ui/ThemeToggle';

const LINKS = [
  { to: '/', label: S.nav.dashboard, icon: LayoutDashboard, end: true },
  { to: '/generate', label: S.nav.generate, icon: FileStack },
  { to: '/generate-simple', label: S.nav.generateQuick, icon: Sparkles },
  { to: '/students', label: S.nav.students, icon: Users },
];

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-md bg-white p-1 shadow-sm ring-1 ring-black/5">
        <img src="/assets/logo.png" alt="" className="size-full object-contain" />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="text-xs font-medium text-gold-600">{S.app.school}</p>
        <p className="text-md font-bold">{S.app.name}</p>
      </div>
    </div>
  );
}

function NavItems({ onNavigate }) {
  return (
    <nav aria-label={S.nav.menu} className="flex flex-col gap-1">
      {LINKS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) => cx(
            'group flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-all duration-150',
            isActive ? 'bg-primary-50 text-primary' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
          )}
        >
          {({ isActive }) => (
            <>
              <span className={cx('grid size-8 place-items-center rounded-sm transition-colors', isActive ? 'bg-primary text-primary-fg shadow-sm' : 'bg-surface-2 group-hover:bg-surface-3')}>
                <Icon size={17} aria-hidden />
              </span>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarBody({ onNavigate, onLogout }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Brand />
      <NavLink
        to="/templates/new"
        onClick={onNavigate}
        className="flex h-11 items-center justify-center gap-2 rounded-md bg-gold text-sm font-bold text-white shadow-sm transition hover:-translate-y-px hover:shadow-md"
      >
        <Plus size={18} aria-hidden />
        {S.nav.newTemplate}
      </NavLink>
      <NavItems onNavigate={onNavigate} />
      <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-fg-muted">{S.theme.label}</span>
          <ThemeToggle />
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex h-10 items-center gap-2 rounded-sm px-3 text-sm font-semibold text-fg-muted transition hover:bg-surface-2 hover:text-fg"
        >
          <LogOut size={16} aria-hidden />
          {S.nav.logout}
        </button>
        <p className="px-3 text-2xs text-fg-subtle">{S.app.version}</p>
      </div>
    </div>
  );
}

/**
 * App shell: sticky sidebar on the right (RTL inline-start) on desktop, a top bar with a slide-in
 * drawer below 1024 px.
 */
export function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  // The drawer remembers the path it was opened on, so any navigation closes it.
  const [drawerPath, setDrawerPath] = useState(null);
  const drawerOpen = drawerPath === location.pathname;
  const setDrawerOpen = (open) => setDrawerPath(open ? location.pathname : null);

  function handleLogout() {
    clearAuthToken();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Mobile / tablet top bar */}
      <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border px-4 lg:hidden">
        <Brand />
        <button type="button" onClick={() => setDrawerOpen(true)} aria-label={S.nav.menu} className="grid size-10 place-items-center rounded-sm hover:bg-surface-2">
          <Menu size={20} />
        </button>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={S.nav.menu}>
          <button type="button" className="absolute inset-0 animate-fade-in bg-[var(--overlay)]" aria-label={S.nav.closeMenu} onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-[290px] animate-panel-in border-e border-border bg-surface shadow-lg">
            <button type="button" onClick={() => setDrawerOpen(false)} aria-label={S.nav.closeMenu} className="absolute end-3 top-3 grid size-9 place-items-center rounded-sm hover:bg-surface-2">
              <X size={18} />
            </button>
            <SidebarBody onNavigate={() => setDrawerOpen(false)} onLogout={handleLogout} />
          </aside>
        </div>
      )}

      <div className="mx-auto flex max-w-[1480px] gap-6 lg:px-6 lg:py-6">
        <aside className="sticky top-6 hidden h-[calc(100vh-48px)] w-[260px] shrink-0 rounded-lg border border-border bg-surface shadow-sm lg:block">
          <SidebarBody onLogout={handleLogout} />
        </aside>
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-0 lg:py-2">{children}</main>
      </div>
    </div>
  );
}
