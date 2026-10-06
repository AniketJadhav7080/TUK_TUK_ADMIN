import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { hasPermission, PERMISSIONS, ROLES } from '../permissions'
import Modal from '../components/Modal'
import DataTable from '../components/DataTable'
import { ErrorState, LoadingState } from '../components/SkeletonLoader'
import { api } from '../services/api'

export default function Users() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [banModal, setBanModal] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [editForm, setEditForm] = useState({})

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true)
      try {
        const allUsers = []
        const firstPage = await api.getUsers('?page=0&size=1000')

        if (Array.isArray(firstPage)) {
          setUsers(firstPage)
        } else if (firstPage?.content) {
          allUsers.push(...firstPage.content)
          const totalPages = firstPage.totalPages || 1
          for (let p = 1; p < totalPages; p++) {
            const page = await api.getUsers(`?page=${p}&size=1000`)
            if (page?.content) allUsers.push(...page.content)
          }
          setUsers(allUsers)
        } else if (firstPage?.users) setUsers(firstPage.users)
        else if (firstPage?.data) setUsers(firstPage.data)
      } catch (err) {
        console.error('getUsers failed:', err)
        setError(`Failed to load users from server: ${err.message || err}`)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const canBan = hasPermission(user, PERMISSIONS.BAN_USERS)
  const canEdit = hasPermission(user, PERMISSIONS.EDIT_USERS)
  const canVerifyVip = hasPermission(user, PERMISSIONS.VERIFY_VIP)

  const [banReason, setBanReason] = useState('')
  const openBan = (u) => {
    setBanReason('')
    setBanModal(u)
  }

  const handleBan = async (u) => {
    const banning = u.status !== 'banned'
    try {
      await api.updateUserStatus(u.id, { status: banning ? 'banned' : 'active', banReason: banning ? (banReason.trim() || undefined) : undefined })
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, status: banning ? 'banned' : 'active' } : x))
      setBanModal(null)
      addToast(banning ? 'User banned' : 'User unbanned', 'success')
    } catch {
      addToast('Failed to update user status', 'error')
      setBanModal(null)
    }
  }

  const handleEdit = async () => {
    try {
      const payload = { name: editForm.name, email: editForm.email, phoneNumber: editForm.phoneNumber, countryCode: editForm.countryCode, countryName: editForm.countryName }
      if (editForm.avatarFile) payload.avatarFile = editForm.avatarFile
      else if (editForm.avatar) payload.avatar = editForm.avatar
      if (isOwner && editForm.official && officialRoles.some((r) => r.value === editForm.official)) payload.official = editForm.official
      await api.updateUser(editModal.id, payload)
      const localPayload = { ...payload }
      delete localPayload.avatarFile
      delete localPayload.official
      if (editForm.avatar) localPayload.avatar = editForm.avatar
      setUsers((prev) => prev.map((x) => x.id === editModal.id ? { ...x, ...localPayload } : x))
      setEditModal(null)
      addToast('User updated successfully', 'success')
    } catch {
      addToast('Failed to update user', 'error')
      setEditModal(null)
    }
  }

  const toggleVip = async (u) => {
    try {
      await api.updateUserVip(u.id, { vip: !u.vip })
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, vip: !x.vip } : x))
      addToast(u.vip ? 'VIP removed' : 'VIP granted', 'success')
    } catch {
      addToast('Failed to update VIP status', 'error')
    }
  }

  const isOwner = user?.role === ROLES.OWNER
  const officialRoles = [
    { value: ROLES.SUPER_ADMIN, label: 'Super Admin' },
    { value: ROLES.MODERATOR, label: 'Moderator' },
    { value: ROLES.SUPPORT, label: 'Support' },
    { value: ROLES.DIAMOND_STOCK, label: 'Diamond Stock Manager' },
    { value: ROLES.AGENCY, label: 'Agency' },
    { value: ROLES.HOST, label: 'Host' },
  ]

  const openEdit = (u) => {
    setEditForm({
      name: u.name || '',
      uid: String(u.id || u.uid || ''),
      avatar: u.avatar || u.profilePic || u.photo || '',
      email: u.email || '',
      phoneNumber: u.phoneNumber || u.phone || '',
      countryCode: u.countryCode || '',
      countryName: u.countryName || u.country || '',
      // Never prefill: app roles (ROLE_USER etc.) are not valid official roles.
      // Blank = skipped, backend keeps existing value.
      official: '',
    })
    setEditModal(u)
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setEditForm((prev) => ({ ...prev, avatar: ev.target.result, avatarFile: file }))
    reader.readAsDataURL(file)
  }

  const filtered = users.filter((u) =>
    String(u.id).includes(search) ||
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    { key: 'id', label: 'ID', render: (u) => <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-light)' }}>{u.id}</span> },
    { key: 'name', label: 'Name', render: (u) => <Link to={`/users/${u.id}`} style={{ color: 'var(--primary)', fontWeight: 500 }}>{u.name}</Link> },
    { key: 'email', label: 'Email', sortable: false },
    { key: 'status', label: 'Status', render: (u) => <span className={`badge ${u.status}`}>{u.status}</span> },
    { key: 'vip', label: 'VIP', render: (u) => u.vip ? <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>VIP</span> : '-' },
    { key: 'device', label: 'Device', render: (u) => <span style={{ fontSize: 13 }}>{u.device || '-'}</span> },
    { key: 'ip', label: 'IP', render: (u) => <span style={{ fontSize: 13, fontFamily: 'monospace' }}>{u.ip || '-'}</span> },
    { key: 'country', label: 'Country' },
    { key: 'rooms', label: 'Rooms' },
    { key: 'reports', label: 'Reports' },
    { key: 'actions', label: 'Actions', sortable: false, render: (u) => (
      <div className="actions">
        <Link to={`/users/${u.id}`} className="btn btn-primary btn-sm">View</Link>
        {canEdit && <button className="btn btn-outline btn-sm" onClick={() => openEdit(u)}>Edit</button>}
        {canVerifyVip && (
          <button className={`btn btn-sm ${u.vip ? 'btn-warning' : 'btn-success'}`} onClick={() => toggleVip(u)}>
            {u.vip ? 'Un-VIP' : 'VIP'}
          </button>
        )}
        {canBan && (
          <button className={`btn btn-sm ${u.status === 'banned' ? 'btn-success' : 'btn-warning'}`} onClick={() => openBan(u)}>
            {u.status === 'banned' ? 'Unban' : 'Ban'}
          </button>
        )}
      </div>
    )},
  ]

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />

  return (
    <div>
      <div className="card">
        <div className="card-header">All Users ({users.length})</div>
        <div className="card-body">
          <div className="search-bar">
            <input placeholder="Search by name, email, or ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <DataTable columns={columns} data={filtered} emptyMessage="No users found matching your search" />
        </div>
      </div>

      {banModal && (
        <Modal title={banModal.status === 'banned' ? 'Unban User' : 'Ban User'} onClose={() => setBanModal(null)}>
          <p>Are you sure you want to {banModal.status === 'banned' ? 'unban' : 'ban'} <strong>{banModal.name}</strong>?</p>
          {banModal.status !== 'banned' && (
            <div className="form-group" style={{ marginTop: 12 }}>
              <label>Ban Reason (optional)</label>
              <input value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="e.g. spam, abuse..." />
            </div>
          )}
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setBanModal(null)}>Cancel</button>
            <button className={`btn ${banModal.status === 'banned' ? 'btn-success' : 'btn-danger'}`} onClick={() => handleBan(banModal)}>
              {banModal.status === 'banned' ? 'Unban' : 'Ban'}
            </button>
          </div>
        </Modal>
      )}

      {editModal && (
        <Modal wide title={`Edit User: ${editModal.name}`} onClose={() => setEditModal(null)}>
          <div style={{ display: 'grid', gap: 14 }}>
            {/* Profile DP */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Profile DP</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid var(--border)' }}>
                  {editForm.avatar ? <img src={editForm.avatar} alt="DP" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>{(editForm.name || 'U').charAt(0).toUpperCase()}</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ fontSize: 13 }} />
                  <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>Upload profile picture</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Name</label>
                <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Full name" style={{ wordBreak: 'break-word' }} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>UID</label>
                <input value={editForm.uid} disabled style={{ background: 'var(--bg)', color: 'var(--text-light)', cursor: 'not-allowed' }} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Mail ID</label>
              <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="user@email.com" style={{ wordBreak: 'break-all' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Phone</label>
                <input value={editForm.phoneNumber} onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })} placeholder="+919876543210" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Country Code</label>
                <input value={editForm.countryCode} onChange={(e) => setEditForm({ ...editForm, countryCode: e.target.value })} placeholder="IN" />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Country Name</label>
              <input value={editForm.countryName} onChange={(e) => setEditForm({ ...editForm, countryName: e.target.value })} placeholder="India" />
            </div>

            {isOwner && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Official (Role)</label>
                <select value={editForm.official} onChange={(e) => setEditForm({ ...editForm, official: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 14, background: 'rgba(255,255,255,0.9)', outline: 'none' }}>
                  <option value="">Select role</option>
                  {officialRoles.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>Only owner can change official role</div>
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setEditModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleEdit}>Save</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
