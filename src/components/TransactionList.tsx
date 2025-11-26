import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { deleteTransaction } from '@/lib/api'
import type { Transaction } from '@/types/database'

type Props = {
  transactions: Transaction[]
}

export function TransactionList({ transactions }: Props) {
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
    },
  })

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <svg className="size-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-slate-500">Inga transaktioner ännu</p>
        <p className="text-sm mt-1">Lägg till din första transaktion ovan</p>
      </div>
    )
  }

  // Gruppera transaktioner per datum
  const groupedByDate = transactions.reduce((groups, transaction) => {
    const date = transaction.date
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(transaction)
    return groups
  }, {} as Record<string, Transaction[]>)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (dateStr === today.toISOString().split('T')[0]) {
      return 'Idag'
    }
    if (dateStr === yesterday.toISOString().split('T')[0]) {
      return 'Igår'
    }
    return date.toLocaleDateString('sv-SE', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    })
  }

  const formatAmount = (amount: number, type: string) => {
    const formatted = new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
    
    return type === 'income' ? `+${formatted}` : `-${formatted}`
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedByDate).map(([date, dayTransactions]) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-slate-400 mb-3 capitalize">
            {formatDate(date)}
          </h3>
          <div className="space-y-2">
            {dayTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100 group hover:bg-slate-100 transition-colors"
              >
                {/* Ikon */}
                <div className="size-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-lg shadow-sm">
                  {transaction.category?.icon || (transaction.type === 'income' ? '💰' : '📦')}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">
                    {transaction.description || transaction.category?.name || 'Transaktion'}
                  </p>
                  <p className="text-sm text-slate-400">
                    {transaction.category?.name}
                  </p>
                </div>

                {/* Belopp */}
                <div className="text-right">
                  <p className={`font-semibold ${
                    transaction.type === 'income' ? 'text-teal-600' : 'text-slate-800'
                  }`}>
                    {formatAmount(Number(transaction.amount), transaction.type)}
                  </p>
                </div>

                {/* Ta bort-knapp */}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 hover:bg-red-50"
                  onClick={() => deleteMutation.mutate(transaction.id)}
                  disabled={deleteMutation.isPending}
                >
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
