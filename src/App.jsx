import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SidebarProvider } from './context/SidebarContext'
import { ToastProvider } from './context/ToastContext'
import { canAccessRoute } from './permissions'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import UserDetail from './pages/UserDetail'
import Hosts from './pages/Hosts'
import Rooms from './pages/Rooms'
import Reports from './pages/Reports'
import Tickets from './pages/Tickets'
import DiamondAllocation from './pages/DiamondAllocation'
import Gifts from './pages/Gifts'
import Agency from './pages/Agency'
import CountryHandler from './pages/CountryHandler'
import AllocationHistory from './pages/AllocationHistory'
import HostPanel from './pages/HostPanel'
import LiveMonitor from './pages/LiveMonitor'
import Security from './pages/Security'
import Events from './pages/Events'
import Payments from './pages/Payments'
import VIPMembership from './pages/VIPMembership'
import Clans from './pages/Clans'
import NearbyRooms from './pages/NearbyRooms'
import Dating from './pages/Dating'
import AIModeration from './pages/AIModeration'
import DailyMissions from './pages/DailyMissions'
import AchievementBadges from './pages/AchievementBadges'
import Notifications from './pages/Notifications'
import Admins from './pages/Admins'
import Settings from './pages/Settings'
import OfficialModerators from './pages/OfficialModerators'
import OfficialSupport from './pages/OfficialSupport'
import Profile from './pages/Profile'

function ProtectedLayout({ children }) {
  return (
    <SidebarProvider>
      <div className="layout">
        <Sidebar />
        <div className="main-content">
          <Header />
          {children}
        </div>
      </div>
    </SidebarProvider>
  )
}

function ProtectedRoute({ children, required }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div className="spinner" style={{ width: 48, height: 48, border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>
  if (!user) return <Navigate to="/login" replace />
  if (required && !canAccessRoute(user, required)) {
    return (
      <ProtectedLayout>
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <h2 style={{ fontSize: 48, marginBottom: 12 }}>🚫</h2>
          <h3>Access Denied</h3>
          <p style={{ color: 'var(--text-light)', marginTop: 8 }}>You don't have permission to access this page.</p>
        </div>
      </ProtectedLayout>
    )
  }
  return <ProtectedLayout>{children}</ProtectedLayout>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute required="/"><Dashboard /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute required="/users"><Users /></ProtectedRoute>} />
      <Route path="/users/:id" element={<ProtectedRoute required="/users/"><UserDetail /></ProtectedRoute>} />
      <Route path="/hosts" element={<ProtectedRoute required="/hosts"><Hosts /></ProtectedRoute>} />
      <Route path="/rooms" element={<ProtectedRoute required="/rooms"><Rooms /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute required="/reports"><Reports /></ProtectedRoute>} />
      <Route path="/tickets" element={<ProtectedRoute required="/tickets"><Tickets /></ProtectedRoute>} />
      <Route path="/diamond-allocation" element={<ProtectedRoute required="/diamond-allocation"><DiamondAllocation /></ProtectedRoute>} />
      <Route path="/gifts" element={<ProtectedRoute required="/gifts"><Gifts /></ProtectedRoute>} />
      <Route path="/agency" element={<ProtectedRoute required="/agency"><Agency /></ProtectedRoute>} />
      <Route path="/country" element={<ProtectedRoute required="/country"><CountryHandler /></ProtectedRoute>} />
      <Route path="/allocation-history" element={<ProtectedRoute required="/allocation-history"><AllocationHistory /></ProtectedRoute>} />
      <Route path="/host-panel" element={<ProtectedRoute required="/host-panel"><HostPanel /></ProtectedRoute>} />
      <Route path="/live" element={<ProtectedRoute required="/live"><LiveMonitor /></ProtectedRoute>} />
      <Route path="/security" element={<ProtectedRoute required="/security"><Security /></ProtectedRoute>} />
      <Route path="/events" element={<ProtectedRoute required="/events"><Events /></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute required="/payments"><Payments /></ProtectedRoute>} />
      <Route path="/vip" element={<ProtectedRoute required="/vip"><VIPMembership /></ProtectedRoute>} />
      <Route path="/clans" element={<ProtectedRoute required="/clans"><Clans /></ProtectedRoute>} />
      <Route path="/nearby" element={<ProtectedRoute required="/nearby"><NearbyRooms /></ProtectedRoute>} />
      <Route path="/dating" element={<ProtectedRoute required="/dating"><Dating /></ProtectedRoute>} />
      <Route path="/ai-moderation" element={<ProtectedRoute required="/ai-moderation"><AIModeration /></ProtectedRoute>} />
      <Route path="/missions" element={<ProtectedRoute required="/missions"><DailyMissions /></ProtectedRoute>} />
      <Route path="/badges" element={<ProtectedRoute required="/badges"><AchievementBadges /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute required="/notifications"><Notifications /></ProtectedRoute>} />
      <Route path="/admins" element={<ProtectedRoute required="/admins"><Admins /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute required="/settings"><Settings /></ProtectedRoute>} />
      <Route path="/official/moderators" element={<ProtectedRoute required="/official/moderators"><OfficialModerators /></ProtectedRoute>} />
      <Route path="/official/support" element={<ProtectedRoute required="/official/support"><OfficialSupport /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  )
}
