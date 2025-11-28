import { NavLink, Outlet, useNavigate } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  { path: '/app', label: 'Översikt', icon: '📊' },
  { path: '/app/incomes', label: 'Inkomster', icon: '💰' },
  { path: '/app/fixed-expenses', label: 'Fasta utgifter', icon: '🏠' },
  { path: '/app/variable-expenses', label: 'Rörliga utgifter', icon: '🛒' },
  { path: '/app/savings', label: 'Sparande', icon: '🐷' },
  { path: '/app/import', label: 'Import', icon: '📥' },
  { path: '/app/admin', label: 'Admin', icon: '⚙️' },
]

export function AppLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 lg:px-12 border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-teal-500 flex items-center justify-center">
            <svg className="size-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <span className="font-semibold text-slate-800">Budget App</span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500 hidden sm:block">
            {user?.email}
          </span>
          <Button variant="outline" size="sm" onClick={handleSignOut} className="border-slate-300 text-slate-600 hover:bg-slate-100">
            Logga ut
          </Button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white/50 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-1 overflow-x-auto py-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/app'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                    isActive
                      ? 'bg-teal-500 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  )
                }
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="px-6 py-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

