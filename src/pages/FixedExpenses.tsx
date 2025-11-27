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
import { getFixedExpenses, createFixedExpense, updateFixedExpense, deleteFixedExpense } from '@/lib/api'
import type { FixedExpense, NewFixedExpense } from '@/types/database'

const EXPENSE_CATEGORIES = [
  'Boende',
  'Transport',
  'Försäkring',
  'Abonnemang',
  'Lån',
  'Barn',
  'Hälsa',
  'Övrigt',
]

export function FixedExpenses() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const queryClient = useQueryClient()

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['fixed-expenses'],
    queryFn: getFixedExpenses,
  })

  const createMutation = useMutation({
    mutationFn: createFixedExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-expenses'] })
      setIsDialogOpen(false)
      setSelectedCategory('')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NewFixedExpense> }) => 
      updateFixedExpense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-expenses'] })
      setEditingExpense(null)
      setIsDialogOpen(false)
      setSelectedCategory('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFixedExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-expenses'] })
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data: NewFixedExpense = {
      name: formData.get('name') as string,
      amount: parseFloat(formData.get('amount') as string) || 0,
      budget: parseFloat(formData.get('budget') as string),
      due_day: formData.get('due_day') ? parseInt(formData.get('due_day') as string) : null,
      category: selectedCategory || null,
      notes: (formData.get('notes') as string) || null,
      is_active: true,
    }

    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (expense: FixedExpense) => {
    setEditingExpense(expense)
    setSelectedCategory(expense.category || '')
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Är du säker på att du vill ta bort denna utgift?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleToggleActive = (expense: FixedExpense) => {
    updateMutation.mutate({ 
      id: expense.id, 
      data: { is_active: !expense.is_active } 
    })
  }

  const activeExpenses = expenses.filter(e => e.is_active)
  const totalExpenses = activeExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const totalBudget = activeExpenses.reduce((sum, e) => sum + Number(e.budget), 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Fasta utgifter</h1>
          <p className="text-slate-500 mt-1">
            Hantera dina återkommande månadsutgifter
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setEditingExpense(null)
            setSelectedCategory('')
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-teal-500 hover:bg-teal-600">
              + Lägg till utgift
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? 'Redigera utgift' : 'Lägg till fast utgift'}
              </DialogTitle>
              <DialogDescription>
                {editingExpense 
                  ? 'Uppdatera informationen för denna utgift'
                  : 'Lägg till en ny återkommande utgift'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Namn</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="T.ex. Hyra, El, Internet"
                  defaultValue={editingExpense?.name || ''}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Faktiskt belopp</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    placeholder="0"
                    defaultValue={editingExpense?.amount || ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget</Label>
                  <Input
                    id="budget"
                    name="budget"
                    type="number"
                    step="0.01"
                    placeholder="0"
                    defaultValue={editingExpense?.budget || ''}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_day">Förfallodag</Label>
                  <Input
                    id="due_day"
                    name="due_day"
                    type="number"
                    min="1"
                    max="31"
                    placeholder="1-31"
                    defaultValue={editingExpense?.due_day || ''}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Anteckningar (valfritt)</Label>
                <Input
                  id="notes"
                  name="notes"
                  placeholder="Extra information..."
                  defaultValue={editingExpense?.notes || ''}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setEditingExpense(null)
                    setSelectedCategory('')
                  }}
                >
                  Avbryt
                </Button>
                <Button 
                  type="submit" 
                  className="bg-teal-500 hover:bg-teal-600"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending 
                    ? 'Sparar...' 
                    : editingExpense ? 'Uppdatera' : 'Lägg till'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summering */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-500">
              Faktiska utgifter
            </CardDescription>
            <CardTitle className="text-3xl text-slate-800">
              {formatCurrency(totalExpenses)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-500">
              Budget
            </CardDescription>
            <CardTitle className="text-3xl text-slate-800">
              {formatCurrency(totalBudget)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className={`border shadow-sm ${totalExpenses <= totalBudget ? 'bg-teal-50 border-teal-200' : 'bg-red-50 border-red-200'}`}>
          <CardHeader className="pb-2">
            <CardDescription className={totalExpenses <= totalBudget ? 'text-teal-700' : 'text-red-700'}>
              Differens
            </CardDescription>
            <CardTitle className={`text-3xl ${totalExpenses <= totalBudget ? 'text-teal-600' : 'text-red-600'}`}>
              {formatCurrency(totalBudget - totalExpenses)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabell */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">Alla fasta utgifter</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="size-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-lg mb-2">Inga fasta utgifter ännu</p>
              <p className="text-sm">Lägg till din första fasta utgift ovan</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Namn</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Belopp</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Förfallo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => {
                  const overBudget = expense.amount > expense.budget
                  return (
                    <TableRow key={expense.id} className={!expense.is_active ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{expense.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {expense.category || 'Övrigt'}
                        </Badge>
                      </TableCell>
                      <TableCell className={overBudget ? 'text-red-600 font-medium' : ''}>
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell>{formatCurrency(expense.budget)}</TableCell>
                      <TableCell className="text-slate-500">
                        {expense.due_day ? `${expense.due_day}:e` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={expense.is_active ? 'default' : 'secondary'}
                          className={expense.is_active ? 'bg-teal-500' : ''}
                        >
                          {expense.is_active ? 'Aktiv' : 'Pausad'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(expense)}
                          >
                            {expense.is_active ? '⏸️' : '▶️'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(expense)}
                          >
                            ✏️
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(expense.id)}
                            disabled={deleteMutation.isPending}
                          >
                            🗑️
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

