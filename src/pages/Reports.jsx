import { useState, useEffect } from 'react'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import { LoadingState, ErrorState } from '../components/SkeletonLoader'
import { api } from '../services/api'

export default function Reports() {
  const { addToast } = useToast()
  const [reports, setReports] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resolveModal, setResolveModal] = useState(null)

  const fetchReports = (statusFilter) => {
    setLoading(true)
    setError('')
    const status = statusFilter === 'all' ? '' : statusFilter.toUpperCase()
    api.getReports({ status, page: 0 })
      .then((data) => {
        if (Array.isArray(data)) setReports(data)
        else if (data?.content) setReports(data.content)
        else if (data?.reports) setReports(data.reports)
        else if (data?.data) setReports(data.data)
        else setReports([])
      })
      .catch((err) => setError(err?.message || 'Failed to load reports'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchReports(filter)
  }, [filter])

  const handleResolve = async (report) => {
    try {
      await api.resolveReport(report.id, { status: 'RESOLVED' })
      setResolveModal(null)
      fetchReports(filter)
      addToast('Report resolved successfully', 'success')
    } catch {
      addToast('Failed to resolve report', 'error')
      setResolveModal(null)
    }
  }

  const filtered = reports.filter((r) => filter === 'all' || r.status?.toLowerCase() === filter)
  const pendingCount = reports.filter((r) => r.status?.toLowerCase() === 'pending').length

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={() => fetchReports(filter)} />

  return (
    <div className="page-container">
      <div className="stats-grid">
        <div className="stats-card">
          <div className="label">Total Reports</div>
          <div className="value">{reports.length}</div>
        </div>
        <div className="stats-card">
          <div className="label">Pending</div>
          <div className="value" style={{ color: 'var(--warning)' }}>{pendingCount}</div>
        </div>
        <div className="stats-card">
          <div className="label">Resolved</div>
          <div className="value" style={{ color: 'var(--success)' }}>{reports.length - pendingCount}</div>
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', gap: 8 }}>
            {['all', 'pending', 'resolved'].map((f) => (
              <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Reporter</th>
                  <th>Reported User</th>
                  <th>Reason</th>
                  <th>Details</th>
                  <th>Room</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>{r.reporter}</td>
                    <td style={{ fontWeight: 500 }}>{r.reported || r.reportedUserId || r.targetUserId || r.targetUser || '—'}</td>
                    <td><span className="badge reported">{r.reason}</span></td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.detail}</td>
                    <td>{r.room || r.roomName || r.roomId || '—'}</td>
                    <td>{r.date}</td>
                    <td><span className={`badge ${r.status}`}>{r.status}</span></td>
                    <td>
                      {r.status?.toLowerCase() === 'pending' && (
                        <button className="btn btn-success btn-sm" onClick={() => setResolveModal(r)}>Resolve</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {resolveModal && (
        <Modal title="Resolve Report" onClose={() => setResolveModal(null)}>
          <p>Mark this report against <strong>{resolveModal.reported || resolveModal.reportedUserId || resolveModal.targetUserId || 'User'}</strong> as resolved?</p>
          <p style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 8 }}>
            Reason: {resolveModal.reason} — {resolveModal.detail}
          </p>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setResolveModal(null)}>Cancel</button>
            <button className="btn btn-success" onClick={() => handleResolve(resolveModal)}>Mark Resolved</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
