import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { hasPermission, PERMISSIONS } from '../permissions'
import Modal from '../components/Modal'
import { LoadingState, ErrorState } from '../components/SkeletonLoader'
import { api } from '../services/api'

const nameOf = (v) => {
  if (v == null) return '—'
  if (typeof v === 'object') return v.name || v.username || v.email || v.id || '—'
  return v
}
const formatDate = (v) => {
  if (!v) return '—'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString()
}

export default function Reports() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [reports, setReports] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resolveModal, setResolveModal] = useState(null)
  const canResolve = hasPermission(user, PERMISSIONS.RESOLVE_REPORTS)

  const fetchReports = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.getReports({ page: 0, size: 500 })
      if (Array.isArray(data)) setReports(data)
      else if (data?.content) setReports(data.content)
      else if (data?.reports) setReports(data.reports)
      else if (data?.data) setReports(data.data)
      else setReports([])
    } catch (err) {
      setError(err?.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  const handleResolve = async (report) => {
    try {
      await api.resolveReport(report.id, { status: 'RESOLVED' })
      setReports((prev) => prev.map((r) => r.id === report.id ? { ...r, status: 'RESOLVED' } : r))
      setResolveModal(null)
      addToast('Report resolved successfully', 'success')
    } catch (err) {
      addToast(err?.message || 'Failed to resolve report', 'error')
    }
  }

  const filtered = reports.filter((r) => filter === 'all' || (r.status || '').toLowerCase() === filter)
  const pendingCount = reports.filter((r) => (r.status || '').toLowerCase() === 'pending').length
  const resolvedCount = reports.filter((r) => (r.status || '').toLowerCase() === 'resolved').length

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={fetchReports} />

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
          <div className="value" style={{ color: 'var(--success)' }}>{resolvedCount}</div>
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
                    <td>{nameOf(r.reporter || r.reporterName || r.reporterId)}</td>
                    <td style={{ fontWeight: 500 }}>{nameOf(r.reported || r.reportedUser || r.reportedUserId || r.targetUserId || r.targetUser)}</td>
                    <td><span className="badge reported">{r.reason || '—'}</span></td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.detail || r.description || '—'}</td>
                    <td>{r.room || r.roomName || r.roomId || '—'}</td>
                    <td>{formatDate(r.date || r.createdAt)}</td>
                    <td><span className={`badge ${(r.status || '').toLowerCase()}`}>{r.status}</span></td>
                    <td>
                      {canResolve && (r.status || '').toLowerCase() === 'pending' ? (
                        <button className="btn btn-success btn-sm" onClick={() => setResolveModal(r)}>Resolve</button>
                      ) : null}
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
          <p>Mark this report against <strong>{nameOf(resolveModal.reported || resolveModal.reportedUser || resolveModal.reportedUserId || resolveModal.targetUserId || 'User')}</strong> as resolved?</p>
          <p style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 8 }}>
            Reason: {resolveModal.reason || '—'} — {resolveModal.detail || resolveModal.description || ''}
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
