import { BrowserRouter, Routes, Route } from 'react-router'
import { AuthProvider } from '@/contexts/AuthContext'
import { QueryProvider } from '@/components/QueryProvider'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Landing } from '@/pages/Landing'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Dashboard } from '@/pages/Dashboard'

function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryProvider>
  )
}

export default App
