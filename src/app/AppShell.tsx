import { LayoutDashboard, FileText, FilePlus, Settings, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router'

const navItems: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { to: '/invoices', label: 'Invoices', icon: <FileText size={18} /> },
  { to: '/invoices/new', label: 'New Invoice', icon: <FilePlus size={18} /> },
  { to: '/settings', label: 'Settings', icon: <Settings size={18} /> },
]

export const AppShell = () => (
  <div className="min-h-screen">
    {/* Skip navigation link for accessibility */}
    <a
      href="#main-content"
      className="fixed left-2 top-2 z-50 -translate-y-20 rounded-md bg-orange-600 px-4 py-2 text-sm font-bold text-white shadow-lg transition-transform duration-200 focus:translate-y-0"
    >
      Skip to main content
    </a>

    {/* ─── Desktop Sidebar ─── */}
    <aside className="app-chrome fixed inset-y-0 left-0 hidden w-[272px] flex-col border-r border-slate-800/60 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-5 py-6 lg:flex">
      {/* Brand card */}
      <div className="relative mb-8 overflow-hidden rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-4 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-indigo-500/5" />
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-md shadow-orange-500/20">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-white tracking-tight">Price Error</p>
              <p className="text-[11px] font-medium text-slate-400">CRM</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-orange-400/80">
            Premium Deals. Smarter Prices.
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            aria-current={undefined}
            className={({ isActive }) =>
              [
                'group relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-orange-500/15 to-orange-500/5 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-orange-500 shadow-sm shadow-orange-500/40" />
                )}
                <span className={`transition-colors duration-200 ${isActive ? 'text-orange-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                  {item.icon}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto border-t border-slate-800/60 pt-4">
        <p className="text-[11px] text-slate-600">Invoice & Quotation Control Center</p>
      </div>
    </aside>

    {/* ─── Mobile Header ─── */}
    <header className="app-chrome sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-xl lg:hidden">
      <div className="mb-2 flex items-center justify-between rounded-lg bg-gradient-to-r from-slate-950 to-slate-900 px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-md shadow-orange-500/20">
            <Zap size={15} className="text-white" />
          </div>
          <span className="text-sm font-black text-white tracking-tight">Price Error</span>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">CRM</span>
      </div>
      <nav className="grid grid-cols-4 gap-1.5" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              [
                'flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-[11px] font-bold leading-tight transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </header>

    {/* ─── Main Content ─── */}
    <main id="main-content" className="px-3 py-4 sm:px-4 sm:py-6 lg:ml-[272px] lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Outlet />
      </div>
    </main>
  </div>
)
