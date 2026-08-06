import { useState, useEffect } from 'react'
import { api } from '../services/api'
import Loading from '../components/Loading'
import Modal from '../components/Modal'



export default function Security() {
  const [fraudAlerts, setFraudAlerts] = useState([])
  const [flaggedContent, setFlaggedContent] = useState([])
  const [securityAlerts, setSecurityAlerts] = useState([])
  const [tab, setTab] = useState('fraud')
  const [actionModal, setActionModal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.getFraudAlerts(),
      api.getVoiceLogs(),
      api.getSecurityAlerts(),
    ]).then(([fraud, voice, security]) => {
      setFraudAlerts(fraud ?? [])
      setFlaggedContent(voice ?? [])
      setSecurityAlerts(security ?? [])
    }).catch(() => {
      setError('Failed to load security data from server.')
      setLoading(false)
    }).finally(() => setLoading(false))
  }, [])

  const handleResolve = (id) => {
    setFraudAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: 'resolved' } : a))
    setActionModal(null)
  }

  const handleBlockIp = async (ip, user) => {
    try {
      await api.blockIp({ ip, user })
      setSecurityAlerts((prev) => prev.filter((a) => a.ip !== ip))
    } catch {
      setError('Failed to block IP.')
    }
  }

  if (loading) return <Loading />

  return (
    <div>
      {error && (
        <div style={{ marginBottom: 16, padding: 10, borderRadius: 'var(--radius)', background: '#fee2e2', color: '#991b1b', fontSize: 13 }}>
          {error}
        </div>
      )}
      <div className="stats-grid">
        <div className="stats-card"><div className="label">Open Alerts</div><div className="value" style={{ color: 'var(--danger)' }}>{fraudAlerts.filter((a) => a.status === 'open').length}</div></div>
        <div className="stats-card"><div className="label">High Risk</div><div className="value" style={{ color: 'var(--danger)' }}>{fraudAlerts.filter((a) => a.risk === 'high').length}</div></div>
        <div className="stats-card"><div className="label">Flagged Content</div><div className="value" style={{ color: 'var(--warning)' }}>{flaggedContent.filter((c) => c.status === 'flagged').length}</div></div>
        <div className="stats-card"><div className="label">Resolved Today</div><div className="value" style={{ color: 'var(--success)' }}>{fraudAlerts.filter((a) => a.status === 'resolved').length}</div></div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['fraud', 'content', 'suspicious'].map((t) => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(t)}>
            {t === 'fraud' ? 'Fraud Detection' : t === 'content' ? 'AI Content Moderation' : 'Suspicious Logins'}
          </button>
        ))}
      </div>

      {tab === 'fraud' && (
        <div className="card">
          <div className="card-header">Fraud & Abuse Alerts</div>
          <div className="card-body">
            {fraudAlerts.length === 0 ? <p style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>No fraud alerts at this time (API returns empty data)</p> : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>User</th><th>Type</th><th>Details</th><th>Risk</th><th>Detected</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {fraudAlerts.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 500 }}>{a.user}</td>
                      <td><span className="badge reported">{a.type}</span></td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.details}</td>
                      <td><span className={`badge ${a.risk === 'high' ? 'banned' : 'reported'}`}>{a.risk}</span></td>
                      <td>{a.detected}</td>
                      <td><span className={`badge ${a.status}`}>{a.status}</span></td>
                      <td>
                        {a.status === 'open' && (
                          <button className="btn btn-success btn-sm" onClick={() => setActionModal(a)}>Resolve</button>
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
      )}

      {tab === 'content' && (
        <div className="card">
          <div className="card-header">AI Voice & Content Moderation</div>
          <div className="card-body">
            {flaggedContent.length === 0 ? <p style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>No flagged content (API returns empty data)</p> : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>User</th><th>Type</th><th>AI Confidence</th><th>Room</th><th>Detected</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {flaggedContent.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.user}</td>
                      <td><span className="badge reported">{c.type}</span></td>
                      <td><span style={{ fontWeight: 600, color: parseInt(c.confidence) > 90 ? 'var(--danger)' : 'var(--warning)' }}>{c.confidence}</span></td>
                      <td>{c.room}</td>
                      <td>{c.detected}</td>
                      <td><span className={`badge ${c.status}`}>{c.status}</span></td>
                      <td><button className="btn btn-outline btn-sm">Review</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>
      )}

      {tab === 'suspicious' && (
        <div className="card">
          <div className="card-header">Suspicious Login Attempts</div>
          <div className="card-body">
            {securityAlerts.length === 0 ? <p style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>No suspicious logins detected (API returns empty data)</p> : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>User</th><th>Location</th><th>Device</th><th>IP</th><th>Attempts</th><th>Last Attempt</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {securityAlerts.map((a) => (
                    <tr key={a.id}>
                      <td>{a.user}</td>
                      <td>{a.location}</td>
                      <td>{a.device}</td>
                      <td style={{ fontFamily: 'monospace' }}>{a.ip}</td>
                      <td>{a.attempts}</td>
                      <td>{a.lastAttempt}</td>
                      <td><button className="btn btn-danger btn-sm" onClick={() => handleBlockIp(a.ip, a.user)}>Block</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>
      )}

      {actionModal && (
        <Modal title="Resolve Alert" onClose={() => setActionModal(null)}>
          <p>Resolve fraud alert for <strong>{actionModal.user}</strong>?</p>
          <p style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 8 }}>Type: {actionModal.type}<br />Details: {actionModal.details}</p>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setActionModal(null)}>Cancel</button>
            <button className="btn btn-success" onClick={() => handleResolve(actionModal.id)}>Mark Resolved</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
