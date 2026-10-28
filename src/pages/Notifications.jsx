import { useState, useEffect, useRef } from 'react'
import { api } from '../services/api'
import Loading from '../components/Loading'
import { useToast } from '../context/ToastContext'

const POLL_INTERVAL = 30 * 1000
const POLL_MAX_DURATION = 5 * 60 * 1000

async function fetchAllHistory() {
  const data = await api.getNotificationHistory(0, 100)
  if (Array.isArray(data)) return data
  if (data?.content) {
    // Paginated response: fetch every page so the full history shows
    const all = [...data.content]
    const totalPages = Math.min(data.totalPages || 1, 50)
    for (let p = 1; p < totalPages; p++) {
      const page = await api.getNotificationHistory(p, data.size || 100).catch(() => null)
      if (page?.content) all.push(...page.content)
    }
    return all
  }
  return data?.notifications || data?.data || []
}

const formatDate = (v) => {
  if (!v) return { date: '—', time: '—' }
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return { date: String(v), time: '—' }
  return { date: d.toLocaleDateString(), time: d.toLocaleTimeString() }
}

const normalizeHistory = (n, idx) => {
  const when = n.createdAt || n.sentAt || n.date || n.timestamp
  const formatted = when ? formatDate(when) : { date: n.date || '—', time: n.time || '—' }
  return {
    ...n,
    _key: n.id ?? n.jobId ?? `${idx}-${n.title || 'notification'}`,
    type: n.type || n.notificationType || 'notification',
    title: n.title || n.subject || '(no title)',
    audience: n.audience || n.recipient || n.recipientType || '—',
    status: n.status || '—',
    date: formatted.date,
    time: formatted.time,
    reads: n.reads ?? n.readCount ?? n.readByCount ?? 0,
  }
}

