import { useState, useEffect } from 'react'
import { api } from '../services/api'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

export default function AIModeration() {
  const [flags, setFlags] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('voice')
  const [actionModal, setActionModal] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const data = await api.getAiModerationFlags()
        if (!cancelled) setFlags(Array.isArray(data) ? data : (data?.content || []))
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const voiceFlags = flags.filter((f) => f.type === 'voice' || f.category === 'voice' || !f.type)
  const fakeFlags = flags.filter((f) => f.type === 'fake_user' || f.category === 'fake_user')
  const contentFlags = flags.filter((f) => f.type === 'content' || f.category === 'content')

  const filtered = (tab === 'voice' ? voiceFlags : tab === 'fake' ? fakeFlags : contentFlags).filter((f) => {
    const q = search.toLowerCase()
    return (f.user || f.username || '').toLowerCase().includes(q) || (f.reason || f.details || '').toLowerCase().includes(q)
  })

  const handleResolve = async (flag) => {
    try {
      await api.resolveAiFlag(flag.id, { resolved: true })
      setFlags((prev) => prev.map((f) => f.id === flag.id ? { ...f, status: 'resolved' } : f))
    } catch {
      setError('Failed to resolve flag.')
    }
    setActionModal(null)
  }

  if (loading) return <Loading text="Loading AI moderation data..." />

  return (
    <div>
      {error && <div className="alert alert-warning" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="stats-grid">
        <div className="stats-card"><div className="label">Total Flags</div><div className="value">{flags.length}</div></div>
        <div className="stats-card"><div className="label">Voice</div><div className="value" style={{ color: 'var(--warning)' }}>{voiceFlags.length}</div></div>
        <div className="stats-card"><div className="label">Fake Users</div><div className="value" style={{ color: 'var(--danger)' }}>{fakeFlags.length}</div></div>
        <div className="stats-card"><div className="label">Content</div><div className="value">{contentFlags.length}</div></div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', gap: 8 }}>
          {[
            { key: 'voice', label: 'Voice Moderation' },
            { key: 'fake', label: 'Fake User Detection' },
            { key: 'content', label: 'Content Moderation' },
          ].map((t) => (
            <button key={t.key} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="card-body">
          <div className="search-bar">
            <input placeholder="Search by user or reason..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {filtered.length === 0 ? (
            <p style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>
              {tab === 'voice' ? 'No voice moderation flags (API not implemented yet)' :
               tab === 'fake' ? 'No fake user detections (API not implemented yet)' :
               'No content flags (API not implemented yet)'}
            </p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>{tab === 'voice' ? 'AI Confidence' : tab === 'fake' ? 'Risk Score' : 'Type'}</th>
                    <th>Reason</th>
                    <th>Detected</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => (
                    <tr key={f.id} style={{ background: (parseInt(f.confidence) > 90 || parseInt(f.risk) > 80) ? '#fff5f5' : 'none' }}>
                      <td style={{ fontWeight: 500 }}>{f.user || f.username}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: parseInt(f.confidence || f.risk || 0) > 80 ? 'var(--danger)' : 'var(--warning)' }}>
                          {f.confidence || f.risk || f.score || 'N/A'}{f.confidence || f.risk || f.score ? '%' : ''}
                        </span>
                      </td>
                      <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.reason || f.details || 'N/A'}</td>
                      <td>{f.detectedAt ? new Date(f.detectedAt).toLocaleString() : f.date || 'N/A'}</td>
                      <td><span className={`badge ${f.status === 'resolved' ? 'active' : 'reported'}`}>{f.status || 'pending'}</span></td>
                      <td>
                        {(!f.status || f.status !== 'resolved') && (
                          <button className="btn btn-success btn-sm" onClick={() => setActionModal(f)}>Resolve</button>
                        )}
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
        <Modal title="Resolve Flag" onClose={() => setActionModal(null)}>
          <p>Resolve moderation flag for <strong>{actionModal.user || actionModal.username}</strong>?</p>
          <p style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 8 }}>
            Reason: {actionModal.reason || actionModal.details}<br />
            AI Confidence: {actionModal.confidence || actionModal.risk || 'N/A'}%
          </p>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setActionModal(null)}>Cancel</button>
            <button className="btn btn-success" onClick={() => handleResolve(actionModal)}>Mark Resolved</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
