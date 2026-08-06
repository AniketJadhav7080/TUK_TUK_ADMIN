import { useState, useEffect } from 'react'
import { api } from '../services/api'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

const missions = [
  { id: 'm1', name: 'Daily Streak', reward: '50 coins', progress: 70, target: '7 days', type: 'daily' },
  { id: 'm2', name: 'Voice Chat 1hr', reward: '100 coins', progress: 45, target: '60 min', type: 'daily' },
  { id: 'm3', name: 'Send 5 Gifts', reward: '75 coins', progress: 3, target: '5 gifts', type: 'daily' },
  { id: 'm4', name: 'Win 3 PK Battles', reward: '300 coins', progress: 1, target: '3 wins', type: 'weekly' },
]

const achievements = [
  { name: 'Rising Star', condition: 'Reach 1,000 followers', usersEarned: 1240 },
  { name: 'Gift Master', condition: 'Receive 500 gifts', usersEarned: 580 },
  { name: 'PK Champion', condition: 'Win 50 PK battles', usersEarned: 230 },
  { name: 'Social Butterfly', condition: 'Join 100 voice rooms', usersEarned: 890 },
]

export default function Events() {
  const [tab, setTab] = useState('events')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'music', reward: '', startDate: '', endDate: '' })
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getEvents()
      .then((data) => {
        if (data) {
          if (Array.isArray(data)) setEvents(data)
          else if (data.content) setEvents(data.content)
        }
      })
      .catch(() => { setError('Failed to load events from server.') })
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await api.createEvent(form)
      setShowCreate(false)
      setForm({ name: '', type: 'music', reward: '', startDate: '', endDate: '' })
      const data = await api.getEvents()
      if (data) {
        if (Array.isArray(data)) setEvents(data)
        else if (data.content) setEvents(data.content)
      }
    } catch {
      setError('Failed to create event.')
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
        <div className="stats-card"><div className="label">Active Events</div><div className="value" style={{ color: 'var(--success)' }}>{events.filter((e) => e.status === 'active').length}</div></div>
        <div className="stats-card"><div className="label">Upcoming</div><div className="value" style={{ color: 'var(--warning)' }}>{events.filter((e) => e.status === 'upcoming').length}</div></div>
        <div className="stats-card"><div className="label">Total Participants</div><div className="value">{events.reduce((s, e) => s + (e.participants ?? 0), 0).toLocaleString()}</div></div>
        <div className="stats-card"><div className="label">Daily Missions</div><div className="value">{missions.length}</div></div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['events', 'missions', 'achievements'].map((t) => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(t)}>
            {t === 'events' ? 'Events' : t === 'missions' ? 'Daily Missions' : 'Achievements'}
          </button>
        ))}
        {tab === 'events' && <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setShowCreate(true)}>+ Create Event</button>}
      </div>

      {tab === 'events' && (
        <div className="card">
          <div className="card-header">Event List</div>
          <div className="card-body">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Event Name</th><th>Type</th><th>Status</th><th>Start</th><th>End</th><th>Participants</th><th>Reward</th><th>Host</th></tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 500 }}>{e.name}</td>
                      <td><span className="badge" style={{ background: '#e0e7ff', color: '#3730a3', textTransform: 'capitalize' }}>{e.type}</span></td>
                      <td><span className={`badge ${e.status}`}>{e.status}</span></td>
                      <td>{e.startDate}</td>
                      <td>{e.endDate}</td>
                      <td>{(e.participants ?? 0).toLocaleString()}</td>
                      <td style={{ fontWeight: 500 }}>{e.reward}</td>
                      <td>{e.host}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'missions' && (
        <div className="card">
          <div className="card-header">Daily / Weekly Missions</div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {missions.map((m) => (
                <div key={m.id} style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600 }}>{m.name}</span>
                    <span className={`badge ${m.type === 'daily' ? 'active' : 'reported'}`}>{m.type}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 8 }}>Reward: <strong>{m.reward}</strong></div>
                  <div style={{ background: '#f3f4f6', borderRadius: 8, height: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${(m.progress / parseInt(m.target)) * 100}%`, background: 'var(--primary)', height: '100%', borderRadius: 8 }} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>{m.progress} / {m.target}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'achievements' && (
        <div className="card">
          <div className="card-header">Achievement Badges</div>
          <div className="card-body">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Badge</th><th>Condition</th><th>Users Earned</th></tr>
                </thead>
                <tbody>
                  {achievements.map((a, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500, fontSize: 16 }}>{a.name}</td>
                      <td>{a.condition}</td>
                      <td style={{ fontWeight: 600 }}>{a.usersEarned.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <Modal title="Create New Event" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate}>
            <div className="form-group"><label>Event Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
                  <option value="music">Music</option>
                  <option value="pk">PK Battle</option>
                  <option value="promo">Promotional</option>
                  <option value="social">Social</option>
                  <option value="cultural">Cultural</option>
                </select>
              </div>
              <div className="form-group"><label>Reward</label><input value={form.reward} onChange={(e) => setForm({ ...form, reward: e.target.value })} required /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group"><label>Start Date</label><input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required /></div>
              <div className="form-group"><label>End Date</label><input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required /></div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Event</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
