import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getTransactionsForMonth, getCategories, createTransaction, deleteTransaction } from '@/lib/api'
import type { NewTransaction } from '@/types/database'

export function VariableExpenses() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const queryClient = useQueryClient()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const monthName = now.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' })

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', year, month],
    queryFn: () => getTransactionsForMonth(year, month),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  const expenseCategories = categories.filter(c => c.type === 'expense')

  const createMutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      setIsDialogOpen(false)
      setSelectedCategory('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data: NewTransaction = {
      description: formData.get('description') as string,
      amount: parseFloat(formData.get('amount') as string),
      date: formData.get('date') as string,
      category_id: selectedCategory || null,
      type: 'expense',
      notes: (formData.get('notes') as string) || null,
    }

    createMutation.mutate(data)
  }

  const handleDelete = (id: string) => {
    if (confirm('Är du säker på att du vill ta bort denna utgift?')) {
      deleteMutation.mutate(id)
    }
  }

  // Filtrera endast utgifter
  const expenses = transactions.filter(t => t.type === 'expense')
  const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0)

  // Gruppera per kategori
  const byCategory = expenses.reduce((acc, t) => {
    const catName = t.category?.name || 'Okategoriserat'
    if (!acc[catName]) acc[catName] = { total: 0, count: 0 }
    acc[catName].total += Number(t.amount)
    acc[catName].count += 1
    return acc
  }, {} as Record<string, { total: number; count: number }>)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('sv-SE', {
      day: 'numeric',
      month: 'short',
    })
  }

  // Sortera kategorier efter total
  const sortedCategories = Object.entries(byCategory)
    .sort((a, b) => b[1].total - a[1].total)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Rörliga utgifter</h1>
          <p className="text-slate-500 mt-1 capitalize">
            {monthName}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) setSelectedCategory('')
        }}>
          <DialogTrigger asChild>
            <Button className="bg-teal-500 hover:bg-teal-600">
              + Lägg till utgift
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Lägg till rörlig utgift</DialogTitle>
              <DialogDescription>
                Registrera ett nytt köp eller utgift
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Beskrivning</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="T.ex. ICA, Coop, Restaurang"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Belopp (SEK)</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    placeholder="0"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Datum</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Kategori</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Välj kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Anteckningar (valfritt)</Label>
                <Input
                  id="notes"
                  name="notes"
                  placeholder="Extra information för AI-analys..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setSelectedCategory('')
                  }}
                >
                  Avbryt
                </Button>
                <Button 
                  type="submit" 
                  className="bg-teal-500 hover:bg-teal-600"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Sparar...' : 'Lägg till'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summering */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-red-700">
              Totala rörliga utgifter
            </CardDescription>
            <CardTitle className="text-4xl text-red-600">
              {formatCurrency(totalExpenses)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">
              {expenses.length} transaktioner denna månad
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-500">
              Snitt per dag
            </CardDescription>
            <CardTitle className="text-3xl text-slate-800">
              {formatCurrency(totalExpenses / new Date().getDate())}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">
              Baserat på {new Date().getDate()} dagar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Kategorifördelning */}
      {sortedCategories.length > 0 && (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800">Per kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedCategories.map(([category, data]) => {
                const percentage = totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-700">{category}</span>
                      <span className="text-slate-500">
                        {formatCurrency(data.total)} ({data.count} st)
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-teal-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaktionstabell */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">Alla transaktioner</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="size-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-lg mb-2">Inga utgifter denna månad</p>
              <p className="text-sm">Lägg till din första utgift ovan</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Beskrivning</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Belopp</TableHead>
                  <TableHead className="text-right">Åtgärd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="text-slate-500">
                      {formatDate(expense.date)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {expense.description || '-'}
                      {expense.notes && (
                        <span className="block text-xs text-slate-400 mt-0.5">
                          {expense.notes}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {expense.category?.icon} {expense.category?.name || 'Okategoriserat'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(expense.id)}
                        disabled={deleteMutation.isPending}
                      >
                        🗑️
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

