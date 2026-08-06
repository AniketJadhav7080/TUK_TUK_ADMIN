import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../permissions'
import Modal from '../components/Modal'

const roleColors = { moderator: '#0a7ea4', support: '#27ae60', super_admin: '#8b5cf6' }

export default function OfficialSupport() {
  const { allAdmins, addAdmin, removeAdmin } = useAuth()
  const staff = allAdmins.filter((a) => a.role === ROLES.SUPPORT)
  const [showModal, setShowModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(null)
  const [form, setForm] = useState({ name: '', email: '' })

  const handleAdd = (e) => {
    e.preventDefault()
    addAdmin({ ...form, role: ROLES.SUPPORT })
    setForm({ name: '', email: '' })
    setShowModal(false)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Support Staff</h2>
          <p className="page-subtitle">Manage support team accounts and permissions</p>
        </div>
        <button className="btn btn-premium" onClick={() => setShowModal(true)}>+ Add Support Staff</button>
      </div>

      <div className="card card-premium">
        <div className="card-header">
          <span>All Support Staff</span>
          <span className="badge badge-count">{staff.length}</span>
        </div>
        <div className="card-body">
          {staff.length === 0 ? (
            <div className="empty-state">No support staff accounts yet</div>
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
                  {staff.map((a) => (
                    <tr key={a.id}>
                      <td className="cell-user">
                        <span className="avatar" style={{ background: roleColors.support }}>{a.name.charAt(0)}</span>
                        {a.name}
                      </td>
                      <td>{a.email}</td>
                      <td><span className="role-badge" style={{ background: roleColors.support }}>Support Staff</span></td>
                      <td className="cell-perms">View users, reports, notifications</td>
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
        <Modal title="Add Support Staff" onClose={() => setShowModal(false)}>
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
              <button type="submit" className="btn btn-premium">Add Support Staff</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteModal && (
        <Modal title="Remove Support Staff" onClose={() => setDeleteModal(null)}>
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
