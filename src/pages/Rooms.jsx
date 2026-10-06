import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { hasPermission, PERMISSIONS, ROLES } from '../permissions'
import Modal from '../components/Modal'
import Loading from '../components/Loading'
import { api } from '../services/api'

export default function Rooms() {
  const { user } = useAuth()
  const [rooms, setRooms] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deactivateModal, setDeactivateModal] = useState(null)
  const [hostChangeModal, setHostChangeModal] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [editForm, setEditForm] = useState({ roomName: '', imageUrl: '' })
  const [editError, setEditError] = useState('')
  const [newHostId, setNewHostId] = useState('')
  const [eligibleHosts, setEligibleHosts] = useState([])
  const [hostsLoading, setHostsLoading] = useState(false)
  const [hostChangeError, setHostChangeError] = useState('')

  const openHostChange = async (room) => {
    setHostChangeModal(room)
    setNewHostId('')
    setHostChangeError('')
    setEligibleHosts([])
    setHostsLoading(true)
    try {
      // One host = one room: only users NOT hosting any room are eligible
      const busyIds = new Set(rooms.map((r) => String(r.hostId ?? r.host)).filter(Boolean))
      const first = await api.getUsers('?page=0&size=1000')
      let all = []
      if (Array.isArray(first)) all = first
      else if (first?.content) {
        all = [...first.content]
        for (let p = 1; p < (first.totalPages || 1); p++) {
          try {
            const pg = await api.getUsers(`?page=${p}&size=1000`)
            if (pg?.content) all.push(...pg.content)
          } catch { /* keep loaded pages */ }
        }
      }
      setEligibleHosts(all.filter((u) => !busyIds.has(String(u.id))))
    } catch {
      setEligibleHosts([])
    } finally {
      setHostsLoading(false)
    }
  }
  const [actionModal, setActionModal] = useState(null)
  const [actionType, setActionType] = useState('')

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
        const list = Array.isArray(data) ? data : (data?.rooms || data?.content || [])
        // Backend returns roomId/roomName; normalize to id/name so all actions work
        setRooms(list.map((r) => ({ ...r, id: r.id || r.roomId, name: r.roomName || r.name })))
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
  const openEdit = (room) => {
    setEditForm({ roomName: room.roomName || room.name || '', imageUrl: room.imageUrl || room.image || '' })
    setEditError('')
    setEditModal(room)
  }

  const handleImageFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setEditForm((prev) => ({ ...prev, imageUrl: ev.target.result, imageFile: file }))
    reader.readAsDataURL(file)
  }

  const handleEditSave = async (ev) => {
    ev.preventDefault()
    setEditError('')
    try {
      await api.updateRoom(editModal.id, { roomName: editForm.roomName, imageUrl: editForm.imageUrl || null, imageFile: editForm.imageFile })
      setRooms((prev) => prev.map((r) => r.id === editModal.id ? { ...r, roomName: editForm.roomName, name: editForm.roomName, imageUrl: editForm.imageUrl } : r))
      setEditModal(null)
    } catch (err) {
      setEditError(err.message || 'Failed to update room (backend API not ready yet)')
    }
  }

  const handleActivate = async (room) => {
    try {
      const code = room.countryCode || room.country || 'IN'
      if (api.deactivateCountryRoom) await api.deactivateCountryRoom(code, room.id, true).catch(() => api.activateRoom(room.id))
      else await api.activateRoom(room.id)
      setRooms((prev) => prev.map((r) => r.id === room.id ? { ...r, status: 'active' } : r))
    } catch {}
  }
  const handleHostChange = async (e) => {
    e.preventDefault()
    setHostChangeError('')
    try {
      const room = hostChangeModal
      const code = room.countryCode || room.country || 'IN'
      if (api.transferCountryHost) await api.transferCountryHost(code, room.id, { hostId: newHostId, newHostId }).catch(() => api.transferHost(room.id, { newHostId }))
      else await api.transferHost(room.id, { newHostId })
      setRooms((prev) => prev.map((r) => r.id === room.id ? { ...r, host: newHostId, hostId: newHostId } : r)); setHostChangeModal(null); setNewHostId('')
    } catch (err) {
      setHostChangeError(err.message || 'Transfer failed — user may already host a room')
    }
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
          <div className="value">{categoriesCount?.totalCategories ?? (categoriesCount ? Object.keys(categoriesCount).length : new Set(rooms.map((r) => r.category)).size)}</div>
          {categoriesCount?.categoryCounts && <div className="change" style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>{Object.entries(categoriesCount.categoryCounts).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ')}</div>}
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
                    <td style={{ fontWeight: 500 }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{(r.imageUrl || r.image) ? <img src={r.imageUrl || r.image} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none' }} /> : null}{r.roomName || r.name}</span></td>
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
                        {r.status !== 'closed' && r.status !== 'inactive' && canMuteKick && (
                          <button className="btn btn-warning btn-sm" onClick={() => handleAction('mute', r)} title="Mute all">🔇 Mute</button>
                        )}
                        {user?.role === ROLES.OWNER && (
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(r)} title="Edit name & DP">Edit</button>
                        )}
                        {canManage && (
                          <>
                            {(r.status === 'inactive' || r.status === 'deactivated' || r.status === 'closed') ? (
                              <button className="btn btn-success btn-sm" onClick={() => handleActivate(r)} title="Activate">Activate</button>
                            ) : (
                              <button className="btn btn-outline btn-sm" onClick={() => setDeactivateModal(r)} title="Deactivate">Deactivate</button>
                            )}
                            <button className="btn btn-primary btn-sm" onClick={() => openHostChange(r)} title="Change Host">Host ↻</button>
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
      {editModal && (
        <Modal title={`Edit Room: ${editModal.roomName || editModal.name}`} onClose={() => setEditModal(null)}>
          <form onSubmit={handleEditSave}>
            <div className="form-group">
              <label>Room DP</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid var(--border)' }}>
                  {editForm.imageUrl ? <img src={editForm.imageUrl} alt="DP" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>{(editForm.roomName || 'R').charAt(0).toUpperCase()}</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <input value={editForm.imageUrl} onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })} placeholder="https://... image URL" style={{ width: '100%', marginBottom: 6 }} />
                  <input type="file" accept="image/*" onChange={handleImageFile} style={{ fontSize: 13 }} />
                </div>
              </div>
            </div>
            <div className="form-group">
              <label>Room Name</label>
              <input value={editForm.roomName} onChange={(e) => setEditForm({ ...editForm, roomName: e.target.value })} required placeholder="Room name" />
            </div>
            {editError && <div style={{ padding: '8px 12px', borderRadius: 8, fontSize: 13, background: '#fee2e2', color: '#991b1b', marginBottom: 12 }}>{editError}</div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setEditModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save</button>
            </div>
          </form>
        </Modal>
      )}
      {hostChangeModal && (
        <Modal title={`Change Host: ${hostChangeModal.name}`} onClose={() => { setHostChangeModal(null); setNewHostId('') }}>
          <form onSubmit={handleHostChange}>
            <div className="form-group">
              <label>New Host (only users with no room — one host = one room)</label>
              {hostsLoading ? (
                <p style={{ fontSize: 13, color: 'var(--text-light)' }}>Loading eligible users...</p>
              ) : (
                <select value={newHostId} onChange={(e) => setNewHostId(e.target.value)} required style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
                  <option value="">Select user ({eligibleHosts.length} eligible)</option>
                  {eligibleHosts.map((u) => (
                    <option key={u.id} value={u.id}>{u.name || u.username || u.email || u.id} ({u.id})</option>
                  ))}
                </select>
              )}
            </div>
            {hostChangeError && <div style={{ padding: '8px 12px', borderRadius: 8, fontSize: 13, background: '#fee2e2', color: '#991b1b', marginBottom: 12 }}>{hostChangeError}</div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => { setHostChangeModal(null); setNewHostId('') }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={hostsLoading || !newHostId}>Change Host</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
