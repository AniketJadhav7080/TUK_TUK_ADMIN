import { useState, useEffect } from 'react'
import { api } from '../services/api'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

export default function NearbyRooms() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('distance')
  const [selectedRoom, setSelectedRoom] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const data = await api.getNearbyRooms({ sort: sortBy })
        if (!cancelled) {
          const list = data.content || data.data || data || []
          setRooms(Array.isArray(list) ? list : [])
        }
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [sortBy])

  const filtered = rooms.filter((r) => (r.name || r.roomName || '').toLowerCase().includes(search.toLowerCase()))

  if (loading) return <Loading text="Loading nearby rooms..." />

  return (
    <div>
      {error && <div className="alert alert-warning" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="stats-grid">
        <div className="stats-card"><div className="label">Nearby Rooms</div><div className="value">{rooms.length}</div></div>
        <div className="stats-card"><div className="label">Total Users</div><div className="value">{rooms.reduce((s, r) => s + (r.participants || r.userCount || 0), 0)}</div></div>
        <div className="stats-card"><div className="label">Avg Distance</div><div className="value">{rooms.length > 0 ? Math.round(rooms.reduce((s, r) => s + (r.distance || 0), 0) / rooms.length) + 'm' : 'N/A'}</div></div>
        <div className="stats-card"><div className="label">Active</div><div className="value" style={{ color: 'var(--success)' }}>{rooms.filter((r) => r.status === 'live' || r.status === 'active').length}</div></div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span>Nearby Voice Rooms</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 13, background: 'var(--bg-card)', color: 'var(--text)' }}>
            <option value="distance">Nearest First</option>
            <option value="popular">Most Popular</option>
            <option value="recent">Recently Active</option>
          </select>
        </div>
        <div className="card-body">
          <div className="search-bar">
            <input placeholder="Search rooms..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {filtered.length === 0 ? (
            <p style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>No nearby rooms found (API not implemented yet)</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {filtered.map((r) => (
                <div key={r.id} className="card" style={{ margin: 0, cursor: 'pointer' }} onClick={() => setSelectedRoom(r)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.name || r.roomName || 'Unknown Room'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{r.hostName || r.host || 'Unknown host'}</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>{r.distance ? `${r.distance}m` : 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-light)' }}>
                    <span>{r.participants || r.userCount || 0} participants</span>
                    <span>{r.category || 'General'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedRoom && (
        <Modal title={selectedRoom.name || selectedRoom.roomName} onClose={() => setSelectedRoom(null)}>
          <div className="detail-grid">
            <div className="detail-item"><div className="detail-label">Host</div><div className="detail-value">{selectedRoom.hostName || selectedRoom.host}</div></div>
            <div className="detail-item"><div className="detail-label">Distance</div><div className="detail-value" style={{ color: 'var(--primary)' }}>{selectedRoom.distance ? `${selectedRoom.distance}m` : 'N/A'}</div></div>
            <div className="detail-item"><div className="detail-label">Participants</div><div className="detail-value">{selectedRoom.participants || selectedRoom.userCount || 0}</div></div>
            <div className="detail-item"><div className="detail-label">Category</div><div className="detail-value">{selectedRoom.category || 'General'}</div></div>
            <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`badge ${selectedRoom.status === 'live' ? 'active' : 'pending'}`}>{selectedRoom.status}</span></div></div>
            <div className="detail-item"><div className="detail-label">Location</div><div className="detail-value">{selectedRoom.location || selectedRoom.area || 'N/A'}</div></div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setSelectedRoom(null)}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
