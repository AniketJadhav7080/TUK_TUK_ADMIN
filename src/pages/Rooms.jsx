import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { hasPermission, PERMISSIONS } from '../permissions'
import Modal from '../components/Modal'
import Loading from '../components/Loading'
import { api } from '../services/api'

export default function Rooms() {
  const { user } = useAuth()
  const [rooms, setRooms] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [closeModal, setCloseModal] = useState(null)
  const [deactivateModal, setDeactivateModal] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [hostChangeModal, setHostChangeModal] = useState(null)
  const [newHostId, setNewHostId] = useState('')
  const [actionModal, setActionModal] = useState(null)
  const [actionType, setActionType] = useState('')

  const canClose = hasPermission(user, PERMISSIONS.CLOSE_ROOMS)
  const canMuteKick = hasPermission(user, PERMISSIONS.MUTE_KICK)
  const canManage = hasPermission(user, PERMISSIONS.MANAGE_HOSTS) || hasPermission(user, PERMISSIONS.CLOSE_ROOMS)

  const [activeCount, setActiveCount] = useState(null)
  const [categoriesCount, setCategoriesCount] = useState(null)
  const [totalParticipants, setTotalParticipants] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError('')
    const loadRooms = async () => {
      try {
        let data = null
        try { data = await api.getAdminRooms() } catch {}
        if (!data) try { data = await api.getPlatformOwnerRooms() } catch {}
        if (!data) try { data = await api.getLiveRooms() } catch {}
        if (Array.isArray(data)) setRooms(data)
        else if (data?.rooms) setRooms(data.rooms)
        else if (data?.content) setRooms(data.content)
        else setRooms([])
      } catch (err) { setError(err?.message || 'Failed to load rooms') }
      finally { setLoading(false) }
    }
    const loadCounts = async () => {
      try { const r = await api.getActiveRoomsCount(); setActiveCount(r.activeRooms ?? r.count ?? r) } catch {}
      try { const r = await api.getRoomCategoriesCount(); setCategoriesCount(r) } catch {}
      try { const r = await api.getTotalParticipantsCount(); setTotalParticipants(r.totalParticipants ?? r.count ?? r) } catch {}
    }
    loadRooms()
    loadCounts()
  }, [])

  const handleClose = async (room) => {
    try {
      await api.closeRoom(room.id)
      setRooms((prev) => prev.map((r) => r.id === room.id ? { ...r, status: 'closed' } : r))
      setCloseModal(null)
    } catch { setCloseModal(null) }
  }

  const handleAction = (type, room) => {
    setActionType(type)
    setActionModal(room)
  }

  const performAction = async () => {
    try {
      if (actionType === 'mute') {
        await api.muteAllRoom(actionModal.id)
      }
      setActionModal(null)
    } catch { setActionModal(null) }
  }

  const handleMuteUser = async (roomId, userId) => {
    try {
      await api.muteKick(roomId, { userId, action: 'mute' })
      setActionModal((prev) => prev ? { ...prev, members: prev.members.map((m) => m.id === userId ? { ...m, muted: true } : m) } : prev)
    } catch {}
  }

  const handleUnmuteUser = async (roomId, userId) => {
    try {
      if (api.unmuteUser) await api.unmuteUser(roomId, userId)
      else await api.muteKick(roomId, { userId, action: 'unmute' })
      setActionModal((prev) => prev ? { ...prev, members: prev.members.map((m) => m.id === userId ? { ...m, muted: false } : m) } : prev)
    } catch {}
  }

  const handleKickUser = async (roomId, userId) => {
    try {
      await api.kickUser(roomId, userId)
      setActionModal((prev) => prev ? { ...prev, members: prev.members.filter((m) => m.id !== userId) } : prev)
    } catch {}
  }

  const handleDeactivate = async () => {
    try {
      const room = deactivateModal
      const code = room.countryCode || room.country || 'IN'
      if (api.deactivateCountryRoom) await api.deactivateCountryRoom(code, room.id, false).catch(() => api.deactivateRoom(room.id))
      else await api.deactivateRoom(room.id)
      setRooms((prev) => prev.map((r) => r.id === room.id ? { ...r, status: 'inactive' } : r))
    } catch {}
    setDeactivateModal(null)
  }
  const handleDelete = async () => {
    try {
      const room = deleteModal
      const code = room.countryCode || room.country || 'IN'
      if (api.deleteCountryRoom) await api.deleteCountryRoom(code, room.id).catch(() => api.deleteRoom(room.id))
      else await api.deleteRoom(room.id)
      setRooms((prev) => prev.filter((r) => r.id !== room.id))
    } catch {}
    setDeleteModal(null)
  }
  const handleHostChange = async (e) => {
    e.preventDefault()
    try {
      const room = hostChangeModal
      const code = room.countryCode || room.country || 'IN'
      if (api.transferCountryHost) await api.transferCountryHost(code, room.id, { hostId: newHostId, newHostId }).catch(() => api.transferHost(room.id, { newHostId }))
      else await api.transferHost(room.id, { newHostId })
      setRooms((prev) => prev.map((r) => r.id === room.id ? { ...r, host: newHostId, hostId: newHostId } : r)); setHostChangeModal(null); setNewHostId('')
    } catch {}
  }

  const filtered = rooms.filter((r) =>
    (r.roomName || r.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.host || r.hostId || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <Loading />
  if (error) return <div className="error-message">{error}</div>

  return (
    <div>
      <div className="stats-grid">
        <div className="stats-card">
          <div className="label">Active Rooms</div>
          <div className="value">{activeCount ?? rooms.filter((r) => r.status === 'active' || r.status === 'LIVE').length}</div>
        </div>
        <div className="stats-card">
          <div className="label">Total Participants</div>
          <div className="value">{totalParticipants ?? rooms.reduce((s, r) => s + (r.participants ?? r.participantCount ?? 0), 0)}</div>
        </div>
        <div className="stats-card">
          <div className="label">Categories</div>
          <div className="value">{categoriesCount ? Object.keys(categoriesCount).length : new Set(rooms.map((r) => r.category)).size}</div>
          {categoriesCount && <div className="change" style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>{Object.entries(categoriesCount).map(([k,v])=>`${k}:${v}`).join(' · ')}</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-header">Voice Chat Rooms ({rooms.length})</div>
        <div className="card-body">
          <div className="search-bar">
            <input placeholder="Search rooms or host..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Room Name</th>
                  <th>Room ID</th>
                  <th>Host</th>
                  <th>Participants</th>
                  <th>Category</th>
                  <th>Country</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id || r.roomName}>
                    <td style={{ fontWeight: 500 }}>{r.roomName || r.name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-light)', wordBreak: 'break-all', maxWidth: 160 }}>{r.id || r.roomId || '-'}</td>
                    <td>{r.host || r.hostId || '-'}</td>
                    <td>
                      {r.viewerCount ?? r.participants ?? 0}
                      {(r.status === 'active' || r.status === 'LIVE') && (
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#27ae60', marginLeft: 6 }} title="Live" />
                      )}
                    </td>
                    <td>{r.category}</td>
                    <td>{r.countryCode || r.country || '-'}</td>
                    <td><span className={`badge ${r.status === 'LIVE' ? 'active' : r.status}`}>{r.status}</span></td>
                    <td>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : r.created || '-'}</td>
                    <td>
                      <div className="actions" style={{ flexWrap: 'wrap' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => handleAction('members', r)} title="View members">
                          👥 {r.members?.length ?? r.participants ?? 0}
                        </button>
                        {r.status !== 'closed' && r.status !== 'inactive' && canMuteKick && (
                          <button className="btn btn-warning btn-sm" onClick={() => handleAction('mute', r)} title="Mute all">🔇 Mute</button>
                        )}
                        {r.status !== 'closed' && r.status !== 'inactive' && canClose && (
                          <button className="btn btn-danger btn-sm" onClick={() => setCloseModal(r)}>Close</button>
                        )}
                        {canManage && (
                          <>
                            <button className="btn btn-outline btn-sm" onClick={() => setDeactivateModal(r)} title="Deactivate">Deactivate</button>
                            <button className="btn btn-primary btn-sm" onClick={() => setHostChangeModal(r)} title="Change Host">Host ↻</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {closeModal && (
        <Modal title="Close Room" onClose={() => setCloseModal(null)}>
          <p>Are you sure you want to close <strong>{closeModal.name}</strong>? ({closeModal.participants} participants will be removed.)</p>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setCloseModal(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={() => handleClose(closeModal)}>Close Room</button>
          </div>
        </Modal>
      )}

      {actionModal && actionType === 'members' && (
        <Modal title={`Members: ${actionModal.name}`} onClose={() => setActionModal(null)}>
          {actionModal.members && actionModal.members.length > 0 ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {actionModal.members.map((m) => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td><span className={`badge ${m.role === 'host' ? 'active' : 'inactive'}`}>{m.role}</span></td>
                      <td>
                        {m.role !== 'host' && canMuteKick && (
                          <div className="actions">
                            {m.muted ? <button className="btn btn-success btn-sm" onClick={() => handleUnmuteUser(actionModal.id, m.id)}>Unmute</button> : <button className="btn btn-warning btn-sm" onClick={() => handleMuteUser(actionModal.id, m.id)}>Mute</button>}
                            <button className="btn btn-danger btn-sm" onClick={() => handleKickUser(actionModal.id, m.id)}>Kick</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--text-light)' }}>No member data available.</p>
          )}
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setActionModal(null)}>Close</button>
          </div>
        </Modal>
      )}

      {actionModal && actionType === 'mute' && (
        <Modal title="Mute Room" onClose={() => setActionModal(null)}>
          <p>Mute all participants in <strong>{actionModal.name}</strong>?</p>
          <p style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 8 }}>This will mute all non-host members in this room.</p>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setActionModal(null)}>Cancel</button>
            <button className="btn btn-warning" onClick={performAction}>Mute All</button>
          </div>
        </Modal>
      )}

      {deactivateModal && (
        <Modal title="Deactivate Room" onClose={() => setDeactivateModal(null)}>
          <p>Deactivate <strong>{deactivateModal.name}</strong>? It will be hidden but not deleted.</p>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setDeactivateModal(null)}>Cancel</button>
            <button className="btn btn-warning" onClick={handleDeactivate}>Deactivate</button>
          </div>
        </Modal>
      )}
      {deleteModal && (
        <Modal title="Delete Room" onClose={() => setDeleteModal(null)}>
          <p>Delete <strong>{deleteModal.name}</strong> permanently? This cannot be undone.</p>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setDeleteModal(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
          </div>
        </Modal>
      )}
      {hostChangeModal && (
        <Modal title={`Change Host: ${hostChangeModal.name}`} onClose={() => { setHostChangeModal(null); setNewHostId('') }}>
          <form onSubmit={handleHostChange}>
            <div className="form-group">
              <label>New Host ID / Email</label>
              <input value={newHostId} onChange={(e) => setNewHostId(e.target.value)} placeholder="Enter user ID or email" required />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => { setHostChangeModal(null); setNewHostId('') }}>Cancel</button>
              <button type="submit" className="btn btn-primary">Change Host</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
