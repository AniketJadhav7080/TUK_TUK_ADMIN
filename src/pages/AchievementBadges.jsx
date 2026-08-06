import { useState, useEffect } from 'react'
import { api } from '../services/api'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

export default function AchievementBadges() {
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', icon: '', color: '#f39c12', requirement: '', category: 'general' })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const data = await api.getBadges()
        if (!cancelled) setBadges(Array.isArray(data) ? data : [])
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
    setForm({ name: '', description: '', icon: '', color: '#f39c12', requirement: '', category: 'general' })
    setShowModal({ type: 'create' })
  }

  const openEdit = (b) => {
    setForm({ name: b.name, description: b.description || '', icon: b.icon || '', color: b.color || '#f39c12', requirement: String(b.requirement || ''), category: b.category || 'general' })
    setShowModal({ type: 'edit', badge: b })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const data = { name: form.name, description: form.description, icon: form.icon, color: form.color, requirement: form.requirement, category: form.category }
    if (showModal.type === 'edit') {
      try {
        await api.updateBadge(showModal.badge.id, data)
        setBadges((prev) => prev.map((b) => b.id === showModal.badge.id ? { ...b, ...data } : b))
      } catch (e) { setError(e.message) }
    } else {
      try {
        const created = await api.createBadge(data)
        if (created?.id) setBadges((prev) => [{ ...created, status: 'active', earned: 0 }, ...prev])
      } catch (e) { setError(e.message) }
    }
    setShowModal(null)
  }

  const handleDelete = async (id) => {
    try {
      await api.deleteBadge(id)
      setBadges((prev) => prev.filter((b) => b.id !== id))
    } catch (e) { setError(e.message) }
  }

  const toggleBadge = async (b) => {
    const newStatus = b.status === 'active' ? 'inactive' : 'active'
    try {
      await api.updateBadge(b.id, { ...b, status: newStatus })
      setBadges((prev) => prev.map((x) => x.id === b.id ? { ...x, status: newStatus } : x))
    } catch {}
  }

  if (loading) return <Loading text="Loading badges..." />

  return (
    <div>
      {error && <div className="alert alert-warning" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="stats-grid">
        <div className="stats-card"><div className="label">Total Badges</div><div className="value">{badges.length}</div></div>
        <div className="stats-card"><div className="label">Active</div><div className="value" style={{ color: 'var(--success)' }}>{badges.filter((b) => b.status === 'active').length}</div></div>
        <div className="stats-card"><div className="label">Total Earned</div><div className="value">{badges.reduce((s, b) => s + (b.earned || b.earnedCount || 0), 0).toLocaleString()}</div></div>
        <div className="stats-card"><div className="label">Categories</div><div className="value">{new Set(badges.map((b) => b.category)).size}</div></div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Badge Catalog</span>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Add Badge</button>
        </div>
        <div className="card-body">
          {badges.length === 0 ? (
            <p style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>No badges configured (API not implemented yet)</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {badges.map((b) => (
                <div key={b.id} className="card" style={{ margin: 0, textAlign: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: b.color || 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#fff', margin: '0 auto 12px' }}>
                    {b.icon || '\u{1F3C6}'}
                  </div>
                  <h4 style={{ margin: '0 0 4px', fontSize: 15 }}>{b.name}</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-light)', margin: '0 0 8px', minHeight: 20 }}>{b.description || 'No description'}</p>
                  <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 8 }}>
                    <span className="badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>{b.category}</span>
                    {' '}
                    <span className={`badge ${b.status || 'active'}`}>{b.status || 'active'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-light)' }}>
                    Earned by <strong>{(b.earned || b.earnedCount || 0).toLocaleString()}</strong> users
                    {b.requirement ? ` · Req: ${b.requirement}` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12, justifyContent: 'center' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(b)}>Edit</button>
                    <button className={`btn btn-sm ${(b.status || 'active') === 'active' ? 'btn-warning' : 'btn-success'}`} onClick={() => toggleBadge(b)}>
                      {(b.status || 'active') === 'active' ? 'Disable' : 'Enable'}
                    </button>
                    <button className="btn btn-danger-outline btn-sm" onClick={() => handleDelete(b.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <Modal title={showModal.type === 'create' ? 'Add Badge' : `Edit: ${showModal.badge.name}`} onClose={() => setShowModal(null)}>
          <form onSubmit={handleSave}>
            <div className="form-group"><label>Badge Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="form-group"><label>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group"><label>Icon (emoji)</label><input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></div>
              <div className="form-group"><label>Color</label><input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group"><label>Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
                  {['general', 'social', 'voice', 'gaming', 'premium', 'special'].map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Requirement</label><input value={form.requirement} onChange={(e) => setForm({ ...form, requirement: e.target.value })} placeholder="e.g., 100 hours" /></div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{showModal.type === 'create' ? 'Add Badge' : 'Save Changes'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
