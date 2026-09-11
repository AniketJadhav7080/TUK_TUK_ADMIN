import { useState, useEffect } from 'react'
import { api } from '../services/api'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

const PERIODS = ['monthly', 'quarterly', 'yearly']

export default function DailyMissions() {
  const [missions, setMissions] = useState([])
  const [superAdmins, setSuperAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', period: 'monthly', requirement: '', targetAdmin: 'ALL' })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const [mData, aData] = await Promise.all([
          api.getMissions().catch(() => []),
          api.getAdmins().catch(() => api.listAdmins().catch(() => [])),
        ])
        if (cancelled) return
        if (Array.isArray(mData)) setMissions(mData)
        const list = Array.isArray(aData) ? aData : (aData.admins || aData.content || [])
        setSuperAdmins(list.filter((a) => String(a.role).toLowerCase().includes('super')))
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
    setForm({ name: '', description: '', period: 'monthly', requirement: '', targetAdmin: 'ALL' })
    setShowModal({ type: 'create' })
  }

  const openEdit = (m) => {
    setForm({ name: m.name, description: m.description || '', period: m.period || m.type || 'monthly', requirement: String(m.requirement || ''), targetAdmin: m.targetAdminId || m.targetAdmin || 'ALL' })
    setShowModal({ type: 'edit', mission: m })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const data = {
      name: form.name, description: form.description,
      period: form.period, requirement: parseInt(form.requirement) || 1,
      targetAdminId: form.targetAdmin,
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
        else setMissions((prev) => [{ ...data, id: Date.now(), status: 'active', completions: 0 }, ...prev])
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

  const adminName = (id) => {
    if (!id || id === 'ALL') return 'All Super Admins'
    const a = superAdmins.find((x) => String(x.id) === String(id) || String(x.adminId) === String(id))
    return a ? `Super Admin (${a.country || a.countryCode || '—'})` : id
  }

  if (loading) return <Loading text="Loading missions..." />

  return (
    <div>
      {error && <div className="alert alert-warning" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="stats-grid">
        <div className="stats-card"><div className="label">Total Missions</div><div className="value">{missions.length}</div></div>
        <div className="stats-card"><div className="label">Monthly</div><div className="value">{missions.filter((m) => (m.period || m.type) === 'monthly').length}</div></div>
        <div className="stats-card"><div className="label">Quarterly</div><div className="value">{missions.filter((m) => (m.period || m.type) === 'quarterly').length}</div></div>
        <div className="stats-card"><div className="label">Yearly</div><div className="value">{missions.filter((m) => (m.period || m.type) === 'yearly').length}</div></div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Missions for Super Admins</span>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Add Mission</button>
        </div>
        <div className="card-body">
          {missions.length === 0 ? (
            <p style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>No missions configured</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {missions.map((m) => (
                <div key={m.id} className="card" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-light)', textTransform: 'capitalize' }}>{m.period || m.type} · For: {adminName(m.targetAdminId || m.targetAdmin)}</div>
                    </div>
                    <span className={`badge ${m.status || 'active'}`}>{m.status || 'active'}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-light)', margin: '0 0 8px', minHeight: 20 }}>{m.description || 'No description'}</p>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>Goal: {m.requirement || 'N/A'}</div>
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
              <div className="form-group"><label>Period</label>
                <select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
                  {PERIODS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Requirement (goal)</label><input type="number" value={form.requirement} onChange={(e) => setForm({ ...form, requirement: e.target.value })} placeholder="e.g., 5" /></div>
            </div>
            <div className="form-group"><label>Super Admin</label>
              <select value={form.targetAdmin} onChange={(e) => setForm({ ...form, targetAdmin: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
                <option value="ALL">All Super Admins</option>
                {superAdmins.map((a) => <option key={a.id} value={a.id}>Super Admin ({a.country || a.countryCode || '—'})</option>)}
              </select>
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
