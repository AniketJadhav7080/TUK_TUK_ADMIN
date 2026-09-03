import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSidebar } from '../context/SidebarContext'
import { hasPermission, PERMISSIONS } from '../permissions'
import { api } from '../services/api'
import Modal from './Modal'

const API_BASE = 'https://impish-earwig-epiphany.ngrok-free.dev/api';

const roleColors = {
  owner: { bg: '#ff6b35', label: 'Owner', defaultRoute: '/' },
  super_admin: { bg: '#8b5cf6', label: 'Super Admin', defaultRoute: '/' },
  moderator: { bg: '#0a7ea4', label: 'Moderator', defaultRoute: '/' },
  support: { bg: '#27ae60', label: 'Support', defaultRoute: '/' },
  country_handler: { bg: '#e67e22', label: 'Country Handler', defaultRoute: '/country' },
  diamond_stock: { bg: '#1abc9c', label: 'Diamond Stock', defaultRoute: '/diamond-stock' },
  agency: { bg: '#e74c3c', label: 'Agency', defaultRoute: '/agency' },
  host: { bg: '#f39c12', label: 'Host', defaultRoute: '/host-panel' },
}

export default function Header() {
  const { user, logout, allAdmins, switchRole } = useAuth()
  const { toggle } = useSidebar()
  const navigate = useNavigate()
  const roleInfo = roleColors[user?.role] || { bg: '#6b7280', label: user?.role }
  const [apiStatus, setApiStatus] = useState('checking')
  const [profileOpen, setProfileOpen] = useState(false)
  const [profilePic, setProfilePic] = useState(null)
  const [showChangePwd, setShowChangePwd] = useState(false)
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwdMsg, setPwdMsg] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem('profile_pic_' + user?.id)
    if (saved) setProfilePic(saved)
  }, [user?.id])

  useEffect(() => {
    const check = async () => {
      try {
        const token = sessionStorage.getItem('admin_token')
        const res = await fetch(`${API_BASE}/dashboard/stats`, {
          signal: AbortSignal.timeout(5000),
          headers: { 'ngrok-skip-browser-warning': 'true', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        })
        setApiStatus(res.ok ? 'connected' : 'error')
      } catch {
        setApiStatus('error')
      }
    }
    if (user) {
      check()
      const interval = setInterval(check, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwdMsg('')
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdMsg('New passwords do not match.')
      return
    }
    if (pwdForm.newPassword.length < 6) {
      setPwdMsg('Password must be at least 6 characters.')
      return
    }
    setPwdLoading(true)
    try {
      await api.changePassword(user.email, pwdForm.currentPassword, pwdForm.newPassword)
      setPwdMsg('Password changed successfully.')
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      setPwdMsg(err.message || 'Failed to change password.')
    } finally {
      setPwdLoading(false)
    }
  }

  const handleSwitch = (e) => {
    const selected = allAdmins.find((a) => a.id === e.target.value)
    switchRole(e.target.value)
    const route = roleColors[selected?.role]?.defaultRoute || '/'
    navigate(route)
  }

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="hamburger" onClick={toggle}>☰</button>
        <h1>Tuk Tuk Admin Panel</h1>
        <span className="role-badge" style={{ background: roleInfo.bg }}>{roleInfo.label}</span>
        {user?.country && <span className="role-badge" style={{ background: '#374151' }}>{user.country}</span>}
      </div>
      <div className="header-right">
        {hasPermission(user, PERMISSIONS.MANAGE_ADMINS) && (
          <select className="role-switcher" value={user?.id} onChange={handleSwitch}>
            {allAdmins.map((a) => (
              <option key={a.id} value={a.id}>{a.name} ({roleColors[a.role]?.label || a.role})</option>
            ))}
          </select>
        )}
        <span className={`api-dot ${apiStatus}`} title={apiStatus === 'connected' ? 'API Connected' : apiStatus === 'checking' ? 'Checking...' : 'API Disconnected'} />
        <div className="profile-dropdown" ref={dropdownRef}>
          <button className="profile-trigger" onClick={() => setProfileOpen(!profileOpen)}>
            {profilePic ? <img src={profilePic} alt="" className="admin-avatar-img" /> : <div className="admin-avatar" style={{ background: roleInfo.bg }}>{user?.name?.charAt(0) || 'A'}</div>}
            <span className="header-email">{user?.email}</span>
            <span className={`dropdown-arrow ${profileOpen ? 'open' : ''}`}>▾</span>
          </button>
          {profileOpen && (
            <div className="profile-menu">
              <div className="profile-menu-header">
                {profilePic ? <img src={profilePic} alt="" className="admin-avatar-img large" /> : <div className="admin-avatar large" style={{ background: roleInfo.bg }}>{user?.name?.charAt(0) || 'A'}</div>}
                <div>
                  <div className="profile-name">{user?.name || 'Admin'}</div>
                  <div className="profile-email">{user?.email}</div>
                  <span className="role-badge" style={{ background: roleInfo.bg, fontSize: 11, padding: '2px 8px' }}>{roleInfo.label}</span>
                </div>
              </div>
              <div className="profile-menu-body">
                <button className="profile-menu-item" onClick={() => { setProfileOpen(false); navigate('/profile') }}>
                  <span className="profile-menu-icon">👤</span> Profile
                </button>
                <button className="profile-menu-item" onClick={() => { setProfileOpen(false); setShowChangePwd(true) }}>
                  <span className="profile-menu-icon">🔑</span> Change Password
                </button>
              </div>
              <div className="profile-menu-footer">
                <button className="profile-menu-item logout" onClick={logout}>
                  <span className="profile-menu-icon">🚪</span> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showChangePwd && (
        <Modal title="Change Password" onClose={() => { setShowChangePwd(false); setPwdMsg(''); setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' }) }}>
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label>Current Password</label>
              <input type="password" value={pwdForm.currentPassword} onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" value={pwdForm.newPassword} onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" value={pwdForm.confirmPassword} onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })} required />
            </div>
            {pwdMsg && (
              <div style={{ padding: '8px 12px', borderRadius: 8, fontSize: 13, background: pwdMsg.includes('successfully') ? '#d1fae5' : '#fee2e2', color: pwdMsg.includes('successfully') ? '#065f46' : '#991b1b', marginBottom: 12 }}>
                {pwdMsg}
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => { setShowChangePwd(false); setPwdMsg(''); setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' }) }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={pwdLoading}>{pwdLoading ? 'Changing...' : 'Change Password'}</button>
            </div>
          </form>
        </Modal>
      )}
    </header>
  )
}
