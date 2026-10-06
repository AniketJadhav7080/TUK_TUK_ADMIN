import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api, resolveAssetUrl } from '../services/api'
import Modal from '../components/Modal'

const roleLabels = {
  owner: 'Platform Owner',
  super_admin: 'Super Admin',
  moderator: 'Moderator',
  support: 'Support',
  diamond_stock: 'Diamond Stock Manager',
  agency: 'Agency',
  host: 'Host',
}

const roleColors = {
  owner: '#ff6b35',
  super_admin: '#8b5cf6',
  moderator: '#0a7ea4',
  support: '#27ae60',
  diamond_stock: '#1abc9c',
  agency: '#e74c3c',
  host: '#f39c12',
}

export default function Profile() {
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  const [profilePic, setProfilePic] = useState(null)
  const [showChangePwd, setShowChangePwd] = useState(false)
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwdMsg, setPwdMsg] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [deco, setDeco] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem('profile_pic_' + user?.id)
    if (saved) setProfilePic(saved)
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    api.getAdminDecorations(user.id).then((d) => setDeco(d)).catch(() => setDeco(null))
  }, [user?.id])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      setProfilePic(dataUrl)
      localStorage.setItem('profile_pic_' + user?.id, dataUrl)
    }
    reader.readAsDataURL(file)
  }

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

  if (!user) return null

  const color = roleColors[user.role] || '#8b5cf6'

  return (
    <div className="page-container">
      <div className="profile-card">
        <div className="profile-cover" style={{ background: `linear-gradient(135deg, ${color}22, ${color}44)` }} />
        <div className="profile-body">
          <div className="profile-avatar-section">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="profile-avatar-wrapper" onClick={() => fileInputRef.current?.click()} style={{ width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {profilePic ? (
                  <img src={profilePic} alt="Profile" className="profile-avatar-img" style={{ width: 62, height: 62 }} />
                ) : (
                  <div className="profile-avatar-letter" style={{ background: color, width: 62, height: 62, fontSize: 26 }}>
                    {user.name?.charAt(0)?.toUpperCase() || 'A'}
                  </div>
                )}
                {deco?.frameUrl && <img src={resolveAssetUrl(deco.frameUrl)} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} style={{ position: 'absolute', inset: 0, width: 100, height: 100, objectFit: 'contain', pointerEvents: 'none' }} />}
                <div className="profile-avatar-overlay">
                  <span>📷</span>
                </div>
              </div>
              {deco?.badgeUrl && (
                <img src={resolveAssetUrl(deco.badgeUrl)} alt="" title={deco.badge || 'Badge'} onError={(e) => { e.currentTarget.style.display = 'none' }} style={{ marginTop: 4, height: 22, objectFit: 'contain' }} />
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
            <div className="profile-name-section" style={{ minWidth: 0, flex: 1 }}>
              <h2 style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{user.name || 'Admin'}</h2>
              <span className="role-badge" style={{ background: color, fontSize: 12, padding: '4px 12px' }}>
                {roleLabels[user.role] || user.role}
              </span>
            </div>
          </div>

          <div className="profile-details-grid">
            <div className="profile-detail-item">
              <div className="profile-detail-label">Admin ID</div>
              <div className="profile-detail-value">{user.id}</div>
            </div>
            <div className="profile-detail-item">
              <div className="profile-detail-label">Email Address</div>
              <div className="profile-detail-value">{user.email}</div>
            </div>
            {user.country && (
              <div className="profile-detail-item">
                <div className="profile-detail-label">Country</div>
                <div className="profile-detail-value">{user.country}</div>
              </div>
            )}
            <div className="profile-detail-item">
              <div className="profile-detail-label">Role</div>
              <div className="profile-detail-value">{roleLabels[user.role] || user.role}</div>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button className="btn btn-outline" onClick={() => setShowChangePwd(true)}>Change Password</button>
          </div>
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
    </div>
  )
}
