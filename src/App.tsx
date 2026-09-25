import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import Login from './pages/Login'
import Signup from './pages/Signup'
import OrdersList from './pages/OrdersList'
import OrderDetail from './pages/OrderDetail'
import { getToken } from './services/authService'
import './App.css'

// Simple guard: redirects to /login if there's no saved session token.
// Swap this for real token-expiry / role checks once the API supports them.
function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = getToken()
  return token ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <OrdersList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute>
              <OrderDetail />
            </ProtectedRoute>
          }
        />
        {/* Add more protected routes as we build them out: /customers, /customers/:id */}
        <Route path="*" element={<Navigate to="/orders" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App