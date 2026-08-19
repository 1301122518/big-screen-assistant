import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import AdminPage from './pages/AdminPage'
import PlayerPage from './pages/PlayerPage'
import LoginPage from './pages/LoginPage'
import { isAuthenticated } from './api/client'
import './index.css'

/** 路由守卫：未登录跳转登录页 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        <Route path="/player" element={<PlayerPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
