import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../permissions'
import Modal from '../components/Modal'

const roleColors = { moderator: '#0a7ea4', support: '#27ae60', super_admin: '#8b5cf6' }

export default function OfficialModerators() {
  const { allAdmins, addAdmin, removeAdmin } = useAuth()
  const moderators = allAdmins.filter((a) => a.role === ROLES.MODERATOR)
  const [showModal, setShowModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(null)
  const [form, setForm] = useState({ name: '', email: '' })

  const handleAdd = (e) => {
    e.preventDefault()
    addAdmin({ ...form, role: ROLES.MODERATOR })
    setForm({ name: '', email: '' })
    setShowModal(false)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Moderators</h2>
          <p className="page-subtitle">Manage moderator accounts and permissions</p>
        </div>
        <button className="btn btn-premium" onClick={() => setShowModal(true)}>+ Add Moderator</button>
      </div>

      <div className="card card-premium">
        <div className="card-header">
          <span>All Moderators</span>
          <span className="badge badge-count">{moderators.length}</span>
        </div>
        <div className="card-body">
          {moderators.length === 0 ? (
            <div className="empty-state">No moderator accounts yet</div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Permissions</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {moderators.map((a) => (
                    <tr key={a.id}>
                      <td className="cell-user">
                        <span className="avatar" style={{ background: roleColors.moderator }}>{a.name.charAt(0)}</span>
                        {a.name}
                      </td>
                      <td>{a.email}</td>
                      <td><span className="role-badge" style={{ background: roleColors.moderator }}>Moderator</span></td>
                      <td className="cell-perms">Users, Rooms, Reports, Notifications</td>
                      <td>
                        <button className="btn btn-danger-outline btn-sm" onClick={() => setDeleteModal(a)}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <Modal title="Add Moderator" onClose={() => setShowModal(false)}>
          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-premium">Add Moderator</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteModal && (
        <Modal title="Remove Moderator" onClose={() => setDeleteModal(null)}>
          <p>Are you sure you want to remove <strong>{deleteModal.name}</strong>?</p>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setDeleteModal(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={() => { removeAdmin(deleteModal.id); setDeleteModal(null) }}>Remove</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
