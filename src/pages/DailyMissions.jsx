import { useState, useEffect } from 'react'
import { api } from '../services/api'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

const PERIODS = ['MONTHLY', 'QUARTERLY', 'YEARLY']

export default function DailyMissions() {
  const [missions, setMissions] = useState([])
  const [countries, setCountries] = useState([])
  const [counts, setCounts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(null)
  const [form, setForm] = useState({ missionName: '', description: '', period: 'MONTHLY', goal: '', countryCode: '' })

  const normalize = (list) => (Array.isArray(list) ? list : []).map((m) => ({
    id: m.id,
    name: m.missionName || m.name,
    description: m.description,
    period: m.period || m.type || 'MONTHLY',
    goal: m.goal ?? m.requirement ?? 0,
    countryCode: m.countryCode ?? null,
    status: m.active === false ? 'inactive' : (m.status || 'active'),
    isNotify: m.isNotify ?? m.notified ?? false,
  }))

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const [mData, cData, aData] = await Promise.all([
          api.getMissions().catch(() => []),
          api.getMissionCounts().catch(() => null),
          api.getAdmins().catch(() => api.listAdmins().catch(() => [])),
        ])
        if (cancelled) return
        const arr = Array.isArray(mData) ? mData : (mData.content || [])
        setMissions(normalize(arr))
        if (cData) setCounts(cData)
        const list = Array.isArray(aData) ? aData : (aData.admins || aData.content || [])
        const codes = [...new Set(list.filter((a) => String(a.role).toLowerCase().includes('super')).map((a) => a.country || a.countryCode).filter(Boolean))]
        setCountries(codes)
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
    setForm({ missionName: '', description: '', period: 'MONTHLY', goal: '', countryCode: '' })
    setShowModal({ type: 'create' })
  }

  const openEdit = (m) => {
    setForm({ missionName: m.name, description: m.description || '', period: m.period || 'MONTHLY', goal: String(m.goal ?? ''), countryCode: m.countryCode || '' })
    setShowModal({ type: 'edit', mission: m })
  }

  const payload = () => ({
    missionName: form.missionName,
    description: form.description,
    period: form.period,
    goal: form.goal,
    countryCode: form.countryCode || null,
  })

  const handleSave = async (e) => {
    e.preventDefault()
    if (showModal.type === 'edit') {
      try {
        await api.updateMission(showModal.mission.id, payload())
        setMissions((prev) => prev.map((m) => m.id === showModal.mission.id ? { ...m, name: form.missionName, description: form.description, period: form.period, goal: form.goal, countryCode: form.countryCode || null } : m))
      } catch (e) { setError(e.message) }
    } else {
      try {
        const created = await api.createMission(payload())
        const row = created?.id ? normalize([created])[0] : { ...normalize([{ ...payload(), id: Date.now() }])[0] }
        setMissions((prev) => [row, ...prev])
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

  const toggleStatus = async (m) => {
    const active = m.status !== 'active'
    try {
      await api.toggleMissionStatus(m.id, active)
      setMissions((prev) => prev.map((x) => x.id === m.id ? { ...x, status: active ? 'active' : 'inactive' } : x))
    } catch (e) { setError(e.message) }
  }

  const handleNotify = async (m) => {
    try {
      const res = await api.notifyMission(m.id)
      const notified = res?.isNotify ?? true
      setMissions((prev) => prev.map((x) => x.id === m.id ? { ...x, isNotify: notified } : x))
    } catch (e) { setError(e.message) }
  }

  if (loading) return <Loading text="Loading missions..." />

  const countFor = (p) => counts ? (counts[p.toLowerCase()] ?? counts[p] ?? 0) : missions.filter((m) => m.period === p).length

  return (
    <div>
      {error && <div className="alert alert-warning" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="stats-grid">
        <div className="stats-card"><div className="label">Total Missions</div><div className="value">{counts?.all ?? counts?.total ?? missions.length}</div></div>
        <div className="stats-card"><div className="label">Monthly</div><div className="value">{countFor('MONTHLY')}</div></div>
        <div className="stats-card"><div className="label">Quarterly</div><div className="value">{countFor('QUARTERLY')}</div></div>
        <div className="stats-card"><div className="label">Yearly</div><div className="value">{countFor('YEARLY')}</div></div>
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
                <div key={m.id} className="card" style={{ margin: 0, minWidth: 0, overflow: 'hidden', padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, overflowWrap: 'anywhere', wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: 1.4 }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-light)', textTransform: 'capitalize', overflowWrap: 'anywhere', wordBreak: 'break-word', whiteSpace: 'normal' }}>{m.period?.toLowerCase()} · For: {m.countryCode || 'All Super Admins'}</div>
                    </div>
                    <span className={`badge ${m.status || 'active'}`} style={{ flexShrink: 0 }}>{m.status || 'active'}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-light)', margin: '0 0 8px', minHeight: 20 }}>{m.description || 'No description'}</p>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>Goal: {typeof m.goal === 'object' ? JSON.stringify(m.goal) : String(m.goal ?? 'N/A')}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12, flexWrap: 'wrap' }}>
                    <button className="btn btn-success btn-sm" onClick={() => handleNotify(m)} title={m.isNotify ? 'Already notified — click to notify again' : 'Notify all super admins'}>{m.isNotify ? 'Renotify' : 'Notify'}</button>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(m)}>Edit</button>
                    <button className={`btn btn-sm ${m.status === 'active' ? 'btn-warning' : 'btn-success'}`} onClick={() => toggleStatus(m)}>{m.status === 'active' ? 'Deactivate' : 'Activate'}</button>
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
            <div className="form-group"><label>Mission Name</label><input value={form.missionName} onChange={(e) => setForm({ ...form, missionName: e.target.value })} required /></div>
            <div className="form-group"><label>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group"><label>Period</label>
                <select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
                  {PERIODS.map((p) => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Goal</label><input type="text" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="e.g., Complete 500 activities" /></div>
            </div>
            <div className="form-group"><label>Country (Super Admin)</label>
              <select value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
                <option value="">All Super Admins</option>
                {countries.map((c) => <option key={c} value={c}>Super Admin ({c})</option>)}
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
