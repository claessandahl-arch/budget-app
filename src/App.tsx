import { BrowserRouter, Routes, Route } from 'react-router'
import { AuthProvider } from '@/contexts/AuthContext'
import { QueryProvider } from '@/components/QueryProvider'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/AppLayout'
import { Landing } from '@/pages/Landing'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Overview } from '@/pages/Overview'
import { Incomes } from '@/pages/Incomes'
import { FixedExpenses } from '@/pages/FixedExpenses'
import { VariableExpenses } from '@/pages/VariableExpenses'
import { Savings } from '@/pages/Savings'
import { Import } from '@/pages/Import'
import { Admin } from '@/pages/Admin'

function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected app routes */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Overview />} />
              <Route path="incomes" element={<Incomes />} />
              <Route path="fixed-expenses" element={<FixedExpenses />} />
              <Route path="variable-expenses" element={<VariableExpenses />} />
              <Route path="savings" element={<Savings />} />
              <Route path="import" element={<Import />} />
              <Route path="admin" element={<Admin />} />
            </Route>

            {/* Legacy redirect */}
            <Route path="/dashboard" element={<Overview />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryProvider>
  )
}

export default App
