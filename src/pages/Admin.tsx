import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  getAdminStats, 
  deleteAllTransactions, 
  deleteAllImportProfiles,
  deleteAllCategories,
  deleteAllIncomes,
  deleteAllFixedExpenses,
  deleteAllSavings
} from '@/lib/api'

type DeleteTarget = 'transactions' | 'import-profiles' | 'categories' | 'incomes' | 'fixed-expenses' | 'savings' | null

const DELETE_LABELS: Record<Exclude<DeleteTarget, null>, { label: string; description: string; emoji: string }> = {
  'transactions': {
    label: 'transaktioner',
    description: 'Alla rörliga utgifter och inkomster kommer att raderas permanent.',
    emoji: '🛒'
  },
  'import-profiles': {
    label: 'importprofiler',
    description: 'Alla sparade mappningar för Excel-import kommer att raderas.',
    emoji: '📥'
  },
  'categories': {
    label: 'kategorier',
    description: 'Alla kategorier kommer att raderas. Transaktioner med kategorier blir utan kategori.',
    emoji: '🏷️'
  },
  'incomes': {
    label: 'inkomster',
    description: 'Alla återkommande inkomster kommer att raderas.',
    emoji: '💰'
  },
  'fixed-expenses': {
    label: 'fasta utgifter',
    description: 'Alla fasta utgifter (hyra, abonnemang etc.) kommer att raderas.',
    emoji: '🏠'
  },
  'savings': {
    label: 'sparande',
    description: 'Alla sparande-poster kommer att raderas.',
    emoji: '🐷'
  },
}

