import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getCategories, createTransaction } from '@/lib/api'
import type { TransactionType } from '@/types/database'

export function AddTransactionDialog() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  
  const queryClient = useQueryClient()

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  const filteredCategories = categories.filter(c => c.type === type)

  const mutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      setOpen(false)
      resetForm()
    },
  })

  const resetForm = () => {
    setAmount('')
    setCategoryId('')
    setDescription('')
    setDate(new Date().toISOString().split('T')[0])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    mutation.mutate({
      type,
      amount: parseFloat(amount),
      category_id: categoryId || null,
      description: description || null,
      date,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/25">
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Lägg till transaktion
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-800">Ny transaktion</DialogTitle>
          <DialogDescription className="text-slate-500">
            Lägg till en inkomst eller utgift
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Typ-väljare */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={type === 'expense' ? 'default' : 'outline'}
              className={type === 'expense' ? 'flex-1 bg-slate-800 hover:bg-slate-700' : 'flex-1 border-slate-300'}
              onClick={() => {
                setType('expense')
                setCategoryId('')
              }}
            >
              Utgift
            </Button>
            <Button
              type="button"
              variant={type === 'income' ? 'default' : 'outline'}
              className={type === 'income' ? 'flex-1 bg-teal-500 hover:bg-teal-600' : 'flex-1 border-slate-300'}
              onClick={() => {
                setType('income')
                setCategoryId('')
              }}
            >
              Inkomst
            </Button>
          </div>

          {/* Belopp */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-slate-700">Belopp (kr)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="border-slate-300 focus:border-teal-500 focus:ring-teal-500"
            />
          </div>

          {/* Kategori */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-slate-700">Kategori</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="border-slate-300 focus:border-teal-500 focus:ring-teal-500">
                <SelectValue placeholder="Välj kategori" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                {filteredCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Beskrivning */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-slate-700">Beskrivning (valfritt)</Label>
            <Input
              id="description"
              placeholder="T.ex. Matinköp ICA"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border-slate-300 focus:border-teal-500 focus:ring-teal-500"
            />
          </div>

          {/* Datum */}
          <div className="space-y-2">
            <Label htmlFor="date" className="text-slate-700">Datum</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="border-slate-300 focus:border-teal-500 focus:ring-teal-500"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-slate-300"
              onClick={() => setOpen(false)}
            >
              Avbryt
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-teal-500 hover:bg-teal-600 text-white"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Sparar...' : 'Spara'}
            </Button>
          </div>

          {mutation.isError && (
            <p className="text-sm text-red-500 text-center">
              Något gick fel. Försök igen.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
