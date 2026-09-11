import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ROLES } from '../permissions'
import { ASIAN_COUNTRIES, ARABIC_COUNTRIES } from '../data/countries'
import Modal from '../components/Modal'
import { api } from '../services/api'
import { LoadingState, ErrorState } from '../components/SkeletonLoader'

const roleColors = {
  owner: '#ff6b35',
  super_admin: '#8b5cf6',
  moderator: '#0a7ea4',
  support: '#27ae60',
  country_handler: '#e67e22',
  diamond_stock: '#1abc9c',
  diamond_stock_manager: '#1abc9c',
  agency: '#e74c3c',
  host: '#f39c12',
}

const roleLabels = {
  owner: 'Owner',
  super_admin: 'Super Admin',
  moderator: 'Moderator',
  support: 'Support Staff',
  country_handler: 'Country Handler',
  diamond_stock: 'Diamond Stock',
  diamond_stock_manager: 'Diamond Stock',
  agency: 'Agency',
  host: 'Host',
}

const assignableRoles = [ROLES.SUPER_ADMIN, ROLES.MODERATOR, ROLES.SUPPORT, ROLES.COUNTRY_HANDLER, ROLES.DIAMOND_STOCK, ROLES.AGENCY, ROLES.HOST]

function getDisplayName(admin) {
  const n = admin?.name || ''
  const roleValues = Object.values(roleLabels).map((l) => l.toLowerCase())
  const isRoleName = roleValues.includes(n.toLowerCase()) || n.toLowerCase().startsWith('platform')
  if (!n || isRoleName) {
    return admin?.email || 'Admin'
  }
  return n
}

