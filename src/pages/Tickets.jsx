import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { hasPermission, PERMISSIONS } from '../permissions'
import Modal from '../components/Modal'
import { api } from '../services/api'
import Loading from '../components/Loading'

const statusOf = (t) => String(t?.status || '').toLowerCase()
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
const normalizeMessage = (m) => {
  const sender = m.sender || m.from || m.senderType || m.role || ''
  const fromSupport = /support|admin|agent/i.test(String(sender)) || m.support === true || m.isAdmin === true
  return {
    text: m.text ?? m.message ?? m.content ?? m.body ?? '',
    from: fromSupport ? 'Support' : (typeof sender === 'string' ? sender : (m.senderName || m.userName || 'User')),
    time: formatDate(m.time || m.createdAt || m.sentAt || m.timestamp),
  }
}

export default function Tickets() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [chatModal, setChatModal] = useState(null)
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState([])
  const canManage = hasPermission(user, PERMISSIONS.MANAGE_TICKETS)
  const canChat = hasPermission(user, PERMISSIONS.LIVE_CHAT_SUPPORT)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    api.getTickets({ page: 0, size: 500 })
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : (data?.content || data?.tickets || data?.data || [])
        setTickets(list)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const filtered = filter === 'all' ? tickets : tickets.filter((t) => statusOf(t) === filter)
  const openCount = tickets.filter((t) => statusOf(t) === 'open').length
  const inProgressCount = tickets.filter((t) => statusOf(t) === 'in_progress').length
  const resolvedCount = tickets.filter((t) => statusOf(t) === 'resolved').length

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!chatInput.trim() || !chatModal) return
    const msg = { text: chatInput, from: 'Support' }
    try {
      await api.sendTicketMessage(chatModal.id, msg)
      setMessages((prev) => [...prev, { ...msg, time: new Date().toLocaleTimeString() }])
      setChatInput('')
    } catch (err) {
      addToast(err?.message || 'Failed to send message', 'error')
    }
  }

  const handleAssign = async (ticket) => {
    try {
      await api.updateTicketStatus(ticket.id, { status: 'in_progress' })
      setTickets((prev) => prev.map((t) => t.id === ticket.id ? { ...t, status: 'in_progress', assignee: user?.name || 'Support Staff' } : t))
      addToast('Ticket assigned', 'success')
    } catch (err) {
      addToast(err?.message || 'Failed to assign ticket', 'error')
    }
  }

  const handleResolve = async (ticket) => {
    try {
      await api.updateTicketStatus(ticket.id, { status: 'resolved' })
      setTickets((prev) => prev.map((t) => t.id === ticket.id ? { ...t, status: 'resolved' } : t))
      setChatModal(null)
      addToast('Ticket resolved', 'success')
    } catch (err) {
      addToast(err?.message || 'Failed to resolve ticket', 'error')
    }
  }

  const openChat = async (ticket) => {
    setChatModal(ticket)
    setMessages([])
    try {
      const data = await api.getTicketMessages(ticket.id)
      const list = Array.isArray(data) ? data : (data?.content || data?.messages || data?.data || [])
      setMessages(list.map(normalizeMessage))
    } catch (err) {
      addToast(err?.message || 'Failed to load messages', 'error')
    }
  }

  if (loading) return <Loading text="Loading tickets..." />

  return (
    <div>
      {error && <div className="error-banner" style={{ background: '#fff5f5', color: '#e53e3e', padding: '8px 16px', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 13 }}>Failed to load tickets: {error}</div>}
      <div className="stats-grid">
        <div className="stats-card"><div className="label">Total Tickets</div><div className="value">{tickets.length}</div></div>
        <div className="stats-card"><div className="label">Open</div><div className="value" style={{ color: 'var(--danger)' }}>{openCount}</div></div>
        <div className="stats-card"><div className="label">In Progress</div><div className="value" style={{ color: 'var(--warning)' }}>{inProgressCount}</div></div>
        <div className="stats-card"><div className="label">Resolved</div><div className="value" style={{ color: 'var(--success)' }}>{resolvedCount}</div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', gap: 8 }}>
            {['all', 'open', 'in_progress', 'resolved'].map((f) => (
              <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(f)}>
                {f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>User</th><th>Subject</th><th>Category</th><th>Priority</th><th>Status</th><th>Messages</th><th>Assignee</th><th>Date</th><th>Actions</th></tr>
              </thead>
              <tbody>
                  {filtered.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>{nameOf(t.reporterUserName || t.user || t.userName)}</td>
                    <td>{t.subject}</td>
                    <td><span className="badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>{t.category || '-'}</span></td>
                    <td><span className={`badge ${t.priority === 'urgent' ? 'banned' : t.priority === 'high' ? 'reported' : 'inactive'}`}>{t.priority || '-'}</span></td>
                    <td><span className={`badge ${statusOf(t) === 'open' ? 'reported' : statusOf(t) === 'in_progress' ? 'pending' : 'active'}`}>{statusOf(t).replace('_', ' ') || '-'}</span></td>
                    <td>{t.messages ?? t.messageCount ?? 0}</td>
                    <td>{nameOf(t.assignee)}</td>
                    <td>{formatDate(t.date || t.createdAt)}</td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-primary btn-sm" onClick={() => openChat(t)}>Chat</button>
                        {canManage && statusOf(t) === 'open' && <button className="btn btn-warning btn-sm" onClick={() => handleAssign(t)}>Assign</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {chatModal && (
        <Modal title={`Ticket: ${chatModal.subject}`} onClose={() => setChatModal(null)}>
          <div style={{ marginBottom: 16, maxHeight: 250, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: 20 }}>No messages yet</p>
            ) : (
              messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.from === 'Support' ? 'flex-end' : 'flex-start' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 2 }}>{m.from} • {m.time}</span>
                  <div style={{ background: m.from === 'Support' ? 'var(--primary-light)' : '#f3f4f6', padding: '8px 12px', borderRadius: 12, maxWidth: '80%', fontSize: 13 }}>
                    {m.text}
                  </div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 8 }}>
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={canChat ? 'Type a message...' : 'You do not have live chat permission'} disabled={!canChat} style={{ flex: 1, padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }} />
            <button type="submit" className="btn btn-primary btn-sm" disabled={!canChat}>Send</button>
          </form>
          <div className="modal-actions" style={{ marginTop: 12 }}>
            <button className="btn btn-outline" onClick={() => setChatModal(null)}>Close</button>
            {canManage && statusOf(chatModal) !== 'resolved' && (
              <button className="btn btn-success" onClick={() => handleResolve(chatModal)}>Mark Resolved</button>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
