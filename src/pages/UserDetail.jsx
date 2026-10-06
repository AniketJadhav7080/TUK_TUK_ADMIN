import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { hasPermission, PERMISSIONS } from '../permissions'
import Modal from '../components/Modal'
import Loading from '../components/Loading'
import { api } from '../services/api'

export default function UserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: admin } = useAuth()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [banModal, setBanModal] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})

  const canBan = hasPermission(admin, PERMISSIONS.BAN_USERS)
  const canEdit = hasPermission(admin, PERMISSIONS.EDIT_USERS)
  const canVerifyVip = hasPermission(admin, PERMISSIONS.VERIFY_VIP)

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true)
      try {
        const data = await api.getUser(id)
        if (data) setUser(data)
        setError('')
      } catch (err) {
        setError('Failed to load user details')
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [id])

  const handleBan = async () => {
    try {
      await api.updateUserStatus(id, { status: user.status === 'banned' ? 'active' : 'banned' })
      setUser((prev) => ({ ...prev, status: prev.status === 'banned' ? 'active' : 'banned' }))
      setBanModal(false)
    } catch { setBanModal(false) }
  }

  const handleSaveEdit = async () => {
    try {
      const payload = { name: editForm.name, email: editForm.email, phoneNumber: editForm.phoneNumber, countryCode: editForm.countryCode, countryName: editForm.countryName, gender: editForm.gender, age: editForm.age }
      await api.updateUser(id, payload)
      setUser((prev) => ({ ...prev, ...payload }))
      setEditing(false)
    } catch { setEditing(false) }
  }

  const toggleVip = async () => {
    try {
      await api.updateUserVip(id, { vip: !user.vip })
      setUser((prev) => ({ ...prev, vip: !prev.vip }))
    } catch {}
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
  if (error) return <div className="error-message">{error}</div>
  if (!user) return <div className="loading">User not found</div>

  return (
    <div>
      <button className="btn btn-outline" onClick={() => navigate('/users')} style={{ marginBottom: 16 }}>← Back to Users</button>

      <div className="card">
        <div className="card-header">
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
              {user.name.charAt(0)}
            </span>
            {user.name}
            <span className={`badge ${user.status}`} style={{ marginLeft: 8 }}>{user.status}</span>
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
              <div className="detail-value">{user.joined}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Last Active</div>
              <div className="detail-value">{user.lastActive || '-'}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Active Rooms</div>
              <div className="detail-value">{user.rooms}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Reports</div>
              <div className="detail-value">{user.reports}</div>
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
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-label">Current Device</div>
                <div className="detail-value">{user.device || '-'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Operating System</div>
                <div className="detail-value">{user.os || '-'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Current IP</div>
                <div className="detail-value" style={{ fontFamily: 'monospace' }}>{user.ip || '-'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Last Known IP</div>
                <div className="detail-value" style={{ fontFamily: 'monospace' }}>{user.lastIp || '-'}</div>
              </div>
            </div>

            {user.deviceHistory && user.deviceHistory.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-light)' }}>Device Login History</div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Device</th>
                        <th>IP Address</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {user.deviceHistory.map((d, i) => (
                        <tr key={i}>
                          <td>{d.device}</td>
                          <td style={{ fontFamily: 'monospace' }}>{d.ip}</td>
                          <td>{d.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
              <button className={`btn ${user.status === 'banned' ? 'btn-success' : 'btn-danger'}`} onClick={() => setBanModal(true)}>
                {user.status === 'banned' ? 'Unban User' : 'Ban User'}
              </button>
            )}
          </div>
        </div>
      </div>

      {banModal && (
        <Modal title={user.status === 'banned' ? 'Unban User' : 'Ban User'} onClose={() => setBanModal(false)}>
          <p>Are you sure you want to {user.status === 'banned' ? 'unban' : 'ban'} <strong>{user.name}</strong>?</p>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setBanModal(false)}>Cancel</button>
            <button className={`btn ${user.status === 'banned' ? 'btn-success' : 'btn-danger'}`} onClick={handleBan}>
              {user.status === 'banned' ? 'Unban' : 'Ban'}
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
