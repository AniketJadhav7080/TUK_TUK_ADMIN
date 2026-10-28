import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { hasPermission, PERMISSIONS } from '../permissions'
import Modal from '../components/Modal'
import Loading from '../components/Loading'
import { ErrorState } from '../components/SkeletonLoader'
import { api } from '../services/api'

export default function Hosts() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [hosts, setHosts] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionModal, setActionModal] = useState(null)
  const [actionType, setActionType] = useState('')

  const canApprove = hasPermission(user, PERMISSIONS.APPROVE_HOSTS)
  const statusOf = (h) => String(h?.status || '').toLowerCase()

  // Hosts come ONLY from the hosts API (/hosts records with stats fields).
  // No rooms/users derivation — backend fills the table (room-create auto-insert).
  const fetchHosts = async () => {
    setLoading(true)
    setError('')
    try {
      const hostRes = await api.getHosts({ status: '', search: '', page: 0, size: 100 })
      const list = Array.isArray(hostRes)
        ? hostRes
        : (hostRes?.content || hostRes?.hosts || hostRes?.data || [])
      // Backend shape: hostId (not id), gifts {total,value} object, totalPkCount
      setHosts(list.map((h) => {
        const gifts = (h.gifts && typeof h.gifts === 'object') ? (h.gifts.total ?? '-') : h.gifts
        return {
          ...h,
          id: h.id ?? h.hostId,
          gifts,
          pkBattles: h.pkBattles ?? h.totalPkCount,
          source: 'registered',
        }
      }))
    } catch (err) {
      setError(err?.message || 'Failed to load hosts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHosts()
  }, [])

  const handleAction = (type, host) => {
    setActionType(type)
    setActionModal(host)
  }

  const performAction = async () => {
    const approve = actionType === 'approve'
    const banning = actionType === 'ban' && statusOf(actionModal) !== 'banned'
    try {
      if (approve) {
        await api.approveHost(actionModal.id)
      } else if (actionType === 'ban') {
        const newStatus = banning ? 'banned' : 'active'
        await api.updateHostApproval(actionModal.id, { status: newStatus })
      }
      setActionModal(null)
      addToast(approve ? 'Host approved' : banning ? 'Host banned' : 'Host unbanned', 'success')
      fetchHosts()
    } catch (err) {
      addToast(err?.message || 'Action failed', 'error')
    }
  }

  const filtered = hosts.filter((h) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (h.name || '').toLowerCase().includes(q) ||
      (h.email || '').toLowerCase().includes(q) ||
      String(h.id || '').toLowerCase().includes(q)
  })

  if (loading) return <Loading />
  if (error) return <div style={{ padding: 24 }}><ErrorState message={error} onRetry={fetchHosts} /></div>

  return (
    <div>
      <div className="stats-grid">
        <div className="stats-card"><div className="label">Total Hosts</div><div className="value">{hosts.length}</div></div>
        <div className="stats-card"><div className="label">Active</div><div className="value" style={{ color: 'var(--success)' }}>{hosts.filter((h) => ['active', 'live', 'approved'].includes(statusOf(h))).length}</div></div>
        <div className="stats-card"><div className="label">Pending</div><div className="value" style={{ color: 'var(--warning)' }}>{hosts.filter((h) => statusOf(h) === 'pending').length}</div></div>
        <div className="stats-card"><div className="label">Total Followers</div><div className="value">{hosts.reduce((s, h) => s + (Number(h.followers) || 0), 0).toLocaleString()}</div></div>
      </div>

      <div className="card">
        <div className="card-header">Host Management ({hosts.length})</div>
        <div className="card-body">
          <div className="search-bar">
            <input placeholder="Search hosts..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Room</th>
                  <th>Followers</th>
                  <th>Gifts</th>
                  <th>PK Battles</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h) => (
                  <tr key={h.id}>
                    <td style={{ fontWeight: 500 }}>{h.name}</td>
                    <td>{h.email}</td>
                    <td><span className={`badge ${statusOf(h)}`}>{h.status}</span></td>
                    <td>{h.roomName || h.roomId || '-'}</td>
                    <td>{(h.followers ?? 0).toLocaleString()}</td>
                    <td>{h.gifts ?? '-'}</td>
                    <td>{h.pkBattles ?? '-'}</td>
                    <td>
                      <div className="actions">
                        {canApprove && statusOf(h) === 'pending' && (
                          <button className="btn btn-success btn-sm" onClick={() => handleAction('approve', h)}>Approve</button>
                        )}
                        {canApprove && (
                          <button className={`btn btn-sm ${statusOf(h) === 'banned' ? 'btn-success' : 'btn-warning'}`} onClick={() => handleAction('ban', h)}>
                            {statusOf(h) === 'banned' ? 'Unban' : 'Ban'}
                          </button>
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

      {actionModal && (
        <Modal
          title={actionType === 'approve' ? 'Approve Host' : statusOf(actionModal) === 'banned' ? 'Unban Host' : 'Ban Host'}
          onClose={() => setActionModal(null)}
        >
          <p>
            {actionType === 'approve'
              ? <>Approve <strong>{actionModal.name}</strong> as a host?</>
              : <>Are you sure you want to {statusOf(actionModal) === 'banned' ? 'unban' : 'ban'} <strong>{actionModal.name}</strong>?</>}
          </p>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setActionModal(null)}>Cancel</button>
            <button className={`btn ${actionType === 'approve' || statusOf(actionModal) === 'banned' ? 'btn-success' : 'btn-danger'}`} onClick={performAction}>
              {actionType === 'approve' ? 'Approve' : statusOf(actionModal) === 'banned' ? 'Unban' : 'Ban'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