export default function Admins() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const isOwner = user?.role === ROLES.OWNER
  const [showModal, setShowModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: ROLES.SUPER_ADMIN, country: '' })
  const [formErrors, setFormErrors] = useState({})
  const [admins, setAdmins] = useState([])
  const [decoMap, setDecoMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      let list = []
      try {
        const data = await api.getAdmins()
        list = Array.isArray(data) ? data : data.admins || data.content || []
        if (!cancelled) setAdmins(list)
      } catch {
        try {
          const data = await api.listAdmins()
          list = Array.isArray(data) ? data : data.admins || []
          if (!cancelled) setAdmins(list)
        } catch (err) {
          if (!cancelled) setError(err.message)
        }
      }
      try {
        const entries = await Promise.all((list || []).map(async (a) => {
          try {
            const d = await api.getAdminDecorations(a.id)
            if (d?.badgeUrl || d?.frameUrl || d?.badge || d?.frame) return [a.id, d]
          } catch {}
          return null
        }))
        if (!cancelled) {
          const map = {}
          entries.forEach((e) => { if (e) map[e[0]] = e[1] })
          setDecoMap(map)
        }
      } catch {}
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const validate = () => {
    const errors = {}
    if (!form.name.trim()) errors.name = 'Name is required'
    if (!form.email.trim()) errors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errors.email = 'Invalid email format'
    if (!form.password) errors.password = 'Password is required'
    else if (form.password.length < 6) errors.password = 'Min 6 characters'
    if (!form.country) errors.country = 'Country is required'
    if (form.role === ROLES.SUPER_ADMIN) {
      const existing = admins.find((a) => a.role === ROLES.SUPER_ADMIN && a.country === form.country)
      if (existing) errors.country = `Super Admin already exists for ${form.country}`
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!validate()) return
    try {
      await api.createAdmin({ ...form })
      await reloadAdmins()
      setForm({ name: '', email: '', password: '', role: ROLES.SUPER_ADMIN, country: '' })
      setFormErrors({})
      setShowModal(false)
      addToast('Admin created successfully', 'success')
    } catch {
      try {
        await api.addAdmin({ ...form })
        await reloadAdmins()
        setForm({ name: '', email: '', password: '', role: ROLES.SUPER_ADMIN, country: '' })
        setFormErrors({})
        setShowModal(false)
        addToast('Admin created successfully', 'success')
      } catch {
        addToast('Failed to create admin', 'error')
      }
    }
  }

  const reloadAdmins = async () => {
    try {
      const data = await api.getAdmins()
      setAdmins(Array.isArray(data) ? data : data.admins || data.content || [])
    } catch {
      try {
        const data = await api.listAdmins()
        setAdmins(Array.isArray(data) ? data : data.admins || [])
      } catch {}
    }
  }

  const handleDelete = async () => {
    if (!deleteModal) return
    try {
      await api.removeAdmin(deleteModal.id)
      await reloadAdmins()
      setDeleteModal(null)
      addToast('Admin removed successfully', 'success')
    } catch {
      addToast('Failed to remove admin', 'error')
      setDeleteModal(null)
    }
  }

  if (loading) return <div className="page-container"><LoadingState /></div>
  if (error && admins.length === 0) return <div className="page-container"><ErrorState message={error} onRetry={() => window.location.reload()} /></div>

  const displayAdmins = admins.filter((a) => isOwner || a.role !== ROLES.OWNER)

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">Administrators</h2>
          <p className="page-subtitle">{isOwner ? 'Full control over all admin accounts and roles' : 'Manage moderator and support staff accounts'}</p>
        </div>
        {isOwner && <button className="btn btn-premium" onClick={() => setShowModal(true)}>+ Add Admin</button>}
      </div>

      <div className="card card-premium">
        <div className="card-header">
          <span>All Administrators</span>
          <span className="badge badge-count">{displayAdmins.length}</span>
        </div>
        <div className="card-body">
          <div className="table-wrapper">
            <table>
              <thead>
                  <tr>
                    <th>Admin ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Badge / Frame</th>
                    <th>Country</th>
                    <th>Permissions</th>
                    <th>Actions</th>
                  </tr>
              </thead>
              <tbody>
                {displayAdmins.map((a) => (
                  <tr key={a.id}>
                    <td>{a.adminId}</td>
                    <td className="cell-user">
                      <span className="avatar" style={{ background: roleColors[a.role] || '#6b7280' }}>{getDisplayName(a).charAt(0).toUpperCase()}</span>
                      {getDisplayName(a)}
                    </td>
                    <td>{a.email}</td>
                    <td><span className="role-badge" style={{ background: roleColors[a.role] || '#6b7280' }}>{roleLabels[a.role] || a.role}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {decoMap[a.id]?.badgeUrl ? <img src={decoMap[a.id].badgeUrl} alt={decoMap[a.id].badge || 'badge'} title={decoMap[a.id].badge || 'Badge'} style={{ width: 28, height: 28, objectFit: 'contain' }} /> : (decoMap[a.id]?.badge || '')}
                        {decoMap[a.id]?.frameUrl ? <img src={decoMap[a.id].frameUrl} alt={decoMap[a.id].frame || 'frame'} title={decoMap[a.id].frame || 'Frame'} style={{ width: 28, height: 28, objectFit: 'contain' }} /> : (decoMap[a.id]?.frame || '')}
                        {!decoMap[a.id] && <span style={{ color: 'var(--text-light)' }}>—</span>}
                      </div>
                    </td>
                    <td>{a.country || '-'}</td>
                    <td className="cell-perms">
                      {a.role === ROLES.OWNER ? 'All permissions (owner)' : a.role === ROLES.SUPER_ADMIN ? 'All permissions except owner-only' : a.role === ROLES.MODERATOR ? 'Users, Rooms, Reports, Notifications' : a.role === ROLES.SUPPORT ? 'View users, reports, notifications' : 'Role-specific permissions'}
                    </td>
                    <td>
                      {(isOwner && a.role !== ROLES.OWNER) && (
                        <div className="actions">
                          <button className="btn btn-danger-outline btn-sm" onClick={() => setDeleteModal(a)}>Remove</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <Modal title="Add New Admin" onClose={() => { setFormErrors({}); setShowModal(false) }}>
          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label>Name</label>
              <input className={formErrors.name ? 'input-error' : ''} value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setFormErrors({ ...formErrors, name: '' }) }} required />
              {formErrors.name && <div className="field-error">{formErrors.name}</div>}
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" className={formErrors.email ? 'input-error' : ''} value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setFormErrors({ ...formErrors, email: '' }) }} required />
              {formErrors.email && <div className="field-error">{formErrors.email}</div>}
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" className={formErrors.password ? 'input-error' : ''} value={form.password} onChange={(e) => { setForm({ ...form, password: e.target.value }); setFormErrors({ ...formErrors, password: '' }) }} required placeholder="Set login password" />
              {formErrors.password && <div className="field-error">{formErrors.password}</div>}
            </div>
            <div className="form-group">
              <label>Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, country: '' })} className="input-select">
                {assignableRoles.map((r) => (
                  <option key={r} value={r}>{roleLabels[r] || r}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Country</label>
              <select className={`input-select ${formErrors.country ? 'input-error' : ''}`} value={form.country} onChange={(e) => { setForm({ ...form, country: e.target.value }); setFormErrors({ ...formErrors, country: '' }) }} required>
                <option value="">-- Select Country --</option>
                <optgroup label="Asian Countries">
                  {ASIAN_COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </optgroup>
                <optgroup label="Arabic Countries">
                  {ARABIC_COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </optgroup>
              </select>
              {formErrors.country && <div className="field-error">{formErrors.country}</div>}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => { setFormErrors({}); setShowModal(false) }}>Cancel</button>
              <button type="submit" className="btn btn-premium">Add Admin</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteModal && (
        <Modal title="Remove Admin" onClose={() => setDeleteModal(null)}>
          <p>Are you sure you want to remove <strong>{deleteModal.name}</strong>?</p>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setDeleteModal(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete}>Remove</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
