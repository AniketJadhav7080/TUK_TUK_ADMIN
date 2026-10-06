import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../permissions'
import { api } from '../services/api'
import Loading from '../components/Loading'

export default function AllocationHistory() {
  const { user } = useAuth()
  const role = user?.role
  const isOwner = role === ROLES.OWNER
  const isSuperAdmin = role === ROLES.SUPER_ADMIN
  const isSeller = role === ROLES.DIAMOND_STOCK

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [records, setRecords] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = isOwner
          ? await api.getOwnerDiamondHistory(page).catch(() => [])
          : isSuperAdmin
            ? await api.getSuperAdminHistory().catch(() => [])
            : isSeller
              ? await api.getManagerRechargeHistory().catch(() => [])
              : []
        if (!cancelled) {
          const list = Array.isArray(data) ? data : (data?.content || [])
          setRecords(list)
          if (data?.totalPages) setTotalPages(data.totalPages)
        }
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [page])

  if (loading) return <Loading text="Loading allocation history..." />

  return (
    <div>
      {error && <div className="alert alert-warning" style={{ marginBottom: 12 }}>{error}</div>}

      {isOwner && (
        <>
          <div className="stats-grid">
            <div className="stats-card"><div className="label">Total Allocations</div><div className="value">{records.length}</div></div>
            <div className="stats-card"><div className="label">Total Diamonds Allocated</div><div className="value" style={{ color: 'var(--primary)' }}>{records.reduce((s, r) => s + (r.amount || 0), 0).toLocaleString()}</div></div>
          </div>
          <div className="card">
            <div className="card-header">Country-wise Allocation History</div>
            <div className="card-body">
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr><th>Country</th><th>Super Admin</th><th>Amount</th><th>Date</th><th>Note</th></tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={r.id || i}>
                        <td style={{ fontWeight: 500 }}>{r.country || r.countryCode || '—'}</td>
                        <td>{r.adminName || r.superAdminName || '—'}</td>
                        <td style={{ fontWeight: 600, color: 'var(--success)' }}>+{(r.amount || 0).toLocaleString()}</td>
                        <td>{r.date ? new Date(r.date).toLocaleDateString() : '—'}</td>
                        <td style={{ color: 'var(--text-light)' }}>{r.note || '—'}</td>
                      </tr>
                    ))}
                    {records.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>No allocations yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                  <button className="btn btn-sm btn-outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
                  <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-light)' }}>Page {page + 1} of {totalPages}</span>
                  <button className="btn btn-sm btn-outline" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {isSuperAdmin && (
        <div className="card">
          <div className="card-header">Distribution to Diamond Stock Managers — {user?.country || 'your country'}</div>
          <div className="card-body">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Recharge Agent</th><th>Amount</th><th>Date</th><th>Note</th></tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.id || i}>
                      <td style={{ fontWeight: 500 }}>{r.sellerName || r.receiverName || '—'}</td>
                      <td style={{ fontWeight: 600, color: 'var(--success)' }}>+{(r.amount || 0).toLocaleString()}</td>
                      <td>{r.date || r.createdAt || '—'}</td>
                      <td style={{ color: 'var(--text-light)' }}>{r.note || '—'}</td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>No distributions yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isSeller && (
        <div className="card">
          <div className="card-header">Recharge History</div>
          <div className="card-body">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>User ID</th><th>User Name</th><th>Country</th><th>Diamonds</th><th>Amount</th><th>Date</th><th>Note</th></tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.id || i}>
                      <td style={{ fontWeight: 500 }}>{r.userId || r.user?.id || '—'}</td>
                      <td>{r.userName || r.user?.name || r.user?.username || '—'}</td>
                      <td>{r.country || '—'}</td>
                      <td style={{ fontWeight: 600, color: 'var(--success)' }}>+{(r.diamonds || 0).toLocaleString()}</td>
                      <td>{r.amount ? `₹${r.amount}` : '—'}</td>
                      <td>{r.date || r.createdAt || '—'}</td>
                      <td style={{ color: 'var(--text-light)' }}>{r.note || '—'}</td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>No recharges yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!isOwner && !isSuperAdmin && !isSeller && (
        <div className="card"><div className="card-body"><p style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>Your role ({role}) does not have access to this panel.</p></div></div>
      )}
    </div>
  )
}
