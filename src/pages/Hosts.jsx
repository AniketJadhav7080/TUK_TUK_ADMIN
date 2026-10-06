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

  const fetchHosts = async () => {
    setLoading(true)
    setError('')
    try {
      const [hostRes, roomsRes, usersRes] = await Promise.all([
        api.getHosts({ status: '', search: '', page: 0, size: 100 }).catch(() => null),
        api.getLiveRooms().catch(() => api.getAdminRooms().catch(() => [])),
        api.getUsers('?page=0&size=1000').catch(() => null),
      ])
      const registered = Array.isArray(hostRes)
        ? hostRes
        : (hostRes?.content || hostRes?.hosts || hostRes?.data || [])
      const rooms = Array.isArray(roomsRes) ? roomsRes : (roomsRes?.content || roomsRes?.rooms || [])
      const usersPage = usersRes
      let allUsers = []
      if (Array.isArray(usersPage)) allUsers = usersPage
      else if (usersPage?.content) {
        allUsers = [...usersPage.content]
        const totalPages = usersPage.totalPages || 1
        for (let p = 1; p < totalPages; p++) {
          try {
            const pg = await api.getUsers(`?page=${p}&size=1000`)
            if (pg?.content) allUsers.push(...pg.content)
          } catch { /* keep already loaded pages */ }
        }
      }
      const userMap = {}
      allUsers.forEach((u) => { userMap[String(u.id)] = u })
      const regIds = new Set(registered.map((h) => String(h.id)))
      // Room creator = host (per backend rule): add room hosts missing from register
      const seen = new Set()
      const derived = []
      rooms.forEach((r) => {
        const hid = r.hostId ?? r.host
        if (hid === undefined || hid === null || hid === '') return
        const key = String(hid)
        if (regIds.has(key) || seen.has(key)) return
        seen.add(key)
        const u = userMap[key]
        const live = r.status === 'LIVE' || r.status === 'live' || r.status === 'active'
        derived.push({
          id: hid,
          name: u?.name || u?.username || key,
          email: u?.email || '-',
          status: live ? 'live' : (r.status || 'active'),
          followers: r.viewerCount ?? r.participants ?? 0,
          gifts: '-',
          pkWins: '-',
          pkLosses: '-',
          roomName: r.roomName || r.name || '-',
          country: r.countryCode || r.country || '-',
          source: 'room',
        })
      })
      setHosts([
        ...registered.map((h) => ({ ...h, source: 'registered' })),
        ...derived,
      ])
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
      if (actionType === 'approve') {
        await api.approveHost(actionModal.id)
      } else if (actionType === 'reject') {
        await api.updateHostApproval(actionModal.id, { status: 'rejected' })
      } else if (actionType === 'ban') {
        const newStatus = actionModal.status === 'banned' ? 'active' : 'banned'
        if (actionModal.source === 'room') await api.updateUserStatus(actionModal.id, { status: newStatus })
        else await api.updateHostApproval(actionModal.id, { status: newStatus })
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
    String(h.id || '').includes(search) ||
    (h.roomName || '').toLowerCase().includes(search.toLowerCase())
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
                  <th>PK (W/L)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h) => (
                  <tr key={`${h.source || 'reg'}-${h.id}`}>
                    <td style={{ fontWeight: 500 }}>{h.name}</td>
                    <td>{h.email}</td>
                    <td><span className={`badge ${h.status}`}>{h.status}</span></td>
                    <td>{h.roomName || '-'}</td>
                    <td>{(h.followers ?? 0).toLocaleString()}</td>
                    <td>{h.gifts ?? '-'}</td>
                    <td>{h.pkWins ?? '-'}/{h.pkLosses ?? '-'}</td>
                    <td>
                      <div className="actions">
                        {h.status === 'pending' && canApprove && (
                          <>
                            <button className="btn btn-success btn-sm" onClick={() => handleAction('approve', h)}>Approve</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleAction('reject', h)}>Reject</button>
                          </>
                        )}
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
        <Modal title={actionType === 'approve' ? 'Approve Host' : actionType === 'reject' ? 'Reject Host' : `${actionType === 'ban' && actionModal.status === 'banned' ? 'Unban' : 'Ban'} Host`} onClose={() => setActionModal(null)}>
          <p>Are you sure you want to {actionType === 'approve' ? 'approve' : actionType === 'reject' ? 'reject' : actionModal.status === 'banned' ? 'unban' : 'ban'} <strong>{actionModal.name}</strong>?</p>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setActionModal(null)}>Cancel</button>
            <button className={`btn ${actionType === 'approve' ? 'btn-success' : 'btn-danger'}`} onClick={performAction}>
              {actionType === 'approve' ? 'Approve' : actionType === 'reject' ? 'Reject' : actionModal.status === 'banned' ? 'Unban' : 'Ban'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
