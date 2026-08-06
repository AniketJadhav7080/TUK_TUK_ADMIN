import { useState, useEffect } from 'react'
import Modal from '../components/Modal'
import { api } from '../services/api'
import Loading from '../components/Loading'

const mapRoom = (r) => ({
  id: r.id,
  name: r.name || r.roomName || 'Unknown Room',
  host: r.hostName || r.host?.name || r.host || 'Unknown',
  participants: r.participants ?? r.participantCount ?? 0,
  duration: r.duration || r.elapsed || '0m',
  flagged: r.flagged ?? r.isFlagged ?? false,
  quality: r.quality || r.audioQuality || 'good',
  status: r.status || 'active',
})

export default function LiveMonitor() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [actionModal, setActionModal] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function fetchRooms() {
      try {
        setLoading(true)
        setError(null)
        const data = await api.getLiveRooms()
        if (cancelled) return
        const mapped = (data.content || data.data || data || []).map(mapRoom)
        setRooms(mapped)
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch live rooms:', err)
          setError(err.message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchRooms()
    return () => { cancelled = true }
  }, [])

  const handleCloseRoom = async (room) => {
    try {
      await api.closeRoom(room.id)
      setRooms((prev) => prev.filter((r) => r.id !== room.id))
    } catch (err) {
      console.error('Failed to close room:', err)
    }
    setActionModal(null)
  }

  const flagged = rooms.filter((r) => r.flagged)

  if (loading) return <Loading text="Loading live rooms..." />

  return (
    <div>
      {error && <div className="error-banner" style={{ background: '#fff5f5', color: '#e53e3e', padding: '8px 16px', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 13 }}>Failed to load live rooms: {error}</div>}
      <div className="stats-grid">
        <div className="stats-card"><div className="label">🔴 Live Rooms</div><div className="value">{rooms.length}</div></div>
        <div className="stats-card"><div className="label">Total Participants</div><div className="value">{rooms.reduce((s, r) => s + r.participants, 0)}</div></div>
        <div className="stats-card"><div className="label">⚠️ Flagged Rooms</div><div className="value" style={{ color: 'var(--danger)' }}>{flagged.length}</div></div>
        <div className="stats-card"><div className="label">Excellent Quality</div><div className="value" style={{ color: 'var(--success)' }}>{rooms.filter((r) => r.quality === 'excellent').length}</div></div>
      </div>

      <div className="card" style={{ border: flagged.length > 0 ? '2px solid var(--danger)' : 'none' }}>
        <div className="card-header" style={{ color: flagged.length > 0 ? 'var(--danger)' : 'inherit' }}>
          Live Room Monitoring {flagged.length > 0 && `— ${flagged.length} room(s) flagged!`}
        </div>
        <div className="card-body">
          <div className="search-bar">
            <input placeholder="Search live rooms..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
            {rooms.length === 0 ? <p style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>No live rooms currently (API returns empty list)</p> : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Room</th><th>Host</th><th>Participants</th><th>Duration</th><th>Audio Quality</th><th>Flagged</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {rooms.filter((r) => r.name.toLowerCase().includes(search.toLowerCase())).map((r) => (
                  <tr key={r.id} style={{ background: r.flagged ? '#fff5f5' : 'none' }}>
                    <td style={{ fontWeight: 500 }}>{r.name}</td>
                    <td>{r.host}</td>
                    <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#27ae60', display: 'inline-block' }} /> {r.participants}</span></td>
                    <td>{r.duration}</td>
                    <td>
                      <span className={`badge ${r.quality === 'excellent' ? 'active' : r.quality === 'good' ? 'pending' : 'reported'}`}>
                        {r.quality}
                      </span>
                    </td>
                    <td>{r.flagged ? <span className="badge banned">⚠️ Flagged</span> : <span style={{ color: 'var(--text-light)' }}>-</span>}</td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-outline btn-sm" onClick={() => setActionModal(r)}>View</button>
                        {r.flagged && <button className="btn btn-danger btn-sm" onClick={() => setActionModal({ ...r, action: 'close' })}>Close</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            )}
        </div>
      </div>

      {actionModal && (
        <Modal title={`Room: ${actionModal.name}`} onClose={() => setActionModal(null)}>
          <div className="detail-grid">
            <div className="detail-item"><div className="detail-label">Host</div><div className="detail-value">{actionModal.host}</div></div>
            <div className="detail-item"><div className="detail-label">Participants</div><div className="detail-value">{actionModal.participants}</div></div>
            <div className="detail-item"><div className="detail-label">Duration</div><div className="detail-value">{actionModal.duration}</div></div>
            <div className="detail-item"><div className="detail-label">Audio Quality</div><div className="detail-value">{actionModal.quality}</div></div>
          </div>
          {actionModal.action === 'close' && (
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => setActionModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleCloseRoom(actionModal)}>Close Room</button>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
