import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { getIncomes, createIncome, updateIncome, deleteIncome } from '@/lib/api'
import type { Income, NewIncome } from '@/types/database'

export function Incomes() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingIncome, setEditingIncome] = useState<Income | null>(null)
  const queryClient = useQueryClient()

  const { data: incomes = [], isLoading } = useQuery({
    queryKey: ['incomes'],
    queryFn: getIncomes,
  })

  const createMutation = useMutation({
    mutationFn: createIncome,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] })
      setIsDialogOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NewIncome> }) => 
      updateIncome(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] })
      setEditingIncome(null)
      setIsDialogOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteIncome,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] })
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data: NewIncome = {
      name: formData.get('name') as string,
      amount: parseFloat(formData.get('amount') as string),
      notes: (formData.get('notes') as string) || null,
      is_active: true,
    }

    if (editingIncome) {
      updateMutation.mutate({ id: editingIncome.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (income: Income) => {
    setEditingIncome(income)
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Är du säker på att du vill ta bort denna inkomst?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleToggleActive = (income: Income) => {
    updateMutation.mutate({ 
      id: income.id, 
      data: { is_active: !income.is_active } 
    })
  }

  const totalIncome = incomes
    .filter(i => i.is_active)
    .reduce((sum, i) => sum + Number(i.amount), 0)

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
          <h1 className="text-3xl font-bold text-slate-800">Inkomster</h1>
          <p className="text-slate-500 mt-1">
            Hantera dina återkommande månadsinkomster
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) setEditingIncome(null)
        }}>
          <DialogTrigger asChild>
            <Button className="bg-teal-500 hover:bg-teal-600">
              + Lägg till inkomst
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingIncome ? 'Redigera inkomst' : 'Lägg till inkomst'}
              </DialogTitle>
              <DialogDescription>
                {editingIncome 
                  ? 'Uppdatera informationen för denna inkomst'
                  : 'Lägg till en ny återkommande inkomst'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Namn</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="T.ex. Nettolön"
                  defaultValue={editingIncome?.name || ''}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Belopp (SEK)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  defaultValue={editingIncome?.amount || ''}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Anteckningar (valfritt)</Label>
                <Input
                  id="notes"
                  name="notes"
                  placeholder="Extra information..."
                  defaultValue={editingIncome?.notes || ''}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setEditingIncome(null)
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
                    : editingIncome ? 'Uppdatera' : 'Lägg till'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summering */}
      <Card className="bg-teal-50 border-teal-200">
        <CardHeader className="pb-2">
          <CardDescription className="text-teal-700">
            Total månadsinkomst
          </CardDescription>
          <CardTitle className="text-4xl text-teal-600">
            {formatCurrency(totalIncome)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-teal-600">
            {incomes.filter(i => i.is_active).length} aktiva inkomstkällor
          </p>
        </CardContent>
      </Card>

      {/* Tabell */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">Alla inkomster</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="size-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : incomes.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-lg mb-2">Inga inkomster ännu</p>
              <p className="text-sm">Lägg till din första inkomst ovan</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Namn</TableHead>
                  <TableHead>Belopp</TableHead>
                  <TableHead>Anteckningar</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomes.map((income) => (
                  <TableRow key={income.id} className={!income.is_active ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{income.name}</TableCell>
                    <TableCell>{formatCurrency(income.amount)}</TableCell>
                    <TableCell className="text-slate-500 max-w-xs truncate">
                      {income.notes || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={income.is_active ? 'default' : 'secondary'}
                        className={income.is_active ? 'bg-teal-500' : ''}
                      >
                        {income.is_active ? 'Aktiv' : 'Pausad'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(income)}
                        >
                          {income.is_active ? '⏸️' : '▶️'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(income)}
                        >
                          ✏️
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(income.id)}
                          disabled={deleteMutation.isPending}
                        >
                          🗑️
                        </Button>
                      </div>
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

