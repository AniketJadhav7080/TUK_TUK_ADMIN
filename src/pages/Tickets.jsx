import { useState, useEffect } from 'react'
import Modal from '../components/Modal'
import { api } from '../services/api'
import Loading from '../components/Loading'

export default function Tickets() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [chatModal, setChatModal] = useState(null)
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState([])

  useEffect(() => {
    let cancelled = false
    const params = filter === 'all' ? '' : `?status=${filter}&page=0&size=20`
    api.getTickets(params)
      .then((data) => {
        if (!cancelled) setTickets(Array.isArray(data) ? data : (data?.content || []))
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [filter])

  const openCount = tickets.filter((t) => t.status === 'open').length

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!chatInput.trim() || !chatModal) return
    const msg = { text: chatInput, from: 'Support' }
    try {
      await api.sendTicketMessage(chatModal.id, msg)
      setMessages((prev) => [...prev, { ...msg, time: new Date().toLocaleTimeString() }])
    } catch {}
    setChatInput('')
  }

  const handleAssign = async (ticket) => {
    try {
      await api.updateTicketStatus(ticket.id, { status: 'in_progress' })
      setTickets((prev) => prev.map((t) => t.id === ticket.id ? { ...t, status: 'in_progress', assignee: 'Support Staff' } : t))
    } catch (err) {
      console.error('Failed to assign ticket:', err)
    }
  }

  const handleResolve = async (ticket) => {
    try {
      await api.updateTicketStatus(ticket.id, { status: 'resolved' })
      setTickets((prev) => prev.map((t) => t.id === ticket.id ? { ...t, status: 'resolved' } : t))
    } catch (err) {
      console.error('Failed to resolve ticket:', err)
    }
    setChatModal(null)
  }

  const openChat = async (ticket) => {
    setChatModal(ticket)
    setMessages([])
    try {
      const data = await api.getTicketMessages(ticket.id)
      setMessages(Array.isArray(data) ? data : [])
    } catch {}
  }

  if (loading) return <Loading text="Loading tickets..." />

  return (
    <div>
      {error && <div className="error-banner" style={{ background: '#fff5f5', color: '#e53e3e', padding: '8px 16px', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 13 }}>Failed to load tickets: {error}</div>}
      <div className="stats-grid">
        <div className="stats-card"><div className="label">Total Tickets</div><div className="value">{tickets.length}</div></div>
        <div className="stats-card"><div className="label">Open</div><div className="value" style={{ color: 'var(--danger)' }}>{openCount}</div></div>
        <div className="stats-card"><div className="label">In Progress</div><div className="value" style={{ color: 'var(--warning)' }}>{tickets.filter((t) => t.status === 'in_progress').length}</div></div>
        <div className="stats-card"><div className="label">Resolved</div><div className="value" style={{ color: 'var(--success)' }}>{tickets.filter((t) => t.status === 'resolved').length}</div></div>
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
                  {tickets.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>{t.reporterUserName || t.user || '-'}</td>
                    <td>{t.subject}</td>
                    <td><span className="badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>{t.category}</span></td>
                    <td><span className={`badge ${t.priority === 'urgent' ? 'banned' : t.priority === 'high' ? 'reported' : 'inactive'}`}>{t.priority}</span></td>
                    <td><span className={`badge ${t.status === 'open' ? 'reported' : t.status === 'in_progress' ? 'pending' : 'active'}`}>{t.status.replace('_', ' ')}</span></td>
                    <td>{t.messages}</td>
                    <td>{t.assignee}</td>
                    <td>{t.date}</td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-primary btn-sm" onClick={() => openChat(t)}>Chat</button>
                        {t.status === 'open' && <button className="btn btn-warning btn-sm" onClick={() => handleAssign(t)}>Assign</button>}
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
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type a message..." style={{ flex: 1, padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }} />
            <button type="submit" className="btn btn-primary btn-sm">Send</button>
          </form>
          <div className="modal-actions" style={{ marginTop: 12 }}>
            <button className="btn btn-outline" onClick={() => setChatModal(null)}>Close</button>
            {chatModal.status !== 'resolved' && (
              <button className="btn btn-success" onClick={() => handleResolve(chatModal)}>Mark Resolved</button>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