export function Admin() {
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)
  const [confirmText, setConfirmText] = useState('')
  const queryClient = useQueryClient()

  // Hämta statistik
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
  })

  // Delete mutations
  const deleteMutation = useMutation({
    mutationFn: async (target: Exclude<DeleteTarget, null>) => {
      switch (target) {
        case 'transactions':
          return deleteAllTransactions()
        case 'import-profiles':
          return deleteAllImportProfiles()
        case 'categories':
          return deleteAllCategories()
        case 'incomes':
          return deleteAllIncomes()
        case 'fixed-expenses':
          return deleteAllFixedExpenses()
        case 'savings':
          return deleteAllSavings()
      }
    },
    onSuccess: () => {
      // Invalidera alla queries
      queryClient.invalidateQueries()
      setDeleteTarget(null)
      setConfirmText('')
    },
  })

  const handleDelete = () => {
    if (deleteTarget && confirmText === 'RADERA') {
      deleteMutation.mutate(deleteTarget)
    }
  }

  const openDeleteDialog = (target: Exclude<DeleteTarget, null>) => {
    setDeleteTarget(target)
    setConfirmText('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800">⚙️ Admin</h1>
        <p className="text-slate-500 mt-1">
          Avancerade inställningar och databashantering
        </p>
      </div>

      {/* Statistik */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">📊 Databasstatistik</CardTitle>
          <CardDescription>
            Översikt av all data i systemet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="size-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-800">{stats?.transactions || 0}</div>
                <div className="text-sm text-slate-500">Transaktioner</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-800">{stats?.incomes || 0}</div>
                <div className="text-sm text-slate-500">Inkomster</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-800">{stats?.fixedExpenses || 0}</div>
                <div className="text-sm text-slate-500">Fasta utgifter</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-800">{stats?.savings || 0}</div>
                <div className="text-sm text-slate-500">Sparande</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-800">{stats?.categories || 0}</div>
                <div className="text-sm text-slate-500">Kategorier</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-800">{stats?.importProfiles || 0}</div>
                <div className="text-sm text-slate-500">Importprofiler</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-white border-red-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-red-700">⚠️ Farozon</CardTitle>
          <CardDescription>
            Dessa åtgärder kan inte ångras. Var försiktig!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Radera transaktioner */}
          <div className="flex items-center justify-between p-4 border border-red-100 rounded-lg bg-red-50/50">
            <div>
              <h3 className="font-medium text-slate-800">🛒 Radera alla transaktioner</h3>
              <p className="text-sm text-slate-500">
                Tar bort alla rörliga utgifter och inkomster ({stats?.transactions || 0} st)
              </p>
            </div>
            <Button 
              variant="outline" 
              className="border-red-300 text-red-600 hover:bg-red-100"
              onClick={() => openDeleteDialog('transactions')}
              disabled={!stats?.transactions}
            >
              Radera
            </Button>
          </div>

          <Separator />

          {/* Radera inkomster */}
          <div className="flex items-center justify-between p-4 border border-red-100 rounded-lg bg-red-50/50">
            <div>
              <h3 className="font-medium text-slate-800">💰 Radera alla inkomster</h3>
              <p className="text-sm text-slate-500">
                Tar bort alla återkommande inkomster ({stats?.incomes || 0} st)
              </p>
            </div>
            <Button 
              variant="outline" 
              className="border-red-300 text-red-600 hover:bg-red-100"
              onClick={() => openDeleteDialog('incomes')}
              disabled={!stats?.incomes}
            >
              Radera
            </Button>
          </div>

          {/* Radera fasta utgifter */}
          <div className="flex items-center justify-between p-4 border border-red-100 rounded-lg bg-red-50/50">
            <div>
              <h3 className="font-medium text-slate-800">🏠 Radera alla fasta utgifter</h3>
              <p className="text-sm text-slate-500">
                Tar bort alla fasta utgifter ({stats?.fixedExpenses || 0} st)
              </p>
            </div>
            <Button 
              variant="outline" 
              className="border-red-300 text-red-600 hover:bg-red-100"
              onClick={() => openDeleteDialog('fixed-expenses')}
              disabled={!stats?.fixedExpenses}
            >
              Radera
            </Button>
          </div>

          {/* Radera sparande */}
          <div className="flex items-center justify-between p-4 border border-red-100 rounded-lg bg-red-50/50">
            <div>
              <h3 className="font-medium text-slate-800">🐷 Radera allt sparande</h3>
              <p className="text-sm text-slate-500">
                Tar bort alla sparande-poster ({stats?.savings || 0} st)
              </p>
            </div>
            <Button 
              variant="outline" 
              className="border-red-300 text-red-600 hover:bg-red-100"
              onClick={() => openDeleteDialog('savings')}
              disabled={!stats?.savings}
            >
              Radera
            </Button>
          </div>

          <Separator />

          {/* Radera kategorier */}
          <div className="flex items-center justify-between p-4 border border-red-100 rounded-lg bg-red-50/50">
            <div>
              <h3 className="font-medium text-slate-800">🏷️ Radera alla kategorier</h3>
              <p className="text-sm text-slate-500">
                Tar bort alla kategorier ({stats?.categories || 0} st)
              </p>
            </div>
            <Button 
              variant="outline" 
              className="border-red-300 text-red-600 hover:bg-red-100"
              onClick={() => openDeleteDialog('categories')}
              disabled={!stats?.categories}
            >
              Radera
            </Button>
          </div>

          {/* Radera importprofiler */}
          <div className="flex items-center justify-between p-4 border border-red-100 rounded-lg bg-red-50/50">
            <div>
              <h3 className="font-medium text-slate-800">📥 Radera alla importprofiler</h3>
              <p className="text-sm text-slate-500">
                Tar bort alla sparade Excel-mappningar ({stats?.importProfiles || 0} st)
              </p>
            </div>
            <Button 
              variant="outline" 
              className="border-red-300 text-red-600 hover:bg-red-100"
              onClick={() => openDeleteDialog('import-profiles')}
              disabled={!stats?.importProfiles}
            >
              Radera
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bekräftelse-dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">
              ⚠️ Bekräfta borttagning
            </DialogTitle>
            <DialogDescription>
              {deleteTarget && DELETE_LABELS[deleteTarget].description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
              <span className="text-3xl">{deleteTarget && DELETE_LABELS[deleteTarget].emoji}</span>
              <p className="mt-2 font-medium text-red-700">
                Du håller på att radera alla {deleteTarget && DELETE_LABELS[deleteTarget].label}
              </p>
              <p className="text-sm text-red-600">
                Denna åtgärd kan inte ångras!
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm">
                Skriv <span className="font-mono font-bold">RADERA</span> för att bekräfta
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Skriv RADERA här..."
                className="font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Avbryt
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDelete}
              disabled={confirmText !== 'RADERA' || deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Raderar...' : 'Radera permanent'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
