import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { hasPermission, PERMISSIONS } from '../permissions'
import Modal from '../components/Modal'
import Loading from '../components/Loading'
import { api } from '../services/api'

export default function Hosts() {
  const { user } = useAuth()
  const [hosts, setHosts] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionModal, setActionModal] = useState(null)
  const [actionType, setActionType] = useState('')

  const canApprove = hasPermission(user, PERMISSIONS.APPROVE_HOSTS)

  // Hosts come ONLY from the hosts API (/hosts records with stats fields).
  // No rooms/users derivation — backend fills the table (room-create auto-insert).
  const fetchHosts = async () => {
    setLoading(true)
    setError('')
    try {
      const hostRes = await api.getHosts({ status: '', search: '', page: 0, size: 100 }).catch(() => null)
      const list = Array.isArray(hostRes)
        ? hostRes
        : (hostRes?.content || hostRes?.hosts || hostRes?.data || [])
      setHosts(list.map((h) => ({ ...h, source: 'registered' })))
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
    try {
      if (actionType === 'ban') {
        const newStatus = actionModal.status === 'banned' ? 'active' : 'banned'
        await api.updateHostApproval(actionModal.id, { status: newStatus })
      }
      setActionModal(null)
      fetchHosts()
    } catch (err) {
      setError(err?.message || 'Action failed')
      setActionModal(null)
    }
  }

  const filtered = hosts.filter((h) =>
    (h.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (h.email || '').toLowerCase().includes(search.toLowerCase()) ||
    String(h.id || '').includes(search)
  )

  if (loading) return <Loading />
  if (error) return <div className="error-message">{error}</div>

  return (
    <div>
      <div className="stats-grid">
        <div className="stats-card"><div className="label">Total Hosts</div><div className="value">{hosts.length}</div></div>
        <div className="stats-card"><div className="label">Active</div><div className="value" style={{ color: 'var(--success)' }}>{hosts.filter((h) => ['active', 'live', 'LIVE'].includes(h.status)).length}</div></div>
        <div className="stats-card"><div className="label">Pending</div><div className="value" style={{ color: 'var(--warning)' }}>{hosts.filter((h) => h.status === 'pending').length}</div></div>
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
                    <td><span className={`badge ${h.status}`}>{h.status}</span></td>
                    <td>{h.roomName || h.roomId || '-'}</td>
                    <td>{(h.followers ?? 0).toLocaleString()}</td>
                    <td>{h.gifts ?? '-'}</td>
                    <td>{h.pkBattles ?? '-'}</td>
                    <td>
                      <div className="actions">
                        {canApprove && (
                          <button className={`btn btn-sm ${h.status === 'banned' ? 'btn-success' : 'btn-warning'}`} onClick={() => handleAction('ban', h)}>
                            {h.status === 'banned' ? 'Unban' : 'Ban'}
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
        <Modal title={`${actionModal.status === 'banned' ? 'Unban' : 'Ban'} Host`} onClose={() => setActionModal(null)}>
          <p>Are you sure you want to {actionModal.status === 'banned' ? 'unban' : 'ban'} <strong>{actionModal.name}</strong>?</p>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setActionModal(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={performAction}>
              {actionModal.status === 'banned' ? 'Unban' : 'Ban'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
