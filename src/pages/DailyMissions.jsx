import { useState, useEffect } from 'react'
import { api } from '../services/api'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

export default function DailyMissions() {
  const [missions, setMissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', reward: '', type: 'daily', requirement: '', icon: '' })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const data = await api.getMissions()
        if (!cancelled) setMissions(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const openCreate = () => {
    setForm({ name: '', description: '', reward: '', type: 'daily', requirement: '', icon: '' })
    setShowModal({ type: 'create' })
  }

  const openEdit = (m) => {
    setForm({ name: m.name, description: m.description || '', reward: String(m.reward || ''), type: m.type || 'daily', requirement: String(m.requirement || m.progress || ''), icon: m.icon || '' })
    setShowModal({ type: 'edit', mission: m })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const data = {
      name: form.name, description: form.description, reward: form.reward,
      type: form.type, requirement: parseInt(form.requirement) || 1, icon: form.icon,
    }
    if (showModal.type === 'edit') {
      try {
        await api.updateMission(showModal.mission.id, data)
        setMissions((prev) => prev.map((m) => m.id === showModal.mission.id ? { ...m, ...data } : m))
      } catch (e) { setError(e.message) }
    } else {
      try {
        const created = await api.createMission(data)
        if (created?.id) setMissions((prev) => [{ ...created, status: 'active', completions: 0 }, ...prev])
      } catch (e) { setError(e.message) }
    }
    setShowModal(null)
  }

  const handleDelete = async (id) => {
    try {
      await api.deleteMission(id)
      setMissions((prev) => prev.filter((m) => m.id !== id))
    } catch (e) { setError(e.message) }
  }

  if (loading) return <Loading text="Loading missions..." />

  return (
    <div>
      {error && <div className="alert alert-warning" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="stats-grid">
        <div className="stats-card"><div className="label">Total Missions</div><div className="value">{missions.length}</div></div>
        <div className="stats-card"><div className="label">Daily</div><div className="value">{missions.filter((m) => m.type === 'daily').length}</div></div>
        <div className="stats-card"><div className="label">Weekly</div><div className="value">{missions.filter((m) => m.type === 'weekly').length}</div></div>
        <div className="stats-card"><div className="label">Active</div><div className="value" style={{ color: 'var(--success)' }}>{missions.filter((m) => m.status === 'active' || !m.status).length}</div></div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Mission Catalog</span>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Add Mission</button>
        </div>
        <div className="card-body">
          {missions.length === 0 ? (
            <p style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>No missions configured (API not implemented yet)</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {missions.map((m) => (
                <div key={m.id} className="card" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: m.type === 'daily' ? 'var(--primary)' : '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#fff' }}>
                      {m.icon || (m.type === 'daily' ? '\u{1F4C5}' : '\u{1F4C6}')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-light)', textTransform: 'capitalize' }}>{m.type} · {m.completions || 0} completions</div>
                    </div>
                    <span className={`badge ${m.status || 'active'}`}>{m.status || 'active'}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-light)', margin: '0 0 8px', minHeight: 20 }}>{m.description || 'No description'}</p>
                  <div style={{ fontSize: 13, color: 'var(--text)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Reward: <strong>{m.reward}</strong></span>
                    <span>Goal: {m.requirement || m.progress || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(m)}>Edit</button>
                    <button className="btn btn-danger-outline btn-sm" onClick={() => handleDelete(m.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <Modal title={showModal.type === 'create' ? 'Add Mission' : `Edit: ${showModal.mission.name}`} onClose={() => setShowModal(null)}>
          <form onSubmit={handleSave}>
            <div className="form-group"><label>Mission Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="form-group"><label>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group"><label>Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="achievement">Achievement</option>
                </select>
              </div>
              <div className="form-group"><label>Icon (emoji)</label><input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group"><label>Reward</label><input value={form.reward} onChange={(e) => setForm({ ...form, reward: e.target.value })} required placeholder="100 coins" /></div>
              <div className="form-group"><label>Requirement (goal)</label><input type="number" value={form.requirement} onChange={(e) => setForm({ ...form, requirement: e.target.value })} placeholder="e.g., 5" /></div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{showModal.type === 'create' ? 'Add Mission' : 'Save Changes'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
