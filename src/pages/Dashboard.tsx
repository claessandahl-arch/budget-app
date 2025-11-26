import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AddTransactionDialog } from '@/components/AddTransactionDialog'
import { TransactionList } from '@/components/TransactionList'
import { getMonthlySummary } from '@/lib/api'

export function Dashboard() {
  const { user, signOut } = useAuth()
  
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const { data: summary, isLoading } = useQuery({
    queryKey: ['summary', year, month],
    queryFn: () => getMonthlySummary(year, month),
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const monthName = now.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="relative min-h-screen">
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
            <Button variant="outline" size="sm" onClick={signOut} className="border-slate-300 text-slate-600 hover:bg-slate-100">
              Logga ut
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-6 py-8 lg:px-12">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Välkomstmeddelande och månad */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-800">
                  Översikt
                </h1>
                <p className="text-slate-500 mt-1 capitalize">
                  {monthName}
                </p>
              </div>
              <AddTransactionDialog />
            </div>

            {/* Sammanfattningskort */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2 text-slate-500">
                    <span className="size-2 rounded-full bg-teal-500" />
                    Inkomster
                  </CardDescription>
                  <CardTitle className="text-3xl text-teal-600">
                    {isLoading ? '...' : formatCurrency(summary?.income ?? 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-slate-400">
                    Denna månad
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2 text-slate-500">
                    <span className="size-2 rounded-full bg-red-400" />
                    Utgifter
                  </CardDescription>
                  <CardTitle className="text-3xl text-slate-800">
                    {isLoading ? '...' : formatCurrency(summary?.expenses ?? 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-slate-400">
                    Denna månad
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2 text-slate-500">
                    <span className="size-2 rounded-full bg-blue-400" />
                    Balans
                  </CardDescription>
                  <CardTitle className={`text-3xl ${
                    (summary?.balance ?? 0) >= 0 ? 'text-teal-600' : 'text-red-500'
                  }`}>
                    {isLoading ? '...' : formatCurrency(summary?.balance ?? 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-slate-400">
                    Inkomster - Utgifter
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Transaktionslista */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-slate-800">Senaste transaktioner</CardTitle>
                <CardDescription className="text-slate-500">
                  Dina transaktioner för {monthName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="size-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <TransactionList transactions={summary?.transactions ?? []} />
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
