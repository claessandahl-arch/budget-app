import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="relative flex flex-col min-h-screen">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 lg:px-12">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-teal-500 flex items-center justify-center">
              <svg className="size-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <span className="font-semibold text-slate-800">Budget App</span>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-slate-600 hover:text-slate-800">
            <Link to="/login">Logga in</Link>
          </Button>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex items-center justify-center px-6 py-12 lg:py-24">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-600 text-sm font-medium">
              <span className="size-1.5 rounded-full bg-teal-500 animate-pulse" />
              Gratis för familjen
            </div>

            {/* Huvudrubrik */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-800">
              Full kontroll över
              <span className="block text-teal-500">din ekonomi</span>
            </h1>

            {/* Beskrivning */}
            <p className="text-lg sm:text-xl text-slate-600 max-w-xl mx-auto leading-relaxed">
              Samla alla dina inkomster, utgifter och sparande på ett ställe. 
              Få fullständig koll på familjens ekonomi.
            </p>

            {/* CTA-knappar */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" className="w-full sm:w-auto bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/25" asChild>
                <Link to="/register">
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Skapa konto
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-100" asChild>
                <Link to="/login">Logga in</Link>
              </Button>
            </div>
          </div>
        </main>

        {/* Features */}
        <section className="px-6 pb-16 lg:pb-24">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="size-10 rounded-lg bg-teal-50 flex items-center justify-center mb-2">
                    <svg className="size-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <CardTitle className="text-lg text-slate-800">Spåra utgifter</CardTitle>
                  <CardDescription className="text-slate-500">
                    Kategorisera och följ upp alla dina utgifter automatiskt.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="size-10 rounded-lg bg-teal-50 flex items-center justify-center mb-2">
                    <svg className="size-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                  </div>
                  <CardTitle className="text-lg text-slate-800">Hantera sparande</CardTitle>
                  <CardDescription className="text-slate-500">
                    Sätt sparmål och se dina framsteg över tid.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="size-10 rounded-lg bg-teal-50 flex items-center justify-center mb-2">
                    <svg className="size-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <CardTitle className="text-lg text-slate-800">Dela med familjen</CardTitle>
                  <CardDescription className="text-slate-500">
                    Hela familjen kan bidra till budgeten tillsammans.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 py-6 border-t border-slate-200">
          <div className="max-w-5xl mx-auto flex items-center justify-between text-sm text-slate-500">
            <span>Budget App</span>
            <span>Gratis för privat bruk</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
