import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getDashboardSummary, getAverageExpensesByCategory } from '@/lib/api'

export function Overview() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const monthName = now.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' })

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary', year, month],
    queryFn: () => getDashboardSummary(year, month),
  })

  const { data: averages } = useQuery({
    queryKey: ['average-expenses'],
    queryFn: () => getAverageExpensesByCategory(6),
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="size-12 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const totalExpenses = (summary?.totalFixedExpenses || 0) + (summary?.totalVariableExpenses || 0)
  const remainingAfterAll = (summary?.totalIncome || 0) - totalExpenses - (summary?.totalSavings || 0)

  // Donut chart data
  const chartData = [
    { label: 'Fasta utgifter', value: summary?.totalFixedExpenses || 0, color: '#ef4444' },
    { label: 'Rörliga utgifter', value: summary?.totalVariableExpenses || 0, color: '#f97316' },
    { label: 'Sparande', value: summary?.totalSavings || 0, color: '#22c55e' },
    { label: 'Kvar', value: Math.max(0, remainingAfterAll), color: '#14b8a6' },
  ]

  const totalForChart = chartData.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Månadsbudget</h1>
        <p className="text-slate-500 mt-1 capitalize">{monthName}</p>
      </div>

      {/* Huvudkort med KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vänster: Donut chart */}
        <Card className="bg-white border-slate-200 shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800">Fördelning</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {/* Simple SVG Donut Chart */}
            <div className="relative size-48">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                {chartData.reduce((acc, item, index) => {
                  const percentage = totalForChart > 0 ? (item.value / totalForChart) * 100 : 0
                  const previousPercentages = chartData
                    .slice(0, index)
                    .reduce((sum, d) => sum + (totalForChart > 0 ? (d.value / totalForChart) * 100 : 0), 0)
                  
                  const strokeDasharray = `${percentage * 2.51327} ${251.327 - percentage * 2.51327}`
                  const strokeDashoffset = -previousPercentages * 2.51327

                  if (percentage > 0) {
                    acc.push(
                      <circle
                        key={item.label}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={item.color}
                        strokeWidth="12"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-500"
                      />
                    )
                  }
                  return acc
                }, [] as React.ReactNode[])}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-800">
                  {formatPercent(summary?.savingsRatio || 0)}
                </span>
                <span className="text-xs text-slate-500">Sparkvot</span>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 grid grid-cols-2 gap-2 w-full">
              {chartData.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  <div 
                    className="size-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-600">{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Höger: Summering */}
        <Card className="bg-white border-slate-200 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800">Sammanfattning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Inkomster */}
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-teal-100 flex items-center justify-center">
                  💰
                </div>
                <div>
                  <p className="font-medium text-slate-800">Summa månadsinkomst</p>
                  <p className="text-sm text-slate-500">{summary?.incomes.length || 0} inkomstkällor</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-teal-600">
                {formatCurrency(summary?.totalIncome || 0)}
              </span>
            </div>

            {/* Fasta utgifter */}
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-red-100 flex items-center justify-center">
                  🏠
                </div>
                <div>
                  <p className="font-medium text-slate-800">Fasta utgifter</p>
                  <p className="text-sm text-slate-500">{formatPercent(summary?.fixedExpenseRatio || 0)} av inkomst</p>
                </div>
              </div>
              <span className="text-xl font-semibold text-slate-800">
                {formatCurrency(summary?.totalFixedExpenses || 0)}
              </span>
            </div>

            {/* Rörliga utgifter */}
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  🛒
                </div>
                <div>
                  <p className="font-medium text-slate-800">Rörliga utgifter</p>
                  <p className="text-sm text-slate-500">{formatPercent(summary?.variableExpenseRatio || 0)} av inkomst</p>
                </div>
              </div>
              <span className="text-xl font-semibold text-slate-800">
                {formatCurrency(summary?.totalVariableExpenses || 0)}
              </span>
            </div>

            {/* Sparande */}
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center">
                  🐷
                </div>
                <div>
                  <p className="font-medium text-slate-800">Månadsparande</p>
                  <p className="text-sm text-slate-500">{formatPercent(summary?.savingsRatio || 0)} sparkvot</p>
                </div>
              </div>
              <span className="text-xl font-semibold text-green-600">
                {formatCurrency(summary?.totalSavings || 0)}
              </span>
            </div>

            {/* Saldo */}
            <div className="flex justify-between items-center py-3 bg-slate-50 -mx-6 px-6 rounded-b-lg">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-teal-500 flex items-center justify-center">
                  <span className="text-white font-bold">=</span>
                </div>
                <div>
                  <p className="font-medium text-slate-800">Saldo</p>
                  <p className="text-sm text-slate-500">Kvar efter allt</p>
                </div>
              </div>
              <span className={`text-2xl font-bold ${remainingAfterAll >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
                {formatCurrency(remainingAfterAll)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI-kort */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-teal-500 to-teal-600 border-none text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-teal-100">Sparkvot</CardDescription>
            <CardTitle className="text-3xl">{formatPercent(summary?.savingsRatio || 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-teal-100">
              {(summary?.savingsRatio || 0) >= 10 ? '✅ Bra!' : '📈 Mål: 10%'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 border-none text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-red-100">Fasta utg. av inkomst</CardDescription>
            <CardTitle className="text-3xl">{formatPercent(summary?.fixedExpenseRatio || 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-100">
              {(summary?.fixedExpenseRatio || 0) <= 50 ? '✅ Under 50%' : '⚠️ Högt'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-none text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-orange-100">Rörliga utg. av inkomst</CardDescription>
            <CardTitle className="text-3xl">{formatPercent(summary?.variableExpenseRatio || 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-100">
              {(summary?.variableExpenseRatio || 0) <= 30 ? '✅ Under 30%' : '📊 Kolla kategorier'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-none text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-100">Totala utgifter</CardDescription>
            <CardTitle className="text-3xl">
              {formatPercent(((summary?.fixedExpenseRatio || 0) + (summary?.variableExpenseRatio || 0)))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-100">
              av inkomst
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Snittutgifter per kategori */}
      {averages && Object.keys(averages).length > 0 && (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800">📊 Snittutgifter per kategori</CardTitle>
            <CardDescription>Baserat på senaste 6 månaderna</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(averages)
                .sort((a, b) => b[1] - a[1])
                .map(([category, avg]) => (
                  <div 
                    key={category} 
                    className="flex justify-between items-center p-3 bg-slate-50 rounded-lg"
                  >
                    <span className="font-medium text-slate-700">{category}</span>
                    <span className="text-slate-600">{formatCurrency(avg)}/mån</span>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      )}

      {/* Senaste transaktioner */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">Senaste rörliga utgifter</CardTitle>
          <CardDescription>De 5 senaste transaktionerna</CardDescription>
        </CardHeader>
        <CardContent>
          {summary?.variableExpenses && summary.variableExpenses.length > 0 ? (
            <div className="space-y-3">
              {summary.variableExpenses
                .filter(t => t.type === 'expense')
                .slice(0, 5)
                .map((t) => (
                  <div 
                    key={t.id} 
                    className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{t.description}</p>
                      <p className="text-sm text-slate-500">
                        {new Date(t.date).toLocaleDateString('sv-SE')} • {t.category?.name || 'Okategoriserat'}
                      </p>
                    </div>
                    <span className="font-semibold text-red-600">
                      {formatCurrency(t.amount)}
                    </span>
                  </div>
                ))
              }
            </div>
          ) : (
            <p className="text-center py-8 text-slate-500">
              Inga transaktioner denna månad
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

