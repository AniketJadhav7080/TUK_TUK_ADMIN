import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { hasPermission, PERMISSIONS } from '../permissions'
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
      } catch {
        setError('Failed to load users from server')
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const canBan = hasPermission(user, PERMISSIONS.BAN_USERS)
  const canEdit = hasPermission(user, PERMISSIONS.EDIT_USERS)
  const canVerifyVip = hasPermission(user, PERMISSIONS.VERIFY_VIP)

  const handleBan = async (u) => {
    try {
      await api.updateUserStatus(u.id, { status: u.status === 'banned' ? 'active' : 'banned' })
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, status: x.status === 'banned' ? 'active' : 'banned' } : x))
      setBanModal(null)
      addToast(u.status === 'banned' ? 'User unbanned' : 'User banned', 'success')
    } catch {
      addToast('Failed to update user status', 'error')
      setBanModal(null)
    }
  }

  const handleEdit = async () => {
    try {
      await api.updateUser(editModal.id, editForm)
      setUsers((prev) => prev.map((x) => x.id === editModal.id ? { ...x, ...editForm } : x))
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

  const openEdit = (u) => {
    setEditForm({ name: u.name, email: u.email, phone: u.phone || '', country: u.country || '' })
    setEditModal(u)
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
          <button className={`btn btn-sm ${u.status === 'banned' ? 'btn-success' : 'btn-warning'}`} onClick={() => setBanModal(u)}>
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
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setBanModal(null)}>Cancel</button>
            <button className={`btn ${banModal.status === 'banned' ? 'btn-success' : 'btn-danger'}`} onClick={() => handleBan(banModal)}>
              {banModal.status === 'banned' ? 'Unban' : 'Ban'}
            </button>
          </div>
        </Modal>
      )}

      {editModal && (
        <Modal title={`Edit User: ${editModal.name}`} onClose={() => setEditModal(null)}>
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
            <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Country</label>
            <input value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} />
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
