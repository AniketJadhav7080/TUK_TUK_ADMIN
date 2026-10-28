import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { hasPermission, PERMISSIONS } from '../permissions'
import Modal from '../components/Modal'
import Loading from '../components/Loading'
import { ErrorState } from '../components/SkeletonLoader'
import { api } from '../services/api'

function formatDate(v) {
  if (!v) return '-'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString()
}

export default function UserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: admin } = useAuth()
  const { addToast } = useToast()
  const [user, setUser] = useState(null)
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [banModal, setBanModal] = useState(false)
  const [banReason, setBanReason] = useState('')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})

  const isBanned = user?.banned === true || user?.status === 'banned'

  const canBan = hasPermission(admin, PERMISSIONS.BAN_USERS)
  const canEdit = hasPermission(admin, PERMISSIONS.EDIT_USERS)
  const canVerifyVip = hasPermission(admin, PERMISSIONS.VERIFY_VIP)

  const fetchUser = async () => {
    setLoading(true)
    setDevices([])
    try {
      const data = await api.getUser(id)
      if (data) {
        setUser(data)
        setError('')
      } else {
        setError('User not found')
      }
    } catch (err) {
      setError(err?.message || 'Failed to load user details')
    } finally {
      setLoading(false)
    }
    // Devices load independently — user page still renders if this fails
    try {
      const devs = await api.getUserDevices(id)
      const list = Array.isArray(devs) ? devs : (devs?.content || devs?.devices || devs?.data || [])
      setDevices(list)
    } catch { /* devices are optional */ }
  }

  useEffect(() => { fetchUser() }, [id])

  const handleBan = async () => {
    const banning = !isBanned
    try {
      await api.updateUserStatus(id, {
        status: banning ? 'banned' : 'active',
        banReason: banning ? (banReason.trim() || undefined) : undefined,
      })
      setUser((prev) => ({ ...prev, banned: banning, status: banning ? 'banned' : 'active' }))
      setBanModal(false)
      setBanReason('')
      addToast(banning ? 'User banned' : 'User unbanned', 'success')
    } catch (err) {
      addToast(err?.message || 'Failed to update user status', 'error')
    }
  }

  const handleSaveEdit = async () => {
    try {
      const payload = { name: editForm.name, email: editForm.email, phoneNumber: editForm.phoneNumber, countryCode: editForm.countryCode, countryName: editForm.countryName, gender: editForm.gender, age: editForm.age }
      await api.updateUser(id, payload)
      // Re-read so the page reflects what the backend actually stored.
      const fresh = await api.getUser(id).catch(() => null)
      if (fresh) setUser(fresh)
      else setUser((prev) => ({ ...prev, ...payload }))
      setEditing(false)
      addToast('User updated successfully', 'success')
    } catch (err) {
      addToast(err?.message || 'Failed to update user', 'error')
    }
  }

  const toggleVip = async () => {
    try {
      await api.updateUserVip(id, { vip: !user.vip })
      setUser((prev) => ({ ...prev, vip: !prev.vip }))
      addToast(user.vip ? 'VIP removed' : 'VIP granted', 'success')
    } catch (err) {
      addToast(err?.message || 'Failed to update VIP status', 'error')
    }
  }

  const openEdit = () => {
    setEditForm({
      name: user.name, email: user.email, phoneNumber: user.phoneNumber || user.phone || '',
      gender: user.gender || '', age: user.age || '',
      countryCode: user.countryCode || '', countryName: user.countryName || user.country || '',
    })
    setEditing(true)
  }

  if (loading) return <Loading />
  if (error) return <div style={{ padding: 24 }}><ErrorState message={error} onRetry={fetchUser} /></div>
  if (!user) return <div style={{ padding: 24 }}><ErrorState message="User not found" onRetry={fetchUser} /></div>

  return (
    <div>
      <button className="btn btn-outline" onClick={() => navigate('/users')} style={{ marginBottom: 16 }}>← Back to Users</button>

      <div className="card">
        <div className="card-header">
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
              {(user.name || user.email || 'U').charAt(0).toUpperCase()}
            </span>
            {user.name || 'Unnamed user'}
            <span className={`badge ${isBanned ? 'banned' : user.status}`} style={{ marginLeft: 8 }}>{isBanned ? 'banned' : user.status}</span>
            {user.vip && <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>VIP</span>}
          </span>
        </div>
        <div className="card-body">
          <div className="detail-grid">
            <div className="detail-item">
              <div className="detail-label">Email</div>
              <div className="detail-value">{user.email}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Phone</div>
              <div className="detail-value">{user.phoneNumber || user.phone || '-'}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Gender</div>
              <div className="detail-value">{user.gender || '-'}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Age</div>
              <div className="detail-value">{user.age || '-'}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Country</div>
              <div className="detail-value">{user.countryName || user.country || '-'}{user.countryCode ? ` (${user.countryCode})` : ''}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Joined</div>
              <div className="detail-value">{formatDate(user.joined || user.createdAt)}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Last Active</div>
              <div className="detail-value">{formatDate(user.lastActive || user.lastActiveAt)}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Active Rooms</div>
              <div className="detail-value">{user.rooms ?? user.roomsJoinTillNow ?? user.activeRooms ?? 0}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Reports</div>
              <div className="detail-value">{user.reports ?? user.reportsCount ?? 0}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Total Messages</div>
              <div className="detail-value">{user.totalMessages?.toLocaleString() || '-'}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Voice Minutes</div>
              <div className="detail-value">{user.totalVoiceMinutes || 0} min</div>
            </div>
          </div>

          <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <h4 style={{ marginBottom: 12, fontWeight: 600 }}>Device & IP Tracking</h4>
            {devices.length === 0 ? (
              <p style={{ color: 'var(--text-light)', fontSize: 13 }}>No devices found</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Device</th>
                      <th>OS</th>
                      <th>IP</th>
                      <th>Last Login</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map((d) => (
                      <tr key={d.deviceId || d.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{d.deviceModel || '-'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-light)', fontFamily: 'monospace' }}>{d.deviceId || d.id || '-'}</div>
                        </td>
                        <td style={{ fontSize: 13 }}>{d.osType ? `${d.osType} ${d.osVersion || ''}` : '-'}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.ipAddress || '-'}</td>
                        <td style={{ fontSize: 12 }}>{d.lastLoginAt ? new Date(d.lastLoginAt).toLocaleString() : '-'}</td>
                        <td><span className={`badge ${d.blocked ? 'banned' : 'active'}`}>{d.blocked ? 'Blocked' : 'Active'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
            {canEdit && <button className="btn btn-primary" onClick={openEdit}>Edit Profile</button>}
            {canVerifyVip && (
              <button className={`btn ${user.vip ? 'btn-warning' : 'btn-success'}`} onClick={toggleVip}>
                {user.vip ? 'Remove VIP' : 'Mark as VIP'}
              </button>
            )}
            {canBan && (
              <button className={`btn ${isBanned ? 'btn-success' : 'btn-danger'}`} onClick={() => { setBanReason(''); setBanModal(true) }}>
                {isBanned ? 'Unban User' : 'Ban User'}
              </button>
            )}
          </div>
        </div>
      </div>

      {banModal && (
        <Modal title={isBanned ? 'Unban User' : 'Ban User'} onClose={() => setBanModal(false)}>
          <p>Are you sure you want to {isBanned ? 'unban' : 'ban'} <strong>{user.name}</strong>?</p>
          {!isBanned && (
            <div className="form-group" style={{ marginTop: 12 }}>
              <label>Ban Reason (optional)</label>
              <input value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="e.g. spam, abuse..." />
            </div>
          )}
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setBanModal(false)}>Cancel</button>
            <button className={`btn ${isBanned ? 'btn-success' : 'btn-danger'}`} onClick={handleBan}>
              {isBanned ? 'Unban' : 'Ban'}
            </button>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal title={`Edit: ${user.name}`} onClose={() => setEditing(false)}>
          <div className="form-group">
            <label>Name</label>
            <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input value={editForm.phoneNumber} onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })} placeholder="+919876543210" />
          </div>
          <div className="form-group">
            <label>Gender</label>
            <select value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Age</label>
            <input type="number" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Country Code</label>
            <input value={editForm.countryCode} onChange={(e) => setEditForm({ ...editForm, countryCode: e.target.value })} placeholder="IN" />
          </div>
          <div className="form-group">
            <label>Country Name</label>
            <input value={editForm.countryName} onChange={(e) => setEditForm({ ...editForm, countryName: e.target.value })} placeholder="India" />
          </div>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveEdit}>Save Changes</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
