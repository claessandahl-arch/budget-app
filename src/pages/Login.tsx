import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signIn(email, password)
    
    if (error) {
      setError('Fel e-post eller lösenord. Försök igen.')
      setLoading(false)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="relative min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 lg:px-12">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-teal-500 flex items-center justify-center">
              <svg className="size-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <span className="font-semibold text-slate-800">Budget App</span>
          </Link>
        </header>

        {/* Login Form */}
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <Card className="w-full max-w-md bg-white border-slate-200 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-slate-800">Välkommen tillbaka</CardTitle>
              <CardDescription className="text-slate-500">
                Logga in för att se din ekonomi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700">E-post</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="din@email.se"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700">Lösenord</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-teal-500 hover:bg-teal-600 text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Loggar in...
                    </>
                  ) : (
                    'Logga in'
                  )}
                </Button>

                <p className="text-center text-sm text-slate-500">
                  Har du inget konto?{' '}
                  <Link to="/register" className="text-teal-600 hover:text-teal-700 font-medium hover:underline">
                    Skapa konto
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
