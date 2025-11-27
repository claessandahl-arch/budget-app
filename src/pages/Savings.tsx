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
import { getSavings, createSaving, updateSaving, deleteSaving } from '@/lib/api'
import type { Saving, NewSaving, SavingsType } from '@/types/database'

const SAVINGS_TYPES: { value: SavingsType; label: string; emoji: string; description: string }[] = [
  { value: 'short', label: 'Kort', emoji: '💵', description: 'Buffert, semester' },
  { value: 'long', label: 'Lång', emoji: '🏦', description: 'Pension, fonder' },
  { value: 'risk', label: 'Risk', emoji: '📈', description: 'Aktier, crypto' },
]

export function Savings() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSaving, setEditingSaving] = useState<Saving | null>(null)
  const [selectedType, setSelectedType] = useState<SavingsType>('long')
  const queryClient = useQueryClient()

  const { data: savings = [], isLoading } = useQuery({
    queryKey: ['savings'],
    queryFn: getSavings,
  })

  const createMutation = useMutation({
    mutationFn: createSaving,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings'] })
      setIsDialogOpen(false)
      setSelectedType('long')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NewSaving> }) => 
      updateSaving(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings'] })
      setEditingSaving(null)
      setIsDialogOpen(false)
      setSelectedType('long')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSaving,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings'] })
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data: NewSaving = {
      name: formData.get('name') as string,
      amount: parseFloat(formData.get('amount') as string),
      type: selectedType,
      affects_investment_ratio: formData.get('affects_investment_ratio') === 'on',
      notes: (formData.get('notes') as string) || null,
      is_active: true,
    }

    if (editingSaving) {
      updateMutation.mutate({ id: editingSaving.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (saving: Saving) => {
    setEditingSaving(saving)
    setSelectedType(saving.type)
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Är du säker på att du vill ta bort detta sparande?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleToggleActive = (saving: Saving) => {
    updateMutation.mutate({ 
      id: saving.id, 
      data: { is_active: !saving.is_active } 
    })
  }

  const activeSavings = savings.filter(s => s.is_active)
  const totalSavings = activeSavings.reduce((sum, s) => sum + Number(s.amount), 0)
  const investmentSavings = activeSavings
    .filter(s => s.affects_investment_ratio)
    .reduce((sum, s) => sum + Number(s.amount), 0)

  // Gruppera per typ
  const byType = {
    short: activeSavings.filter(s => s.type === 'short'),
    long: activeSavings.filter(s => s.type === 'long'),
    risk: activeSavings.filter(s => s.type === 'risk'),
  }

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
          <h1 className="text-3xl font-bold text-slate-800">Sparande</h1>
          <p className="text-slate-500 mt-1">
            Hantera ditt månatliga sparande
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setEditingSaving(null)
            setSelectedType('long')
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-teal-500 hover:bg-teal-600">
              + Lägg till sparande
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingSaving ? 'Redigera sparande' : 'Lägg till sparande'}
              </DialogTitle>
              <DialogDescription>
                {editingSaving 
                  ? 'Uppdatera informationen för detta sparande'
                  : 'Lägg till en ny sparpost'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Namn</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="T.ex. Lysa, Avanza, Buffert"
                  defaultValue={editingSaving?.name || ''}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Månadsbelopp (SEK)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  defaultValue={editingSaving?.amount || ''}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Typ av sparande</Label>
                <Select value={selectedType} onValueChange={(v) => setSelectedType(v as SavingsType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SAVINGS_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="flex items-center gap-2">
                          <span>{type.emoji}</span>
                          <span>{type.label}</span>
                          <span className="text-slate-400">- {type.description}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="affects_investment_ratio"
                  name="affects_investment_ratio"
                  defaultChecked={editingSaving?.affects_investment_ratio || false}
                  className="size-4 rounded border-slate-300"
                />
                <Label htmlFor="affects_investment_ratio" className="text-sm font-normal">
                  Påverkar investeringskvot
                </Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Anteckningar (valfritt)</Label>
                <Input
                  id="notes"
                  name="notes"
                  placeholder="Extra information..."
                  defaultValue={editingSaving?.notes || ''}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setEditingSaving(null)
                    setSelectedType('long')
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
                    : editingSaving ? 'Uppdatera' : 'Lägg till'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summering */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-teal-50 border-teal-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-teal-700">
              Totalt sparande
            </CardDescription>
            <CardTitle className="text-3xl text-teal-600">
              {formatCurrency(totalSavings)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-teal-600">/månad</p>
          </CardContent>
        </Card>

        {SAVINGS_TYPES.map((type) => {
          const typeTotal = byType[type.value].reduce((sum, s) => sum + Number(s.amount), 0)
          return (
            <Card key={type.value} className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2 text-slate-500">
                  <span>{type.emoji}</span>
                  {type.label}
                </CardDescription>
                <CardTitle className="text-2xl text-slate-800">
                  {formatCurrency(typeTotal)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-400">
                  {byType[type.value].length} poster
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Investeringskvot-info */}
      {investmentSavings > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-700">
              Påverkar investeringskvot
            </CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {formatCurrency(investmentSavings)}
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      {/* Tabell */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">Alla sparanden</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="size-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : savings.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-lg mb-2">Inget sparande ännu</p>
              <p className="text-sm">Lägg till ditt första sparande ovan</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Namn</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Belopp</TableHead>
                  <TableHead>Inv.kvot</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savings.map((saving) => {
                  const typeInfo = SAVINGS_TYPES.find(t => t.value === saving.type)
                  return (
                    <TableRow key={saving.id} className={!saving.is_active ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{saving.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {typeInfo?.emoji} {typeInfo?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(saving.amount)}</TableCell>
                      <TableCell>
                        {saving.affects_investment_ratio ? '✅' : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={saving.is_active ? 'default' : 'secondary'}
                          className={saving.is_active ? 'bg-teal-500' : ''}
                        >
                          {saving.is_active ? 'Aktiv' : 'Pausad'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(saving)}
                          >
                            {saving.is_active ? '⏸️' : '▶️'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(saving)}
                          >
                            ✏️
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(saving.id)}
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

