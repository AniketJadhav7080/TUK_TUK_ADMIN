import { useState, useEffect } from 'react'
import { api } from '../services/api'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

const emptyForm = { name: '', description: '', eventType: 'PK_BATTLE', rewards: '', hostName: '', countryCode: 'IN', startDate: '', endDate: '' }

export default function Events() {
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [image, setImage] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const normalize = (list) => (Array.isArray(list) ? list : []).map((e) => ({
    id: e.id,
    name: e.name,
    description: e.description,
    type: e.eventType || e.type,
    status: (e.eventStatus || e.status || '').toLowerCase() || e.status,
    eventStatus: e.eventStatus,
    startDate: e.startDate,
    endDate: e.endDate,
    rewards: e.rewards ?? e.reward,
    hostName: e.hostName || e.host,
    imageUrl: e.imageUrl,
    countryCode: e.countryCode,
    sent: e.sent,
  }))

  useEffect(() => {
    api.getEvents()
      .then((data) => {
        if (!data) return
        if (Array.isArray(data)) setEvents(normalize(data))
        else if (data.content) setEvents(normalize(data.content))
      })
      .catch(() => { setError('Failed to load events from server.') })
      .finally(() => setLoading(false))
  }, [])

  const refresh = async () => {
    const data = await api.getEvents()
    if (!data) return
    if (Array.isArray(data)) setEvents(normalize(data))
    else if (data.content) setEvents(normalize(data.content))
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await api.createEvent(form, image)
      setShowCreate(false)
      setForm(emptyForm); setImage(null)
      await refresh()
    } catch {
      setError('Failed to create event.')
    }
  }

  const openEdit = (ev) => {
    setForm({ name: ev.name || '', description: ev.description || '', eventType: ev.type || 'PK_BATTLE', rewards: String(ev.rewards ?? ''), hostName: ev.hostName || '', countryCode: ev.countryCode || 'IN', startDate: (ev.startDate || '').slice(0, 16), endDate: (ev.endDate || '').slice(0, 16) })
    setImage(null)
    setShowEdit(ev)
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    try {
      const payload = { name: form.name, description: form.description, eventType: form.eventType, rewards: Number(form.rewards) || 0, hostName: form.hostName, countryCode: form.countryCode, startDate: form.startDate, endDate: form.endDate }
      await api.updateEvent(showEdit.id, payload)
      setEvents((prev) => prev.map((x) => x.id === showEdit.id ? { ...x, ...payload, type: payload.eventType } : x))
      setShowEdit(null)
      setForm(emptyForm); setImage(null)
    } catch {
      setError('Failed to update event.')
    }
  }

  const handleDelete = async () => {
    try {
      await api.deleteEvent(deleteTarget.id)
      setEvents((prev) => prev.filter((x) => x.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      setError('Failed to delete event.')
      setDeleteTarget(null)
    }
  }

  const handleNotify = async (ev) => {
    try {
      await api.notifyEvent(ev.id)
      setEvents((prev) => prev.map((x) => x.id === ev.id ? { ...x, sent: true } : x))
    } catch {
      setError('Failed to send notification.')
    }
  }

  if (loading) return <Loading />

  const fmtDate = (d) => { if (!d) return '-'; try { const dt = new Date(d); return isNaN(dt) ? d.slice(0, 16).replace('T', ' ') : dt.toLocaleString(); } catch { return d } }

  return (
    <div>
      {error && (
        <div style={{ marginBottom: 16, padding: 10, borderRadius: 'var(--radius)', background: '#fee2e2', color: '#991b1b', fontSize: 13 }}>
          {error}
        </div>
      )}
      <div className="stats-grid">
        <div className="stats-card"><div className="label">Active Events</div><div className="value" style={{ color: 'var(--success)' }}>{events.filter((e) => (e.eventStatus || e.status || '').toUpperCase() === 'ACTIVE').length}</div></div>
        <div className="stats-card"><div className="label">Upcoming</div><div className="value" style={{ color: 'var(--warning)' }}>{events.filter((e) => (e.eventStatus || e.status || '').toUpperCase() !== 'ACTIVE').length}</div></div>
        <div className="stats-card"><div className="label">Total Events</div><div className="value">{events.length}</div></div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => { setForm(emptyForm); setImage(null); setShowCreate(true) }}>+ Create Event</button>
      </div>

      <div className="card">
        <div className="card-header">Event List</div>
        <div className="card-body">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Image</th><th>Event Name</th><th>Type</th><th>Status</th><th>Start</th><th>End</th><th>Rewards</th><th>Host</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td>{e.imageUrl ? <img src={e.imageUrl} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} /> : <span style={{ color: 'var(--text-light)' }}>—</span>}</td>
                    <td style={{ fontWeight: 500 }}>{e.name}</td>
                    <td><span className="badge" style={{ background: '#e0e7ff', color: '#3730a3', textTransform: 'capitalize' }}>{e.type}</span></td>
                    <td><span className={`badge ${e.status}`}>{e.eventStatus || e.status}</span></td>
                    <td style={{ fontSize: 12 }}>{fmtDate(e.startDate)}</td>
                    <td style={{ fontSize: 12 }}>{fmtDate(e.endDate)}</td>
                    <td style={{ fontWeight: 500 }}>{e.rewards}</td>
                    <td>{e.hostName}</td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-success btn-sm" onClick={() => handleNotify(e)} title="Notify all users">Notify{e.sent ? ' ✓' : ''}</button>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(e)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(e)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showCreate && (
        <Modal title="Create New Event" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate}>
            <div className="form-group"><label>Event Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="form-group"><label>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required rows={2} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>Type</label>
                <select value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
                  <option value="PK_BATTLE">PK Battle</option>
                  <option value="MUSIC">Music</option>
                  <option value="PROMO">Promotional</option>
                  <option value="SOCIAL">Social</option>
                  <option value="CULTURAL">Cultural</option>
                </select>
              </div>
              <div className="form-group"><label>Rewards (diamonds)</label><input type="number" value={form.rewards} onChange={(e) => setForm({ ...form, rewards: e.target.value })} required /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group"><label>Host Name</label><input value={form.hostName} onChange={(e) => setForm({ ...form, hostName: e.target.value })} required /></div>
              <div className="form-group"><label>Country</label><input value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value })} placeholder="IN" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group"><label>Start Date</label><input type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required /></div>
              <div className="form-group"><label>End Date</label><input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required /></div>
            </div>
            <div className="form-group"><label>Image</label><input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} />{image && <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>{image.name}</div>}</div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Event</button>
            </div>
          </form>
        </Modal>
      )}

      {showEdit && (
        <Modal title={`Edit: ${showEdit.name}`} onClose={() => setShowEdit(null)}>
          <form onSubmit={handleEdit}>
            <div className="form-group"><label>Event Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="form-group"><label>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>Type</label>
                <select value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
                  <option value="PK_BATTLE">PK Battle</option>
                  <option value="MUSIC">Music</option>
                  <option value="PROMO">Promotional</option>
                  <option value="SOCIAL">Social</option>
                  <option value="CULTURAL">Cultural</option>
                </select>
              </div>
              <div className="form-group"><label>Rewards (diamonds)</label><input type="number" value={form.rewards} onChange={(e) => setForm({ ...form, rewards: e.target.value })} required /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group"><label>Host Name</label><input value={form.hostName} onChange={(e) => setForm({ ...form, hostName: e.target.value })} required /></div>
              <div className="form-group"><label>Country</label><input value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value })} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group"><label>Start Date</label><input type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required /></div>
              <div className="form-group"><label>End Date</label><input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required /></div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowEdit(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete Event" onClose={() => setDeleteTarget(null)}>
          <p>Delete <strong>{deleteTarget.name}</strong> permanently?</p>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