export default function Notifications() {
  const { addToast } = useToast()
  const [type, setType] = useState('notification')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState('all')
  const [specificUserId, setSpecificUserId] = useState('')
  const [image, setImage] = useState(null)
  const [schedule, setSchedule] = useState('')
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [job, setJob] = useState(null)
  const [sendError, setSendError] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const pollTimer = useRef(null)
  const mountedRef = useRef(true)
  const sendingRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (pollTimer.current) clearTimeout(pollTimer.current)
    }
  }, [])


  const setHistoryList = (list) => setHistory((Array.isArray(list) ? list : []).map(normalizeHistory))

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const list = await fetchAllHistory()
        if (!cancelled) setHistoryList(list)
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load history')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const typeMap = { notification: 'ADMIN_BROADCAST', announcement: 'ADMIN_ANNOUNCEMENT', promo: 'ADMIN_PROMOTIONAL' }
  const recipientMap = { all: 'ALL_USERS', active: 'ACTIVE_USERS', vip: 'VIP_USERS', inactive: 'INACTIVE_USERS', banned: 'BANNED_USERS', specific: 'SELECTED_USERS' }

  // Poll the specific job until COMPLETED/FAILED, then refresh history from the API
  const pollJob = (jobId) => {
    const startedAt = Date.now()
    if (pollTimer.current) clearTimeout(pollTimer.current)

    const tick = async () => {
      let status = null
      try { status = await api.getMassJobStatus(jobId) } catch { /* retry next tick */ }
      if (!mountedRef.current) return

      if (status && (status.status === 'COMPLETED' || status.status === 'FAILED')) {
        setJob({ jobId, status: status.status })
        try {
          const list = await fetchAllHistory()
          if (mountedRef.current) setHistoryList(list)
        } catch { /* history refresh failed */ }
        if (!mountedRef.current) return
        addToast(
          status.status === 'COMPLETED' ? 'Notification sent successfully' : (status.errorMessage || 'Notification failed'),
          status.status === 'COMPLETED' ? 'success' : 'error'
        )
        setJob(null)
        return
      }

      if (status?.status) setJob({ jobId, status: status.status })

      const elapsed = Date.now() - startedAt
      if (elapsed >= POLL_MAX_DURATION) {
        try {
          const list = await fetchAllHistory()
          if (mountedRef.current) setHistoryList(list)
        } catch { /* ignore */ }
        if (mountedRef.current) setJob(null)
        return
      }
      pollTimer.current = setTimeout(tick, Math.min(POLL_INTERVAL, POLL_MAX_DURATION - elapsed))
    }
    tick()
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (sendingRef.current) return
    sendingRef.current = true
    setSending(true)
    setSendError(null)
    try {
      if (type === 'notification' && audience === 'specific' && !specificUserId.trim()) {
        throw new Error('Please enter User ID for specific user')
      }
      const recipient = recipientMap[audience] || 'ALL_USERS'
      const apiType = typeMap[type] || 'ADMIN_BROADCAST'
      const payload = { title, body: message, recipient, type: apiType }
      if (recipient === 'SELECTED_USERS') payload.userIds = [specificUserId.trim()]
      else if (schedule) payload.schedule = schedule
      const wasScheduled = !!schedule
      let response
      if (recipient === 'SELECTED_USERS') {
        response = await api.sendNotification({ ...payload, image })
      } else {
        response = await api.sendMassNotification(payload, image)
      }

      setTitle('')
      setMessage('')
      setImage(null)
      setSchedule('')

      if (response?.jobId && !wasScheduled) {
        // Async job (202 + jobId): show queued chip, refresh once, then poll status
        setJob({ jobId: response.jobId, status: response.status || 'QUEUED' })
        fetchAllHistory().then((list) => { if (mountedRef.current) setHistoryList(list) }).catch(() => {})
        pollJob(response.jobId)
      } else {
        // Scheduled send or older backend without jobId
        setFeedback(wasScheduled ? 'Scheduled!' : 'Sent successfully!')
        fetchAllHistory().then((list) => { if (mountedRef.current) setHistoryList(list) }).catch(() => {})
        setTimeout(() => { if (mountedRef.current) setFeedback(null) }, 3000)
      }
    } catch (err) {
      setSendError(err.message || 'Failed to send notification')
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  if (loading) return <Loading text="Loading notifications..." />

  return (
    <div>
      {error && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          Could not load notification history: {error}. You can still send notifications below.
        </div>
      )}
      {sendError && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>✗ {sendError}</div>
      )}

      <div className="card">
        <div className="card-header">{type === 'notification' ? 'Send Push Notification' : type === 'announcement' ? 'Broadcast Announcement' : 'Promotional Banner'}</div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[
              { key: 'notification', label: 'Push Notification' },
              { key: 'announcement', label: 'Announcement' },
              { key: 'promo', label: 'Promo Banner' },
            ].map((t) => (
              <button key={t.key} className={`btn btn-sm ${type === t.key ? 'btn-primary' : 'btn-outline'}`} onClick={() => setType(t.key)}>{t.label}</button>
            ))}
          </div>

          <form onSubmit={handleSend}>
            <div className="form-group">
              <label>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title..." required />
            </div>
            <div className="form-group">
              <label>Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message..."
                required
                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14, minHeight: 100, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
            <div className="form-group">
              <label>Image (optional)</label>
              <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} />
              {image && <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>{image.name}</div>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>Audience</label>
                <select value={audience} onChange={(e) => setAudience(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
                  <option value="all">All Users</option>
                  <option value="active">Active Users</option>
                  <option value="vip">VIP Users</option>
                  <option value="inactive">Inactive Users</option>
                  <option value="banned">Banned Users</option>
                  {type === 'notification' && <option value="specific">Specific User (ID)</option>}
                </select>
              </div>
              {type === 'notification' && audience === 'specific' ? (
                <div className="form-group">
                  <label>User ID</label>
                  <input value={specificUserId} onChange={(e) => setSpecificUserId(e.target.value)} placeholder="Enter user ID e.g. 100346" required />
                </div>
              ) : (
                <div className="form-group">
                  <label>Schedule (optional)</label>
                  <input type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
                </div>
              )}
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
              <button type="submit" className="btn btn-primary" disabled={sending}>
                {sending ? 'Sending...' : schedule ? 'Schedule' : 'Send Now'}
              </button>
              {feedback && <span style={{ color: 'var(--success)', fontSize: 13 }}>✓ {feedback}</span>}
              {job && (
                <span className={`badge ${job.status === 'FAILED' ? 'banned' : 'reported'}`} style={{ textTransform: 'capitalize' }}>
                  Job #{job.jobId}: {String(job.status || 'QUEUED').toLowerCase()}
                </span>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Notification History ({history.length})</div>
        <div className="card-body">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Audience</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Reads</th>
                </tr>
              </thead>
              <tbody>
                {history.map((n) => (
                  <tr key={n._key}>
                    <td><span className="badge reported" style={{ textTransform: 'capitalize' }}>{n.type}</span></td>
                    <td style={{ fontWeight: 500 }}>{n.title}</td>
                    <td>{n.audience}</td>
                    <td><span className={`badge ${String(n.status).toLowerCase()}`}>{n.status}</span></td>
                    <td>{n.date}</td>
                    <td>{n.time}</td>
                    <td>{Number(n.reads || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>No notifications sent yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
