import { useState, useEffect } from 'react'
import { api } from '../services/api'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

export default function Dating() {
  const [profiles, setProfiles] = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('profiles')
  const [search, setSearch] = useState('')
  const [selectedProfile, setSelectedProfile] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const [profilesData, matchesData] = await Promise.all([
          api.getDatingProfiles().catch(() => []),
          api.getDatingMatches().catch(() => []),
        ])
        if (!cancelled) {
          setProfiles(Array.isArray(profilesData) ? profilesData : [])
          setMatches(Array.isArray(matchesData) ? matchesData : [])
        }
      } catch {
        if (!cancelled) setError('Failed to load dating data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filteredProfiles = profiles.filter((p) => (p.name || p.username || '').toLowerCase().includes(search.toLowerCase()))

  if (loading) return <Loading text="Loading dating data..." />

  return (
    <div>
      {error && <div className="alert alert-warning" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="stats-grid">
        <div className="stats-card"><div className="label">Total Profiles</div><div className="value">{profiles.length}</div></div>
        <div className="stats-card"><div className="label">Active</div><div className="value" style={{ color: 'var(--success)' }}>{profiles.filter((p) => p.status === 'active' || !p.status).length}</div></div>
        <div className="stats-card"><div className="label">Matches</div><div className="value" style={{ color: 'var(--danger)' }}>{matches.length}</div></div>
        <div className="stats-card"><div className="label">Success Rate</div><div className="value">{profiles.length > 0 ? Math.round((matches.length / profiles.length) * 100) + '%' : 'N/A'}</div></div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['profiles', 'matches'].map((t) => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(t)}>
            {t === 'profiles' ? 'Dating Profiles' : 'Matches'}
          </button>
        ))}
      </div>

      {tab === 'profiles' && (
        <div className="card">
          <div className="card-header">Dating Profiles</div>
          <div className="card-body">
            <div className="search-bar">
              <input placeholder="Search profiles..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {filteredProfiles.length === 0 ? (
              <p style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>No dating profiles (API not implemented yet)</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {filteredProfiles.map((p) => (
                  <div key={p.id} className="card" style={{ margin: 0, cursor: 'pointer' }} onClick={() => setSelectedProfile(p)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: p.color || 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff' }}>
                        {p.avatar || p.name?.charAt(0) || '?'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name || p.username}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{p.age || 'N/A'} · {p.gender || p.location || 'N/A'}</div>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-light)', margin: '0 0 8px', minHeight: 20 }}>{p.bio || p.about || 'No bio'}</p>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {(p.interests || p.tags || []).map((i, idx) => (
                        <span key={idx} className="badge" style={{ background: '#e0e7ff', color: '#3730a3', fontSize: 11 }}>{i}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'matches' && (
        <div className="card">
          <div className="card-header">Dating Matches</div>
          <div className="card-body">
            {matches.length === 0 ? (
              <p style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>No matches (API not implemented yet)</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr><th>User 1</th><th>User 2</th><th>Match Date</th><th>Compatibility</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {matches.map((m) => (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 500 }}>{m.user1 || m.user1Name || 'N/A'}</td>
                        <td style={{ fontWeight: 500 }}>{m.user2 || m.user2Name || 'N/A'}</td>
                        <td>{m.matchedAt ? new Date(m.matchedAt).toLocaleDateString() : 'N/A'}</td>
                        <td><span style={{ fontWeight: 600, color: parseInt(m.compatibility) > 80 ? 'var(--success)' : 'var(--warning)' }}>{m.compatibility || m.score || 'N/A'}%</span></td>
                        <td><span className={`badge ${m.status}`}>{m.status || 'active'}</span></td>
                        <td>
                          <button className="btn btn-outline btn-sm">View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedProfile && (
        <Modal title={selectedProfile.name || selectedProfile.username} onClose={() => setSelectedProfile(null)}>
          <div className="detail-grid">
            <div className="detail-item"><div className="detail-label">Age</div><div className="detail-value">{selectedProfile.age || 'N/A'}</div></div>
            <div className="detail-item"><div className="detail-label">Gender</div><div className="detail-value">{selectedProfile.gender || 'N/A'}</div></div>
            <div className="detail-item"><div className="detail-label">Location</div><div className="detail-value">{selectedProfile.location || 'N/A'}</div></div>
            <div className="detail-item"><div className="detail-label">Bio</div><div className="detail-value">{selectedProfile.bio || selectedProfile.about || 'No bio'}</div></div>
            <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`badge ${selectedProfile.status || 'active'}`}>{selectedProfile.status || 'active'}</span></div></div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setSelectedProfile(null)}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
